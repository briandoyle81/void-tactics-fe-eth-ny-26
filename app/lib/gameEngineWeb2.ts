import { prisma } from "./prisma";
import { getEconomyConfig } from "./economyConfig";
import { getMapTiles } from "./getMapTiles";
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
import { hasLineOfSight } from "../utils/gameGridRanges";
import { computeMovementRange } from "../utils/gameGridRangesWeb2";
import { ActionType, ScoringPosition } from "../types/types";
import type { Web2GameDataView, Web2LastMove } from "../types/web2Game";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import { GamePhase } from "../generated/prisma";
import {
  getSpecialConfigWeb2,
  isAoeSpecialWeb2,
  isActivatableSpecialWeb2,
} from "../utils/specialConfigWeb2";
import { getFactionAbilityConfigWeb2 } from "../utils/factionAbilityConfigWeb2";
import { resolveTournamentMatchIfApplicable } from "./resolveTournamentMatchIfApplicable";
import { resolveCampaignNodeIfApplicable } from "./resolveCampaignNodeIfApplicable";
import { resolveRoguelikeRunIfApplicable } from "./resolveRoguelikeRunIfApplicable";
import { applyPvpWinEffectsIfApplicable } from "./resolvePvpWinEffectsIfApplicable";
import { getWinEffectsSettings } from "./winEffectsWeb2";
import { AI_USER_ID } from "../config/aiUser";

// Server-side turn-processing engine — ported from `explore-traditional`'s
// `app/api/games/[id]/action/route.ts` (human-vs-human logic only; the
// source branch's AI auto-move block was stripped entirely, see the plan).
// Keeps the API route thin: the route does auth + request-shape parsing,
// this module does everything else (load, validate, compute, persist).

export class GameActionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface GameActionInput {
  shipId: number;
  row: number;
  col: number;
  actionType: number;
  targetShipId: number;
  specialType?: number;
}

// Web2 counterpart to Game.healCapPercent — caps any heal effect (currently
// just the Repair special; win-effect heals will route through this too
// once wired) at `capPercent`% of max HP. Never heals below the ship's
// current HP even if it's already past the cap.
function applyHealCap(currentHp: number, desiredHp: number, maxHp: number, capPercent: number): number {
  const clamped = Math.min(maxHp, desiredHp);
  if (capPercent >= 100) return clamped;
  const capValue = Math.floor((maxHp * capPercent) / 100);
  return Math.max(currentHp, Math.min(clamped, capValue));
}

function applyShootDamage(
  state: Web2GameDataView,
  attackerShipId: number,
  targetShipId: number,
): Web2GameDataView {
  const attackerIdx = state.shipIds.findIndex((id) => id === attackerShipId);
  const targetIdx = state.shipIds.findIndex((id) => id === targetShipId);
  if (attackerIdx === -1 || targetIdx === -1) return state;

  const newAttrs = [...state.shipAttributes];
  const attackerAttrs = newAttrs[attackerIdx]!;
  const targetAttrs = { ...newAttrs[targetIdx]! };

  const wasDisabled = targetAttrs.hullPoints === 0;

  if (!wasDisabled) {
    const baseDamage = attackerAttrs.gunDamage;
    const reduction = targetAttrs.damageReduction;
    // Applying a hit always deals a minimum of 1 (unlike the client's damage
    // *preview*, which can show 0 — see calculateDamageWeb2.ts).
    const damage = Math.max(1, baseDamage - Math.floor((baseDamage * reduction) / 100));
    targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - damage);
  }

  // Shooting a ship that was already at 0 HP increments reactor timer; timer reaches 3 → ship destroyed
  if (wasDisabled) {
    targetAttrs.reactorCriticalTimer = (targetAttrs.reactorCriticalTimer || 0) + 1;
  }

  newAttrs[targetIdx] = targetAttrs;

  let newCreatorActive = [...state.creatorActiveShipIds];
  let newJoinerActive = [...state.joinerActiveShipIds];
  let newPositions = state.shipPositions;
  if (targetAttrs.reactorCriticalTimer >= 3) {
    newCreatorActive = newCreatorActive.filter((id) => id !== targetShipId);
    newJoinerActive = newJoinerActive.filter((id) => id !== targetShipId);
    newPositions = newPositions.filter((p) => p.shipId !== targetShipId);
  }

  return { ...state, shipAttributes: newAttrs, shipPositions: newPositions, creatorActiveShipIds: newCreatorActive, joinerActiveShipIds: newJoinerActive };
}

/**
 * Adds `delta` to a ship's reactor-critical timer, removing it from the
 * game once it reaches 3 — shared by EMP (variant 1 slot 1, single target)
 * and Electric Storm (variant 2 slot 1, self-centered AoE). Status effect
 * code 1 is the same debuff marker both use for the client's icon.
 */
function applyReactorTimerDelta(
  state: Web2GameDataView,
  targetShipId: number,
  delta: number,
): Web2GameDataView {
  const targetIdx = state.shipIds.findIndex((id) => id === targetShipId);
  if (targetIdx === -1) return state;
  const newAttrs = [...state.shipAttributes];
  const targetAttrs = { ...newAttrs[targetIdx]! };
  targetAttrs.statusEffects = [...(targetAttrs.statusEffects ?? []), 1];
  targetAttrs.reactorCriticalTimer = Math.max(0, (targetAttrs.reactorCriticalTimer || 0) + delta);
  newAttrs[targetIdx] = targetAttrs;
  if (targetAttrs.reactorCriticalTimer >= 3) {
    return {
      ...state,
      shipAttributes: newAttrs,
      shipPositions: state.shipPositions.filter((p) => p.shipId !== targetShipId),
      creatorActiveShipIds: state.creatorActiveShipIds.filter((id) => id !== targetShipId),
      joinerActiveShipIds: state.joinerActiveShipIds.filter((id) => id !== targetShipId),
    };
  }
  return { ...state, shipAttributes: newAttrs };
}

/**
 * Reduces a ship's hull by `damage` (floored at 0). Distinct from
 * `applyShootDamage`: matches DroneSwarmResolver/FlakArrayResolver's
 * hullDelta path on-chain, which never bumps the reactor-critical timer
 * even against an already-disabled (0 HP) target — that "keep shooting a
 * downed ship to finish it off" mechanic is specific to gun damage
 * (Game.sol's normal Shoot path), not special-effect hull damage.
 */
function applySpecialHullDamage(
  state: Web2GameDataView,
  targetShipId: number,
  damage: number,
): Web2GameDataView {
  const targetIdx = state.shipIds.findIndex((id) => id === targetShipId);
  if (targetIdx === -1) return state;
  const newAttrs = [...state.shipAttributes];
  const targetAttrs = { ...newAttrs[targetIdx]! };
  targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - damage);
  newAttrs[targetIdx] = targetAttrs;
  return { ...state, shipAttributes: newAttrs };
}

function checkWinConditions(state: Web2GameDataView): { winner: string | null; reason: string | null } {
  if (state.creatorActiveShipIds.length === 0) {
    return { winner: state.metadata.joiner, reason: "all_destroyed" };
  }
  if (state.joinerActiveShipIds.length === 0) {
    return { winner: state.metadata.creator, reason: "all_destroyed" };
  }
  const creatorDone = state.creatorScore >= state.maxScore;
  const joinerDone = state.joinerScore >= state.maxScore;
  if (creatorDone && joinerDone) {
    if (state.creatorScore > state.joinerScore) {
      return { winner: state.metadata.creator, reason: "score" };
    } else if (state.joinerScore > state.creatorScore) {
      return { winner: state.metadata.joiner, reason: "score" };
    } else {
      return { winner: WEB2_TIE_SENTINEL, reason: "tie" };
    }
  }
  if (creatorDone) {
    return { winner: state.metadata.creator, reason: "score" };
  }
  if (joinerDone) {
    return { winner: state.metadata.joiner, reason: "score" };
  }
  return { winner: null, reason: null };
}

/**
 * Reject a move destination that isn't actually reachable, a shot whose
 * target is out of weapon range or lacks line of sight, a ram whose
 * destination isn't the target's own tile, a single-target special (EMP/
 * Repair Drones for variant 1, Drone Swarm for variant 2) whose target is
 * out of the special's range, and any attempt to activate a passive-only
 * special (variant 2's Additional Thruster — no on-chain resolver either).
 * (Self-centered AoE specials — Flak Array/Electric Storm — need no
 * separate target-range check; their blast radius is self-contained,
 * computed server-side from the ship's own destination tile; see the
 * ActionType.Special case in applyGameAction.) Ram/special range
 * enforcement was intentionally deferred when this engine was first ported
 * (the source branch's handlers only ever validated ownership/team
 * constraints, never range) — closing that gap here since it let a ship
 * ram/special a target anywhere on the board regardless of position. Uses
 * the same shared `gameGridRangesWeb2.ts`/`hasLineOfSight` module the
 * client uses for range highlighting, and the same `specialConfigWeb2.ts`
 * range table the client reads — no duplicated/diverging logic.
 *
 * `variant` is the ACTING ship's own traits.variant — a special's slot
 * number is per-faction, so which ability (and which range) applies
 * depends on it (docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §3).
 */
function validateDestinationAndTarget(params: {
  state: Web2GameDataView;
  shipId: number;
  row: number;
  col: number;
  actionType: number;
  targetShipId: number;
  specialType: number;
  variant: number;
  blockedGrid: boolean[][];
  /** Movement-blocking terrain, independent of blockedGrid's LOS-only blocking (see docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md §1). */
  impassableGrid?: boolean[][];
}) {
  const { state, shipId, row, col, actionType, targetShipId, specialType, variant, blockedGrid, impassableGrid } = params;

  if (actionType === ActionType.Retreat) return; // no destination to validate

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) throw new GameActionError(400, "Ship position not found");
  const { row: curRow, col: curCol } = shipPos.position;

  const isStayingPut = row === curRow && col === curCol;
  if (!isStayingPut) {
    const shipMap = new Map<number, true>(state.shipIds.map((id) => [id, true]));
    const attrsByShip = new Map(state.shipIds.map((id, i) => [id, state.shipAttributes[i]]));
    // Mirrors the client's canEnterOccupiedCell (useGameplayInteraction.ts)
    // exactly: a Ram may move onto a tile occupied by a disabled enemy ship.
    const opponentActiveIds = shipPos.isCreator
      ? state.joinerActiveShipIds
      : state.creatorActiveShipIds;
    // ActionType.Ram (legacy, variant-unrestricted) is the one action that
    // may move directly onto an occupied tile — matches the old on-chain
    // auto-ram-on-move model. ActionType.FactionAbility (the real, unified
    // Ram/Repair action new submissions use — see gameGridWeaponSelector's
    // client-side counterpart) is NOT exempted here: it moves to a normal,
    // legal tile like any other action, and the ability's own effect
    // (below) relocates the rammer onto the victim's tile afterward,
    // mirroring RamResolver.sol exactly.
    const reachable = computeMovementRange({
      gridWidth: state.gridDimensions.gridWidth,
      gridHeight: state.gridDimensions.gridHeight,
      selectedShipId: shipId,
      hasShips: true,
      shipMap,
      getShipAttributes: (id) => attrsByShip.get(id) ?? null,
      shipPositions: state.shipPositions,
      previewPosition: null,
      canEnterOccupiedCell: (_row, _col, occupyingShipId) =>
        actionType === ActionType.Ram &&
        occupyingShipId !== shipId &&
        opponentActiveIds.includes(occupyingShipId) &&
        attrsByShip.get(occupyingShipId)?.hullPoints === 0,
      impassableGrid,
    });
    if (!reachable.some((p) => p.row === row && p.col === col)) {
      throw new GameActionError(400, "Destination out of movement range or crosses impassable terrain");
    }
  }

  if (actionType === ActionType.Shoot) {
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    const shooterIdx = state.shipIds.findIndex((id) => id === shipId);
    const shooterAttrs = state.shipAttributes[shooterIdx];
    if (!targetPos || !shooterAttrs) throw new GameActionError(400, "Invalid shot");
    const distance = Math.abs(targetPos.position.row - row) + Math.abs(targetPos.position.col - col);
    const range = shooterAttrs.range || 1;
    if (distance !== 1 && distance > range) {
      throw new GameActionError(400, "Target out of weapon range");
    }
    if (distance > 1 && !hasLineOfSight(row, col, targetPos.position.row, targetPos.position.col, blockedGrid)) {
      throw new GameActionError(400, "No line of sight to target");
    }
  }

  if (actionType === ActionType.Ram) {
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    if (!targetPos) throw new GameActionError(400, "Invalid ram target");
    if (targetPos.position.row !== row || targetPos.position.col !== col) {
      throw new GameActionError(400, "Ram destination must be the target ship's tile");
    }
  }

  if (actionType === ActionType.FactionAbility) {
    // Every ship's innate ability — Ram (variant 1, evict a downed enemy)
    // or Repair (variant 2, heal a friendly incl. self) — always needs a
    // real target, unlike Special's Flak/Electric Storm AoE case.
    const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
    if (!targetPos) throw new GameActionError(400, "Invalid target");
    const distance = Math.abs(targetPos.position.row - row) + Math.abs(targetPos.position.col - col);
    const { range, isHeal } = getFactionAbilityConfigWeb2(variant);
    if (distance > range) throw new GameActionError(400, "Target out of range");
    const targetIsOwnSide = targetPos.isCreator === shipPos.isCreator;
    if (isHeal) {
      if (!targetIsOwnSide) throw new GameActionError(400, "Can only repair your own ships");
    } else {
      if (targetIsOwnSide) throw new GameActionError(400, "Can only ram enemy ships");
      const targetAttrs = state.shipAttributes[state.shipIds.findIndex((id) => id === targetShipId)];
      if (!targetAttrs || targetAttrs.hullPoints !== 0) {
        throw new GameActionError(400, "Can only ram disabled ships");
      }
    }
  }

  if (actionType === ActionType.Special) {
    if (specialType !== 0 && !isActivatableSpecialWeb2(variant, specialType)) {
      // Matches the on-chain revert: variant 2's Additional Thruster has no
      // registered resolver, so trying to *use* it (rather than just
      // benefit from its passive movement) is rejected outright.
      throw new GameActionError(400, "This special cannot be activated — it's passive-only");
    }
    if (specialType !== 0 && !isAoeSpecialWeb2(variant, specialType)) {
      const targetPos = state.shipPositions.find((p) => p.shipId === targetShipId);
      if (!targetPos) throw new GameActionError(400, "Invalid special target");
      const distance = Math.abs(targetPos.position.row - row) + Math.abs(targetPos.position.col - col);
      const range = getSpecialConfigWeb2(variant, specialType)?.range ?? 0;
      if (distance > range) {
        throw new GameActionError(400, "Target out of special range");
      }
    }
  }
}

export async function applyGameAction(
  gameId: number,
  userId: string,
  input: GameActionInput,
): Promise<Web2GameDataView> {
  const { shipId, row, col, actionType, targetShipId } = input;
  const specialType = input.specialType ?? 0;

  const [game, economy, winEffectsSettings, actingShip] = await Promise.all([
    prisma.game.findFirst({
      where: { id: gameId, OR: [{ player1Id: userId }, { player2Id: userId }] },
      include: { lobby: true },
    }),
    getEconomyConfig(),
    getWinEffectsSettings(),
    // Only needed for the ActionType.Special branch (a special's slot
    // number is per-faction — see validateDestinationAndTarget's doc), but
    // fetched unconditionally alongside the other lookups above rather than
    // gated on actionType, to keep this a single Promise.all with no
    // action-shaped branching before the game record is even loaded.
    prisma.ship.findUnique({ where: { id: shipId }, select: { traits: true } }),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = (actingShip?.traits as any)?.variant ?? 1;

  if (!game) throw new GameActionError(404, "Not found");
  if (game.phase !== GamePhase.ACTIVE) throw new GameActionError(409, "Game not active");

  const state = game.state as unknown as Web2GameDataView;

  if (state.turnState.currentTurn !== userId) {
    throw new GameActionError(409, "Not your turn");
  }

  const isCreator = state.metadata.creator === userId;
  const myActiveShipIds = isCreator ? state.creatorActiveShipIds : state.joinerActiveShipIds;
  const myMovedShipIds = isCreator ? state.creatorMovedShipIds : state.joinerMovedShipIds;
  const isRetreating = actionType === ActionType.Retreat;

  // Retreat bypasses the active-list check — disabled ships that have been removed from active
  // mid-combat (reactor timer ≥ 3) can still be retreated if they have a board position.
  if (!isRetreating && !myActiveShipIds.some((id) => id === shipId)) {
    throw new GameActionError(400, "Ship not active or not yours");
  }

  if (!isRetreating && myMovedShipIds.some((id) => id === shipId)) {
    throw new GameActionError(409, "Ship already moved this round");
  }

  const shipPos = state.shipPositions.find((p) => p.shipId === shipId);
  if (!shipPos) throw new GameActionError(400, "Ship position not found");

  // For retreat, verify ownership via position metadata since the ship may no longer be active
  if (isRetreating && shipPos.isCreator !== isCreator) {
    throw new GameActionError(400, "Ship not active or not yours");
  }

  // Build map grids for scoring at round end + server-side range/LOS
  // validation. Cached by mapId — see getMapTiles.ts — since map tiles are
  // static after creation but this runs on every single action submission.
  const mapData = game.lobby.mapId ? await getMapTiles(game.lobby.mapId) : null;
  const rawScoringTiles = mapData
    ? (mapData.scoringTiles as unknown as ScoringPosition[])
    : [];
  const { scoringGrid, blockedGrid, impassableGrid } = buildMapGridsFromContractMap(
    mapData ? (mapData.blockedTiles as unknown as Array<{ row: number; col: number }>) : [],
    rawScoringTiles,
    state.gridDimensions.gridWidth,
    state.gridDimensions.gridHeight,
    mapData ? (mapData.impassableTiles as unknown as Array<{ row: number; col: number }>) : [],
  );

  validateDestinationAndTarget({
    state,
    shipId,
    row,
    col,
    actionType,
    targetShipId,
    specialType,
    variant,
    blockedGrid,
    impassableGrid,
  });

  const now = Date.now();
  let newState: Web2GameDataView = {
    ...state,
    mapId: state.mapId || game.lobby.mapId || 0,
    shipPositions: [...state.shipPositions],
    shipAttributes: [...state.shipAttributes],
    creatorActiveShipIds: [...state.creatorActiveShipIds],
    joinerActiveShipIds: [...state.joinerActiveShipIds],
    creatorMovedShipIds: [...state.creatorMovedShipIds],
    joinerMovedShipIds: [...state.joinerMovedShipIds],
  };

  const moveShipTo = (sid: number, newRow: number, newCol: number) => {
    const posIdx = newState.shipPositions.findIndex((p) => p.shipId === sid);
    if (posIdx === -1) return;
    const newPositions = [...newState.shipPositions];
    newPositions[posIdx] = { ...newPositions[posIdx]!, position: { row: newRow, col: newCol } };
    newState = { ...newState, shipPositions: newPositions };
  };

  const oldRow = shipPos.position.row;
  const oldCol = shipPos.position.col;

  // Snapshot opponent's active ships before any state mutation so we can count kills
  const opponentActivesBefore = new Set<number>(
    isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds,
  );

  let lastMove: Web2LastMove;

  switch (actionType) {
    case ActionType.Pass:
    case ActionType.ClaimPoints: {
      moveShipTo(shipId, row, col);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Pass, targetShipId: 0, timestamp: now };
      break;
    }

    case ActionType.Shoot: {
      if (!targetShipId) throw new GameActionError(400, "Target required for shoot");
      moveShipTo(shipId, row, col);
      newState = applyShootDamage(newState, shipId, targetShipId);
      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Shoot, targetShipId, timestamp: now };
      break;
    }

    case ActionType.Special: {
      if (!targetShipId && !isAoeSpecialWeb2(variant, specialType)) {
        throw new GameActionError(400, "Target required for special");
      }
      moveShipTo(shipId, row, col);

      if (variant !== 2 && specialType === 1) {
        // EMP: target must be an enemy ship
        const opponentActiveIds = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
        if (!opponentActiveIds.some((id) => id === targetShipId)) {
          throw new GameActionError(400, "Can only use EMP on enemy ships");
        }
        const strength = getSpecialConfigWeb2(1, 1)!.strength;
        newState = applyReactorTimerDelta(newState, targetShipId, strength);
      } else if (variant !== 2 && specialType === 2) {
        // Repair Drones: target must be your own ship
        if (!myActiveShipIds.some((id) => id === targetShipId)) {
          throw new GameActionError(400, "Can only repair your own ships");
        }
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        if (targetIdx !== -1) {
          const newAttrs = [...newState.shipAttributes];
          const targetAttrs = { ...newAttrs[targetIdx]! };
          const healAmount = getSpecialConfigWeb2(1, 2)!.strength;
          targetAttrs.hullPoints = applyHealCap(
            targetAttrs.hullPoints,
            targetAttrs.hullPoints + healAmount,
            targetAttrs.maxHullPoints,
            winEffectsSettings.healCapPercent,
          );
          targetAttrs.reactorCriticalTimer = 0;
          newAttrs[targetIdx] = targetAttrs;
          newState = { ...newState, shipAttributes: newAttrs };
        }
      } else if (variant !== 2 && specialType === 3) {
        // Flak Array: deal gun damage to every active ship within range except the firing ship — no LOS check, friendly fire included
        const flakRange = getSpecialConfigWeb2(1, 3)!.range;
        const allActiveIds = [
          ...newState.creatorActiveShipIds,
          ...newState.joinerActiveShipIds,
        ];
        for (const targetId of allActiveIds) {
          if (targetId === shipId) continue;
          const targetPos = newState.shipPositions.find(
            (p) => p.shipId === targetId,
          );
          if (!targetPos) continue;
          const dist =
            Math.abs(targetPos.position.row - row) +
            Math.abs(targetPos.position.col - col);
          if (dist <= flakRange) {
            newState = applyShootDamage(newState, shipId, targetId);
          }
        }
      } else if (variant === 2 && specialType === 1) {
        // Electric Storm: self-centered AoE reactor-timer damage against
        // EVERY active ship within range — both sides, AND the caster
        // itself (unlike Flak/Drone Swarm, which exclude the caster).
        const strength = getSpecialConfigWeb2(2, 1)!.strength;
        const range = getSpecialConfigWeb2(2, 1)!.range;
        const allActiveIds = [
          ...newState.creatorActiveShipIds,
          ...newState.joinerActiveShipIds,
        ];
        for (const targetId of allActiveIds) {
          const targetPos = newState.shipPositions.find((p) => p.shipId === targetId);
          if (!targetPos) continue;
          const dist =
            Math.abs(targetPos.position.row - row) +
            Math.abs(targetPos.position.col - col);
          if (dist <= range) {
            newState = applyReactorTimerDelta(newState, targetId, strength);
          }
        }
      } else if (variant === 2 && specialType === 2) {
        // Drone Swarm: single-target hull damage against an enemy within
        // range, reduced by the target's damage reduction (same formula as
        // Flak Array's per-ship damage, no minimum-1 floor).
        const opponentActiveIds = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
        if (!opponentActiveIds.some((id) => id === targetShipId)) {
          throw new GameActionError(400, "Can only use Drone Swarm on enemy ships");
        }
        const strength = getSpecialConfigWeb2(2, 2)!.strength;
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        const targetAttrs = targetIdx !== -1 ? newState.shipAttributes[targetIdx] : undefined;
        if (targetAttrs) {
          const damage = Math.max(
            0,
            strength - Math.floor((strength * targetAttrs.damageReduction) / 100),
          );
          newState = applySpecialHullDamage(newState, targetShipId, damage);
        }
      }
      // variant === 2 && specialType === 3 (Additional Thruster) can't reach
      // here — validateDestinationAndTarget rejects it as passive-only.

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Special, targetShipId: targetShipId ?? 0, timestamp: now };
      break;
    }

    case ActionType.Retreat: {
      newState = {
        ...newState,
        shipPositions: newState.shipPositions.filter((p) => p.shipId !== shipId),
        creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== shipId),
        joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== shipId),
      };
      lastMove = { shipId, oldRow, oldCol, newRow: -1, newCol: -1, actionType: ActionType.Retreat, targetShipId: 0, timestamp: now };
      break;
    }

    case ActionType.Ram: {
      // Legacy action, kept for any stale client still sending it (current
      // clients submit the unified ActionType.FactionAbility above
      // instead) — restricted to variant 1, which is the only faction with
      // Ram at all; variant 2's innate ability is Repair.
      if (variant === 2) throw new GameActionError(400, "This faction cannot ram");
      if (!targetShipId) throw new GameActionError(400, "Target required for ram");
      // Must be an enemy ship, not one of the ramming player's own —
      // ramming your own disabled ship has no legitimate use (it can only
      // deny yourself a future reactor-tick kill credit).
      const opponentActiveIdsForRam = isCreator ? state.joinerActiveShipIds : state.creatorActiveShipIds;
      if (!opponentActiveIdsForRam.some((id) => id === targetShipId)) {
        throw new GameActionError(400, "Can only ram enemy ships");
      }
      const ramTargetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
      if (ramTargetIdx === -1) throw new GameActionError(400, "Target ship not found");
      const ramTargetAttrs = newState.shipAttributes[ramTargetIdx];
      if (!ramTargetAttrs || ramTargetAttrs.hullPoints > 0) {
        throw new GameActionError(400, "Can only ram disabled ships");
      }

      // Move ramming ship to the target's position
      moveShipTo(shipId, row, col);

      // Remove rammed ship from the board and both active lists — no reactor damage to it
      newState = {
        ...newState,
        shipPositions: newState.shipPositions.filter((p) => p.shipId !== targetShipId),
        creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== targetShipId),
        joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== targetShipId),
      };

      // Ramming ship takes +1 reactor damage
      const rammerIdx = newState.shipIds.findIndex((id) => id === shipId);
      if (rammerIdx !== -1) {
        const newAttrs = [...newState.shipAttributes];
        const rammerAttrs = { ...newAttrs[rammerIdx]! };
        rammerAttrs.reactorCriticalTimer = (rammerAttrs.reactorCriticalTimer || 0) + 1;
        newAttrs[rammerIdx] = rammerAttrs;
        if (rammerAttrs.reactorCriticalTimer >= 3) {
          newState = {
            ...newState,
            shipAttributes: newAttrs,
            shipPositions: newState.shipPositions.filter((p) => p.shipId !== shipId),
            creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== shipId),
            joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== shipId),
          };
        } else {
          newState = { ...newState, shipAttributes: newAttrs };
        }
      }

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.Ram, targetShipId, timestamp: now };
      break;
    }

    case ActionType.FactionAbility: {
      // Every ship's innate ability — Ram (variant 1) or Repair (variant
      // 2) — dispatched uniformly, mirroring Game.sol's
      // _performFactionAbility exactly: the ship moves to its own
      // (already-validated legal) destination first, same as any other
      // action; the ability's effect is layered on afterward.
      if (!targetShipId) throw new GameActionError(400, "Target required");
      moveShipTo(shipId, row, col);

      if (variant === 2) {
        // Repair: heal the target (including self) — mirrors
        // RepairResolver.sol (strength 50, capped like the equipped Repair
        // Drones special).
        const { strength } = getFactionAbilityConfigWeb2(2);
        const targetIdx = newState.shipIds.findIndex((id) => id === targetShipId);
        if (targetIdx !== -1) {
          const newAttrs = [...newState.shipAttributes];
          const targetAttrs = { ...newAttrs[targetIdx]! };
          targetAttrs.hullPoints = applyHealCap(
            targetAttrs.hullPoints,
            targetAttrs.hullPoints + (strength ?? 0),
            targetAttrs.maxHullPoints,
            winEffectsSettings.healCapPercent,
          );
          newAttrs[targetIdx] = targetAttrs;
          newState = { ...newState, shipAttributes: newAttrs };
        }
      } else {
        // Ram: evict the downed enemy (unconditional retreat, not destroy —
        // mirrors RamResolver.sol), then relocate the rammer onto its
        // now-vacated tile and tick the rammer's own reactor timer by 1.
        const targetPos = newState.shipPositions.find((p) => p.shipId === targetShipId);
        newState = {
          ...newState,
          shipPositions: newState.shipPositions.filter((p) => p.shipId !== targetShipId),
          creatorActiveShipIds: newState.creatorActiveShipIds.filter((id) => id !== targetShipId),
          joinerActiveShipIds: newState.joinerActiveShipIds.filter((id) => id !== targetShipId),
        };
        newState = applyReactorTimerDelta(newState, shipId, 1);
        // If that 3rd ram just destroyed the rammer, it never occupies the
        // vacated tile — matches RamResolver's own comment on this exact case.
        const rammerStillActive = newState.shipPositions.some((p) => p.shipId === shipId);
        if (targetPos && rammerStillActive) {
          newState = {
            ...newState,
            shipPositions: newState.shipPositions.map((p) =>
              p.shipId === shipId ? { ...p, position: targetPos.position } : p,
            ),
          };
        }
      }

      lastMove = { shipId, oldRow, oldCol, newRow: row, newCol: col, actionType: ActionType.FactionAbility, targetShipId, timestamp: now };
      break;
    }

    default:
      throw new GameActionError(400, "Unknown action type");
  }

  newState = { ...newState, lastMove };

  // Mark ship as moved
  if (isCreator) {
    if (!newState.creatorMovedShipIds.some((id) => id === shipId)) {
      newState = { ...newState, creatorMovedShipIds: [...newState.creatorMovedShipIds, shipId] };
    }
  } else {
    if (!newState.joinerMovedShipIds.some((id) => id === shipId)) {
      newState = { ...newState, joinerMovedShipIds: [...newState.joinerMovedShipIds, shipId] };
    }
  }

  // Check early win condition (all enemy ships destroyed)
  const earlyWin = checkWinConditions(newState);
  let gamePhase: GamePhase = game.phase;
  let winnerId: string | null = game.winnerId;

  if (earlyWin.winner) {
    gamePhase = GamePhase.COMPLETED;
    winnerId = earlyWin.winner;
    newState = {
      ...newState,
      metadata: { ...newState.metadata, winner: earlyWin.winner },
    };
  } else {
    // Turn advancement
    // Disabled (0-HP) ships don't need to submit moves; exclude them from the round-end check
    // so they stay on the field until the round-end reactor tick destroys them.
    const getShipHp = (sid: number): number => {
      const idx = newState.shipIds.findIndex((id) => id === sid);
      return idx === -1 ? 1 : (newState.shipAttributes[idx]?.hullPoints ?? 1);
    };
    const allCreatorMoved = newState.creatorActiveShipIds
      .filter((id) => getShipHp(id) > 0)
      .every((id) => newState.creatorMovedShipIds.some((mid) => mid === id));
    const allJoinerMoved = newState.joinerActiveShipIds
      .filter((id) => getShipHp(id) > 0)
      .every((id) => newState.joinerMovedShipIds.some((mid) => mid === id));

    if (allCreatorMoved && allJoinerMoved) {
      // Round end: award scoring points first (disabled ships on tiles still score)
      for (const pos of newState.shipPositions) {
        const pts = scoringGrid[pos.position.row]?.[pos.position.col] ?? 0;
        if (pts > 0) {
          if (newState.creatorActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, creatorScore: newState.creatorScore + pts };
          } else if (newState.joinerActiveShipIds.some((id) => id === pos.shipId)) {
            newState = { ...newState, joinerScore: newState.joinerScore + pts };
          }
        }
      }

      // Round-end reactor tick: every active 0-HP ship gains +1 reactor damage.
      // Ships reaching timer >= 3 are destroyed (removed from board and active lists).
      {
        const reactorAttrs = [...newState.shipAttributes];
        let reactorCreatorActive = [...newState.creatorActiveShipIds];
        let reactorJoinerActive = [...newState.joinerActiveShipIds];
        const destroyedIds = new Set<number>();
        const activeSet = new Set([...reactorCreatorActive, ...reactorJoinerActive]);
        newState.shipIds.forEach((sid, idx) => {
          if (!activeSet.has(sid)) return;
          const attrs = { ...reactorAttrs[idx]! };
          if (attrs.hullPoints === 0) {
            attrs.reactorCriticalTimer = (attrs.reactorCriticalTimer || 0) + 1;
            reactorAttrs[idx] = attrs;
            if (attrs.reactorCriticalTimer >= 3) {
              destroyedIds.add(sid);
              reactorCreatorActive = reactorCreatorActive.filter((id) => id !== sid);
              reactorJoinerActive = reactorJoinerActive.filter((id) => id !== sid);
            }
          }
        });
        newState = {
          ...newState,
          shipAttributes: reactorAttrs,
          shipPositions: destroyedIds.size > 0
            ? newState.shipPositions.filter((p) => !destroyedIds.has(p.shipId))
            : newState.shipPositions,
          creatorActiveShipIds: reactorCreatorActive,
          joinerActiveShipIds: reactorJoinerActive,
        };
      }

      const roundEndWin = checkWinConditions(newState);
      if (roundEndWin.winner) {
        gamePhase = GamePhase.COMPLETED;
        winnerId = roundEndWin.winner;
        newState = {
          ...newState,
          metadata: { ...newState.metadata, winner: roundEndWin.winner },
        };
      } else {
        // Start next round — alternate who goes first each round
        const nextCreatorGoesFirst = !newState.metadata.creatorGoesFirst;
        const firstPlayerNextRound = nextCreatorGoesFirst
          ? newState.metadata.creator
          : newState.metadata.joiner;
        newState = {
          ...newState,
          metadata: { ...newState.metadata, creatorGoesFirst: nextCreatorGoesFirst },
          creatorMovedShipIds: [],
          joinerMovedShipIds: [],
          turnState: {
            ...newState.turnState,
            currentRound: newState.turnState.currentRound + 1,
            currentTurn: firstPlayerNextRound,
            turnStartTime: Date.now(),
          },
        };
      }
    } else {
      // One ship per turn: pass to the opponent, but skip them if they have no healthy unmoved ships
      const nextTurnDefault = isCreator ? newState.metadata.joiner : newState.metadata.creator;
      const nextIsCreator = nextTurnDefault === newState.metadata.creator;
      const nextHasUnmovedHealthy = nextIsCreator
        ? newState.creatorActiveShipIds.some(
            (id) => getShipHp(id) > 0 && !newState.creatorMovedShipIds.some((mid) => mid === id),
          )
        : newState.joinerActiveShipIds.some(
            (id) => getShipHp(id) > 0 && !newState.joinerMovedShipIds.some((mid) => mid === id),
          );
      // If the opponent has nothing to move, keep turn with current player
      const nextTurn = nextHasUnmovedHealthy
        ? nextTurnDefault
        : isCreator ? newState.metadata.creator : newState.metadata.joiner;
      newState = {
        ...newState,
        turnState: { ...newState.turnState, currentTurn: nextTurn, turnStartTime: Date.now() },
      };
    }
  }

  // Count enemy ships killed this action (direct + any round-end reactor ticks).
  // Rammed ships are force-retreated, not killed — exclude them from kill credit.
  const opponentActivesAfter = new Set<number>(
    isCreator ? newState.joinerActiveShipIds : newState.creatorActiveShipIds,
  );
  const destroyedShipIds = [...opponentActivesBefore].filter((id) => {
    if (opponentActivesAfter.has(id)) return false;
    if (actionType === ActionType.Ram && id === targetShipId) return false;
    if (actionType === ActionType.FactionAbility && variant !== 2 && id === targetShipId) return false;
    return true;
  });
  const killCount = destroyedShipIds.length;

  const submittedRound = state.turnState.currentRound;
  const finalState = newState;
  const finalPhase = gamePhase;
  const finalWinnerId = winnerId;

  await prisma.$transaction(async (tx) => {
    // Optimistic concurrency check: the entire new state was computed in JS
    // from the `game` row read at the top of this function. If another
    // request (e.g. the same player double-submitting, or a network retry)
    // committed a change to this game between that read and now, `updatedAt`
    // will have moved and this conditional update matches zero rows —
    // meaning our computed state is stale and must not be applied. Using
    // `updateMany` (not `update`) so the row-count check is possible; the
    // row is uniquely identified by `id` regardless.
    const committed = await tx.game.updateMany({
      where: { id: gameId, updatedAt: game.updatedAt },
      data: {
        state: finalState as unknown as object,
        currentTurn: finalState.turnState.currentTurn,
        currentRound: finalState.turnState.currentRound,
        phase: finalPhase,
        winnerId: finalWinnerId,
      },
    });
    if (committed.count === 0) {
      throw new GameActionError(409, "Game state changed — please retry");
    }

    await tx.gameTurn.create({
      data: {
        gameId,
        playerId: userId,
        round: submittedRound,
        actions: [{ actionType, shipId, row, col, oldRow, oldCol, targetShipId, specialType }],
        snapshot: finalState as unknown as object,
      },
    });

    // Award kill reward and increment shipsDestroyed on attacking ship.
    // PvP (destroying a human opponent) always pays flat killRewardUtc,
    // regardless of variant. Destroying an AI-owned ship pays whatever
    // killRewardByVariant maps the *destroyed* ship's variant to — mirrors
    // FactionRewardTokenRegistry.rewardToken(variant) on-chain; a variant
    // with no entry pays nothing (see docs/update/Frontend_Updates_2026-09-17.md §2).
    if (killCount > 0) {
      const attacker = await tx.user.findUnique({
        where: { id: userId },
        select: { purchasedShipCount: true },
      });
      if ((attacker?.purchasedShipCount ?? 0) >= economy.purchaseThresholdForRewards) {
        const opponentIsAI = game.player1Id === AI_USER_ID || game.player2Id === AI_USER_ID;
        if (opponentIsAI) {
          const destroyedShips = await tx.ship.findMany({
            where: { id: { in: destroyedShipIds } },
            select: { id: true, traits: true },
          });
          let decReward = 0;
          let utcReward = 0;
          for (const ship of destroyedShips) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const variant = (ship.traits as any)?.variant ?? 0;
            const reward = economy.killRewardByVariant[variant];
            if (!reward) continue; // unregistered variant — no reward (mirrors RewardSkipped)
            if (reward.token === "DEC") decReward += reward.amount;
            else utcReward += reward.amount;
          }
          if (decReward > 0 || utcReward > 0) {
            await tx.user.update({
              where: { id: userId },
              data: {
                ...(decReward > 0 ? { decBalance: { increment: decReward } } : {}),
                ...(utcReward > 0 ? { creditBalance: { increment: utcReward } } : {}),
              },
            });
          }
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { creditBalance: { increment: killCount * economy.killRewardUtc } },
          });
        }
      }
      await tx.ship.update({
        where: { id: shipId, ownerId: userId },
        data: { shipsDestroyed: { increment: killCount } },
      });
    }

    if (finalPhase === GamePhase.COMPLETED && finalWinnerId && finalWinnerId !== game.winnerId) {
      if (finalWinnerId === WEB2_TIE_SENTINEL) {
        await tx.playerStats.upsert({
          where: { userId: game.player1Id },
          update: { draws: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: game.player1Id, draws: 1, totalGames: 1 },
        });
        await tx.playerStats.upsert({
          where: { userId: game.player2Id },
          update: { draws: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: game.player2Id, draws: 1, totalGames: 1 },
        });
      } else {
        const loserId = finalWinnerId === game.player1Id ? game.player2Id : game.player1Id;
        await tx.playerStats.upsert({
          where: { userId: finalWinnerId },
          update: { wins: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: finalWinnerId, wins: 1, totalGames: 1 },
        });
        await tx.playerStats.upsert({
          where: { userId: loserId },
          update: { losses: { increment: 1 }, totalGames: { increment: 1 } },
          create: { userId: loserId, losses: 1, totalGames: 1 },
        });
      }
      // Free all ships used in this game so players can use them again
      const gameFleets = await tx.fleet.findMany({ where: { lobbyId: game.lobbyId } });
      const allFleetShipIds = gameFleets.flatMap((f) => f.shipIds);
      if (allFleetShipIds.length > 0) {
        await tx.ship.updateMany({ where: { id: { in: allFleetShipIds } }, data: { inFleet: false } });
      }
    }
  });

  // A tie leaves no clear winner to advance a tournament bracket with — leave
  // the match unresolved for the tournament creator to resolve manually
  // (mirrors web3's admin "resolve as draw" action), matching the
  // stats-skip above.
  if (finalPhase === GamePhase.COMPLETED && finalWinnerId && finalWinnerId !== game.winnerId && finalWinnerId !== WEB2_TIE_SENTINEL) {
    await resolveTournamentMatchIfApplicable(game.lobbyId, finalWinnerId);
    await resolveCampaignNodeIfApplicable(game.lobbyId, finalWinnerId);
    await resolveRoguelikeRunIfApplicable(game.lobbyId, finalWinnerId);
    await applyPvpWinEffectsIfApplicable(game.lobbyId, finalWinnerId);
  }

  return finalState;
}

import type {
  DialogMission,
  DialogResponse,
  DialogSide,
  DialogTrigger,
  GenericDialogLine,
  MissionDialogLine,
} from "../types/dialog";
import { MISSION_DIALOG_LINES } from "../data/dialog/missionDialog";
import { GENERIC_DIALOG_LINES } from "../data/dialog/genericDialog";
import type { VictoryReasonEnemyShip } from "./victoryReason";

// Pure trigger engine for in-mission dialog. Shared by GameDisplay.tsx,
// GameDisplayWeb2.tsx and SimulatedGameDisplay.tsx (via useMissionDialog).
// Number-native: each view converts its own game data before calling this.

/** The parts of a game's state that dialog triggers look at. */
export interface DialogSnapshot {
  round: number;
  myScore: number;
  enemyScore: number;
  /** Ships removed from the game (status destroyed). */
  myShipsDestroyed: number;
  enemyShipsDestroyed: number;
  /**
   * Distinct ships that have been disabled (0 hull, still on the board) at
   * any point this game — a repaired-then-disabled-again ship counts once,
   * and a disabled ship that's later destroyed still counts. Built from
   * DialogObservation by mergeDisabledShips.
   */
  myShipsDisabled: number;
  enemyShipsDisabled: number;
  /** How the game ended for the local player; null while it's still running (or a draw). */
  outcome: DialogOutcome;
}

export type DialogOutcome = "victory" | "defeat" | null;

/**
 * What a view sees right now. Disabled ships are given by id (only the
 * ones disabled at this moment); the hook folds them into the per-game
 * "ever disabled" set to get DialogSnapshot's cumulative counts.
 */
export type DialogObservation = Omit<DialogSnapshot, "myShipsDisabled" | "enemyShipsDisabled"> & {
  myDisabledShipIds: string[];
  enemyDisabledShipIds: string[];
};

/** Ids of every ship disabled so far this game, per side. */
export interface EverDisabledShips {
  player: string[];
  enemy: string[];
}

export interface DialogShip extends VictoryReasonEnemyShip {
  /** Ship id, as a string (bigint/number ids converted by the view). */
  id: string;
  isMine: boolean;
}

/** Ship status values (ShipPosition.status). */
const STATUS_ACTIVE = 0;
const STATUS_DESTROYED = 1;

export function buildDialogSnapshot({
  round,
  myScore,
  enemyScore,
  ships,
  outcome = null,
}: {
  round: number;
  myScore: number;
  enemyScore: number;
  ships: readonly DialogShip[];
  outcome?: DialogOutcome;
}): DialogObservation {
  let myShipsDestroyed = 0;
  let enemyShipsDestroyed = 0;
  const myDisabledShipIds: string[] = [];
  const enemyDisabledShipIds: string[] = [];
  for (const ship of ships) {
    const status = ship.status ?? STATUS_ACTIVE;
    if (status === STATUS_DESTROYED) {
      if (ship.isMine) myShipsDestroyed++;
      else enemyShipsDestroyed++;
    } else if (status === STATUS_ACTIVE && ship.hullPoints != null && ship.hullPoints <= 0) {
      // Disabled: 0 hull but still on the board. Unknown attributes (null)
      // are treated as flying, same as victoryReason.ts. Retreated ships
      // (status 2) are neither.
      (ship.isMine ? myDisabledShipIds : enemyDisabledShipIds).push(ship.id);
    }
  }
  return {
    round,
    myScore,
    enemyScore,
    myShipsDestroyed,
    enemyShipsDestroyed,
    myDisabledShipIds,
    enemyDisabledShipIds,
    outcome,
  };
}

/**
 * Folds the ships disabled right now into the game's running "ever
 * disabled" set and returns the snapshot (with cumulative disabled counts)
 * plus the updated set to persist.
 */
export function mergeDisabledShips(
  observation: DialogObservation,
  everDisabled: EverDisabledShips | null | undefined,
): { snapshot: DialogSnapshot; everDisabled: EverDisabledShips } {
  const player = [...new Set([...(everDisabled?.player ?? []), ...observation.myDisabledShipIds])];
  const enemy = [...new Set([...(everDisabled?.enemy ?? []), ...observation.enemyDisabledShipIds])];
  return {
    snapshot: {
      round: observation.round,
      myScore: observation.myScore,
      enemyScore: observation.enemyScore,
      myShipsDestroyed: observation.myShipsDestroyed,
      enemyShipsDestroyed: observation.enemyShipsDestroyed,
      myShipsDisabled: player.length,
      enemyShipsDisabled: enemy.length,
      outcome: observation.outcome,
    },
    everDisabled: { player, enemy },
  };
}

/** True when nothing has happened yet: first round, no points, no losses. */
export function isOpeningSnapshot(s: DialogSnapshot): boolean {
  return (
    s.round <= 1 &&
    s.myScore === 0 &&
    s.enemyScore === 0 &&
    s.myShipsDestroyed === 0 &&
    s.enemyShipsDestroyed === 0 &&
    s.myShipsDisabled === 0 &&
    s.enemyShipsDisabled === 0 &&
    s.outcome === null
  );
}

export function snapshotsEqual(a: DialogSnapshot, b: DialogSnapshot): boolean {
  return (
    a.round === b.round &&
    a.myScore === b.myScore &&
    a.enemyScore === b.enemyScore &&
    a.myShipsDestroyed === b.myShipsDestroyed &&
    a.enemyShipsDestroyed === b.enemyShipsDestroyed &&
    a.myShipsDisabled === b.myShipsDisabled &&
    a.enemyShipsDisabled === b.enemyShipsDisabled &&
    a.outcome === b.outcome
  );
}

/** One concrete thing that happened between two snapshots. */
export type DialogOccurrence =
  | { type: "missionStart" }
  | { type: "roundEnd"; round: number }
  | { type: "roundStart"; round: number }
  | { type: "shipsDisabled"; side: DialogSide; count: number }
  | { type: "shipsDestroyed"; side: DialogSide; count: number }
  | { type: "pointsScored"; side: DialogSide; points: number }
  | { type: "missionVictory" }
  | { type: "missionDefeat" };

export function occurrenceKey(o: DialogOccurrence): string {
  switch (o.type) {
    case "missionStart":
    case "missionVictory":
    case "missionDefeat":
      return o.type;
    case "roundEnd":
    case "roundStart":
      return `${o.type}:${o.round}`;
    case "shipsDisabled":
    case "shipsDestroyed":
      return `${o.type}:${o.side}:${o.count}`;
    case "pointsScored":
      return `pointsScored:${o.side}:${o.points}`;
  }
}

const OCCURRENCE_ORDER: Record<DialogOccurrence["type"], number> = {
  missionStart: 0,
  roundEnd: 1,
  roundStart: 2,
  shipsDisabled: 3,
  shipsDestroyed: 4,
  pointsScored: 5,
  // Last, so the final kill/score lines play before the debrief.
  missionVictory: 6,
  missionDefeat: 6,
};

function occurrenceSortValue(o: DialogOccurrence): number {
  switch (o.type) {
    case "missionStart":
    case "missionVictory":
    case "missionDefeat":
      return 0;
    case "roundEnd":
    case "roundStart":
      return o.round;
    case "shipsDisabled":
    case "shipsDestroyed":
      return o.count;
    case "pointsScored":
      return o.points;
  }
}

function compareOccurrences(a: DialogOccurrence, b: DialogOccurrence): number {
  // Round end/start interleave by round (end 2, start 3, end 3, start 4)
  // when several rounds pass between two snapshots.
  const aRound = a.type === "roundEnd" || a.type === "roundStart";
  const bRound = b.type === "roundEnd" || b.type === "roundStart";
  if (aRound && bRound) {
    const aKey = occurrenceSortValue(a) + (a.type === "roundEnd" ? 0.5 : 0);
    const bKey = occurrenceSortValue(b) + (b.type === "roundEnd" ? 0.5 : 0);
    return aKey - bKey;
  }
  return (
    OCCURRENCE_ORDER[a.type] - OCCURRENCE_ORDER[b.type] ||
    occurrenceSortValue(a) - occurrenceSortValue(b) ||
    occurrenceKey(a).localeCompare(occurrenceKey(b))
  );
}

function range(fromInclusive: number, toInclusive: number): number[] {
  const out: number[] = [];
  for (let i = fromInclusive; i <= toInclusive; i++) out.push(i);
  return out;
}

function shipsDestroyedFor(s: DialogSnapshot, side: DialogSide): number {
  return side === "player" ? s.myShipsDestroyed : s.enemyShipsDestroyed;
}

function shipsDisabledFor(s: DialogSnapshot, side: DialogSide): number {
  return side === "player" ? s.myShipsDisabled : s.enemyShipsDisabled;
}

function scoreFor(s: DialogSnapshot, side: DialogSide): number {
  return side === "player" ? s.myScore : s.enemyScore;
}

/**
 * The occurrences of `trigger` between `prev` and `next`. `prev` is null at
 * the very start of a mission. Thresholds fire only when crossed, so a
 * trigger never fires twice for the same transition.
 */
export function triggerOccurrences(
  trigger: DialogTrigger,
  prev: DialogSnapshot | null,
  next: DialogSnapshot,
): DialogOccurrence[] {
  switch (trigger.type) {
    case "missionStart":
      return prev === null ? [{ type: "missionStart" }] : [];
    case "roundStart": {
      const rounds = prev === null ? [next.round] : range(prev.round + 1, next.round);
      return rounds
        .filter((r) => trigger.round == null || trigger.round === r)
        .map((round) => ({ type: "roundStart", round }));
    }
    case "roundEnd": {
      if (prev === null) return [];
      return range(prev.round, next.round - 1)
        .filter((r) => trigger.round == null || trigger.round === r)
        .map((round) => ({ type: "roundEnd", round }));
    }
    case "shipsDisabled":
    case "shipsDestroyed": {
      const countFor = trigger.type === "shipsDisabled" ? shipsDisabledFor : shipsDestroyedFor;
      const before = prev ? countFor(prev, trigger.side) : 0;
      const after = countFor(next, trigger.side);
      return before < trigger.count && trigger.count <= after
        ? [{ type: trigger.type, side: trigger.side, count: trigger.count }]
        : [];
    }
    case "missionVictory":
    case "missionDefeat": {
      const outcome = trigger.type === "missionVictory" ? "victory" : "defeat";
      return (prev?.outcome ?? null) !== outcome && next.outcome === outcome
        ? [{ type: trigger.type }]
        : [];
    }
    case "pointsScored": {
      const before = prev ? scoreFor(prev, trigger.side) : 0;
      const after = scoreFor(next, trigger.side);
      return before < trigger.points && trigger.points <= after
        ? [{ type: "pointsScored", side: trigger.side, points: trigger.points }]
        : [];
    }
  }
}

export function isSameMission(a: DialogMission, b: DialogMission): boolean {
  if (a.kind === "tutorial" || b.kind === "tutorial") return a.kind === b.kind;
  return a.kind === b.kind && a.nodeId === b.nodeId;
}

function genericAppliesTo(line: GenericDialogLine, mission: DialogMission): boolean {
  if (mission.kind === "tutorial") return false;
  return (line.missionKinds ?? ["campaign", "roguelike"]).includes(mission.kind);
}

/** FNV-1a: a stable pick for a seed, so a reload doesn't reshuffle lines. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

/** A line ready to show. `key` is unique per line per occurrence. */
export interface DialogQueueItem {
  key: string;
  /** The occurrence that fired it (occurrenceKey, e.g. "missionStart"); shared by a line and its replies. */
  event: string;
  characterId: string;
  text: string;
  /** Shown in place of a required line that hasn't been written. */
  isError?: boolean;
}

/**
 * Mission kinds where every mission must have its own entry (missionStart)
 * line. When one is missing an error shows in its place instead of a generic
 * line, the same way a node with no title shows an error (useNodeContent.ts).
 */
const ENTRY_LINE_REQUIRED_KINDS: readonly DialogMission["kind"][] = ["roguelike"];

function missingEntryLineText(mission: DialogMission): string {
  const where = mission.kind === "tutorial" ? "the tutorial" : `${mission.kind} node #${mission.nodeId}`;
  return `Error: ${where} has no entry dialog line`;
}

/**
 * A line followed by its replies, as queue items. Replies get keys derived
 * from the line's (`<key>~r1`, `<key>~r2`, ...) so they're tracked with it.
 */
function withResponses(
  key: string,
  event: string,
  characterId: string,
  text: string,
  responses: readonly DialogResponse[] | undefined,
): DialogQueueItem[] {
  return [
    { key, event, characterId, text },
    ...(responses ?? []).map((response, i) => ({
      key: `${key}~r${i + 1}`,
      event,
      characterId: response.characterId,
      text: response.text,
    })),
  ];
}

/**
 * Lines to show for what happened between `prev` and `next`, in event order.
 * For each occurrence, every matching mission line plays; if there are none,
 * one matching generic line plays with one of its variants (except a
 * required entry line, which shows an error instead). Keys already in
 * `firedKeys` are skipped.
 */
export function selectDialogLines({
  mission,
  gameId,
  prev,
  next,
  firedKeys,
  missionLines = MISSION_DIALOG_LINES,
  genericLines = GENERIC_DIALOG_LINES,
}: {
  mission: DialogMission;
  gameId: string;
  prev: DialogSnapshot | null;
  next: DialogSnapshot;
  firedKeys: ReadonlySet<string>;
  missionLines?: readonly MissionDialogLine[];
  genericLines?: readonly GenericDialogLine[];
}): DialogQueueItem[] {
  type Bucket = {
    occurrence: DialogOccurrence;
    missionLines: MissionDialogLine[];
    genericLines: GenericDialogLine[];
  };
  const buckets = new Map<string, Bucket>();
  const bucketFor = (occurrence: DialogOccurrence): Bucket => {
    const key = occurrenceKey(occurrence);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { occurrence, missionLines: [], genericLines: [] };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  for (const line of missionLines) {
    if (!isSameMission(line.mission, mission)) continue;
    for (const o of triggerOccurrences(line.trigger, prev, next)) {
      bucketFor(o).missionLines.push(line);
    }
  }
  for (const line of genericLines) {
    if (!genericAppliesTo(line, mission) || line.variants.length === 0) continue;
    for (const o of triggerOccurrences(line.trigger, prev, next)) {
      bucketFor(o).genericLines.push(line);
    }
  }

  const entryLineRequired = prev === null && ENTRY_LINE_REQUIRED_KINDS.includes(mission.kind);
  if (entryLineRequired) bucketFor({ type: "missionStart" });

  const items: DialogQueueItem[] = [];
  const ordered = [...buckets.values()].sort((a, b) =>
    compareOccurrences(a.occurrence, b.occurrence),
  );
  for (const bucket of ordered) {
    const occKey = occurrenceKey(bucket.occurrence);
    if (bucket.missionLines.length > 0) {
      for (const line of bucket.missionLines) {
        const key = `${line.id}@${occKey}`;
        if (firedKeys.has(key)) continue;
        items.push(...withResponses(key, occKey, line.characterId, line.text, line.responses));
      }
      continue;
    }
    if (entryLineRequired && bucket.occurrence.type === "missionStart") {
      const key = `missing-entry@${occKey}`;
      if (!firedKeys.has(key)) {
        items.push({
          key,
          event: occKey,
          characterId: "",
          text: missingEntryLineText(mission),
          isError: true,
        });
      }
      continue;
    }
    if (bucket.genericLines.length === 0) continue;
    const line = pick(bucket.genericLines, `${gameId}|${occKey}`);
    const key = `${line.id}@${occKey}`;
    if (firedKeys.has(key)) continue;
    const variant = pick(line.variants, `${gameId}|${line.id}|${occKey}`);
    const { text, responses } = typeof variant === "string" ? { text: variant, responses: undefined } : variant;
    items.push(...withResponses(key, occKey, line.characterId, text, responses));
  }
  return items;
}

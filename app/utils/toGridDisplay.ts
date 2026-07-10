import { Ship, ShipPosition, LastMove } from "../types/types";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { toShipVisual } from "./toShipVisual";
import type { GameplayShip } from "../hooks/useGameplayInteraction";
import type { Web2LastMove } from "../types/web2Game";

// Boundary adapters between web3's bigint-keyed data and the display-layer
// (`number`-keyed) shapes `GameGrid` and everything under it consume. See
// app/types/gridDisplay.ts for why this is safe. Web2 code never needs
// these — its native types already match `GridShip`/`GridShipPosition`.

export function toGridShip(ship: Ship): GridShip {
  return {
    ...toShipVisual(ship),
    id: Number(ship.id),
  };
}

export function toGridShipMap(shipMap: Map<bigint, Ship>): Map<number, GridShip> {
  const result = new Map<number, GridShip>();
  shipMap.forEach((ship, id) => {
    result.set(Number(id), toGridShip(ship));
  });
  return result;
}

export function toGridShipPosition(pos: ShipPosition): GridShipPosition {
  return {
    shipId: Number(pos.shipId),
    position: pos.position,
    isCreator: pos.isCreator,
    status: pos.status,
    isPreview: pos.isPreview,
  };
}

export function toGridShipPositionGrid(
  grid: (ShipPosition | null)[][],
): (GridShipPosition | null)[][] {
  return grid.map((row) => row.map((cell) => (cell ? toGridShipPosition(cell) : null)));
}

export function toGridShipPositions(
  positions: readonly ShipPosition[] | undefined,
): GridShipPosition[] | undefined {
  return positions?.map(toGridShipPosition);
}

export function toGridTargets(
  targets: readonly { shipId: bigint; position: { row: number; col: number } }[],
): { shipId: number; position: { row: number; col: number } }[] {
  return targets.map((t) => ({ shipId: Number(t.shipId), position: t.position }));
}

export function toGridIdSet(ids: Iterable<bigint>): Set<number> {
  const result = new Set<number>();
  for (const id of ids) result.add(Number(id));
  return result;
}

/** Bidirectional id conversion for callbacks GameGrid fires back up to its (bigint-typed) parent. */
export function displayIdToBigint(id: number | null): bigint | null {
  return id == null ? null : BigInt(id);
}

// Adapters for `useGameplayInteraction` (see app/hooks/useGameplayInteraction.ts),
// the shared `<GameGrid>` interaction-state hook. Unlike `GridShip`, this
// hook's internal logic needs ownership (`.owner`) — e.g. to tell friend
// from foe when targeting — so it takes a slightly richer, still `number`-id
// shape than `GridShip` (which deliberately has none).

export function toGameplayShip(ship: Ship): GameplayShip {
  return {
    id: Number(ship.id),
    owner: ship.owner,
    equipment: ship.equipment,
  };
}

export function toGameplayShipMap(shipMap: Map<bigint, Ship>): Map<number, GameplayShip> {
  const result = new Map<number, GameplayShip>();
  shipMap.forEach((ship, id) => {
    result.set(Number(id), toGameplayShip(ship));
  });
  return result;
}

export function toGridLastMove(lastMove: LastMove | null | undefined): Web2LastMove | null {
  if (!lastMove) return null;
  return {
    shipId: Number(lastMove.shipId),
    oldRow: lastMove.oldRow,
    oldCol: lastMove.oldCol,
    newRow: lastMove.newRow,
    newCol: lastMove.newCol,
    actionType: lastMove.actionType,
    targetShipId: Number(lastMove.targetShipId),
    timestamp: Number(lastMove.timestamp),
  };
}

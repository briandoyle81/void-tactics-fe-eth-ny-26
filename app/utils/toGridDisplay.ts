import { Ship, ShipPosition } from "../types/types";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { toShipVisual } from "./toShipVisual";

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

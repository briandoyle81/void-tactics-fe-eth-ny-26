import { ShipVisual } from "./shipVisual";

// Display-layer types for the interactive game grid (`GameGrid` and
// everything under it). The grid never submits a transaction itself — it
// only renders and fires selection/targeting callbacks up to its parent
// (`GameDisplay` for web3, a future web2 game view) — so it never needs
// bigint precision for ship/position ids, only a stable, comparable value
// to use as Map/Set keys and in `===` checks. Both modes' ids are always
// small sequential integers (contract counters / Prisma autoincrement), so
// `Number(id)` is a lossless, one-way-safe conversion in both directions.
//
// This lets `GameGrid` be genuinely shared: web3's `GameDisplay` adapts its
// `bigint`-keyed state to these shapes at the boundary (see
// `toGridShip`/`toGridShipPosition` in `utils/toShipVisual.ts`) and converts
// callback values back to `bigint` before touching its own state (which
// still needs `bigint` for actual contract calls). Web2's game view needs no
// adapter — its native types already match this shape field-for-field.

export interface GridShipPosition {
  shipId: number;
  position: { row: number; col: number };
  isCreator: boolean;
  status?: 0 | 1 | 2;
  isPreview?: boolean;
}

export interface GridShip extends ShipVisual {
  id: number;
}

export interface GridTargetRef {
  shipId: number;
  position: { row: number; col: number };
}

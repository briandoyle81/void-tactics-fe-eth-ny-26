// Minimal structural shape needed to render a ship's appearance and derived
// rank/tier — equipment, traits, and a handful of shipData flags. No ids, no
// ownership, nothing bigint/address-shaped. Both the web3 `Ship` (bigint ids)
// and web2 `Web2Ship` (number ids) types are structurally compatible with
// this shape for their equipment/traits/shipData fields, so the pure
// rendering layer (`utils/shipRenderer/*`, `utils/shipLevel.ts`) can be
// shared between modes without either mode's identity data ever crossing
// into the other. Rendering call sites that hold a web3 `Ship` (whose
// `shipData.timestampDestroyed` is a `bigint`) must adapt it to this shape
// first — see `toShipVisual` in `useShipRenderer.ts`.

export interface ShipVisualEquipment {
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
}

export interface ShipVisualColors {
  h1: number;
  s1: number;
  l1: number;
  h2: number;
  s2: number;
  l2: number;
}

export interface ShipVisualTraits {
  colors: ShipVisualColors;
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
}

export interface ShipVisualData {
  shipsDestroyed: number;
  shiny: boolean;
  constructed: boolean;
  /** ms epoch; 0 means "not destroyed". */
  timestampDestroyed: number;
}

export interface ShipVisual {
  equipment: ShipVisualEquipment;
  traits: ShipVisualTraits;
  shipData: ShipVisualData;
}

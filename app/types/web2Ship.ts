// Web2-mode ship types. These are intentionally parallel to (and never
// share a definition with) the web3 `Ship`/`ShipData`/`ShipTraits` types in
// `./types.ts`, which model on-chain data (`bigint` ids, `0x${string}`
// addresses). Web2 ships are Prisma-backed rows keyed by plain integer ids
// and owned by a NextAuth user id (a Google OAuth sub, not an address) — the
// two systems are parallel and never interoperate, so there is no shared
// interface to reconcile here.

export interface Web2Ship {
  name: string;
  id: number;
  equipment: Web2ShipEquipment;
  traits: Web2ShipTraits;
  shipData: Web2ShipData;
  owner: string;
}

export interface Web2ShipEquipment {
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
}

export interface Web2ShipTraits {
  serialNumber: number;
  colors: Web2ShipColors;
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
}

export interface Web2ShipColors {
  h1: number;
  s1: number;
  l1: number;
  h2: number;
  s2: number;
  l2: number;
}

export interface Web2ShipData {
  shipsDestroyed: number;
  costsVersion: number;
  cost: number;
  shiny: boolean;
  constructed: boolean;
  inFleet: boolean;
  timestampDestroyed: number;
  modifiedCount: number;
  isFree: boolean;
}

// Number/string-native ship-display shape for the shared `ShipCard.tsx`.
// Both web3 (`Ship`, bigint) and web2 (`Web2Ship`, number) adapt into this
// at their own boundary — see `app/utils/toShipCardData.ts` (web3) and
// `app/utils/toShipCardDataWeb2.ts` (web2). No bigint/address ever appears
// here; see the number-native-shared-components rule.
export interface ShipCardData {
  id: string;
  name: string;
  isShiny: boolean;
  isConstructed: boolean;
  isDestroyed: boolean;
  /** Seconds since epoch; 0 means "not destroyed". Fed to formatDestroyedDate. */
  timestampDestroyedSeconds: number;
  inFleet: boolean;
  cost: number;
  equipment: {
    mainWeapon: number;
    armor: number;
    shields: number;
    special: number;
  };
  traits: {
    variant: number;
    accuracy: number;
    hull: number;
    speed: number;
  };
  rank: number;
  rankShipsDestroyed: number;
  rankNextRank: number | null;
  rankKillsToNextRank: number | null;
}

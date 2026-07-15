import { getPreviewDisplayRanks } from "./shipPurchaseTierDisplay";

// Shared between ShipPurchaseInterface.tsx (web3) and
// ShipPurchaseInterfaceWeb2.tsx (web2) — the synthetic preview-ship
// generation used to render tier-card art before a real purchase. Pure,
// number-native, no id-type/backend dependency, so this is a single shared
// module; each caller converts a spec into its own `Ship`/`Web2Ship` shape
// (bigint vs number ids) at the boundary. `shipsDestroyedForRank` is
// deliberately NOT shared — web3 and web2 use different kill-count tables
// for the same rank, which is a content choice, not incidental duplication.
export const PREVIEW_SHIP_ID_OFFSET = 900000;

export interface ShipPreviewSpec {
  seed: number;
  shipsDestroyed: number;
  equipment: { mainWeapon: number; armor: number; shields: number; special: number };
  colors: { h1: number; s1: number; l1: number; h2: number; s2: number; l2: number };
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
  shiny: boolean;
}

export function buildShipPreviewSpec(seed: number, shipsDestroyed: number): ShipPreviewSpec {
  return {
    seed,
    shipsDestroyed,
    equipment: {
      mainWeapon: seed % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: (seed + 1) % 4,
    },
    colors: {
      h1: (seed * 47) % 360,
      s1: 70,
      l1: 52,
      h2: (seed * 47 + 68) % 360,
      s2: 62,
      l2: 46,
    },
    variant: 1,
    accuracy: seed % 3,
    hull: (seed + 1) % 3,
    speed: (seed + 2) % 3,
    shiny: seed % 7 === 0,
  };
}

export function getPreviewShipSpecsForTier(
  previewSeed: number,
  tier: number,
  shipCount: number,
  shipsDestroyedForRank: (rank: number) => number,
): ShipPreviewSpec[] {
  const base = previewSeed + tier * 20 + 1;
  const ranksToShow = getPreviewDisplayRanks(tier, shipCount);
  return ranksToShow.map((rank, idx) => buildShipPreviewSpec(base + idx, shipsDestroyedForRank(rank)));
}

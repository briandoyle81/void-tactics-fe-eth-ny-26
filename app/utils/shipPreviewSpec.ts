import { getPreviewDisplayRanks } from "./shipPurchaseTierDisplay";
import { validSpecialsForVariant } from "../types/types";

// Shared between ShipPurchaseInterface.tsx (web3) and
// ShipPurchaseInterfaceWeb2.tsx (web2) — the synthetic preview-ship
// generation used to render tier-card art before a real purchase. Pure,
// number-native, no id-type/backend dependency, so this is a single shared
// module; each caller converts a spec into its own `Ship`/`Web2Ship` shape
// (bigint vs number ids) at the boundary. `shipsDestroyedForRank` is
// deliberately NOT shared — web3 and web2 use different kill-count tables
// for the same rank, which is a content choice, not incidental duplication.
export const PREVIEW_SHIP_ID_OFFSET = 900000;

// Deterministic, well-distributed integer hash. Needed because each tier's
// preview seeds are strided by a fixed amount (see getPreviewShipSpecsForTier),
// and a raw `seed % 4` aliases to the same value on every tier's primary ship
// whenever that stride is a multiple of 4 — which froze `mainWeapon` and
// `special` (both mod-4 lookups) to one value across all tiers. Hashing first
// breaks that aliasing; `salt` gives each property an independent stream so
// they randomize separately from one another.
function hashInt(seed: number, salt: number): number {
  let h = (Math.trunc(seed) ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

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

export function buildShipPreviewSpec(
  seed: number,
  shipsDestroyed: number,
  variant: number = 1,
): ShipPreviewSpec {
  // Special values are per-variant: pick deterministically from the set valid
  // for this ship's variant (same source generateRandomShip/generateShip use),
  // so a variant-2 preview never renders a special its faction can't equip.
  const validSpecials = validSpecialsForVariant(variant);
  return {
    seed,
    shipsDestroyed,
    equipment: {
      // Hashed (not raw `seed % 4`) so weapon/special don't alias to the same
      // value on every tier's primary ship — see hashInt above.
      mainWeapon: hashInt(seed, 1) % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: validSpecials[hashInt(seed, 2) % validSpecials.length]!,
    },
    colors: {
      h1: (seed * 47) % 360,
      s1: 70,
      l1: 52,
      h2: (seed * 47 + 68) % 360,
      s2: 62,
      l2: 46,
    },
    variant,
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
  variant: number = 1,
): ShipPreviewSpec[] {
  const base = previewSeed + tier * 20 + 1;
  const ranksToShow = getPreviewDisplayRanks(tier, shipCount);
  return ranksToShow.map((rank, idx) =>
    buildShipPreviewSpec(base + idx, shipsDestroyedForRank(rank), variant),
  );
}

import { Ship, validSpecialsForVariant } from "../types/types";

// Random ship names for decorative/demo ship displays (no on-chain identity
// backs these — see callers for how they're used).
const SHIP_NAMES = [
  "Vanguard", "Nexus", "Aurora", "Stellar", "Quantum", "Nebula", "Eclipse",
  "Horizon", "Vortex", "Titan", "Phoenix", "Apex", "Nova", "Catalyst",
  "Odyssey", "Spectre", "Raven", "Falcon", "Viper", "Cobra", "Thunder",
  "Storm", "Tempest", "Blade", "Saber", "Reaper", "Wraith", "Phantom",
  "Shadow", "Ghost", "Hunter", "Predator", "Scorpion", "Vulture", "Hawk",
  "Eagle", "Dragon", "Wyvern", "Leviathan", "Kraken", "Behemoth", "Colossus",
  "Goliath", "Atlas", "Hercules", "Zeus", "Ares", "Apollo", "Artemis",
  "Athena",
];

/**
 * Generate a random, fully-formed decorative Ship — no backend/on-chain data
 * required. `name` is variant-1-style (mock real-world-style name); a
 * variant-2 ship's real DroneNames-generated name must be patched in
 * separately by the caller if desired (that generation lives on-chain — see
 * HeroShipShowcase.tsx for the pattern). Uses Math.random(), so callers that
 * render during SSR must only call this client-side, after mount, to avoid a
 * hydration mismatch.
 */
export function generateRandomShip(index: number, variant: number): Ship {
  const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];

  // Every 5th ship gets rank 3-5
  let shipsDestroyed = Math.floor(Math.random() * 10); // Default rank 1
  if (index % 5 === 0) {
    const rank = Math.floor(Math.random() * 3) + 3; // Rank 3, 4, or 5
    if (rank === 3) {
      shipsDestroyed = Math.floor(Math.random() * 70) + 30; // 30-99
    } else if (rank === 4) {
      shipsDestroyed = Math.floor(Math.random() * 200) + 100; // 100-299
    } else {
      shipsDestroyed = Math.floor(Math.random() * 700) + 300; // 300-999
    }
  }

  // Random equipment
  const mainWeapon = Math.floor(Math.random() * 4);
  const armor = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
  const shields =
    armor === 0
      ? Math.random() > 0.5
        ? Math.floor(Math.random() * 3) + 1
        : 0
      : 0;
  // Variant 2 ("Drone" faction) ships use a disjoint Special value set
  // (Slot 4/5/6 instead of Slot 1/2/3) — picking from a flat 0-3 range here
  // produced invalid values for variant-2 ships. Must pick from the values
  // actually valid for this ship's variant instead.
  const validSpecials = validSpecialsForVariant(variant);
  const special = validSpecials[Math.floor(Math.random() * validSpecials.length)];

  // Random traits
  const accuracy = Math.floor(Math.random() * 3);
  const hull = Math.floor(Math.random() * 3);
  const speed = Math.floor(Math.random() * 3);

  // Random colors
  const h1 = Math.floor(Math.random() * 360);
  const s1 = Math.floor(Math.random() * 100);
  const l1 = Math.floor(Math.random() * 100);
  const h2 = Math.floor(Math.random() * 360);
  const s2 = Math.floor(Math.random() * 100);
  const l2 = Math.floor(Math.random() * 100);

  // 20% chance of being shiny
  const shiny = Math.random() < 0.2;

  return {
    name,
    id: BigInt(index),
    equipment: {
      mainWeapon,
      armor,
      shields,
      special,
    },
    traits: {
      serialNumber: BigInt(index),
      colors: {
        h1,
        s1,
        l1,
        h2,
        s2,
        l2,
      },
      variant,
      accuracy,
      hull,
      speed,
    },
    shipData: {
      shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: BigInt(0),
    },
    owner: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };
}

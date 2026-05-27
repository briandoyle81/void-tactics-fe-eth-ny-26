import { Ship, ShipColors, ShipData, ShipEquipment } from "../types/types";
import {
  buildTutorialShip,
  type TutorialCombatTraits,
} from "../utils/tutorialShipBuilder";

// Tutorial player address (simulated)
export const TUTORIAL_PLAYER_ADDRESS =
  "0x1111111111111111111111111111111111111111";
export const TUTORIAL_OPPONENT_ADDRESS =
  "0x2222222222222222222222222222222222222222";

// Helper to create ship colors (NFT / renderer only; not ShipAttributes traits)
function createColors(
  h1: number,
  s1: number,
  l1: number,
  h2: number,
  s2: number,
  l2: number,
): ShipColors {
  return { h1, s1, l1, h2, s2, l2 };
}

// Helper to create ship data (shipsDestroyed drives rank like onchain)
function createShipData(
  cost: number,
  inFleet: boolean = true,
  shipsDestroyed: number = 0,
): ShipData {
  return {
    shipsDestroyed,
    costsVersion: 1,
    cost,
    shiny: false,
    constructed: true,
    inFleet,
    timestampDestroyed: 0,
    modifiedCount: 0,
    isFree: false,
  };
}

/**
 * Tutorial ships: **equipment** and **traits** (`accuracy`, `hull`, `speed` each
 * 0–2, contract enum indices) are canonical. Combat stats come only from
 * `calculateAttributesFromContracts(ship)` (same rules as
 * `ShipAttributes.calculateShipAttributes`).
 *
 * Equipment rule (matches contracts / ShipConstructor): armor and shields are
 * mutually exclusive; at most one of armor or shields may be non-zero.
 */
const TUTORIAL_SHIP_DATA_STANDARD = createShipData(0, true, 0);
const RESOLUTE_SHIP_DATA: ShipData = {
  ...createShipData(0, true, 10),
  shiny: true,
};

const RESOLUTE_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 0,
  shields: 2,
  special: 1,
};
const RESOLUTE_TRAITS: TutorialCombatTraits = {
  accuracy: 2,
  hull: 2,
  speed: 2,
};

const VIGILANT_EQUIPMENT: ShipEquipment = {
  mainWeapon: 1,
  armor: 0,
  shields: 1,
  special: 2,
};
const VIGILANT_TRAITS: TutorialCombatTraits = {
  accuracy: 1,
  hull: 0,
  speed: 0,
};

const SENTINEL_EQUIPMENT: ShipEquipment = {
  mainWeapon: 0,
  armor: 2,
  shields: 0,
  special: 0,
};
const SENTINEL_TRAITS: TutorialCombatTraits = {
  accuracy: 1,
  hull: 0,
  speed: 0,
};

const HAMMER_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 0,
  shields: 1,
  special: 0,
};
const HAMMER_TRAITS: TutorialCombatTraits = {
  accuracy: 1,
  hull: 1,
  speed: 1,
};

const ANVIL_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 2,
  shields: 0,
  special: 0,
};
const ANVIL_TRAITS: TutorialCombatTraits = {
  accuracy: 1,
  hull: 2,
  speed: 0,
};

const TONGS_EQUIPMENT: ShipEquipment = {
  mainWeapon: 1,
  armor: 0,
  shields: 2,
  special: 0,
};
const TONGS_TRAITS: TutorialCombatTraits = {
  accuracy: 2,
  hull: 2,
  speed: 2,
};

// Player ships for tutorial
export const TUTORIAL_PLAYER_SHIPS: Ship[] = [
  buildTutorialShip({
    name: "Resolute",
    id: 1001,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: RESOLUTE_EQUIPMENT,
    shipData: RESOLUTE_SHIP_DATA,
    traits: RESOLUTE_TRAITS,
    visual: {
      serialNumber: 1001,
      colors: createColors(200, 80, 50, 220, 70, 40),
      variant: 1,
    },
  }),
  buildTutorialShip({
    name: "Vigilant",
    id: 1002,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: VIGILANT_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    traits: VIGILANT_TRAITS,
    visual: {
      serialNumber: 1002,
      colors: createColors(250, 90, 60, 270, 80, 50),
      variant: 1,
    },
  }),
  buildTutorialShip({
    name: "Sentinel",
    id: 1003,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: SENTINEL_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    traits: SENTINEL_TRAITS,
    visual: {
      serialNumber: 1003,
      colors: createColors(150, 70, 55, 170, 60, 45),
      variant: 1,
    },
  }),
];

// Opponent ships for tutorial
export const TUTORIAL_OPPONENT_SHIPS: Ship[] = [
  buildTutorialShip({
    name: "Hammer",
    id: 2001,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: HAMMER_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    traits: HAMMER_TRAITS,
    visual: {
      serialNumber: 2001,
      colors: createColors(0, 80, 40, 20, 70, 30),
      variant: 1,
    },
  }),
  buildTutorialShip({
    name: "Anvil",
    id: 2002,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: ANVIL_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    traits: ANVIL_TRAITS,
    visual: {
      serialNumber: 2002,
      colors: createColors(10, 70, 35, 30, 60, 25),
      variant: 1,
    },
  }),
  buildTutorialShip({
    name: "Tongs",
    id: 2003,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: TONGS_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    traits: TONGS_TRAITS,
    visual: {
      serialNumber: 2003,
      colors: createColors(5, 75, 38, 25, 65, 28),
      variant: 1,
    },
  }),
];

// All tutorial ships combined
export const ALL_TUTORIAL_SHIPS = [
  ...TUTORIAL_PLAYER_SHIPS,
  ...TUTORIAL_OPPONENT_SHIPS,
];

import { prisma } from "./prisma";
import { calcShipCost, DEFAULT_COSTS } from "./shipCosts";
import { AI_USER_ID } from "./aiUser";
import type { ShipEquipment, ShipTraits } from "../types/types";

interface ArchetypeTemplate {
  name: string;
  equipment: ShipEquipment;
  traits: { accuracy: number; hull: number; speed: number };
  priority: number; // lower = added first
}

// Covers the five tactical roles from AI_OPPONENT_DESIGN.md.
// Costs range from 105–130 each. Priority 0 (EMP Hawk) is always attempted first.
const ARCHETYPES: ArchetypeTemplate[] = [
  {
    name: "EMP Hawk",
    // laser(0), light shields, EMP special — fast mobile EMP platform
    equipment: { mainWeapon: 0, armor: 0, shields: 1, special: 1 },
    traits: { accuracy: 1, hull: 0, speed: 1 },
    priority: 0,
  },
  {
    name: "Rail Sniper",
    // railgun(1), no defense — max range 9 with accuracy=2
    equipment: { mainWeapon: 1, armor: 0, shields: 0, special: 0 },
    traits: { accuracy: 2, hull: 0, speed: 1 },
    priority: 1,
  },
  {
    name: "Missile Boat",
    // missile(2), light armor — mid-range high damage
    equipment: { mainWeapon: 2, armor: 1, shields: 0, special: 0 },
    traits: { accuracy: 1, hull: 0, speed: 0 },
    priority: 2,
  },
  {
    name: "Plasma Brawler",
    // plasma(3), heavy armor — short-range, heavy DR, high HP
    equipment: { mainWeapon: 3, armor: 3, shields: 0, special: 0 },
    traits: { accuracy: 0, hull: 2, speed: 0 },
    priority: 3,
  },
  {
    name: "Shield Tank",
    // laser(0), heavy shields — defensive capture holder, DR=45
    equipment: { mainWeapon: 0, armor: 0, shields: 3, special: 0 },
    traits: { accuracy: 0, hull: 2, speed: 0 },
    priority: 4,
  },
  {
    name: "Repair Frigate",
    // laser(0), medium shields, Repair — sustain support
    equipment: { mainWeapon: 0, armor: 0, shields: 2, special: 2 },
    traits: { accuracy: 0, hull: 0, speed: 1 },
    priority: 5,
  },
];

// Dark gunmetal + amber — visually distinct from player ships.
const AI_COLORS = { h1: 220, s1: 10, l1: 20, h2: 35, s2: 70, l2: 50 };

function buildTraits(template: ArchetypeTemplate, index: number): ShipTraits {
  return {
    serialNumber: 10_000_000 + index * 997 + (Date.now() % 10_000),
    colors: AI_COLORS,
    variant: index % 3,
    accuracy: template.traits.accuracy,
    hull: template.traits.hull,
    speed: template.traits.speed,
  };
}

/**
 * Selects archetypes that fit within `costLimit` (0 = unlimited),
 * creates Ship records owned by the AI user, and creates a Fleet record.
 * Returns the list of created ship IDs.
 */
export async function generateAiFleet(
  lobbyId: number,
  costLimit: number,
): Promise<number[]> {
  const budget = costLimit > 0 ? costLimit : Infinity;
  const sorted = [...ARCHETYPES].sort((a, b) => a.priority - b.priority);

  const selected: Array<{ template: ArchetypeTemplate; traits: ShipTraits; cost: number }> = [];
  let spent = 0;
  let hasRepair = false;

  for (const template of sorted) {
    if (selected.length >= 5) break;

    // Avoid redundant repair ships
    if (template.equipment.special === 2 && hasRepair) continue;

    const traits = buildTraits(template, selected.length);
    const cost = calcShipCost(template.equipment, traits, DEFAULT_COSTS);

    if (spent + cost > budget) continue;

    selected.push({ template, traits, cost });
    spent += cost;
    if (template.equipment.special === 2) hasRepair = true;
  }

  if (selected.length === 0) return [];

  const shipIds: number[] = [];
  for (const { template, traits, cost } of selected) {
    const ship = await prisma.ship.create({
      data: {
        ownerId: AI_USER_ID,
        name: template.name,
        equipment: template.equipment as object,
        traits: traits as object,
        cost,
        costsVersion: DEFAULT_COSTS.version,
        constructed: true,
        inFleet: true,
      },
    });
    shipIds.push(ship.id);
  }

  const totalCost = spent === Infinity ? 0 : spent;
  await prisma.fleet.create({
    data: {
      ownerId: AI_USER_ID,
      lobbyId,
      shipIds,
      totalCost,
      isComplete: true,
    },
  });

  return shipIds;
}

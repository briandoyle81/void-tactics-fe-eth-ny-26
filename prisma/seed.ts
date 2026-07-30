import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

// Matches prisma.config.ts's loading order: .env.local first (wins, dotenv
// doesn't overwrite an already-set key), falling back to .env.
dotenv.config({ path: [".env.local", ".env"] });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const blockedTilesRaw: boolean[][] = [
  [false,true,true,true,false,false,false,false,false,false,false,false,false,true,true,true,true],
  [false,true,true,false,false,false,false,false,false,false,false,false,false,true,true,true,true],
  [false,true,true,false,false,false,false,false,false,false,false,false,false,true,true,true,false],
  [false,false,true,false,false,false,false,false,true,true,false,true,true,true,false,false,false],
  [false,false,true,false,false,false,false,false,false,true,false,false,false,false,false,false,false],
  [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],
  [false,false,false,false,false,false,false,true,false,false,false,false,false,false,true,false,false],
  [false,false,false,true,true,true,false,true,true,false,false,false,false,false,true,false,false],
  [false,true,true,true,false,false,false,false,false,false,false,false,false,false,true,true,false],
  [true,true,true,true,false,false,false,false,false,false,false,false,false,false,true,true,false],
  [true,true,true,true,false,false,false,false,false,false,false,false,false,true,true,true,false],
];

const scoringTilesRaw: number[][] = [
  [0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0],
  [0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0],
  [0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,0,0],
];

const blockedTiles = blockedTilesRaw.flatMap((row, r) =>
  row.flatMap((blocked, c) => (blocked ? [{ row: r, col: c }] : [])),
);

const scoringTiles = scoringTilesRaw.flatMap((row, r) =>
  row.flatMap((points, c) =>
    points > 0 ? [{ row: r, col: c, points, onlyOnce: false }] : [],
  ),
);

// Visually distinct from player ships (dark gunmetal + amber) — cosmetic
// only, no gameplay effect.
const AI_SHIP_COLORS = { h1: 220, s1: 10, l1: 20, h2: 35, s2: 70, l2: 50 };

// Mirrors the web3 AIEncounters seed deployment script exactly (same
// equipment/traits/archetype per ship, same map-1 placements) so web2 and
// web3 single-player start with an identical default fleet.
const AI_SHIP_CONFIGS = [
  {
    name: "AI Grunt",
    equipment: { mainWeapon: 0, armor: 0, shields: 0, special: 0 }, // Laser, unarmored
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 0, hull: 0, speed: 0 },
    archetype: 0, // Grunt
  },
  {
    name: "AI Aggressor",
    equipment: { mainWeapon: 2, armor: 1, shields: 0, special: 0 }, // Missile, light armor
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 0, hull: 1, speed: 1 },
    archetype: 1, // Aggressor
  },
  {
    name: "AI Sniper",
    equipment: { mainWeapon: 1, armor: 0, shields: 0, special: 0 }, // Railgun (longest range)
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 1, hull: 0, speed: 0 },
    archetype: 2, // Sniper
  },
  {
    name: "AI Support",
    equipment: { mainWeapon: 0, armor: 0, shields: 1, special: 2 }, // Laser, light shields, RepairDrones
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 0, hull: 0, speed: 0 },
    archetype: 3, // Support
  },
  {
    name: "AI Turtle",
    equipment: { mainWeapon: 0, armor: 1, shields: 0, special: 0 }, // Laser, light armor
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 0, hull: 1, speed: 0 },
    archetype: 4, // Turtle
  },
  {
    name: "AI Rammer",
    equipment: { mainWeapon: 3, armor: 3, shields: 0, special: 0 }, // Plasma, heavy armor
    // variant: 1 only matters on web3 (RamResolver gates Ram to faction 1) — no
    // web2 equivalent gate, but kept consistent for parity's sake.
    traits: { serialNumber: 0, colors: AI_SHIP_COLORS, variant: 1, accuracy: 0, hull: 1, speed: 1 },
    archetype: 5, // Rammer
  },
];

// Row-major placement across the joiner's allowed columns (13-16), matching
// AIEncounters' starter-map placement layout exactly.
const AI_STARTER_PLACEMENTS = [
  { row: 0, col: 13 },
  { row: 0, col: 14 },
  { row: 0, col: 15 },
  { row: 0, col: 16 },
  { row: 1, col: 13 },
  { row: 1, col: 14 },
];

async function seedAIEncounters() {
  const existing = await prisma.aIShipConfig.count();
  if (existing > 0) {
    console.log("AI ship configs already seeded, skipping");
    return;
  }

  const configs = await Promise.all(
    AI_SHIP_CONFIGS.map((c) =>
      prisma.aIShipConfig.create({
        data: { name: c.name, equipment: c.equipment, traits: c.traits, archetype: c.archetype },
      }),
    ),
  );

  await Promise.all(
    AI_STARTER_PLACEMENTS.map((pos, i) =>
      prisma.aIMapPlacement.create({
        data: { mapId: 1, row: pos.row, col: pos.col, configId: configs[i].id },
      }),
    ),
  );
  console.log(`Seeded ${configs.length} AI ship configs + placements on map id=1`);
}

async function main() {
  await prisma.map.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "New Map",
      gridWidth: 17,
      gridHeight: 11,
      blockedTiles,
      scoringTiles,
    },
  });
  console.log("Seeded map id=1");

  await seedAIEncounters();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

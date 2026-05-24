import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

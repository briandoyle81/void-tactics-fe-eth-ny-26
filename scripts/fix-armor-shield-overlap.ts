/**
 * Fix ships that have both armor > 0 and shields > 0.
 * Rule: keep whichever is higher; keep armor on a tie; zero the other.
 * Also recalculates cost since equipment changed.
 *
 * Usage:
 *   npx tsx scripts/fix-armor-shield-overlap.ts          # dry run (no writes)
 *   npx tsx scripts/fix-armor-shield-overlap.ts --apply  # write to DB
 */

import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

import { DEFAULT_COSTS, calcShipCost, type CostsConfig } from "../app/lib/shipCosts";
import type { ShipEquipment, ShipTraits } from "../app/types/types";

const DRY_RUN = !process.argv.includes("--apply");

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no changes will be written.\n" : "APPLYING CHANGES.\n");

  const configRow = await prisma.config.findUnique({ where: { key: "ship_costs" } });
  const costs: CostsConfig = configRow ? (configRow.value as CostsConfig) : DEFAULT_COSTS;

  const ships = await prisma.ship.findMany({
    select: { id: true, equipment: true, traits: true, cost: true },
  });

  const affected = ships.filter((s) => {
    const eq = s.equipment as unknown as ShipEquipment;
    return eq.armor > 0 && eq.shields > 0;
  });

  console.log(`Total ships:    ${ships.length}`);
  console.log(`Affected ships: ${affected.length}\n`);

  if (affected.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  const updates = affected.map((s) => {
    const eq = s.equipment as unknown as ShipEquipment;
    const keepArmor = eq.armor >= eq.shields; // armor wins ties
    const newEquipment: ShipEquipment = {
      ...eq,
      armor:   keepArmor ? eq.armor   : 0,
      shields: keepArmor ? 0          : eq.shields,
    };
    const newCost = calcShipCost(newEquipment, s.traits as ShipTraits, costs);
    return { id: s.id, oldEq: eq, newEquipment, oldCost: s.cost, newCost };
  });

  for (const u of updates) {
    const kept    = u.newEquipment.armor > 0 ? `armor=${u.newEquipment.armor}` : `shields=${u.newEquipment.shields}`;
    const dropped = u.oldEq.armor >= u.oldEq.shields ? "shields" : "armor";
    console.log(
      `Ship ${u.id}: armor=${u.oldEq.armor} shields=${u.oldEq.shields}` +
      ` → keep ${kept}, drop ${dropped}` +
      ` (cost ${u.oldCost} → ${u.newCost})`,
    );
  }

  if (DRY_RUN) {
    console.log("\nRe-run with --apply to commit these changes.");
    return;
  }

  const BATCH = 500;
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      chunk.map((u) =>
        prisma.ship.update({
          where: { id: u.id },
          data: { equipment: u.newEquipment as object, cost: u.newCost },
        }),
      ),
    );
    updated += chunk.length;
    console.log(`Updated ${updated}/${updates.length}…`);
  }

  console.log(`\nDone. ${updated} ships fixed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { getCurrentCosts, invalidateCurrentCosts } from "@/app/lib/getCurrentCosts";
import { DEFAULT_COSTS, type CostsConfig } from "@/app/lib/shipCosts";

// GET/PUT /api/admin/ship-costs — admin-only read/write of the ship_costs
// Config row (see getCurrentCosts.ts). Web2-mode counterpart to web3's
// ShipAttributes admin panel's Costs section (useCosts / setCosts-style
// contract calls), gated on WEB2_ADMIN_EMAILS instead of contract ownership.
//
// Ported from explore-traditional's admin/ship-costs (which predates the
// web3/web2 merge): GET also reports how many ships are stale relative to
// the live version (cheap `count()` queries, not a full ship load), and PUT
// assigns the new version server-side rather than trusting a client-supplied
// one, so a client bug can never desync/collide the version counter.
export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const costs = await getCurrentCosts();
  const [total, staleCount] = await Promise.all([
    prisma.ship.count(),
    prisma.ship.count({ where: { costsVersion: { lt: costs.version } } }),
  ]);

  return NextResponse.json({ costs, stats: { total, staleCount } });
}

type CostsInput = Omit<CostsConfig, "version">;

function isValidCostsInput(value: unknown): value is CostsInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const arrayFields = [
    "accuracy",
    "hull",
    "speed",
    "mainWeapon",
    "armor",
    "shields",
    "special",
  ];
  return (
    typeof v.baseCost === "number" &&
    arrayFields.every(
      (f) => Array.isArray(v[f]) && (v[f] as unknown[]).every((n) => typeof n === "number"),
    )
  );
}

export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  if (!isValidCostsInput(body)) {
    return NextResponse.json({ error: "Invalid costs config" }, { status: 400 });
  }

  // Server assigns the version — any `version` field in the request body is
  // ignored, so a stale/buggy client can never send a version that collides
  // with or skips backward from what's actually stored. Reads the row
  // directly (not the cached getCurrentCosts()) since version accuracy here
  // matters more than avoiding one extra query on an admin-only write path.
  const existing = await prisma.config.findUnique({ where: { key: "ship_costs" } });
  const prevVersion = existing ? (existing.value as CostsConfig).version : DEFAULT_COSTS.version;
  const newCosts: CostsConfig = { ...body, version: prevVersion + 1 };

  await prisma.config.upsert({
    where: { key: "ship_costs" },
    create: { key: "ship_costs", value: newCosts as unknown as object },
    update: { value: newCosts as unknown as object },
  });
  invalidateCurrentCosts();

  return NextResponse.json({ costs: newCosts });
}

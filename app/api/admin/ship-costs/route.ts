import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DEFAULT_COSTS, type CostsConfig } from "@/app/lib/shipCosts";
import { MAP_ADMIN_EMAILS } from "@/app/config/alpha";

const CONFIG_KEY = "ship_costs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !MAP_ADMIN_EMAILS.includes(email)) return null;
  return email;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.config.findUnique({ where: { key: CONFIG_KEY } });
  const costs: CostsConfig = row ? (row.value as CostsConfig) : DEFAULT_COSTS;

  const [total, staleCount] = await Promise.all([
    prisma.ship.count(),
    prisma.ship.count({ where: { costsVersion: { lt: costs.version } } }),
  ]);

  return NextResponse.json({ costs, stats: { total, staleCount } });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { costs: CostsConfig };
  const { costs } = body;

  // Basic validation — lengths must match DEFAULT_COSTS exactly
  const EXPECTED_LENGTHS: Record<string, number> = {
    accuracy: DEFAULT_COSTS.accuracy.length,
    hull: DEFAULT_COSTS.hull.length,
    speed: DEFAULT_COSTS.speed.length,
    mainWeapon: DEFAULT_COSTS.mainWeapon.length,
    armor: DEFAULT_COSTS.armor.length,
    shields: DEFAULT_COSTS.shields.length,
    special: DEFAULT_COSTS.special.length,
  };
  const arrays = ["accuracy", "hull", "speed", "mainWeapon", "armor", "shields", "special"] as const;
  for (const key of arrays) {
    if (!Array.isArray(costs[key]) || costs[key].length !== EXPECTED_LENGTHS[key] || costs[key].some((v) => typeof v !== "number" || v < 0)) {
      return NextResponse.json({ error: `Invalid ${key}: must be an array of ${EXPECTED_LENGTHS[key]} non-negative numbers` }, { status: 400 });
    }
  }
  if (typeof costs.baseCost !== "number" || costs.baseCost < 0) {
    return NextResponse.json({ error: "Invalid baseCost" }, { status: 400 });
  }

  // Fetch existing to get current version, then increment
  const existing = await prisma.config.findUnique({ where: { key: CONFIG_KEY } });
  const prevVersion: number = existing ? (existing.value as CostsConfig).version : DEFAULT_COSTS.version;
  const newCosts: CostsConfig = { ...costs, version: prevVersion + 1 };

  // Persist new costs config
  await prisma.config.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: newCosts as object },
    update: { value: newCosts as object },
  });

  return NextResponse.json({ costs: newCosts });
}

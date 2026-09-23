import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { getCurrentCosts, invalidateCurrentCosts, costsConfigKeyForVariant } from "@/app/lib/getCurrentCosts";
import { defaultCostsForVariant, type CostsConfig } from "@/app/lib/shipCosts";

// GET/PUT /api/admin/ship-costs?variant=1|2 — admin-only read/write of the
// per-variant ship_costs Config row (see getCurrentCosts.ts). Web2-mode
// counterpart to web3's ShipAttributes admin panel's Costs section
// (useCosts / setCosts-style contract calls), gated on WEB2_ADMIN_EMAILS
// instead of contract ownership. As of the 2026-09-20/21 redesign, costs
// are per-variant (see
// docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §2)
// — every request operates on exactly one variant's row, selected via the
// `variant` query param (defaults to 1 so an old bookmarked call without it
// keeps working).
//
// GET also reports how many of THAT variant's ships are stale relative to
// its own live version (cheap `count()` queries scoped to the variant, not
// a full ship load), and PUT assigns the new version server-side rather
// than trusting a client-supplied one, so a client bug can never
// desync/collide the version counter.

function parseVariant(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("variant");
  const parsed = raw ? Number(raw) : 1;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function GET(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const variant = parseVariant(req);
  const costs = await getCurrentCosts(variant);
  // Ship.traits is a JSON blob — filtering by variant needs a raw JSON path
  // query rather than a typed Prisma where-clause field.
  const [total, staleCount] = await Promise.all([
    prisma.ship.count({ where: { traits: { path: ["variant"], equals: variant } } }),
    prisma.ship.count({
      where: {
        traits: { path: ["variant"], equals: variant },
        costsVersion: { lt: costs.version },
      },
    }),
  ]);

  return NextResponse.json({ variant, costs, stats: { total, staleCount } });
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

  const variant = parseVariant(req);
  const body = await req.json();
  if (!isValidCostsInput(body)) {
    return NextResponse.json({ error: "Invalid costs config" }, { status: 400 });
  }

  // Server assigns the version — any `version` field in the request body is
  // ignored, so a stale/buggy client can never send a version that collides
  // with or skips backward from what's actually stored. Reads the row
  // directly (not the cached getCurrentCosts()) since version accuracy here
  // matters more than avoiding one extra query on an admin-only write path.
  const configKey = costsConfigKeyForVariant(variant);
  const existing = await prisma.config.findUnique({ where: { key: configKey } });
  const prevVersion = existing
    ? (existing.value as CostsConfig).version
    : defaultCostsForVariant(variant).version;
  const newCosts: CostsConfig = { ...body, version: prevVersion + 1 };

  await prisma.config.upsert({
    where: { key: configKey },
    create: { key: configKey, value: newCosts as unknown as object },
    update: { value: newCosts as unknown as object },
  });
  invalidateCurrentCosts(variant);

  return NextResponse.json({ variant, costs: newCosts });
}

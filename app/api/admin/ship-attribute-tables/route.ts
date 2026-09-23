import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import {
  getShipAttributeTables,
  invalidateShipAttributeTables,
  attributeTablesConfigKeyForVariant,
} from "@/app/lib/getShipAttributeTables";
import { defaultAttributeTablesForVariant, type ShipAttributeTables } from "@/app/lib/shipAttributeTables";

// GET/PUT /api/admin/ship-attribute-tables?variant=1|2 — admin-only
// read/write of the per-variant ship_attribute_tables Config row (see
// getShipAttributeTables.ts). Web2-mode counterpart to web3's ShipAttributes
// admin panel's gun/armor/shield/rank data sections, gated on
// WEB2_ADMIN_EMAILS instead of contract ownership. This affects live combat
// resolution (gameEngineWeb2.ts via calculateAttributesFromContractsWeb2)
// — treat edits as a balance change. As of the 2026-09-20/21 redesign,
// attributes are per-variant (see
// docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §1)
// — every request operates on exactly one variant's row, selected via the
// `variant` query param (defaults to 1).

function parseVariant(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("variant");
  const parsed = raw ? Number(raw) : 1;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function GET(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const variant = parseVariant(req);
  return NextResponse.json(await getShipAttributeTables(variant));
}

type ShipAttributeTablesInput = Omit<ShipAttributeTables, "version">;

function isValidTablesInput(value: unknown): value is ShipAttributeTablesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const numberArrayFields = ["foreAccuracy", "hullBonus", "engineSpeeds", "rankThresholds", "rankBonusPct"];
  const statArrayFields = ["guns", "armors", "shields"];
  const numberArraysOk = numberArrayFields.every(
    (f) => Array.isArray(v[f]) && (v[f] as unknown[]).every((n) => typeof n === "number"),
  );
  const statArraysOk = statArrayFields.every(
    (f) =>
      Array.isArray(v[f]) &&
      (v[f] as unknown[]).every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>).movement === "number" &&
          (f === "guns"
            ? typeof (entry as Record<string, unknown>).range === "number" &&
              typeof (entry as Record<string, unknown>).damage === "number"
            : typeof (entry as Record<string, unknown>).damageReduction === "number"),
      ),
  );
  if (
    typeof v.baseHull !== "number" ||
    typeof v.baseSpeed !== "number" ||
    !numberArraysOk ||
    !statArraysOk
  ) {
    return false;
  }
  const rankThresholds = v.rankThresholds as number[];
  const rankBonusPct = v.rankBonusPct as number[];
  if (rankThresholds.length !== 5 || rankBonusPct.length !== 6) return false;
  if (rankThresholds[0]! <= 0) return false;
  for (let i = 1; i < rankThresholds.length; i++) {
    if (rankThresholds[i]! <= rankThresholds[i - 1]!) return false;
  }
  if (rankBonusPct.some((p) => p > 100)) return false;
  return true;
}

export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const variant = parseVariant(req);
  const body = await req.json();
  if (!isValidTablesInput(body)) {
    return NextResponse.json(
      { error: "Invalid attribute tables: check array lengths (rankThresholds=5 ascending, rankBonusPct=6 each ≤100)" },
      { status: 400 },
    );
  }

  // Server assigns the version — see admin/ship-costs/route.ts for why.
  const configKey = attributeTablesConfigKeyForVariant(variant);
  const existing = await prisma.config.findUnique({ where: { key: configKey } });
  const prevVersion = existing
    ? (existing.value as unknown as ShipAttributeTables).version
    : defaultAttributeTablesForVariant(variant).version;
  const newTables: ShipAttributeTables = { ...body, version: prevVersion + 1 };

  await prisma.config.upsert({
    where: { key: configKey },
    create: { key: configKey, value: newTables as unknown as object },
    update: { value: newTables as unknown as object },
  });
  invalidateShipAttributeTables(variant);

  return NextResponse.json({ variant, tables: newTables });
}

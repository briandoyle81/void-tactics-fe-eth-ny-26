import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";
import { getShipAttributeTables, invalidateShipAttributeTables } from "@/app/lib/getShipAttributeTables";
import { DEFAULT_ATTRIBUTE_TABLES, type ShipAttributeTables } from "@/app/lib/shipAttributeTables";

// GET/PUT /api/admin/ship-attribute-tables — admin-only read/write of the
// ship_attribute_tables Config row (see getShipAttributeTables.ts). Web2-mode
// counterpart to web3's ShipAttributes admin panel's gun/armor/shield data
// sections, gated on WEB2_ADMIN_EMAILS instead of contract ownership. This
// affects live combat resolution (gameEngineWeb2.ts via
// calculateAttributesFromContractsWeb2) — treat edits as a balance change.
export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  return NextResponse.json(await getShipAttributeTables());
}

type ShipAttributeTablesInput = Omit<ShipAttributeTables, "version">;

function isValidTablesInput(value: unknown): value is ShipAttributeTablesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const numberArrayFields = ["foreAccuracy", "hullBonus", "engineSpeeds"];
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
  return (
    typeof v.baseHull === "number" &&
    typeof v.baseSpeed === "number" &&
    numberArraysOk &&
    statArraysOk
  );
}

export async function PUT(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  if (!isValidTablesInput(body)) {
    return NextResponse.json({ error: "Invalid attribute tables" }, { status: 400 });
  }

  // Server assigns the version — see admin/ship-costs/route.ts for why.
  const existing = await prisma.config.findUnique({ where: { key: "ship_attribute_tables" } });
  const prevVersion = existing
    ? (existing.value as unknown as ShipAttributeTables).version
    : DEFAULT_ATTRIBUTE_TABLES.version;
  const newTables: ShipAttributeTables = { ...body, version: prevVersion + 1 };

  await prisma.config.upsert({
    where: { key: "ship_attribute_tables" },
    create: { key: "ship_attribute_tables", value: newTables as unknown as object },
    update: { value: newTables as unknown as object },
  });
  invalidateShipAttributeTables();

  return NextResponse.json({ tables: newTables });
}

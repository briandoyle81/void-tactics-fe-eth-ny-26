import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireWeb2Admin } from "@/app/lib/auth";

// GET/POST /api/admin/ai-ship-configs — web2 counterpart to web3's
// AIEncounters.createAIShipConfig/getAllAIShipConfigs, gated the same way
// as the other web2 admin routes (requireWeb2Admin, not per-address
// on-chain permissions — see AIEncountersAdminPanelWeb2.tsx).

function isValidEquipment(v: unknown): v is { mainWeapon: number; armor: number; shields: number; special: number } {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.mainWeapon === "number" &&
    typeof e.armor === "number" &&
    typeof e.shields === "number" &&
    typeof e.special === "number"
  );
}

function isValidTraits(v: unknown): v is {
  serialNumber: number;
  colors: { h1: number; s1: number; l1: number; h2: number; s2: number; l2: number };
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
} {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  if (typeof t.serialNumber !== "number" || typeof t.variant !== "number") return false;
  if (typeof t.accuracy !== "number" || typeof t.hull !== "number" || typeof t.speed !== "number") return false;
  if (!t.colors || typeof t.colors !== "object") return false;
  const c = t.colors as Record<string, unknown>;
  return ["h1", "s1", "l1", "h2", "s2", "l2"].every((k) => typeof c[k] === "number");
}

export async function GET() {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const configs = await prisma.aIShipConfig.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const { error } = await requireWeb2Admin();
  if (error) return error;

  const body = await req.json();
  const { name, equipment, traits, archetype } = body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isValidEquipment(equipment)) {
    return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });
  }
  if (!isValidTraits(traits)) {
    return NextResponse.json({ error: "Invalid traits" }, { status: 400 });
  }
  if (!Number.isInteger(archetype) || archetype < 0 || archetype > 5) {
    return NextResponse.json({ error: "Invalid archetype" }, { status: 400 });
  }

  const config = await prisma.aIShipConfig.create({
    data: { name: name.trim(), equipment, traits, archetype },
  });
  return NextResponse.json(config, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";
import { PresetMap } from "@/app/types/types";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const maps = await prisma.map.findMany({ orderBy: { id: "asc" } });

  const presetMaps: PresetMap[] = maps.map((m) => ({
    id: m.id,
    blockedPositions: (m.blockedTiles as { row: number; col: number }[]) ?? [],
    scoringPositions:
      (m.scoringTiles as { row: number; col: number; points: number; onlyOnce: boolean }[]) ?? [],
  }));

  return new NextResponse(stringifyWithBigint(presetMaps), {
    headers: { "Content-Type": "application/json" },
  });
}

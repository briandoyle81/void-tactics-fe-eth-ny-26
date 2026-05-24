import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { stringifyWithBigint } from "@/app/lib/bigintJson";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const stats = await prisma.playerStats.findUnique({
    where: { userId: userId! },
  });

  return new NextResponse(
    stringifyWithBigint({
      wins: BigInt(stats?.wins ?? 0),
      losses: BigInt(stats?.losses ?? 0),
      totalGames: BigInt(stats?.totalGames ?? 0),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

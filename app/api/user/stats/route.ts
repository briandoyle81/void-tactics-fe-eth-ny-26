import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const stats = await prisma.playerStats.findUnique({
    where: { userId: userId! },
  });

  return NextResponse.json({
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    draws: stats?.draws ?? 0,
    totalGames: stats?.totalGames ?? 0,
  });
}

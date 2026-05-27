import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const TOP_N = 20;

// GET /api/leaderboard — top players by wins. Auth optional: if signed in, isMe is set.
export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ?? null;

  const rows = await prisma.playerStats.findMany({
    where: { totalGames: { gt: 0 } },
    orderBy: [{ wins: "desc" }, { totalGames: "asc" }],
    take: TOP_N,
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
  });

  const entries = rows.map((row, idx) => ({
    rank: idx + 1,
    displayName: row.user.username ?? `Player_${row.user.id.slice(0, 6)}`,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    totalGames: row.totalGames,
    winRate: row.totalGames > 0 ? Math.round((row.wins / row.totalGames) * 100) : 0,
    isMe: currentUserId !== null && row.user.id === currentUserId,
  }));

  return NextResponse.json(entries);
}

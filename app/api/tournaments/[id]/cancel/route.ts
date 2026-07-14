import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const tournamentId = Number(id);
  if (isNaN(tournamentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { registrants: true },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: "Only the tournament creator can cancel" }, { status: 403 });
  }
  if (tournament.state !== "REGISTRATION") {
    return NextResponse.json({ error: "CancelConditionsNotMet" }, { status: 409 });
  }

  await prisma.$transaction([
    ...tournament.registrants.map((r) =>
      prisma.user.update({
        where: { id: r.userId },
        data: { creditBalance: { increment: tournament.entryFee } },
      }),
    ),
    prisma.tournament.update({
      where: { id: tournamentId },
      data: { state: "CANCELLED", prizePool: 0 },
    }),
  ]);

  return NextResponse.json({ cancelled: true });
}

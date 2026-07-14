import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";
import { InsufficientBalanceError } from "@/app/lib/InsufficientBalanceError";
import { Prisma } from "@/app/generated/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const tournamentId = Number(id);
  if (isNaN(tournamentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [tournament, user] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { registrants: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId! } }),
  ]);
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // The creator has organizer-only powers over this tournament (creating
  // match lobbies, manually resolving stuck matches — see
  // matches/[matchId]/create-lobby and matches/[matchId]/resolve). Letting
  // them also play would let them use those powers to guarantee themselves
  // wins and collect the prize pool without playing a real game.
  if (tournament.creatorId === userId) {
    return NextResponse.json(
      { error: "The tournament creator cannot register as a player" },
      { status: 403 },
    );
  }

  if (tournament.state !== "REGISTRATION") {
    return NextResponse.json({ error: "RegistrationClosed" }, { status: 409 });
  }
  if (tournament.registerBy.getTime() <= Date.now()) {
    return NextResponse.json({ error: "RegistrationClosed" }, { status: 409 });
  }
  if (tournament._count.registrants >= tournament.maxPlayers) {
    return NextResponse.json({ error: "RegistrationFull" }, { status: 409 });
  }
  if (user.creditBalance < tournament.entryFee) {
    return NextResponse.json({ error: "Insufficient credit balance" }, { status: 402 });
  }

  const existing = await prisma.tournamentRegistrant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: userId! } },
  });
  if (existing) {
    return NextResponse.json({ error: "AlreadyRegistered" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Atomic conditional debit — see InsufficientBalanceError. Also closes
      // the (lower-stakes) double-registration race: if two concurrent
      // requests both pass the `existing` check above, the second's
      // `tournamentRegistrant.create` below hits the tournamentId+userId
      // unique constraint and throws, rolling back its balance debit too.
      const debited = await tx.user.updateMany({
        where: { id: userId!, creditBalance: { gte: tournament.entryFee } },
        data: { creditBalance: { decrement: tournament.entryFee } },
      });
      if (debited.count === 0) throw new InsufficientBalanceError();

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { prizePool: { increment: tournament.entryFee } },
      });
      await tx.tournamentRegistrant.create({
        data: { tournamentId, userId: userId! },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient credit balance" }, { status: 402 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "AlreadyRegistered" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ registered: true }, { status: 201 });
}

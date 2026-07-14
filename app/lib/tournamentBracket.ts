import { prisma } from "./prisma";
import { TournamentState } from "../generated/prisma";

type MatchRow = {
  tournamentId: number;
  round: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  isBye: boolean;
  resolved: boolean;
};

function pairSlots(tournamentId: number, round: number, slots: Array<string | null>): MatchRow[] {
  const matches: MatchRow[] = [];
  for (let i = 0; i < slots.length / 2; i++) {
    const player1Id = slots[i * 2] ?? null;
    const player2Id = slots[i * 2 + 1] ?? null;
    const isBye = !player1Id || !player2Id;
    const winnerId = isBye ? (player1Id ?? player2Id) : null;
    matches.push({ tournamentId, round, matchIndex: i, player1Id, player2Id, winnerId, isBye, resolved: isBye });
  }
  return matches;
}

/**
 * Single-elimination bracket, seeded from registration order (no seeding
 * UI — matches web3's on-chain generation). Pads the registrant list to
 * the next power of two with byes; a bye match is resolved immediately
 * with no lobby created.
 */
export async function generateBracket(tournamentId: number): Promise<void> {
  const registrants = await prisma.tournamentRegistrant.findMany({
    where: { tournamentId },
    orderBy: { registeredAt: "asc" },
  });

  let bracketSize = 1;
  while (bracketSize < registrants.length) bracketSize *= 2;
  const totalRounds = Math.round(Math.log2(bracketSize));

  const slots: Array<string | null> = registrants.map((r) => r.userId);
  while (slots.length < bracketSize) slots.push(null);

  const matches = pairSlots(tournamentId, 0, slots);

  await prisma.$transaction([
    prisma.tournamentMatch.createMany({ data: matches }),
    prisma.tournament.update({
      where: { id: tournamentId },
      data: { state: TournamentState.ACTIVE, totalRounds, startedAt: new Date() },
    }),
  ]);

  await maybeAdvanceRound(tournamentId, 0);
}

/**
 * If every match in `round` is resolved, pairs up the round's winners
 * into the next round (propagating byes the same way). No-ops if `round`
 * was the tournament's final round — finalize() is a separate manual
 * creator action, matching web3.
 */
export async function maybeAdvanceRound(tournamentId: number, round: number): Promise<void> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.totalRounds == null) return;

  const roundMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round },
    orderBy: { matchIndex: "asc" },
  });
  if (roundMatches.length === 0 || !roundMatches.every((m) => m.resolved)) return;

  const isFinalRound = round + 1 >= tournament.totalRounds;
  if (isFinalRound) return;

  const existingNext = await prisma.tournamentMatch.count({ where: { tournamentId, round: round + 1 } });
  if (existingNext > 0) return;

  const winners = roundMatches.map((m) => m.winnerId);
  const nextMatches = pairSlots(tournamentId, round + 1, winners);
  await prisma.tournamentMatch.createMany({ data: nextMatches });

  await maybeAdvanceRound(tournamentId, round + 1);
}

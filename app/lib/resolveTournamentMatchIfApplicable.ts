import { prisma } from "./prisma";
import { maybeAdvanceRound } from "./tournamentBracket";

// Web2 has no on-chain `gameResults` oracle contract, so a completed Game
// must self-report back to its tournament match (if any) here — called
// from every path that finalizes a Game (score win, flee, timeout).
export async function resolveTournamentMatchIfApplicable(
  lobbyId: number,
  winnerId: string,
): Promise<void> {
  const match = await prisma.tournamentMatch.findUnique({ where: { lobbyId } });
  if (!match || match.resolved) return;

  await prisma.tournamentMatch.update({
    where: { id: match.id },
    data: { winnerId, resolved: true },
  });

  await maybeAdvanceRound(match.tournamentId, match.round);
}

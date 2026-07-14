"use client";

import type { Web2TournamentMatch } from "../types/web2Tournament";
import { TournamentBracketView, type BracketMatchData } from "./TournamentBracketView";

// Web2-mode counterpart to `TournamentBracket.tsx`. No replay link (no
// walrus blob concept on web2 yet) — otherwise the same layout/logic,
// adapted to plain number ids and nullable player/lobby fields instead of
// the zero-address/zero-id sentinels.
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

interface Props {
  bracket: Web2TournamentMatch[];
}

export function TournamentBracketWeb2({ bracket }: Props) {
  const matches: BracketMatchData[] = bracket.map((match) => {
    const noPlayer1 = !match.player1Id;
    const noPlayer2 = !match.player2Id;
    const isBye = !noPlayer1 && noPlayer2 && match.resolved;
    const isPlayable = !noPlayer1 && !noPlayer2 && !match.resolved;

    return {
      id: String(match.id),
      round: match.round,
      matchLabel: String(match.id),
      player1Label: noPlayer1 ? null : truncateId(match.player1Id!),
      player2Label: noPlayer2 ? null : truncateId(match.player2Id!),
      player1IsWinner: match.resolved && match.winnerId === match.player1Id,
      player2IsWinner: match.resolved && match.winnerId === match.player2Id,
      isBye,
      resolved: match.resolved,
      inProgress: isPlayable && match.lobbyId !== null,
    };
  });

  return <TournamentBracketView bracket={matches} />;
}

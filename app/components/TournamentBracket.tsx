"use client";

import type { TournamentMatch } from "../types/types";
import { TournamentBracketView, type BracketMatchData } from "./TournamentBracketView";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BLOB = "0x" + "0".repeat(64);

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  tournamentId: bigint;
  bracket: TournamentMatch[];
}

export function TournamentBracket({ tournamentId, bracket }: Props) {
  const matches: BracketMatchData[] = bracket.map((match) => {
    const noPlayer1 = match.player1 === ZERO_ADDRESS;
    const noPlayer2 = match.player2 === ZERO_ADDRESS;
    const isBye = !noPlayer1 && noPlayer2 && match.resolved;
    const isPlayable = !noPlayer1 && !noPlayer2 && !match.resolved;

    return {
      id: String(match.matchId),
      round: match.round,
      matchLabel: String(match.matchId),
      player1Label: noPlayer1 ? null : shortAddr(match.player1),
      player2Label: noPlayer2 ? null : shortAddr(match.player2),
      player1IsWinner: match.resolved && match.winner === match.player1,
      player2IsWinner: match.resolved && match.winner === match.player2,
      isBye,
      resolved: match.resolved,
      inProgress: isPlayable && match.gameId !== 0n,
    };
  });

  const matchById = new Map(bracket.map((m) => [String(m.matchId), m]));

  return (
    <TournamentBracketView
      bracket={matches}
      renderReplayLink={(m) => {
        const match = matchById.get(m.id);
        if (!match || !match.resolved || match.walrusBlobId === ZERO_BLOB) return null;
        return (
          <a
            href={`/tournaments/${String(tournamentId)}/matches/${String(match.matchId)}`}
            className="mt-1 block text-[10px] text-phosphor-green/70 hover:text-phosphor-green underline"
          >
            View replay
          </a>
        );
      }}
    />
  );
}

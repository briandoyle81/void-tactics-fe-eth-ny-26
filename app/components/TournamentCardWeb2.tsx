"use client";

import type { Web2Tournament } from "../types/web2Tournament";
import { Web2TournamentState } from "../types/web2Tournament";
import { formatThreatShort, formatTurnShort, formatScoreShort } from "../utils/lobbyFormattersWeb2";
import { TournamentCardView, type TournamentCardData, type TournamentCardState } from "./TournamentCardView";

// Web2-mode counterpart to `TournamentCard.tsx`. Unlike the web3 card
// (which self-fetches via `useTournament(tournamentId)` — cheap there since
// wagmi batches/caches contract reads), this takes an already-fetched
// `Web2Tournament` as a prop instead of self-fetching, to avoid N+1 HTTP
// polling per card in a list.
const STATE_MAP: Record<Web2TournamentState, TournamentCardState> = {
  [Web2TournamentState.Registration]: "registration",
  [Web2TournamentState.Active]: "active",
  [Web2TournamentState.Complete]: "complete",
  [Web2TournamentState.Cancelled]: "cancelled",
};

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

interface Props {
  tournament: Web2Tournament;
  isCreatorMe: boolean;
  onClick: () => void;
}

export function TournamentCardWeb2({ tournament, isCreatorMe, onClick }: Props) {
  const { config, summary } = tournament;
  const state = STATE_MAP[summary.state] ?? "complete";

  const entryFee = config.entryFee > 0 ? `${config.entryFee} credits` : "FREE";
  const prize = summary.prizePool > 0 ? `${summary.prizePool} credits` : "—";
  const players = `${summary.registrantCount}/${config.maxPlayers}`;

  const now = Date.now();
  const timeLeftMs = config.registerBy > now ? config.registerBy - now : 0;
  const hoursLeft = timeLeftMs > 0 ? Math.floor(timeLeftMs / 3_600_000) : 0;
  const minsLeft = timeLeftMs > 0 && hoursLeft === 0 ? Math.floor(timeLeftMs / 60_000) : 0;
  const deadlineValue =
    state === "registration"
      ? hoursLeft > 0
        ? `~${hoursLeft}h left`
        : minsLeft > 0
          ? `~${minsLeft}m left`
          : "closing soon"
      : state === "complete" && summary.championId
        ? truncateId(summary.championId)
        : "—";
  const deadlineLabel = state === "complete" && summary.championId ? "CHAMPION" : "CLOSES";

  const data: TournamentCardData = {
    idLabel: String(summary.id),
    state,
    isCreatorMe,
    players,
    entryFee,
    prize,
    deadlineLabel,
    deadlineValue,
    threat: formatThreatShort(config.costLimit),
    turn: formatTurnShort(config.turnTimeSeconds),
    score: formatScoreShort(config.maxScore),
    rounds: String(summary.totalRounds ?? Math.ceil(Math.log2(config.maxPlayers))),
  };

  return <TournamentCardView data={data} onClick={onClick} />;
}

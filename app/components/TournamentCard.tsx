"use client";

import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useTournament } from "../hooks/useTournament";
import { TournamentState } from "../types/types";
import {
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormatters";
import { TournamentCardView, type TournamentCardData, type TournamentCardState } from "./TournamentCardView";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const STATE_MAP: Record<TournamentState, TournamentCardState> = {
  [TournamentState.Registration]: "registration",
  [TournamentState.Active]: "active",
  [TournamentState.Complete]: "complete",
  [TournamentState.Cancelled]: "cancelled",
};

interface Props {
  tournamentId: bigint;
  onClick?: () => void;
}

export function TournamentCard({ tournamentId, onClick }: Props) {
  const { address } = useAccount();
  const { config, summary, isLoading } = useTournament(tournamentId);

  if (isLoading || !summary || !config) {
    return (
      <div className="border border-gunmetal/40 overflow-hidden animate-pulse">
        <div className="h-10 bg-gunmetal/20 border-b border-gunmetal/30" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-1/2 bg-gunmetal/30 rounded" />
          <div className="grid grid-cols-2 gap-px mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gunmetal/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isCreatorMe = address?.toLowerCase() === summary.creator.toLowerCase();
  const state = STATE_MAP[summary.state] ?? "complete";

  const entryFee = config.entryFee > 0n ? `${formatEther(config.entryFee)} ETH` : "FREE";
  const prize = summary.prizePool > 0n ? `${formatEther(summary.prizePool)} ETH` : "—";
  const players = `${String(summary.registrantCount)}/${config.maxPlayers}`;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const timeLeft = config.lastStartTime > now ? config.lastStartTime - now : 0n;
  const hoursLeft = timeLeft > 0n ? Math.floor(Number(timeLeft) / 3600) : 0;
  const minsLeft = timeLeft > 0n && hoursLeft === 0 ? Math.floor(Number(timeLeft) / 60) : 0;
  const deadlineValue =
    state === "registration"
      ? hoursLeft > 0
        ? `~${hoursLeft}h left`
        : minsLeft > 0
          ? `~${minsLeft}m left`
          : "closing soon"
      : state === "complete" && summary.champion !== ZERO_ADDRESS
        ? `${summary.champion.slice(0, 6)}…${summary.champion.slice(-4)}`
        : "—";
  const deadlineLabel =
    state === "complete" && summary.champion !== ZERO_ADDRESS ? "CHAMPION" : "CLOSES";

  const data: TournamentCardData = {
    idLabel: String(tournamentId),
    state,
    isCreatorMe,
    players,
    entryFee,
    prize,
    deadlineLabel,
    deadlineValue,
    threat: formatThreatShort(config.costLimit),
    turn: formatTurnShort(config.turnTime),
    score: formatScoreShort(config.maxScore),
    rounds: String(summary.totalRounds || Math.ceil(Math.log2(config.maxPlayers))),
  };

  return (
    <TournamentCardView
      data={data}
      href={`/tournaments/${String(tournamentId)}`}
      onClick={onClick}
    />
  );
}

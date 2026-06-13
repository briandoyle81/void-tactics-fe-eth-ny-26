"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { useTournament } from "../hooks/useTournament";
import { TournamentState } from "../types/types";

const STATE_LABELS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "REGISTRATION",
  [TournamentState.Active]: "ACTIVE",
  [TournamentState.Complete]: "COMPLETE",
  [TournamentState.Cancelled]: "CANCELLED",
};

const STATE_COLORS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "border-cyan text-cyan",
  [TournamentState.Active]: "border-phosphor-green text-phosphor-green",
  [TournamentState.Complete]: "border-gunmetal text-text-muted",
  [TournamentState.Cancelled]: "border-warning-red text-warning-red",
};

interface Props {
  tournamentId: bigint;
}

export function TournamentCard({ tournamentId }: Props) {
  const { config, summary, isLoading } = useTournament(tournamentId);

  if (isLoading || !summary || !config) {
    return (
      <div className="border border-gunmetal/40 p-4 font-mono animate-pulse">
        <div className="h-3 w-24 bg-gunmetal/40 rounded mb-2" />
        <div className="h-2 w-16 bg-gunmetal/30 rounded" />
      </div>
    );
  }

  const stateLabel = STATE_LABELS[summary.state] ?? "UNKNOWN";
  const stateColor = STATE_COLORS[summary.state] ?? "border-gunmetal text-text-muted";
  const entryFeeEth = config.entryFee > 0n ? `${formatEther(config.entryFee)} ETH` : "Free";
  const prizeEth = summary.prizePool > 0n ? `${formatEther(summary.prizePool)} ETH` : "—";
  const now = BigInt(Math.floor(Date.now() / 1000));
  const timeLeft = config.lastStartTime > now ? config.lastStartTime - now : 0n;
  const hoursLeft = timeLeft > 0n ? Math.floor(Number(timeLeft) / 3600) : 0;

  return (
    <Link
      href={`/tournaments/${String(tournamentId)}`}
      className="block border border-gunmetal/60 bg-void-black p-4 font-mono hover:border-phosphor-green/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs text-text-muted">Tournament #{String(tournamentId)}</div>
        <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${stateColor}`}>
          {stateLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-text-muted text-[10px] uppercase">Prize</div>
          <div className="text-phosphor-green font-bold">{prizeEth}</div>
        </div>
        <div>
          <div className="text-text-muted text-[10px] uppercase">Players</div>
          <div className="text-secondary">
            {String(summary.registrantCount)}/{config.maxPlayers}
          </div>
        </div>
        <div>
          <div className="text-text-muted text-[10px] uppercase">Entry</div>
          <div className="text-secondary">{entryFeeEth}</div>
        </div>
      </div>

      {summary.state === TournamentState.Registration && hoursLeft > 0 && (
        <div className="mt-2 text-[10px] text-text-muted">
          Closes in ~{hoursLeft}h
        </div>
      )}
      {summary.state === TournamentState.Complete && summary.champion !== "0x0000000000000000000000000000000000000000" && (
        <div className="mt-2 text-[10px] text-text-muted">
          Champion: {summary.champion.slice(0, 6)}…{summary.champion.slice(-4)}
        </div>
      )}
    </Link>
  );
}

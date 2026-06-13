"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useTournament } from "../hooks/useTournament";
import { TournamentState } from "../types/types";
import {
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormatters";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// State badge color — border + text only, no bg
const STATE_TEXT: Record<TournamentState, string> = {
  [TournamentState.Registration]: "text-cyan",
  [TournamentState.Active]: "text-phosphor-green",
  [TournamentState.Complete]: "text-text-muted",
  [TournamentState.Cancelled]: "text-warning-red",
};
const STATE_LABELS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "REGISTRATION",
  [TournamentState.Active]: "IN PROGRESS",
  [TournamentState.Complete]: "COMPLETE",
  [TournamentState.Cancelled]: "CANCELLED",
};
// Card border color
const CARD_BORDER: Record<TournamentState, string> = {
  [TournamentState.Registration]: "border-cyan",
  [TournamentState.Active]: "border-phosphor-green",
  [TournamentState.Complete]: "border-gunmetal",
  [TournamentState.Cancelled]: "border-warning-red/40",
};
const HEADER_BG: Record<TournamentState, string> = {
  [TournamentState.Registration]: "bg-cyan/5 border-cyan/15",
  [TournamentState.Active]: "bg-phosphor-green/5 border-phosphor-green/15",
  [TournamentState.Complete]: "bg-black/20 border-gunmetal/30",
  [TournamentState.Cancelled]: "bg-black/20 border-warning-red/10",
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

  const isCreator = address?.toLowerCase() === summary.creator.toLowerCase();
  const state = summary.state;
  const stateLabel = STATE_LABELS[state] ?? "UNKNOWN";
  const stateText = STATE_TEXT[state] ?? "text-text-muted";
  const cardBorder = CARD_BORDER[state] ?? "border-gunmetal";
  const headerBg = HEADER_BG[state] ?? "bg-black/20 border-gunmetal/30";

  const entryFee = config.entryFee > 0n ? `${formatEther(config.entryFee)} ETH` : "FREE";
  const prize = summary.prizePool > 0n ? `${formatEther(summary.prizePool)} ETH` : "—";
  const players = `${String(summary.registrantCount)}/${config.maxPlayers}`;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const timeLeft = config.lastStartTime > now ? config.lastStartTime - now : 0n;
  const hoursLeft = timeLeft > 0n ? Math.floor(Number(timeLeft) / 3600) : 0;
  const minsLeft = timeLeft > 0n && hoursLeft === 0 ? Math.floor(Number(timeLeft) / 60) : 0;
  const deadline =
    state === TournamentState.Registration
      ? hoursLeft > 0
        ? `~${hoursLeft}h left`
        : minsLeft > 0
          ? `~${minsLeft}m left`
          : "closing soon"
      : state === TournamentState.Complete && summary.champion !== ZERO_ADDRESS
        ? `${summary.champion.slice(0, 6)}…${summary.champion.slice(-4)}`
        : "—";
  const deadlineLabel =
    state === TournamentState.Complete && summary.champion !== ZERO_ADDRESS
      ? "CHAMPION"
      : "CLOSES";

  const mainStats = [
    { label: "PLAYERS", value: players },
    { label: "ENTRY",   value: entryFee },
    { label: "PRIZE",   value: prize },
    { label: deadlineLabel, value: deadline },
  ];

  const configStats = [
    { label: "THREAT", value: formatThreatShort(config.costLimit) },
    { label: "TURN",   value: formatTurnShort(config.turnTime) },
    { label: "SCORE",  value: formatScoreShort(config.maxScore) },
    { label: "ROUNDS", value: String(summary.totalRounds || Math.ceil(Math.log2(config.maxPlayers))) },
  ];

  const inner = (
    <>
      {/* ── Header bar ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerBg}`}>
        <div className="flex items-center gap-2">
          <h5
            className={`text-base font-black tracking-wider ${stateText}`}
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            TOURNAMENT #{String(tournamentId)}
          </h5>
          {isCreator && (
            <span
              className="text-[10px] font-bold tracking-widest text-amber/60"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              [YOURS]
            </span>
          )}
        </div>
        <span
          className={`text-[11px] font-bold tracking-widest ${stateText}`}
          style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
        >
          [{stateLabel}]
        </span>
      </div>

      {/* ── Main stats 2×2 ── */}
      <div className="grid grid-cols-2 gap-px border-b border-gunmetal/30">
        {mainStats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-black/20">
            <span
              className="text-[9px] font-bold tracking-widest text-text-muted"
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              {label}
            </span>
            <span
              className="text-sm font-bold text-cyan"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Config sub-bar 4 cells ── */}
      <div className="grid grid-cols-4 gap-px bg-black/10">
        {configStats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 px-2 py-2 bg-black/20">
            <span
              className="text-[9px] font-bold tracking-widest text-text-muted"
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              {label}
            </span>
            <span
              className="text-xs font-bold text-secondary"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const wrapClass = `overflow-hidden border ${cardBorder} bg-black/30 transition-colors hover:brightness-110 cursor-pointer`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${wrapClass}`}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={`/tournaments/${String(tournamentId)}`} className={wrapClass}>
      {inner}
    </Link>
  );
}

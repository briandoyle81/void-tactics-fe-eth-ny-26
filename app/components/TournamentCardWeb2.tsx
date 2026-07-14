"use client";

import type { Web2Tournament } from "../types/web2Tournament";
import { Web2TournamentState } from "../types/web2Tournament";
import { formatThreatShort, formatTurnShort, formatScoreShort } from "../utils/lobbyFormattersWeb2";

// Web2-mode counterpart to `TournamentCard.tsx`. Unlike the web3 card
// (which self-fetches via `useTournament(tournamentId)` — cheap there since
// wagmi batches/caches contract reads), this takes an already-fetched
// `Web2Tournament` as a prop instead of self-fetching, to avoid N+1 HTTP
// polling per card in a list.
const STATE_TEXT: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "text-cyan",
  [Web2TournamentState.Active]: "text-phosphor-green",
  [Web2TournamentState.Complete]: "text-text-muted",
  [Web2TournamentState.Cancelled]: "text-warning-red",
};
const STATE_LABELS: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "REGISTRATION",
  [Web2TournamentState.Active]: "IN PROGRESS",
  [Web2TournamentState.Complete]: "COMPLETE",
  [Web2TournamentState.Cancelled]: "CANCELLED",
};
const CARD_BORDER: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "border-cyan",
  [Web2TournamentState.Active]: "border-phosphor-green",
  [Web2TournamentState.Complete]: "border-gunmetal",
  [Web2TournamentState.Cancelled]: "border-warning-red/40",
};
const HEADER_BG: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "bg-cyan/5 border-cyan/15",
  [Web2TournamentState.Active]: "bg-phosphor-green/5 border-phosphor-green/15",
  [Web2TournamentState.Complete]: "bg-black/20 border-gunmetal/30",
  [Web2TournamentState.Cancelled]: "bg-black/20 border-warning-red/10",
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
  const state = summary.state;
  const stateLabel = STATE_LABELS[state] ?? "UNKNOWN";
  const stateText = STATE_TEXT[state] ?? "text-text-muted";
  const cardBorder = CARD_BORDER[state] ?? "border-gunmetal";
  const headerBg = HEADER_BG[state] ?? "bg-black/20 border-gunmetal/30";

  const entryFee = config.entryFee > 0 ? `${config.entryFee} credits` : "FREE";
  const prize = summary.prizePool > 0 ? `${summary.prizePool} credits` : "—";
  const players = `${summary.registrantCount}/${config.maxPlayers}`;

  const now = Date.now();
  const timeLeftMs = config.registerBy > now ? config.registerBy - now : 0;
  const hoursLeft = timeLeftMs > 0 ? Math.floor(timeLeftMs / 3_600_000) : 0;
  const minsLeft = timeLeftMs > 0 && hoursLeft === 0 ? Math.floor(timeLeftMs / 60_000) : 0;
  const deadline =
    state === Web2TournamentState.Registration
      ? hoursLeft > 0
        ? `~${hoursLeft}h left`
        : minsLeft > 0
          ? `~${minsLeft}m left`
          : "closing soon"
      : state === Web2TournamentState.Complete && summary.championId
        ? truncateId(summary.championId)
        : "—";
  const deadlineLabel =
    state === Web2TournamentState.Complete && summary.championId ? "CHAMPION" : "CLOSES";

  const mainStats = [
    { label: "PLAYERS", value: players },
    { label: "ENTRY", value: entryFee },
    { label: "PRIZE", value: prize },
    { label: deadlineLabel, value: deadline },
  ];

  const configStats = [
    { label: "THREAT", value: formatThreatShort(config.costLimit) },
    { label: "TURN", value: formatTurnShort(config.turnTimeSeconds) },
    { label: "SCORE", value: formatScoreShort(config.maxScore) },
    { label: "ROUNDS", value: String(summary.totalRounds ?? Math.ceil(Math.log2(config.maxPlayers))) },
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left overflow-hidden border ${cardBorder} bg-black/30 transition-colors hover:brightness-110 cursor-pointer`}
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerBg}`}>
        <div className="flex items-center gap-2">
          <h5
            className={`text-base font-black tracking-wider ${stateText}`}
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            TOURNAMENT #{summary.id}
          </h5>
          {isCreatorMe && (
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
              className="text-xs font-bold text-text-secondary"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}

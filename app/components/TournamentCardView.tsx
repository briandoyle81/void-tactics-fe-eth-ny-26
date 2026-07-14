"use client";

import Link from "next/link";

// Shared between TournamentCard.tsx (web3) and TournamentCardWeb2.tsx
// (web2) — the header/stats-grid card layout, ported verbatim from
// TournamentCard.tsx. Each side fetches/adapts its own data (web2 receives
// an already-fetched `Web2Tournament` from its list, to avoid N+1 HTTP
// polling per card — this view never fetches itself) and maps its native
// state enum onto the normalized `TournamentCardState` union below.
export type TournamentCardState = "registration" | "active" | "complete" | "cancelled";

const STATE_TEXT: Record<TournamentCardState, string> = {
  registration: "text-cyan",
  active: "text-phosphor-green",
  complete: "text-text-muted",
  cancelled: "text-warning-red",
};
const STATE_LABELS: Record<TournamentCardState, string> = {
  registration: "REGISTRATION",
  active: "IN PROGRESS",
  complete: "COMPLETE",
  cancelled: "CANCELLED",
};
const CARD_BORDER: Record<TournamentCardState, string> = {
  registration: "border-cyan",
  active: "border-phosphor-green",
  complete: "border-gunmetal",
  cancelled: "border-warning-red/40",
};
const HEADER_BG: Record<TournamentCardState, string> = {
  registration: "bg-cyan/5 border-cyan/15",
  active: "bg-phosphor-green/5 border-phosphor-green/15",
  complete: "bg-black/20 border-gunmetal/30",
  cancelled: "bg-black/20 border-warning-red/10",
};

export interface TournamentCardData {
  idLabel: string;
  state: TournamentCardState;
  isCreatorMe: boolean;
  players: string;
  entryFee: string;
  prize: string;
  deadlineLabel: string;
  deadlineValue: string;
  threat: string;
  turn: string;
  score: string;
  rounds: string;
}

interface TournamentCardViewProps {
  data: TournamentCardData;
  href?: string;
  onClick?: () => void;
}

export function TournamentCardView({ data, href, onClick }: TournamentCardViewProps) {
  const stateLabel = STATE_LABELS[data.state] ?? "UNKNOWN";
  const stateText = STATE_TEXT[data.state] ?? "text-text-muted";
  const cardBorder = CARD_BORDER[data.state] ?? "border-gunmetal";
  const headerBg = HEADER_BG[data.state] ?? "bg-black/20 border-gunmetal/30";

  const mainStats = [
    { label: "PLAYERS", value: data.players },
    { label: "ENTRY", value: data.entryFee },
    { label: "PRIZE", value: data.prize },
    { label: data.deadlineLabel, value: data.deadlineValue },
  ];

  const configStats = [
    { label: "THREAT", value: data.threat },
    { label: "TURN", value: data.turn },
    { label: "SCORE", value: data.score },
    { label: "ROUNDS", value: data.rounds },
  ];

  const inner = (
    <>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerBg}`}>
        <div className="flex items-center gap-2">
          <h5
            className={`text-base font-black tracking-wider ${stateText}`}
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            TOURNAMENT #{data.idLabel}
          </h5>
          {data.isCreatorMe && (
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
    <Link href={href ?? "#"} className={wrapClass}>
      {inner}
    </Link>
  );
}

"use client";

import React from "react";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// lobby-list card shell (header, creator/joiner/reservation rows, stats
// grid, fleet-view buttons). Ported verbatim from Lobbies.tsx. The action
// section (join/accept/reject/leave/select-fleet) is caller-supplied via
// `actions` since the write mechanism genuinely differs (web3: self-
// contained on-chain write-hook button components; web2: REST calls) —
// same render-prop pattern as `RecycleConfirmModal`'s `confirmButton`.
interface LobbyCardProps {
  lobbyIdLabel: string;
  isCreatorMe: boolean;
  statusColorClass: string;
  statusText: string;

  creatorLabel: string;
  creatorStats?: React.ReactNode;

  joinerLabel?: string | null;
  isJoinerMe?: boolean;
  joinerStats?: React.ReactNode;

  reservedLabel?: string | null;

  threatLabel: string;
  turnLabel: string;
  mapLabel: string;
  scoreLabel: string;

  creatorFleetButton?: React.ReactNode;
  joinerFleetButton?: React.ReactNode;

  actions: React.ReactNode;
}

export function LobbyCard({
  lobbyIdLabel,
  isCreatorMe,
  statusColorClass,
  statusText,
  creatorLabel,
  creatorStats,
  joinerLabel,
  isJoinerMe = false,
  joinerStats,
  reservedLabel,
  threatLabel,
  turnLabel,
  mapLabel,
  scoreLabel,
  creatorFleetButton,
  joinerFleetButton,
  actions,
}: LobbyCardProps) {
  return (
    <div
      className={`overflow-hidden border ${
        isCreatorMe ? "border-amber bg-amber/5" : "border-cyan bg-black/30"
      }`}
      style={{ borderRadius: 0 }}
    >
      {/* ── Header bar ── */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${
          isCreatorMe ? "border-amber/20 bg-amber/5" : "border-cyan/15 bg-cyan/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <h5
            className={`text-base font-black tracking-wider ${
              isCreatorMe ? "text-amber" : "text-cyan"
            }`}
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            LOBBY #{lobbyIdLabel}
          </h5>
          {isCreatorMe && (
            <span
              className="text-[10px] font-bold tracking-widest text-amber/60"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              [YOURS]
            </span>
          )}
        </div>
        <span
          className={`text-[11px] font-bold tracking-widest ${statusColorClass}`}
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          }}
        >
          [{statusText}]
        </span>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* Creator: address left, W/L right */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-sm font-bold ${isCreatorMe ? "text-amber" : "text-text-secondary"}`}
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            {creatorLabel}
          </span>
          {creatorStats}
        </div>

        {/* Joiner row */}
        {joinerLabel && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tracking-widest text-text-muted"
                style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
              >
                + JOINER
              </span>
              <span
                className={`text-sm font-bold ${isJoinerMe ? "text-cyan" : "text-text-secondary"}`}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                }}
              >
                {joinerLabel}
              </span>
            </div>
            {joinerStats}
          </div>
        )}

        {/* Reservation status */}
        {reservedLabel && (
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 shrink-0 text-[10px] font-bold tracking-widest text-amber/70"
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              RESV
            </span>
            <span
              className="text-sm text-amber"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              {reservedLabel}
            </span>
            <span
              className="ml-1 text-[10px] font-bold tracking-widest text-amber/50"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              [RESERVED]
            </span>
          </div>
        )}

        {/* Stats: 2×2 stacked grid */}
        <div className="grid grid-cols-2 gap-px border border-gunmetal/40 mt-1">
          {[
            { label: "THREAT", value: threatLabel },
            { label: "TURN", value: turnLabel },
            { label: "MAP", value: mapLabel },
            { label: "SCORE", value: scoreLabel },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2 bg-black/20">
              <span
                className="text-[9px] font-bold tracking-widest text-text-muted"
                style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
              >
                {label}
              </span>
              <span
                className="text-xs font-bold text-cyan"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Fleet indicators */}
        {(creatorFleetButton || joinerFleetButton) && (
          <div className="flex flex-wrap gap-2 border-t border-gunmetal/40 pt-2">
            {creatorFleetButton}
            {joinerFleetButton}
          </div>
        )}
      </div>

      {/* ── Action section ── */}
      <div className="border-t border-gunmetal/40 px-4 py-3">{actions}</div>
    </div>
  );
}

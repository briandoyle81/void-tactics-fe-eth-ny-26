"use client";

import React from "react";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// Create Lobby form's threat/turn-pace/score-length selectors (ported
// verbatim from Lobbies.tsx's checkbox-card UI). Submission and any
// backend-specific fields (web3's "Reserve for Player" input + on-chain
// cost breakdown) are caller-supplied via `extraFields`/`footer`, since
// reservations aren't implemented server-side for web2 yet.
export type ThreatScale = "skirmish" | "battle";
export type TurnPace = "immediate" | "correspondence";
export type ScoreLength = "short" | "medium" | "long";

interface CardCheckboxProps {
  checked: boolean;
  onCheck: (checked: boolean) => void;
  label: string;
  caption: string;
  compact?: boolean;
}

export function CardCheckbox({ checked, onCheck, label, caption, compact }: CardCheckboxProps) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-start rounded-none border border-gunmetal bg-black/40 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan ${
        compact ? "gap-2 p-2.5 sm:gap-3 sm:p-3" : "gap-3 p-3"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-cyan"
        style={{ borderRadius: 0 }}
      />
      <span>
        <span className="block font-mono font-bold text-cyan">{label}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{caption}</span>
      </span>
    </label>
  );
}

/** Static game-rule caption shown in both create forms — not backend-specific, just factored out to avoid copy-pasting the exact markup. */
export function LobbyTurnOrderNote() {
  return (
    <div className="p-3 bg-steel/50 rounded-none border border-gunmetal">
      <p className="text-sm text-text-secondary">
        <span className="text-amber">// Turn Order:</span> The player who
        creates their fleet first will go first in the game.
      </p>
    </div>
  );
}

interface LobbyCreateFormProps {
  threatScale: ThreatScale;
  onThreatScaleChange: (v: ThreatScale) => void;
  turnPace: TurnPace;
  onTurnPaceChange: (v: TurnPace) => void;
  scoreLength: ScoreLength;
  onScoreLengthChange: (v: ScoreLength) => void;
  mapIdLabel: string;
  title?: string;
  onClose?: () => void;
  extraFields?: React.ReactNode;
  footer: React.ReactNode;
  // Web3-only: a real map picker, filtered to PvP-eligible maps by the
  // caller (Maps.mapMode has no web2 equivalent). When omitted (web2's
  // usage, or before the list has loaded), falls back to the original
  // disabled/read-only display.
  mapOptions?: { id: number; label: string }[];
  onMapIdChange?: (id: string) => void;
  /** Hide the turn-pace selector — for vs-AI lobbies, where turnTime is
   * forced to the contract max regardless of this choice (see
   * AI_GAME_TURN_SECONDS), so showing it would imply a choice that no
   * longer does anything. */
  hideTurnPace?: boolean;
}

export function LobbyCreateForm({
  threatScale,
  onThreatScaleChange,
  turnPace,
  onTurnPaceChange,
  scoreLength,
  onScoreLengthChange,
  mapIdLabel,
  title = "[CREATE LOBBY]",
  onClose,
  extraFields,
  footer,
  hideTurnPace = false,
  mapOptions,
  onMapIdChange,
}: LobbyCreateFormProps) {
  return (
    <div
      className="mb-6 p-4 border border-purple-400 bg-black/40"
      style={{ borderRadius: 0 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-lg font-bold text-purple tracking-widest">{title}</h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create lobby form"
            className="px-3 py-1 border border-warning-red text-warning-red hover:bg-warning-red/20"
            style={{ borderRadius: 0 }}
          >
            X
          </button>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <span className="block text-sm text-text-muted mb-2">Fleet threat limit</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <CardCheckbox
              checked={threatScale === "skirmish"}
              onCheck={(c) => onThreatScaleChange(c ? "skirmish" : "battle")}
              label="Skirmish"
              caption="1000 threat per fleet"
            />
            <CardCheckbox
              checked={threatScale === "battle"}
              onCheck={(c) => onThreatScaleChange(c ? "battle" : "skirmish")}
              label="Battle"
              caption="2000 threat per fleet"
            />
          </div>
        </div>

        {!hideTurnPace && (
          <div>
            <span className="block text-sm text-text-muted mb-2">Turn timer</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <CardCheckbox
                checked={turnPace === "immediate"}
                onCheck={(c) => onTurnPaceChange(c ? "immediate" : "correspondence")}
                label="Immediate game"
                caption="5 minutes per turn"
              />
              <CardCheckbox
                checked={turnPace === "correspondence"}
                onCheck={(c) => onTurnPaceChange(c ? "correspondence" : "immediate")}
                label="Correspondence game"
                caption="24 hours per turn"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-muted mb-1">Map</label>
          {mapOptions && mapOptions.length > 0 ? (
            <select
              value={mapIdLabel}
              onChange={(e) => onMapIdChange?.(e.target.value)}
              className="w-full rounded-none border border-cyan bg-black/60 px-3 py-2 text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
            >
              {mapOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : mapOptions && mapOptions.length === 0 ? (
            <p className="text-xs text-warning-red font-mono">
              [!] No PvP-eligible maps configured — an admin needs to mark a map
              &quot;PvP&quot; or &quot;Both&quot; before a lobby can be created.
            </p>
          ) : (
            <input
              type="text"
              value={mapIdLabel}
              disabled
              readOnly
              className="w-full cursor-not-allowed rounded-none border border-gunmetal bg-black/60 px-3 py-2 text-text-muted"
              aria-readonly
            />
          )}
        </div>

        <div>
          <span className="block text-sm text-text-muted mb-2">Max score (points to win)</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <CardCheckbox
              compact
              checked={scoreLength === "short"}
              onCheck={(c) => onScoreLengthChange(c ? "short" : "medium")}
              label="Short"
              caption="50 points"
            />
            <CardCheckbox
              compact
              checked={scoreLength === "medium"}
              onCheck={(c) => onScoreLengthChange(c ? "medium" : "short")}
              label="Medium"
              caption="100 points"
            />
            <CardCheckbox
              compact
              checked={scoreLength === "long"}
              onCheck={(c) => onScoreLengthChange(c ? "long" : "medium")}
              label="Long"
              caption="200 points"
            />
          </div>
        </div>

        {extraFields}

        {footer}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import type { RunMapAction } from "../../utils/runMapAction";

// The run map's bottom bar: the run roster as ship chips with hull bars,
// fleet cost against the cost cap, and the primary action — always at the
// bottom right.

export interface RosterShipChip {
  key: string;
  name: string;
  image: ReactNode;
  /** 0–100. */
  hullPercent: number;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

function hullColor(percent: number): string {
  if (percent < 35) return "var(--color-warning-red)";
  if (percent < 70) return "var(--color-amber)";
  return "var(--color-phosphor-green)";
}

export function RunActionBar({
  roster,
  fleetCost,
  costCap,
  action,
  onAction,
}: {
  roster: RosterShipChip[];
  fleetCost: number | null;
  costCap: number | null;
  action: RunMapAction | null;
  onAction: () => void;
}) {
  const capPercent =
    fleetCost != null && costCap ? Math.min(100, (fleetCost / costCap) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-3 border-t px-3 py-3 md:flex-row md:items-center md:gap-5 md:px-4"
      style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}
    >
      {roster.length > 0 && (
        <div className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:thin]" aria-label="Run fleet">
          {roster.map((ship) => (
            <div key={ship.key} className="grid w-11 shrink-0 gap-1" title={`${ship.name} · ${Math.round(ship.hullPercent)}% hull`}>
              <div className="aspect-square overflow-hidden border border-steel bg-black/40">{ship.image}</div>
              <div className="h-1" style={{ backgroundColor: "var(--color-steel)" }}>
                <div className="h-full" style={{ width: `${ship.hullPercent}%`, backgroundColor: hullColor(ship.hullPercent) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {costCap != null && (
        <div className="grid min-w-[9rem] gap-1 font-mono text-[11px]" aria-label="Fleet cost against cost cap">
          <div className="flex justify-between gap-3 uppercase tracking-wider text-text-muted">
            <span>Fleet cost</span>
            <span>
              <span className="text-text-primary">{fleetCost ?? "…"}</span> / <span className="text-cyan">{costCap}</span>
            </span>
          </div>
          <div className="h-1.5" style={{ backgroundColor: "var(--color-steel)" }}>
            <div className="h-full bg-cyan" style={{ width: `${capPercent}%` }} />
          </div>
        </div>
      )}

      {action && (
        <button
          type="button"
          onClick={onAction}
          disabled={action.disabled}
          className={`w-full border-2 border-solid px-6 py-3 text-base font-bold uppercase tracking-wider transition-colors duration-150 md:ml-auto md:w-auto ${
            action.disabled
              ? "cursor-not-allowed border-gunmetal text-text-muted"
              : "border-cyan bg-cyan text-near-black hover:bg-cyan/85"
          }`}
          style={DISPLAY_FONT}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

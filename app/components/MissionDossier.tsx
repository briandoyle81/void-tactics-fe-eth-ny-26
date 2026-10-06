"use client";

import React from "react";

export interface MissionDossierRow {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warning";
}

const TONE_CLASS: Record<NonNullable<MissionDossierRow["tone"]>, string> = {
  default: "text-text-primary",
  good: "text-phosphor-green",
  warning: "text-warning-red",
};

/** "5 min", "90 s" — turn timer for the dossier. */
export function formatTurnTime(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds} s`;
}

// The decision-data column of MissionNodePanel: an optional force comparison
// (enemy threat and ship count against your fleet's cost cap, drawn as two
// bars on one scale), then label/value rows, then the launch action pinned
// to the bottom.
export function MissionDossier({
  forces,
  rows,
  action,
}: {
  forces?: {
    enemy: number | null;
    /** Shown in the enemy bar's label; null while loading. */
    enemyShips?: number | null;
    yours: number | null;
    yoursLabel: string;
  };
  rows: MissionDossierRow[];
  action?: React.ReactNode;
}) {
  const scale = Math.max(forces?.enemy ?? 0, forces?.yours ?? 0, 1);
  return (
    <div className="flex h-full flex-col gap-4 bg-near-black/40 p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{"// Mission dossier"}</div>

      {forces && (
        <div className="flex flex-col gap-2">
          <ForceBar
            label={
              forces.enemyShips != null
                ? `Enemy · ${forces.enemyShips} ship${forces.enemyShips === 1 ? "" : "s"}`
                : "Enemy threat"
            }
            value={forces.enemy}
            scale={scale}
            color="var(--color-warning-red)"
          />
          <ForceBar label={forces.yoursLabel} value={forces.yours} scale={scale} color="var(--color-cyan)" />
        </div>
      )}

      <dl className="flex flex-col gap-2 text-xs">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
            <dt className="uppercase tracking-wider text-text-muted">{row.label}</dt>
            <dd className={TONE_CLASS[row.tone ?? "default"]}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {action && <div className="mt-auto pt-2 [&>button]:w-full">{action}</div>}
    </div>
  );
}

function ForceBar({
  label,
  value,
  scale,
  color,
}: {
  label: string;
  value: number | null;
  scale: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-wider text-text-muted">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>
          {value ?? "…"}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-steel">
        <div
          className="h-full"
          style={{ width: `${value != null ? (value / scale) * 100 : 0}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

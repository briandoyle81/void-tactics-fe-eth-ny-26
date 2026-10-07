"use client";

import type { ReactNode } from "react";
import { nodeContentTextClass, type NodeContentStatus } from "../../hooks/useNodeContent";

// The run map drawer's mission view: title and kind, the briefing
// transmission, the enemy fleet as named ship chips, then the dossier.

export interface EnemyShipChip {
  key: string;
  name: string;
  image: ReactNode;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

export function MissionDrawerContent({
  title,
  titleStatus,
  kindLabel,
  briefing,
  enemyFleet,
  dossier,
}: {
  title: string;
  titleStatus: NodeContentStatus | undefined;
  kindLabel: string;
  briefing: ReactNode;
  /** Combat nodes only; null while loading. */
  enemyFleet?: EnemyShipChip[] | null;
  dossier: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 pr-10 font-mono md:pr-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={`text-2xl font-bold uppercase leading-tight tracking-wider ${nodeContentTextClass(titleStatus, "text-cyan")}`}
          style={DISPLAY_FONT}
        >
          {title}
        </h3>
        <span className="shrink-0 border border-steel px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
          {kindLabel}
        </span>
      </div>

      {briefing}

      {enemyFleet !== undefined && (
        <section aria-label="Enemy fleet">
          <div className="mb-2 text-sm font-bold uppercase tracking-wider text-warning-red" style={DISPLAY_FONT}>
            Enemy fleet
          </div>
          {enemyFleet === null ? (
            <p className="text-xs text-text-muted">Scanning…</p>
          ) : enemyFleet.length === 0 ? (
            <p className="text-xs text-text-muted">No contacts.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {enemyFleet.map((ship) => (
                <div key={ship.key} className="grid w-[4.4rem] content-start gap-1">
                  <div className="aspect-square overflow-hidden border border-warning-red/50 bg-black/40">{ship.image}</div>
                  <span className="line-clamp-2 break-words text-[10px] leading-tight text-text-secondary">{ship.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {dossier}
    </div>
  );
}

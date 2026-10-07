"use client";

import type { ChangeEvent, ReactNode, RefObject } from "react";

// Fleet › Loadouts: saved fleet compositions as named slots. Editing one
// opens Fleet › Ships with it selected, where ships are added and removed.
// Shared by web3 and web2; the adapters supply number-native summaries.

export interface LoadoutSummary {
  id: string;
  name: string;
  shipCount: number;
  threat: number;
  /** Images of the first few ships. */
  thumbnails: ReactNode[];
  isActive: boolean;
}

interface LoadoutsViewProps {
  loadouts: LoadoutSummary[];
  onEdit: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  importInputRef: RefObject<HTMLInputElement | null>;
  onImportFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;
const SMALL_BUTTON =
  "border border-solid px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors duration-150";

export const MAX_LOADOUT_THUMBNAILS = 6;

export function LoadoutsView({
  loadouts,
  onEdit,
  onCreate,
  onDelete,
  onExport,
  importInputRef,
  onImportFileChange,
}: LoadoutsViewProps) {
  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onCreate} className={`${SMALL_BUTTON} border-cyan text-cyan hover:bg-cyan/10`}>
          + New loadout
        </button>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onExport}
            className={`${SMALL_BUTTON} border-gunmetal text-text-secondary hover:border-cyan hover:text-cyan`}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className={`${SMALL_BUTTON} border-gunmetal text-text-secondary hover:border-cyan hover:text-cyan`}
          >
            Import
          </button>
          <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFileChange} />
        </span>
      </div>

      {loadouts.length === 0 ? (
        <div className="border border-dashed border-gunmetal p-8 text-center">
          <p className="mb-1 text-lg font-bold uppercase tracking-wider text-text-primary" style={DISPLAY_FONT}>
            No loadouts yet
          </p>
          <p className="font-mono text-xs text-text-muted">
            Save a fleet you like to bring it into battle again. Loadouts are stored in this browser.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loadouts.map((loadout) => (
            <div
              key={loadout.id}
              className={`flex flex-col gap-3 border-2 border-solid bg-black/30 p-3 ${
                loadout.isActive ? "border-cyan" : "border-gunmetal"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xl font-bold uppercase tracking-wider text-text-primary" style={DISPLAY_FONT}>
                  {loadout.name}
                </span>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {loadout.shipCount} ship{loadout.shipCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid min-h-12 grid-cols-6 gap-1">
                {loadout.thumbnails.map((thumbnail, i) => (
                  <div key={i} className="aspect-square overflow-hidden border border-gunmetal bg-black/40">
                    {thumbnail}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-text-secondary">
                  Threat <span className="font-bold text-amber">{loadout.threat}</span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(loadout.id)}
                    className={`${SMALL_BUTTON} border-gunmetal text-text-muted hover:border-warning-red hover:text-warning-red`}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(loadout.id)}
                    className={`${SMALL_BUTTON} border-cyan text-cyan hover:bg-cyan/10`}
                  >
                    Edit ships
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

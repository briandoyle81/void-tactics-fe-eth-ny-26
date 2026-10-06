"use client";

import React from "react";

interface GamesListShellProps {
  isAuthenticated: boolean;
  authRequiredMessage: string;
  isLoading: boolean;
  error?: string | null;
  count: number;
  /** PvE (campaign/roguelike) games are hidden unless this is on. */
  showPve: boolean;
  onShowPveChange: (show: boolean) => void;
  /** How many PvE games the current filter is hiding. */
  hiddenPveCount: number;
  children: React.ReactNode;
}

export const GamesListShell: React.FC<GamesListShellProps> = ({
  isAuthenticated,
  authRequiredMessage,
  isLoading,
  error,
  count,
  showPve,
  onShowPveChange,
  hiddenPveCount,
  children,
}) => {
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-text-muted">{authRequiredMessage}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>
        <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse">
          &gt;&gt; ACQUIRING ENGAGEMENT DATA...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>
        <p className="text-warning-red font-mono text-sm">
          [ERR] Data acquisition failure: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
          <input
            type="checkbox"
            checked={showPve}
            onChange={(e) => onShowPveChange(e.target.checked)}
            className="accent-cyan"
          />
          Show PvE missions
        </label>
      </div>

      {count === 0 ? (
        <div className="py-8 text-text-muted font-mono text-sm">
          <span className="tracking-widest">
            [NO ENGAGEMENTS ON RECORD] — Deploy a fleet and enter the fray.
          </span>
          {hiddenPveCount > 0 && (
            <div className="mt-2 text-xs tracking-widest">
              {"// "}
              {hiddenPveCount} PVE MISSION{hiddenPveCount !== 1 ? "S" : ""} HIDDEN
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="font-mono text-xs text-text-muted tracking-widest">
            {"// "}
            {count} ENGAGEMENT{count !== 1 ? "S" : ""} ON RECORD
            {hiddenPveCount > 0 && ` · ${hiddenPveCount} PVE HIDDEN`}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

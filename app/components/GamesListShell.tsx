"use client";

import React from "react";

interface GamesListShellProps {
  isAuthenticated: boolean;
  authRequiredMessage: string;
  isLoading: boolean;
  error?: string | null;
  count: number;
  children: React.ReactNode;
}

export const GamesListShell: React.FC<GamesListShellProps> = ({
  isAuthenticated,
  authRequiredMessage,
  isLoading,
  error,
  count,
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
      <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>

      {count === 0 ? (
        <div className="py-8 text-text-muted font-mono text-sm">
          <span className="tracking-widest">
            [NO ENGAGEMENTS ON RECORD] — Deploy a fleet and enter the fray.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="font-mono text-xs text-text-muted tracking-widest">
            {"// "}
            {count} ENGAGEMENT{count !== 1 ? "S" : ""} ON RECORD
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

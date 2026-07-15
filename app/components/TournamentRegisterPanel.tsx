"use client";

import React from "react";

interface TournamentRegisterAuthPromptProps {
  message: string;
}

export function TournamentRegisterAuthPrompt({ message }: TournamentRegisterAuthPromptProps) {
  return (
    <div className="border border-gunmetal p-4 text-center text-sm text-text-muted font-mono">
      {message}
    </div>
  );
}

export function TournamentRegisteredBadge() {
  return (
    <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 text-center font-mono">
      <span className="text-phosphor-green text-sm tracking-wider">✓ REGISTERED</span>
    </div>
  );
}

interface TournamentRegisterPanelProps {
  infoSection: React.ReactNode;
  isFull: boolean;
  isBusy: boolean;
  busyLabel: string;
  renderRegisterAction: () => React.ReactNode;
  error: string | null;
}

// Shared by TournamentRegister.tsx (web3) and TournamentRegisterWeb2.tsx
// (web2) — the entry-fee/full/busy/action/error body shown once the viewer
// is authenticated and not yet registered. Only rendered by callers after
// they've handled the not-authenticated / already-registered cases
// themselves (via TournamentRegisterAuthPrompt / TournamentRegisteredBadge
// above), so any narrowed identity the register action closes over (e.g.
// web3's `address`) stays correctly narrowed by the caller's own control
// flow. `renderRegisterAction` is a render function (not a plain node) so
// it's only evaluated once actually shown — matching the original code,
// which never built the World ID widget/button JSX before that point.
export function TournamentRegisterPanel({
  infoSection,
  isFull,
  isBusy,
  busyLabel,
  renderRegisterAction,
  error,
}: TournamentRegisterPanelProps) {
  return (
    <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 font-mono">
      {infoSection}

      {isFull ? (
        <div className="text-center text-xs text-warning-red">Tournament is full.</div>
      ) : isBusy ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
          <span className="text-xs text-text-muted">{busyLabel}</span>
        </div>
      ) : (
        renderRegisterAction()
      )}

      {error && <p className="mt-3 text-xs text-warning-red leading-relaxed">{error}</p>}
    </div>
  );
}

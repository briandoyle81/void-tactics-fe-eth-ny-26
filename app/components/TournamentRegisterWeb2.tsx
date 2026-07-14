"use client";

import { useState, useCallback } from "react";
import { useTournamentActionsWeb2 } from "../hooks/useTournamentActionsWeb2";
import { Web2TournamentState, type Web2TournamentConfig, type Web2TournamentSummary } from "../types/web2Tournament";

// Web2-mode counterpart to `TournamentRegister.tsx` — this is the actual
// World-ID-swap. No proof widget: sybil resistance is "one registration per
// Google account," enforced entirely server-side (a NextAuth session plus a
// unique DB constraint), so registering is just a single button + API call.
interface Props {
  tournamentId: number;
  config: Web2TournamentConfig;
  summary: Web2TournamentSummary;
  isRegistered: boolean;
  isLoggedIn: boolean;
  onSuccess: () => void;
}

export function TournamentRegisterWeb2({ tournamentId, config, summary, isRegistered, isLoggedIn, onSuccess }: Props) {
  const actions = useTournamentActionsWeb2();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      await actions.register(tournamentId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }, [actions, tournamentId, onSuccess]);

  if (summary.state !== Web2TournamentState.Registration) return null;

  if (!isLoggedIn) {
    return (
      <div className="border border-gunmetal p-4 text-center text-sm text-text-muted font-mono">
        Sign in to register.
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 text-center font-mono">
        <span className="text-phosphor-green text-sm tracking-wider">✓ REGISTERED</span>
      </div>
    );
  }

  const isFull = summary.registrantCount >= config.maxPlayers;

  return (
    <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 font-mono">
      <p className="mb-4 text-xs text-text-muted leading-relaxed">
        Entry fee: <span className="text-phosphor-green font-bold">{config.entryFee > 0 ? `${config.entryFee} credits` : "FREE"}</span>
      </p>

      {isFull ? (
        <div className="text-center text-xs text-warning-red">Tournament is full.</div>
      ) : pending ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
          <span className="text-xs text-text-muted">Submitting registration…</span>
        </div>
      ) : (
        <button
          onClick={() => void handleRegister()}
          className="w-full border border-phosphor-green py-2 text-sm font-bold tracking-wider text-phosphor-green hover:bg-phosphor-green/10 transition-colors font-mono"
        >
          Register
        </button>
      )}

      {error && <p className="mt-3 text-xs text-warning-red leading-relaxed">{error}</p>}
    </div>
  );
}

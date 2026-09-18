"use client";

import { useState } from "react";
import { useTournamentActions } from "../hooks/useTournamentActions";
import { TournamentState } from "../types/types";

interface Props {
  tournamentId: bigint;
  state: TournamentState;
  onAction: () => void;
}

// Shared Registration -> Starting (-> reroll) controls, used by both the
// tournament list detail view (Tournaments.tsx) and the standalone
// /tournaments/[tournamentId] page — previously duplicated between the two.
// See docs/update/Frontend_Updates_2026-09-17.md §3.
export function TournamentStartControls({ tournamentId, state, onAction }: Props) {
  const actions = useTournamentActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once buildBracket() reverts ShuffleWindowExpired — the reveal
  // window (10 min) lapsed before anyone called it. rerollBracketShuffle()
  // is the only recovery: it requests fresh randomness and resets the
  // window, after which buildBracket() becomes callable again.
  const [needsReroll, setNeedsReroll] = useState(false);

  // start() already waits for its own receipt and auto-retries
  // buildBracket() for a bit (useTournamentActions.startAndBuildBracket) —
  // returns void, not a hash, and a timed-out auto-retry must not surface
  // as an error since start() itself already succeeded.
  const runStart = async () => {
    setPending(true);
    setError(null);
    try {
      await actions.startAndBuildBracket(tournamentId);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  };

  const runBuildBracket = async () => {
    setPending(true);
    setError(null);
    try {
      const hash = await actions.buildBracket(tournamentId);
      if (actions.publicClient) {
        await actions.publicClient.waitForTransactionReceipt({ hash });
      }
      onAction();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("ShuffleWindowExpired")) {
        setNeedsReroll(true);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  };

  const runReroll = async () => {
    setPending(true);
    setError(null);
    try {
      const hash = await actions.rerollBracketShuffle(tournamentId);
      if (actions.publicClient) {
        await actions.publicClient.waitForTransactionReceipt({ hash });
      }
      setNeedsReroll(false);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reroll failed");
    } finally {
      setPending(false);
    }
  };

  if (state === TournamentState.Registration) {
    return (
      <div className="mb-6">
        <button
          disabled={pending}
          onClick={() => void runStart()}
          className="border border-gunmetal/60 px-4 py-2 text-xs text-text-muted hover:border-steel hover:text-text-secondary transition-colors disabled:opacity-50"
        >
          {pending ? "Starting…" : "Start Tournament"}
        </button>
        <p className="mt-1 text-[10px] text-text-muted">
          Anyone can start once conditions are met (full roster or past deadline + min players).
        </p>
        {error && <p className="text-xs text-warning-red mt-2 break-words">{error}</p>}
      </div>
    );
  }

  if (state === TournamentState.Starting) {
    return (
      <div className="mb-6 border border-cyan/30 bg-cyan/5 p-4">
        {needsReroll ? (
          <>
            <div className="text-xs text-cyan mb-2">
              The reveal window expired before the shuffle was built. Anyone can
              reroll it to request a fresh pairing.
            </div>
            <button
              disabled={pending}
              onClick={() => void runReroll()}
              className="border border-cyan px-4 py-2 text-xs text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
            >
              {pending ? "Rerolling…" : "Reroll Shuffle"}
            </button>
          </>
        ) : (
          <>
            <div className="text-xs text-cyan mb-2">
              Shuffling round-1 pairings… this needs one more transaction a
              few seconds after Start. Anyone can trigger it.
            </div>
            <button
              disabled={pending}
              onClick={() => void runBuildBracket()}
              className="border border-cyan px-4 py-2 text-xs text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
            >
              {pending ? "Building…" : "Build Bracket"}
            </button>
          </>
        )}
        {error && <p className="text-xs text-warning-red mt-2 break-words">{error}</p>}
      </div>
    );
  }

  return null;
}

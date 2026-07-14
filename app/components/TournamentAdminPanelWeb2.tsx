"use client";

import { useState, useCallback } from "react";
import { useTournamentAdminWeb2 } from "../hooks/useTournamentAdminWeb2";
import { Web2TournamentState, type Web2TournamentSummary, type Web2TournamentMatch } from "../types/web2Tournament";

// Web2-mode counterpart to `TournamentAdminPanel.tsx`. One deliberate
// difference from web3's "Resolve as Draw" (which force-resolves a stuck
// match with no winner selection): the API here requires an explicit
// winner, so the stuck-match fallback is two "X wins" buttons instead of
// one "resolve as draw" button — a single-elimination bracket needs
// someone to advance either way, and letting the creator just pick is
// simpler than reproducing web3's unclear "draw" semantics.
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

interface MatchRowProps {
  match: Web2TournamentMatch;
  tournamentId: number;
  onAction: () => void;
}

function MatchAdminRow({ match, tournamentId, onAction }: MatchRowProps) {
  const admin = useTournamentAdminWeb2();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsLobby = !!match.player1Id && !!match.player2Id && !match.resolved && match.lobbyId === null;
  const isStuck = !!match.player1Id && !!match.player2Id && !match.resolved && match.lobbyId !== null;

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setPending(true);
      setError(null);
      try {
        await fn();
        onAction();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setPending(false);
      }
    },
    [onAction],
  );

  if (!needsLobby && !isStuck) return null;

  return (
    <div className="border border-gunmetal/40 p-3 text-xs font-mono">
      <div className="text-text-muted mb-1">
        R{match.round + 1} · M{match.id} ·{" "}
        <span className="text-text-secondary">{truncateId(match.player1Id!)}</span> vs{" "}
        <span className="text-text-secondary">{truncateId(match.player2Id!)}</span>
      </div>

      {needsLobby && (
        <button
          disabled={pending}
          onClick={() => void run(() => admin.createMatchLobby(tournamentId, match.id))}
          className="border border-phosphor-green/50 px-3 py-1 text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Lobby & Assign"}
        </button>
      )}

      {isStuck && (
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => void run(() => admin.resolveMatch(tournamentId, match.id, match.player1Id!))}
            className="border border-warning-red/50 px-3 py-1 text-warning-red hover:border-warning-red hover:bg-warning-red/5 transition-colors disabled:opacity-50"
          >
            {truncateId(match.player1Id!)} wins
          </button>
          <button
            disabled={pending}
            onClick={() => void run(() => admin.resolveMatch(tournamentId, match.id, match.player2Id!))}
            className="border border-warning-red/50 px-3 py-1 text-warning-red hover:border-warning-red hover:bg-warning-red/5 transition-colors disabled:opacity-50"
          >
            {truncateId(match.player2Id!)} wins
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-warning-red text-[10px] break-words">{error}</p>}
    </div>
  );
}

interface Props {
  tournamentId: number;
  currentUserId: string | null;
  summary: Web2TournamentSummary;
  bracket: Web2TournamentMatch[];
  onAction: () => void;
}

export function TournamentAdminPanelWeb2({ tournamentId, currentUserId, summary, bracket, onAction }: Props) {
  const admin = useTournamentAdminWeb2();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUserId || currentUserId !== summary.creator) return null;

  const allResolved = bracket.length > 0 && bracket.every((m) => m.resolved);
  const canFinalize = allResolved && summary.state === Web2TournamentState.Active;

  const runFinalize = async () => {
    setPending(true);
    setError(null);
    try {
      await admin.finalize(tournamentId);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalize failed");
    } finally {
      setPending(false);
    }
  };

  const actionableMatches = bracket.filter((m) => !!m.player1Id && !!m.player2Id && !m.resolved);

  return (
    <div className="border border-phosphor-green/20 bg-phosphor-green/5 p-4 font-mono">
      <div className="text-xs uppercase tracking-widest text-phosphor-green/70 mb-3">Admin Panel</div>

      {actionableMatches.length === 0 && !canFinalize && (
        <p className="text-xs text-text-muted">No pending actions.</p>
      )}

      {actionableMatches.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {actionableMatches.map((m) => (
            <MatchAdminRow key={m.id} match={m} tournamentId={tournamentId} onAction={onAction} />
          ))}
        </div>
      )}

      {canFinalize && (
        <div>
          <button
            disabled={pending}
            onClick={() => void runFinalize()}
            className="w-full border border-phosphor-green py-2 text-sm font-bold text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
          >
            {pending ? "Finalizing…" : "Finalize Tournament"}
          </button>
          {error && <p className="mt-2 text-xs text-warning-red break-words">{error}</p>}
        </div>
      )}
    </div>
  );
}

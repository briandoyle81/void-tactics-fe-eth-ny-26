"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useTournamentAdmin } from "../hooks/useTournamentAdmin";
import type { TournamentConfig, TournamentMatch, TournamentSummary } from "../types/types";
import { TournamentState } from "../types/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface MatchRowProps {
  match: TournamentMatch;
  tournamentId: bigint;
  config: TournamentConfig;
  onAction: () => void;
}

function MatchAdminRow({ match, tournamentId, config, onAction }: MatchRowProps) {
  const admin = useTournamentAdmin();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsLobby =
    match.player1 !== ZERO_ADDRESS &&
    match.player2 !== ZERO_ADDRESS &&
    !match.resolved &&
    match.gameId === 0n;

  const isDraw =
    match.player1 !== ZERO_ADDRESS &&
    match.player2 !== ZERO_ADDRESS &&
    !match.resolved &&
    match.gameId !== 0n;

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setPending(true);
      setError(null);
      try {
        await fn();
        onAction();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed");
      } finally {
        setPending(false);
      }
    },
    [onAction],
  );

  if (!needsLobby && !isDraw) return null;

  return (
    <div className="border border-gunmetal/40 p-3 text-xs font-mono">
      <div className="text-text-muted mb-1">
        R{match.round + 1} · M{String(match.matchId)} ·{" "}
        <span className="text-secondary">{shortAddr(match.player1)}</span> vs{" "}
        <span className="text-secondary">{shortAddr(match.player2)}</span>
      </div>

      {needsLobby && (
        <button
          disabled={pending}
          onClick={() =>
            void run(() =>
              admin.createMatchLobby(
                tournamentId,
                match.matchId,
                match.player1,
                match.player2,
                config,
              ),
            )
          }
          className="border border-phosphor-green/50 px-3 py-1 text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Lobby & Assign"}
        </button>
      )}

      {isDraw && (
        <button
          disabled={pending}
          onClick={() =>
            void run(() => admin.resolveDraw(tournamentId, match.matchId))
          }
          className="border border-warning-red/50 px-3 py-1 text-warning-red hover:border-warning-red hover:bg-warning-red/5 transition-colors disabled:opacity-50"
        >
          {pending ? "Resolving…" : "Resolve as Draw"}
        </button>
      )}

      {error && <p className="mt-1 text-warning-red text-[10px] break-words">{error}</p>}
    </div>
  );
}

interface Props {
  tournamentId: bigint;
  config: TournamentConfig;
  summary: TournamentSummary;
  bracket: TournamentMatch[];
  onAction: () => void;
}

export function TournamentAdminPanel({ tournamentId, config, summary, bracket, onAction }: Props) {
  const { address } = useAccount();
  const admin = useTournamentAdmin();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address || address.toLowerCase() !== summary.creator.toLowerCase()) return null;

  const allResolved = bracket.length > 0 && bracket.every((m) => m.resolved);
  const canFinalize = allResolved && summary.state === TournamentState.Active;

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

  const actionableMatches = bracket.filter(
    (m) =>
      m.player1 !== ZERO_ADDRESS &&
      m.player2 !== ZERO_ADDRESS &&
      !m.resolved,
  );

  return (
    <div className="border border-phosphor-green/20 bg-phosphor-green/5 p-4 font-mono">
      <div className="text-xs uppercase tracking-widest text-phosphor-green/70 mb-3">
        Admin Panel
      </div>

      {actionableMatches.length === 0 && !canFinalize && (
        <p className="text-xs text-text-muted">No pending actions.</p>
      )}

      {actionableMatches.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {actionableMatches.map((m) => (
            <MatchAdminRow
              key={String(m.matchId)}
              match={m}
              tournamentId={tournamentId}
              config={config}
              onAction={onAction}
            />
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

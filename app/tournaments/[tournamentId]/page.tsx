"use client";

import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useTournament } from "../../hooks/useTournament";
import { useTournamentActions } from "../../hooks/useTournamentActions";
import { TournamentRegister } from "../../components/TournamentRegister";
import { TournamentBracket } from "../../components/TournamentBracket";
import { TournamentAdminPanel } from "../../components/TournamentAdminPanel";
import { TournamentState } from "../../types/types";

const STATE_LABELS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "Registration Open",
  [TournamentState.Starting]: "Building Bracket…",
  [TournamentState.Active]: "In Progress",
  [TournamentState.Complete]: "Complete",
  [TournamentState.Cancelled]: "Cancelled",
};

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = BigInt(params.tournamentId as string);
  const { address } = useAccount();
  const { config, summary, bracket, isRegistered, winnings, isLoading, refetch } =
    useTournament(tournamentId);
  const actions = useTournamentActions();
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // For actions that return a tx hash (register/cancel/claim*/buildBracket) —
  // waits for the receipt before refetching. Previously this didn't wait at
  // all, refetching essentially immediately after the wallet returned the
  // hash, before the tx was even mined; fixed here since startAndBuildBracket
  // below needed the same publicClient wiring anyway.
  const run = useCallback(
    async (fn: () => Promise<`0x${string}`>) => {
      setActionPending(true);
      setActionError(null);
      try {
        const hash = await fn();
        if (actions.publicClient) {
          await actions.publicClient.waitForTransactionReceipt({ hash });
        }
        void refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Transaction failed");
      } finally {
        setActionPending(false);
      }
    },
    [refetch, actions],
  );

  // Start is its own handler, not routed through run() above: it already
  // waits for its own start() receipt internally and then auto-retries
  // buildBracket() for a bit (see useTournamentActions.startAndBuildBracket)
  // — it returns void, not a hash, and must not surface a timed-out
  // auto-retry as an error since start() itself already succeeded.
  const runStart = useCallback(async () => {
    setActionPending(true);
    setActionError(null);
    try {
      await actions.startAndBuildBracket(tournamentId);
      void refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setActionPending(false);
    }
  }, [actions, tournamentId, refetch]);

  if (isLoading || !summary || !config) {
    return (
      <div className="flex items-center justify-center py-24 font-mono text-xs text-text-muted gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
        Loading tournament…
      </div>
    );
  }

  const stateLabel = STATE_LABELS[summary.state] ?? "Unknown";
  const prizeEth = summary.prizePool > 0n ? formatEther(summary.prizePool) : null;
  const registrantsFilled = `${String(summary.registrantCount)} / ${config.maxPlayers}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-mono">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-text-muted mb-1">
          Tournament #{String(tournamentId)} · {stateLabel}
        </div>
        <div className="flex flex-wrap gap-4 text-xs mt-3">
          {prizeEth && (
            <div>
              <span className="text-text-muted">Prize pool </span>
              <span className="text-phosphor-green font-bold">{prizeEth} ETH</span>
            </div>
          )}
          <div>
            <span className="text-text-muted">Players </span>
            <span className="text-secondary">{registrantsFilled}</span>
          </div>
          {config.entryFee > 0n && (
            <div>
              <span className="text-text-muted">Entry </span>
              <span className="text-secondary">{formatEther(config.entryFee)} ETH</span>
            </div>
          )}
        </div>
      </div>

      {/* Register */}
      <div className="mb-6">
        <TournamentRegister
          tournamentId={tournamentId}
          config={config}
          summary={summary}
          isRegistered={isRegistered}
          onSuccess={() => void refetch()}
        />
      </div>

      {/* Start button (permissionless once conditions met) */}
      {summary.state === TournamentState.Registration && (
        <div className="mb-6">
          <button
            disabled={actionPending}
            onClick={() => void runStart()}
            className="border border-gunmetal/60 px-4 py-2 text-xs text-text-muted hover:border-steel hover:text-secondary transition-colors disabled:opacity-50"
          >
            {actionPending ? "Starting…" : "Start Tournament"}
          </button>
          <p className="mt-1 text-[10px] text-text-muted">
            Anyone can start when conditions are met (full or past deadline + min players).
          </p>
        </div>
      )}

      {/* Building bracket (start() succeeded, buildBracket() reveals the
          round-1 pairing shuffle and hasn't landed yet — usually the Start
          button above already auto-retries this; shown as a manual
          fallback for anyone viewing the page if that auto-retry window
          closes, e.g. the starter's tab closed). Permissionless — not
          gated to whoever clicked Start. */}
      {summary.state === TournamentState.Starting && (
        <div className="mb-6 border border-cyan/30 bg-cyan/5 p-4">
          <div className="text-xs text-cyan mb-2">
            Shuffling round-1 pairings… this needs one more transaction a
            few seconds after Start. Anyone can trigger it.
          </div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.buildBracket(tournamentId))}
            className="border border-cyan px-4 py-2 text-xs text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
          >
            {actionPending ? "Building…" : "Build Bracket"}
          </button>
        </div>
      )}

      {/* Bracket */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Bracket</div>
        <TournamentBracket
          tournamentId={tournamentId}
          bracket={bracket}
          isBuildingBracket={summary.state === TournamentState.Starting}
        />
      </div>

      {/* Admin panel */}
      <div className="mb-6">
        <TournamentAdminPanel
          tournamentId={tournamentId}
          config={config}
          summary={summary}
          bracket={bracket}
          onAction={() => void refetch()}
        />
      </div>

      {/* Claim prize */}
      {winnings > 0n && address && (
        <div className="mb-4 border border-phosphor-green/30 bg-phosphor-green/5 p-4">
          <div className="text-xs text-phosphor-green mb-2 font-bold">
            You have {formatEther(winnings)} ETH to claim!
          </div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.claimPrize(tournamentId))}
            className="border border-phosphor-green py-2 px-4 text-sm font-bold text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
          >
            {actionPending ? "Claiming…" : "Claim Prize"}
          </button>
        </div>
      )}

      {/* Claim refund */}
      {summary.state === TournamentState.Cancelled && isRegistered && (
        <div className="mb-4 border border-gunmetal/60 p-4">
          <div className="text-xs text-text-muted mb-2">
            Tournament was cancelled. Claim your entry fee refund.
          </div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.claimRefund(tournamentId))}
            className="border border-gunmetal/60 py-2 px-4 text-xs text-secondary hover:border-steel transition-colors disabled:opacity-50"
          >
            {actionPending ? "Claiming…" : "Claim Refund"}
          </button>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-warning-red mt-2 break-words">{actionError}</p>
      )}
    </div>
  );
}

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
import { TournamentStartControls } from "../../components/TournamentStartControls";
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

      {/* Start / building bracket / reroll — shared with the tournament
          list's detail view (TournamentStartControls). */}
      <TournamentStartControls
        tournamentId={tournamentId}
        state={summary.state}
        onAction={() => void refetch()}
      />

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

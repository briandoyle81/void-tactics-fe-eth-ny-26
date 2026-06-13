"use client";

import {
  IDKitRequestWidget,
  orbLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useState, useCallback } from "react";
import { WORLD_APP_ID, WORLD_ACTION } from "../config/tournament";
import { useTournamentActions } from "../hooks/useTournamentActions";
import type { TournamentConfig, TournamentSummary } from "../types/types";
import { TournamentState } from "../types/types";

// IDKit v4: with orbLegacy + allow_legacy_proofs=true the result is IDKitResultV3.
// responses[0] carries { proof, merkle_root, nullifier } for on-chain semaphore verification.
function extractProofFields(result: IDKitResult): {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
} | null {
  if ("responses" in result && Array.isArray(result.responses) && result.responses.length > 0) {
    const r = result.responses[0] as { proof: string; merkle_root: string; nullifier: string };
    return { merkle_root: r.merkle_root, nullifier_hash: r.nullifier, proof: r.proof };
  }
  return null;
}

const REVERT_MESSAGES: Record<string, string> = {
  AlreadyRegistered: "You're already registered for this tournament.",
  NullifierUsed: "This World ID has already registered for this tournament.",
  WrongEntryFee: "Incorrect entry fee — please try again.",
  RegistrationFull: "Tournament is full.",
  RegistrationClosed: "Registration has closed.",
};

function parseRevertMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [revert, friendly] of Object.entries(REVERT_MESSAGES)) {
    if (msg.includes(revert)) return friendly;
  }
  return "Registration failed. Please try again.";
}

interface Props {
  tournamentId: bigint;
  config: TournamentConfig;
  summary: TournamentSummary;
  isRegistered: boolean;
  onSuccess: () => void;
}

export function TournamentRegister({
  tournamentId,
  config,
  summary,
  isRegistered,
  onSuccess,
}: Props) {
  const { address } = useAccount();
  const actions = useTournamentActions();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [fetchingContext, setFetchingContext] = useState(false);

  const openWidget = useCallback(async () => {
    setError(null);
    setFetchingContext(true);
    try {
      const res = await fetch("/api/world-id/rp-context");
      if (!res.ok) throw new Error("Could not fetch proof context");
      const ctx = (await res.json()) as RpContext;
      setRpContext(ctx);
      setWidgetOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setFetchingContext(false);
    }
  }, []);

  const onVerified = useCallback(
    async (result: IDKitResult) => {
      if (!address) return;
      const fields = extractProofFields(result);
      if (!fields) {
        setError("Unexpected proof format from World ID.");
        return;
      }
      setError(null);
      setPending(true);
      try {
        await actions.register(tournamentId, config.entryFee, fields);
        onSuccess();
      } catch (err) {
        setError(parseRevertMessage(err));
      } finally {
        setPending(false);
        setRpContext(null);
      }
    },
    [actions, tournamentId, config.entryFee, address, onSuccess],
  );

  if (summary.state !== TournamentState.Registration) return null;

  if (!address) {
    return (
      <div className="border border-gunmetal p-4 text-center text-sm text-text-muted font-mono">
        Connect your wallet to register.
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

  const isFull = summary.registrantCount >= BigInt(config.maxPlayers);
  const entryFeeEth = config.entryFee > 0n ? formatEther(config.entryFee) : null;
  const isBusy = fetchingContext || pending;

  return (
    <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 font-mono">
      {entryFeeEth && (
        <p className="mb-3 text-xs text-text-muted">
          Entry fee:{" "}
          <span className="text-phosphor-green font-bold">{entryFeeEth} ETH</span>
        </p>
      )}
      <p className="mb-4 text-xs text-text-muted leading-relaxed">
        Verify your identity with World ID to register. One verification per tournament.
      </p>

      {isFull ? (
        <div className="text-center text-xs text-warning-red">Tournament is full.</div>
      ) : isBusy ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
          <span className="text-xs text-text-muted">
            {fetchingContext ? "Preparing verification…" : "Submitting registration…"}
          </span>
        </div>
      ) : (
        <>
          {rpContext && (
            <IDKitRequestWidget
              app_id={WORLD_APP_ID}
              action={WORLD_ACTION}
              rp_context={rpContext}
              allow_legacy_proofs={true}
              preset={orbLegacy({ signal: address })}
              open={widgetOpen}
              onOpenChange={setWidgetOpen}
              onSuccess={(r) => void onVerified(r)}
            />
          )}
          <button
            onClick={() => void openWidget()}
            className="w-full border border-phosphor-green py-2 text-sm font-bold tracking-wider text-phosphor-green hover:bg-phosphor-green/10 transition-colors font-mono"
          >
            Verify with World ID &amp; Register
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 text-xs text-warning-red leading-relaxed">{error}</p>
      )}
    </div>
  );
}

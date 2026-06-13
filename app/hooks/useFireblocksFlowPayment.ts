"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  createCheckoutTransaction,
  attachCheckoutTransactionSource,
  getCheckoutTransactionQuote,
  submitCheckoutTransaction,
  getCheckoutTransaction,
  getWalletAccounts,
} from "@dynamic-labs-sdk/client";
import { FLOW_USD_TIERS } from "@/app/config/flowPayment";

export type FlowPaymentStatus =
  | "idle"
  | "creating" // createCheckoutTransaction
  | "attaching" // attachCheckoutTransactionSource
  | "quoting" // getCheckoutTransactionQuote
  | "signing" // submitCheckoutTransaction (prepare + sign + broadcast)
  | "polling" // polling settlementState
  | "minting" // POST /api/flow/fulfill
  | "success"
  | "error";

export const FLOW_STEP_LABELS: Partial<Record<FlowPaymentStatus, string>> = {
  creating: "Initializing…",
  attaching: "Attaching wallet…",
  quoting: "Getting quote…",
  signing: "Sign in wallet…",
  polling: "Waiting for settlement…",
  minting: "Minting ships…",
};

const CHECKOUT_ID = process.env.NEXT_PUBLIC_FLOW_CHECKOUT_ID!;
const POLL_MS = 3000;
const MAX_POLLS = 100; // ~5 minutes

async function pollSettlement(transactionId: string): Promise<void> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_MS));
    const tx = await getCheckoutTransaction({ transactionId });
    if (tx.settlementState === "completed") return;
    if (
      tx.settlementState === "failed" ||
      tx.executionState === "failed" ||
      tx.executionState === "cancelled" ||
      tx.executionState === "expired"
    ) {
      throw new Error(
        `Payment failed: execution=${tx.executionState} settlement=${tx.settlementState}`,
      );
    }
  }
  throw new Error("Settlement timed out after 5 minutes");
}

export function useFireblocksFlowPayment() {
  const { address, chainId } = useAccount();
  const [status, setStatus] = useState<FlowPaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(
    async (
      tier: number,
      gameChainId: number,
      onSuccess: () => void,
    ): Promise<void> => {
      if (!address || !chainId) {
        setError("Wallet not connected");
        setStatus("error");
        return;
      }
      const flowTier = FLOW_USD_TIERS[tier];
      if (!flowTier) {
        setError("Invalid tier");
        setStatus("error");
        return;
      }
      setError(null);

      try {
        // Step 1: Create transaction — SDK stores session token internally for subsequent calls
        setStatus("creating");
        const { transaction } = await createCheckoutTransaction({
          amount: flowTier.actualAmount,
          currency: "USD",
          checkoutId: CHECKOUT_ID,
        });

        // Step 2: Attach source wallet
        setStatus("attaching");
        await attachCheckoutTransactionSource({
          transactionId: transaction.id,
          fromAddress: address,
          fromChainId: String(chainId),
          fromChainName: "EVM",
        });

        // Step 3: Quote with native token (default when fromTokenAddress is omitted)
        setStatus("quoting");
        await getCheckoutTransactionQuote({ transactionId: transaction.id });

        // Step 4: Prepare + sign + broadcast in one call; SDK handles chain switching and ERC-20 approvals
        setStatus("signing");
        const walletAccount = getWalletAccounts()[0];
        if (!walletAccount) throw new Error("No wallet account available");
        await submitCheckoutTransaction({
          transactionId: transaction.id,
          walletAccount,
          onStepChange: (step) => {
            if (step === "approval" || step === "transaction") setStatus("signing");
          },
        });

        // Step 5: Poll for settlement
        setStatus("polling");
        await pollSettlement(transaction.id);

        // Step 6: Mint ships on game chain via server
        setStatus("minting");
        const fulfillRes = await fetch("/api/flow/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: transaction.id,
            tier,
            buyerAddress: address,
            gameChainId,
          }),
        });
        if (!fulfillRes.ok) throw new Error(await fulfillRes.text());

        setStatus("success");
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    },
    [address, chainId],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { pay, status, error, reset };
}

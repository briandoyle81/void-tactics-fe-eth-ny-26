"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseAbi } from "viem";
import type { WalletClient, PublicClient } from "viem";

export type FlowPaymentStatus =
  | "idle"
  | "creating" // POST /api/flow/create-transaction
  | "attaching" // POST /sdk/.../source
  | "quoting" // POST /sdk/.../quote
  | "preparing" // POST /sdk/.../prepare
  | "signing" // wallet signs on-chain
  | "broadcasting" // POST /sdk/.../broadcast
  | "polling" // polling settlementState
  | "minting" // POST /api/flow/fulfill
  | "success"
  | "error";

export const FLOW_STEP_LABELS: Partial<Record<FlowPaymentStatus, string>> = {
  creating: "Initializing…",
  attaching: "Attaching wallet…",
  quoting: "Getting quote…",
  preparing: "Preparing transaction…",
  signing: "Sign in wallet…",
  broadcasting: "Broadcasting…",
  polling: "Waiting for settlement…",
  minting: "Minting ships…",
};

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const SDK = `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}`;

interface EVMSigningPayload {
  evmApproval?: {
    tokenAddress: `0x${string}`;
    spenderAddress: `0x${string}`;
    amount: string;
  };
  evmTransaction: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    gasLimit: string;
  };
}

export function useFireblocksFlowPayment() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<FlowPaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(
    async (
      tier: number,
      gameChainId: number,
      onSuccess: () => void,
    ): Promise<void> => {
      if (!address || !chainId || !walletClient || !publicClient) {
        setError("Wallet not connected");
        setStatus("error");
        return;
      }
      setError(null);

      try {
        // Step 2 via server: create transaction + store purchase intent
        setStatus("creating");
        const createRes = await fetch("/api/flow/create-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, buyerAddress: address, gameChainId }),
        });
        if (!createRes.ok) throw new Error(await createRes.text());
        const { transactionId, sessionToken } = (await createRes.json()) as {
          transactionId: string;
          sessionToken: string;
        };

        const dct = {
          "x-dynamic-checkout-session-token": sessionToken,
          "Content-Type": "application/json",
        };

        // Step 3: Attach source — user's current wallet + chain
        setStatus("attaching");
        const attachRes = await fetch(`${SDK}/transactions/${transactionId}/source`, {
          method: "POST",
          headers: dct,
          body: JSON.stringify({
            sourceType: "wallet",
            fromAddress: address,
            fromChainId: String(chainId),
            fromChainName: "EVM",
          }),
        });
        if (!attachRes.ok) throw new Error(await attachRes.text());

        // Step 4: Quote — pay with native token on the user's current chain
        setStatus("quoting");
        const quoteRes = await fetch(`${SDK}/transactions/${transactionId}/quote`, {
          method: "POST",
          headers: dct,
          // native token on any EVM chain
          body: JSON.stringify({
            fromTokenAddress: "0x0000000000000000000000000000000000000000",
          }),
        });
        const quoted = (await quoteRes.json()) as { executionState: string };
        if (quoted.executionState !== "quoted") {
          throw new Error(`Quote failed: state=${quoted.executionState}`);
        }

        // Step 5: Prepare — lock in quote, assert balances
        setStatus("preparing");
        const prepareRes = await fetch(
          `${SDK}/transactions/${transactionId}/prepare`,
          {
            method: "POST",
            headers: dct,
            body: JSON.stringify({
              assertBalanceForGasCost: true,
              assertBalanceForTransferAmount: true,
            }),
          },
        );
        const prepared = (await prepareRes.json()) as {
          quote?: { signingPayload?: EVMSigningPayload };
        };

        const payload = prepared.quote?.signingPayload;
        if (!payload?.evmTransaction) {
          throw new Error("No EVM signing payload returned from prepare");
        }

        // Step 6: Sign and broadcast on-chain via wagmi
        setStatus("signing");
        const txHash = await signEVM(walletClient, publicClient, payload);

        // Step 7: Notify Fireblocks Flow of the broadcast
        setStatus("broadcasting");
        const broadcastRes = await fetch(
          `${SDK}/transactions/${transactionId}/broadcast`,
          {
            method: "POST",
            headers: dct,
            body: JSON.stringify({ txHash }),
          },
        );
        if (!broadcastRes.ok) throw new Error(await broadcastRes.text());

        // Step 8: Poll until settled
        setStatus("polling");
        await pollSettlement(transactionId);

        // Mint ships on the game chain via server route
        setStatus("minting");
        const fulfillRes = await fetch("/api/flow/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        });
        if (!fulfillRes.ok) throw new Error(await fulfillRes.text());

        setStatus("success");
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    },
    [address, chainId, walletClient, publicClient],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { pay, status, error, reset };
}

async function signEVM(
  walletClient: WalletClient,
  publicClient: PublicClient,
  payload: EVMSigningPayload,
): Promise<`0x${string}`> {
  const account = walletClient.account!;
  const chain = walletClient.chain;

  if (payload.evmApproval) {
    const { tokenAddress, spenderAddress, amount } = payload.evmApproval;
    const approvalHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: parseAbi(["function approve(address, uint256) returns (bool)"]),
      functionName: "approve",
      args: [spenderAddress, BigInt(amount)],
      account,
      chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }
  return walletClient.sendTransaction({
    to: payload.evmTransaction.to,
    data: payload.evmTransaction.data,
    value: BigInt(payload.evmTransaction.value ?? "0x0"),
    gas: BigInt(payload.evmTransaction.gasLimit),
    account,
    chain,
  });
}

const POLL_MS = 3000;
const MAX_POLLS = 100; // ~5 minutes

async function pollSettlement(transactionId: string): Promise<void> {
  const url = `${SDK}/transactions/${transactionId}`;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_MS));
    const tx = (await fetch(url).then((r) => r.json())) as {
      settlementState: string;
      executionState: string;
    };
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

"use client";

import { useCallback, useReducer, useRef } from "react";
import { useAccount } from "wagmi";
import {
  createCheckoutTransaction,
  attachCheckoutTransactionSource,
  getCheckoutTransactionQuote,
  prepareCheckoutTransaction,
  broadcastCheckoutTransaction,
  getCheckoutTransaction,
  type CheckoutTransactionQuote,
} from "@dynamic-labs-sdk/client";
import { createPublicClient, http, formatUnits } from "viem";
import { mainnet, base, polygon, arbitrum, optimism } from "viem/chains";
import { FLOW_USD_TIERS } from "@/app/config/flowPayment";

const CHECKOUT_ID = process.env.NEXT_PUBLIC_FLOW_CHECKOUT_ID!;

// ── EIP-6963 wallet detection ─────────────────────────────────────────────────

interface Eip6963ProviderInfo {
  rdns: string;
  name: string;
  icon: string;
  uuid?: string;
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface PaymentWalletOption {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

interface ConnectedPaymentWallet {
  address: string;
  provider: Eip1193Provider;
}

// ── Token balance type (replaces @dynamic-labs/sdk-api-core TokenBalance) ────

export interface PaymentTokenBalance {
  address: string;    // "0x000...000" for native
  symbol: string;
  decimals: number;
  balance: number;    // human-readable units
  networkId: number;
  marketValue: number;
}

// ── Payment network config ─────────────────────────────────────────────────────

const PAYMENT_CHAINS = [
  { viemChain: mainnet, id: 1, name: "Ethereum", nativeSymbol: "ETH", priceId: "ethereum" },
  { viemChain: base, id: 8453, name: "Base", nativeSymbol: "ETH", priceId: "ethereum" },
  { viemChain: polygon, id: 137, name: "Polygon", nativeSymbol: "POL", priceId: "matic-network" },
  { viemChain: arbitrum, id: 42161, name: "Arbitrum", nativeSymbol: "ETH", priceId: "ethereum" },
  { viemChain: optimism, id: 10, name: "Optimism", nativeSymbol: "ETH", priceId: "ethereum" },
] as const;

export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  PAYMENT_CHAINS.map(({ id, name }) => [id, name]),
);

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

async function fetchMultichainBalances(address: string): Promise<PaymentTokenBalance[]> {
  // Fetch token prices for all native currencies
  let prices: Record<string, number> = { ethereum: 3000, "matic-network": 0.5 };
  try {
    const priceIds = [...new Set(PAYMENT_CHAINS.map((c) => c.priceId))].join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${priceIds}&vs_currencies=usd`,
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, { usd: number }>;
      for (const [id, val] of Object.entries(data)) prices[id] = val.usd;
    }
  } catch {
    // use fallback prices
  }

  const results = await Promise.allSettled(
    PAYMENT_CHAINS.map(async (chain) => {
      const client = createPublicClient({ chain: chain.viemChain, transport: http() });
      const raw = await client.getBalance({ address: address as `0x${string}` });
      if (raw === 0n) return null;
      const balance = parseFloat(formatUnits(raw, 18));
      const usdPrice = prices[chain.priceId] ?? 0;
      return {
        address: NATIVE_ADDRESS,
        symbol: chain.nativeSymbol,
        decimals: 18,
        balance,
        networkId: chain.id,
        marketValue: balance * usdPrice,
      } satisfies PaymentTokenBalance;
    }),
  );

  const out: PaymentTokenBalance[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) out.push(r.value as PaymentTokenBalance);
  }
  return out.sort((a, b) => b.marketValue - a.marketValue);
}

const isNativeToken = (addr: string) =>
  !addr ||
  addr === "0x0000000000000000000000000000000000000000" ||
  addr.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// ── EVM helpers ───────────────────────────────────────────────────────────────

function encodeApprove(spender: string, amount: string): string {
  const selector = "095ea7b3";
  const addr = spender.toLowerCase().replace("0x", "").padStart(64, "0");
  const amt = BigInt(amount).toString(16).padStart(64, "0");
  return `0x${selector}${addr}${amt}`;
}

async function waitForReceipt(
  provider: Eip1193Provider,
  txHash: string,
  maxWaitMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return;
  }
  throw new Error("Approval transaction timed out");
}

// ── Settlement polling ────────────────────────────────────────────────────────

const POLL_MS = 3000;
const MAX_POLLS = 100;

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

// ── State machine ─────────────────────────────────────────────────────────────

export type FlowModalStep =
  | "closed"
  | "connect-wallet"
  | "loading-balances"
  | "select-token"
  | "no-balances"
  | "creating"
  | "attaching"
  | "quoting"
  | "confirming"
  | "approving"
  | "signing"
  | "polling"
  | "minting"
  | "success"
  | "error";

interface State {
  step: FlowModalStep;
  tier: number;
  gameChainId: number;
  walletOptions: PaymentWalletOption[];
  walletOptionsLoaded: boolean;
  paymentWallet: ConnectedPaymentWallet | null;
  balances: PaymentTokenBalance[];
  selectedToken: PaymentTokenBalance | null;
  transactionId: string | null;
  quote: CheckoutTransactionQuote | null;
  error: string | null;
}

type Action =
  | { type: "OPEN"; tier: number; gameChainId: number }
  | { type: "WALLET_OPTIONS_LOADED"; options: PaymentWalletOption[] }
  | { type: "CONNECTING" }
  | { type: "WALLET_CONNECTED"; wallet: ConnectedPaymentWallet }
  | { type: "BALANCES_LOADED"; balances: PaymentTokenBalance[] }
  | { type: "NO_BALANCES" }
  | { type: "TOKEN_SELECTED"; token: PaymentTokenBalance }
  | { type: "STEP"; step: FlowModalStep }
  | { type: "TX_CREATED"; transactionId: string }
  | { type: "QUOTE_READY"; quote: CheckoutTransactionQuote }
  | { type: "ERROR"; error: string }
  | { type: "CLOSE" }
  | { type: "RETRY" };

const INITIAL: State = {
  step: "closed",
  tier: 0,
  gameChainId: 0,
  walletOptions: [],
  walletOptionsLoaded: false,
  paymentWallet: null,
  balances: [],
  selectedToken: null,
  transactionId: null,
  quote: null,
  error: null,
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "OPEN":
      return { ...INITIAL, step: "connect-wallet", tier: a.tier, gameChainId: a.gameChainId };
    case "WALLET_OPTIONS_LOADED":
      return { ...s, walletOptions: a.options, walletOptionsLoaded: true };
    case "CONNECTING":
      return { ...s, step: "loading-balances" };
    case "WALLET_CONNECTED":
      return { ...s, paymentWallet: a.wallet };
    case "BALANCES_LOADED":
      return { ...s, step: "select-token", balances: a.balances };
    case "NO_BALANCES":
      return { ...s, step: "no-balances" };
    case "TOKEN_SELECTED":
      return { ...s, selectedToken: a.token, step: "creating", transactionId: null, quote: null };
    case "STEP":
      return { ...s, step: a.step };
    case "TX_CREATED":
      return { ...s, transactionId: a.transactionId, step: "attaching" };
    case "QUOTE_READY":
      return { ...s, quote: a.quote, step: "confirming" };
    case "ERROR":
      return { ...s, step: "error", error: a.error };
    case "CLOSE":
      return { ...INITIAL };
    case "RETRY":
      return {
        ...s,
        step: "connect-wallet",
        error: null,
        selectedToken: null,
        transactionId: null,
        quote: null,
      };
    default:
      return s;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFlowPaymentModal({ onSuccess }: { onSuccess: () => void }) {
  const { address: buyerAddress } = useAccount();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const ref = useRef(state);
  ref.current = state;

  const open = useCallback(async (tier: number, gameChainId: number) => {
    dispatch({ type: "OPEN", tier, gameChainId });

    // Discover installed wallets via EIP-6963. The standard works by
    // dispatching a request event; installed extensions respond synchronously
    // with announce events. We collect for 300ms to catch all of them.
    const found: PaymentWalletOption[] = [];
    const handler = (event: Event) => {
      const { info, provider } = (
        event as CustomEvent<{ info: Eip6963ProviderInfo; provider: Eip1193Provider }>
      ).detail;
      if (!found.some((w) => w.info.rdns === info.rdns)) {
        found.push({ info, provider });
      }
    };
    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
    await new Promise<void>((r) => setTimeout(r, 300));
    window.removeEventListener("eip6963:announceProvider", handler as EventListener);

    dispatch({ type: "WALLET_OPTIONS_LOADED", options: found });
  }, []);

  const connectWallet = useCallback(async (rdns: string) => {
    dispatch({ type: "CONNECTING" });
    const walletOpt = ref.current.walletOptions.find((w) => w.info.rdns === rdns);
    if (!walletOpt) {
      dispatch({ type: "ERROR", error: "Wallet not found" });
      return;
    }
    try {
      const accounts = (await walletOpt.provider.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      if (!accounts.length) throw new Error("No accounts returned from wallet");

      const wallet: ConnectedPaymentWallet = {
        address: accounts[0]!,
        provider: walletOpt.provider,
      };
      dispatch({ type: "WALLET_CONNECTED", wallet });

      // Fetch native balances across all supported mainnet chains using
      // viem public clients. The Dynamic balance API requires wallet
      // credentials that the EIP-6963 wallet doesn't have in Dynamic's system.
      const usable = await fetchMultichainBalances(wallet.address);

      if (usable.length === 0) {
        dispatch({ type: "NO_BALANCES" });
      } else {
        dispatch({ type: "BALANCES_LOADED", balances: usable });
      }
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      });
    }
  }, []);

  const selectToken = useCallback(async (token: PaymentTokenBalance) => {
    dispatch({ type: "TOKEN_SELECTED", token });
    const { tier } = ref.current;
    const flowTier = FLOW_USD_TIERS[tier];
    if (!flowTier) {
      dispatch({ type: "ERROR", error: "Invalid state" });
      return;
    }
    try {
      const { transaction } = await createCheckoutTransaction({
        amount: flowTier.actualAmount,
        currency: "USD",
        checkoutId: CHECKOUT_ID,
      });
      dispatch({ type: "TX_CREATED", transactionId: transaction.id });

      const { paymentWallet } = ref.current;
      if (!paymentWallet) throw new Error("No payment wallet");

      await attachCheckoutTransactionSource({
        transactionId: transaction.id,
        fromAddress: paymentWallet.address,
        fromChainId: String(token.networkId),
        fromChainName: "EVM" as const,
      });
      dispatch({ type: "STEP", step: "quoting" });

      const quotedTx = await getCheckoutTransactionQuote({
        transactionId: transaction.id,
        ...(isNativeToken(token.address) ? {} : { fromTokenAddress: token.address }),
      });
      if (!quotedTx.quote) throw new Error("No quote returned");
      dispatch({ type: "QUOTE_READY", quote: quotedTx.quote });
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: err instanceof Error ? err.message : "Failed to get quote",
      });
    }
  }, []);

  const confirm = useCallback(async () => {
    const { transactionId, paymentWallet, tier, gameChainId } = ref.current;
    if (!transactionId || !paymentWallet) {
      dispatch({ type: "ERROR", error: "Invalid state" });
      return;
    }
    const { provider, address: fromAddress } = paymentWallet;
    try {
      dispatch({ type: "STEP", step: "signing" });

      const prepared = await prepareCheckoutTransaction({ transactionId });
      const signingPayload = prepared.quote?.signingPayload;
      if (!signingPayload?.evmTransaction) {
        throw new Error("No EVM signing payload returned from prepare");
      }

      // Switch to the chain the swap runs on
      const requiredChainHex = `0x${Number(signingPayload.chainId).toString(16)}`;
      const currentChainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (currentChainId.toLowerCase() !== requiredChainHex.toLowerCase()) {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: requiredChainHex }],
        });
      }

      // ERC-20 allowance: approve the bridge contract before the swap
      if (signingPayload.evmApproval) {
        dispatch({ type: "STEP", step: "approving" });
        const { tokenAddress, spenderAddress, amount } = signingPayload.evmApproval;
        const approveTxHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: fromAddress, to: tokenAddress, data: encodeApprove(spenderAddress, amount) }],
        })) as string;
        await waitForReceipt(provider, approveTxHash);
      }

      dispatch({ type: "STEP", step: "signing" });
      const { to, data, value, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce } =
        signingPayload.evmTransaction;

      const txParams: Record<string, unknown> = { from: fromAddress, to, data, value, gas: gasLimit };
      if (maxFeePerGas) {
        txParams.maxFeePerGas = maxFeePerGas;
        txParams.maxPriorityFeePerGas = maxPriorityFeePerGas;
      } else if (gasPrice) {
        txParams.gasPrice = gasPrice;
      }
      if (nonce !== undefined) txParams.nonce = `0x${nonce.toString(16)}`;

      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })) as string;

      await broadcastCheckoutTransaction({ transactionId, txHash });

      dispatch({ type: "STEP", step: "polling" });
      await pollSettlement(transactionId);

      dispatch({ type: "STEP", step: "minting" });
      const res = await fetch("/api/flow/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, tier, buyerAddress, gameChainId }),
      });
      if (!res.ok) throw new Error(await res.text());

      dispatch({ type: "STEP", step: "success" });
      onSuccess();
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: err instanceof Error ? err.message : "Payment failed",
      });
    }
  }, [buyerAddress, onSuccess]);

  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const retry = useCallback(() => dispatch({ type: "RETRY" }), []);

  return { ...state, open, close, connectWallet, selectToken, confirm, retry };
}

export type FlowPaymentModal = ReturnType<typeof useFlowPaymentModal>;

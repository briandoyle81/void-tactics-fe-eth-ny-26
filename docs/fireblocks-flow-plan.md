# Fireblocks Flow USD Payment Plan

Add USD-priced ship packs as a third payment method in `ShipPurchaseInterface`. Users pay from any chain/token via Fireblocks Flow; settlement lands as USDC on Base mainnet in the treasury. On settlement, a backend wallet authorized via `isAllowedToCreateShips` calls `createShips` on the Ships contract on the user's selected game chain.

Because this uses real mainnet funds, all UI prices are divided by 100 for the actual Fireblocks Flow transaction (show $4.99, charge $0.05).

---

## Architecture

```
[User clicks USD tier]
       │
       ▼
POST /api/flow/create-transaction    ← server creates Fireblocks tx + stores intent
       │  returns { transactionId, sessionToken, actualAmount }
       ▼
Client: Steps 3–7 (attach source, quote, prepare, sign, broadcast, notify)
       │  directly against Fireblocks Flow API using session token
       ▼
Client polls GET /sdk/{envId}/transactions/{id} until settlementState = "completed"
       │
       ▼
POST /api/flow/fulfill               ← server verifies settlement, mints ships on game chain
       │  uses SHIP_MINTER_PRIVATE_KEY + createShips() on Ships contract
       ▼
Client shows success, triggers ship list refetch
```

Transaction intent (buyer, tier, game chain) is stored server-side between the two routes, preventing a client from claiming a different tier or address than what was originally requested.

---

## Prerequisites

- [ ] `dyn_…` API token from Dynamic Dashboard → Developer → API Tokens (Dashboard → Developer → API Tokens). Flow is available to all ETHGlobal hackathon participants — just try Step 1; if it fails with a 403, stop by the Dynamic booth for instant enablement.
- [ ] A wallet private key for the ship minter — must be added to the Ships contract via `setIsAllowedToCreateShips(address, true)` on each game chain by the contract owner
- [ ] `.env` already has `TREASURY_ADDRESS=0xac5b774D7a700AcDb528048B6052bc1549cd73B9`

---

## Step 1 — One-time curl: Create Checkout Config

Run once; save the returned `id`.

```bash
DYNAMIC_ENV=d572a0c2-24f4-4ae9-9148-f28a3c899d3d
USDC_BASE_MAINNET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
TREASURY_ADDRESS=0xac5b774D7a700AcDb528048B6052bc1549cd73B9
DYNAMIC_API_TOKEN=dyn_YOUR_TOKEN

curl -X POST \
  "https://app.dynamicauth.com/api/v0/environments/${DYNAMIC_ENV}/checkouts" \
  -H "Authorization: Bearer ${DYNAMIC_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"mode\": \"payment\",
    \"settlementConfig\": {
      \"strategy\": \"cheapest\",
      \"settlements\": [{
        \"chainName\": \"EVM\",
        \"chainId\": \"8453\",
        \"tokenAddress\": \"${USDC_BASE_MAINNET}\",
        \"symbol\": \"USDC\",
        \"tokenDecimals\": 6
      }]
    },
    \"destinationConfig\": {
      \"destinations\": [{
        \"chainName\": \"EVM\",
        \"type\": \"address\",
        \"identifier\": \"${TREASURY_ADDRESS}\"
      }]
    }
  }"
```

Add to `.env.local`:

```
NEXT_PUBLIC_FLOW_CHECKOUT_ID=checkout_xxxxxxxxxxxx
DYNAMIC_API_TOKEN=dyn_YOUR_TOKEN
SHIP_MINTER_PRIVATE_KEY=0xYOUR_MINTER_PRIVATE_KEY
```

`DYNAMIC_API_TOKEN` and `SHIP_MINTER_PRIVATE_KEY` are server-only (no `NEXT_PUBLIC_` prefix).

---

## Step 2 — `app/config/flowPayment.ts` (new file)

```ts
export interface FlowTier {
  displayPrice: string; // shown in UI
  actualAmount: string; // sent to Fireblocks Flow (1/100th of display)
}

// Must match the tier count returned by useShipsPurchaseInfo.
// Currently 5 tiers (0–4). Adjust if contract tiers change.
export const FLOW_USD_TIERS: FlowTier[] = [
  { displayPrice: "4.99", actualAmount: "0.05" },
  { displayPrice: "9.99", actualAmount: "0.10" },
  { displayPrice: "19.99", actualAmount: "0.20" },
  { displayPrice: "39.99", actualAmount: "0.40" },
  { displayPrice: "79.99", actualAmount: "0.80" },
];
```

---

## Step 3 — `app/api/flow/create-transaction/route.ts` (new file)

Creates the Fireblocks Flow transaction server-side and stores the purchase intent. The client never sees the actual charge amount or the API token.

```ts
import { NextRequest, NextResponse } from "next/server";
import { FLOW_USD_TIERS } from "@/app/config/flowPayment";

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const API_TOKEN = process.env.DYNAMIC_API_TOKEN!;
const CHECKOUT_ID = process.env.NEXT_PUBLIC_FLOW_CHECKOUT_ID!;

// In-memory store for the hackathon. Replace with a DB for production.
// Maps transactionId → { buyerAddress, tier, gameChainId, fulfilled }
export const pendingPurchases = new Map<
  string,
  {
    buyerAddress: string;
    tier: number;
    gameChainId: number;
    fulfilled: boolean;
  }
>();

export async function POST(req: NextRequest) {
  const { tier, buyerAddress, gameChainId } = (await req.json()) as {
    tier: number;
    buyerAddress: string;
    gameChainId: number;
  };

  const flowTier = FLOW_USD_TIERS[tier];
  if (!flowTier) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const res = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}/checkouts/${CHECKOUT_ID}/transactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: flowTier.actualAmount,
        currency: "USD",
        memo: { tier, buyerAddress, gameChainId },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const { sessionToken, transaction } = (await res.json()) as {
    sessionToken: string;
    transaction: { id: string };
  };

  pendingPurchases.set(transaction.id, {
    buyerAddress,
    tier,
    gameChainId,
    fulfilled: false,
  });

  return NextResponse.json({ transactionId: transaction.id, sessionToken });
}
```

---

## Step 4 — `app/api/flow/fulfill/route.ts` (new file)

Verifies settlement and mints ships on the game chain.

```ts
import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flowTestnet, baseSepolia, saigon } from "viem/chains";
import { pendingPurchases } from "../create-transaction/route";
import {
  getContractAddresses,
  getVariantForChainId,
} from "@/app/config/networks";
// Import chain definitions that include xaiTestnet
import { xaiTestnet } from "@/app/config/networks";

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const MINTER_KEY = process.env.SHIP_MINTER_PRIVATE_KEY as `0x${string}`;

const CREATE_SHIPS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
    ],
    name: "createShips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

function getViemChain(chainId: number) {
  switch (chainId) {
    case flowTestnet.id:
      return flowTestnet;
    case baseSepolia.id:
      return baseSepolia;
    case saigon.id:
      return saigon;
    case xaiTestnet.id:
      return xaiTestnet;
    default:
      return flowTestnet;
  }
}

export async function POST(req: NextRequest) {
  const { transactionId } = (await req.json()) as { transactionId: string };

  const intent = pendingPurchases.get(transactionId);
  if (!intent) {
    return NextResponse.json({ error: "Unknown transaction" }, { status: 404 });
  }
  if (intent.fulfilled) {
    return NextResponse.json({ error: "Already fulfilled" }, { status: 409 });
  }

  // Verify settlement with Fireblocks Flow
  const txRes = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}/transactions/${transactionId}`,
  );
  const tx = (await txRes.json()) as {
    settlementState: string;
    executionState: string;
  };

  if (tx.settlementState !== "completed") {
    return NextResponse.json(
      { error: `Settlement not complete: ${tx.settlementState}` },
      { status: 400 },
    );
  }

  // Mark fulfilled before minting to prevent double-mint on retry
  intent.fulfilled = true;

  const { buyerAddress, tier, gameChainId } = intent;
  const chain = getViemChain(gameChainId);
  const contractAddresses = getContractAddresses(gameChainId);
  const variant = getVariantForChainId(gameChainId);

  // Ships per tier — read from contract or hardcode from getPurchaseInfo result.
  // tierShips(uint256 index) returns the ship count for that tier.
  // For now: match contract values (0=1, 1=2, 2=3, 3=4, 4=5 or whatever is set).
  // TODO: fetch dynamically from contract if tier counts change.
  const SHIPS_PER_TIER: Record<number, number> = {
    0: 1,
    1: 2,
    2: 3,
    3: 4,
    4: 5,
  };
  const amount = BigInt(SHIPS_PER_TIER[tier] ?? 1);

  const account = privateKeyToAccount(MINTER_KEY);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const txHash = await walletClient.writeContract({
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: CREATE_SHIPS_ABI,
    functionName: "createShips",
    args: [buyerAddress as `0x${string}`, amount, variant, tier],
  });

  // Wait for confirmation
  const publicClient = createPublicClient({ chain, transport: http() });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return NextResponse.json({ success: true, mintTxHash: txHash });
}
```

> **Important:** Hardcoded `SHIPS_PER_TIER` must match the contract. Read `tierShips(index)` from the contract on each chain to confirm the values before deploying, or fetch dynamically in the route.

---

## Step 5 — `app/hooks/useFireblocksFlowPayment.ts` (new file)

Calls the server for transaction creation (Step 2), then handles Steps 3–7 client-side using the returned session token.

```ts
"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseAbi, type WalletClient } from "viem";

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

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const SDK = `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}`;

export function useFireblocksFlowPayment() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<FlowPaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(
    async (
      tier: number,
      gameChainId: number,
      onSuccess: () => void,
    ): Promise<void> => {
      if (!address || !chainId || !walletClient) {
        setError("Wallet not connected");
        setStatus("error");
        return;
      }
      setError(null);

      try {
        // Step 2 via server: create transaction + store intent
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

        // Step 3: Attach source
        setStatus("attaching");
        await fetch(`${SDK}/transactions/${transactionId}/source`, {
          method: "POST",
          headers: dct,
          body: JSON.stringify({
            sourceType: "wallet",
            fromAddress: address,
            fromChainId: String(chainId),
            fromChainName: "EVM",
          }),
        });

        // Step 4: Quote — native token on the user's chain
        setStatus("quoting");
        const quoted = (await fetch(
          `${SDK}/transactions/${transactionId}/quote`,
          {
            method: "POST",
            headers: dct,
            body: JSON.stringify({
              fromTokenAddress: "0x0000000000000000000000000000000000000000",
            }),
          },
        ).then((r) => r.json())) as { executionState: string };

        if (quoted.executionState !== "quoted") {
          throw new Error(`Quote failed: state=${quoted.executionState}`);
        }

        // Step 5: Prepare
        setStatus("preparing");
        const prepared = (await fetch(
          `${SDK}/transactions/${transactionId}/prepare`,
          {
            method: "POST",
            headers: dct,
            body: JSON.stringify({
              assertBalanceForGasCost: true,
              assertBalanceForTransferAmount: true,
            }),
          },
        ).then((r) => r.json())) as {
          quote?: { signingPayload?: EVMSigningPayload };
        };

        const payload = prepared.quote?.signingPayload;
        if (!payload?.evmTransaction)
          throw new Error("No EVM signing payload returned");

        // Step 6: Sign and broadcast on-chain
        setStatus("signing");
        const txHash = await signEVM(walletClient, payload);

        // Step 7: Notify backend of broadcast
        setStatus("broadcasting");
        await fetch(`${SDK}/transactions/${transactionId}/broadcast`, {
          method: "POST",
          headers: dct,
          body: JSON.stringify({ txHash }),
        });

        // Step 8: Poll settlement
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
    [address, chainId, walletClient],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);
  return { pay, status, error, reset };
}

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── EVM signer ───────────────────────────────────────────────────────────────

async function signEVM(
  walletClient: WalletClient,
  payload: EVMSigningPayload,
): Promise<`0x${string}`> {
  if (payload.evmApproval) {
    const { tokenAddress, spenderAddress, amount } = payload.evmApproval;
    const approvalHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: parseAbi(["function approve(address, uint256) returns (bool)"]),
      functionName: "approve",
      args: [spenderAddress, BigInt(amount)],
    });
    // Wait for approval before main tx (wagmi/viem handles this internally in most cases)
    // If explicit wait is needed, use publicClient.waitForTransactionReceipt
    void approvalHash;
  }
  return walletClient.sendTransaction({
    to: payload.evmTransaction.to,
    data: payload.evmTransaction.data,
    value: BigInt(payload.evmTransaction.value ?? "0x0"),
    gas: BigInt(payload.evmTransaction.gasLimit),
  });
}

// ── Settlement poller ────────────────────────────────────────────────────────

const POLL_MS = 3000;
const MAX_POLLS = 100;

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
```

---

## Step 6 — `app/components/FlowPaymentButton.tsx` (new file)

Same card structure as `ShipPurchaseButton` children in `ShipPurchaseInterface`. Drives `useFireblocksFlowPayment` and surfaces step progress inline.

```tsx
"use client";

import {
  useFireblocksFlowPayment,
  type FlowPaymentStatus,
} from "../hooks/useFireblocksFlowPayment";
import { ShipImage } from "./ShipImage";
import type { Ship } from "../types/types";
import type { FlowTier } from "../config/flowPayment";

interface Props {
  tier: number;
  gameChainId: number;
  flowTier: FlowTier;
  shipsCount: number;
  tierCallout: string;
  badge: string | null;
  previewShips: Ship[];
  colors: {
    border: string;
    text: string;
    hoverBorder: string;
    hoverText: string;
    hoverBg: string;
  };
  onSuccess: () => void;
}

const STEP_LABELS: Partial<Record<FlowPaymentStatus, string>> = {
  creating: "Initializing…",
  attaching: "Attaching wallet…",
  quoting: "Getting quote…",
  preparing: "Preparing transaction…",
  signing: "Sign in wallet…",
  broadcasting: "Broadcasting…",
  polling: "Waiting for settlement…",
  minting: "Minting ships…",
};

export function FlowPaymentButton({
  tier,
  gameChainId,
  flowTier,
  shipsCount,
  tierCallout,
  badge,
  previewShips,
  colors,
  onSuccess,
}: Props) {
  const { pay, status, error, reset } = useFireblocksFlowPayment();
  const isActive = !["idle", "success", "error"].includes(status);
  const previewSingleColumn = previewShips.length <= 1;

  const handleClick = () => {
    if (status === "error") {
      reset();
      return;
    }
    if (!isActive) void pay(tier, gameChainId, onSuccess);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={`relative min-h-[420px] px-4 py-3 border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
    >
      <div className="flex h-full flex-col gap-2">
        {badge && (
          <div className="absolute right-2 top-2 border border-solid border-cyan bg-cyan/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-cyan">
            {badge}
          </div>
        )}
        <div className="pr-20">
          <div className="text-lg font-extrabold leading-tight">
            {tierCallout}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
            <div className="opacity-75">PRICE</div>
            <div className="font-bold">${flowTier.displayPrice} USD</div>
          </div>
          <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
            <div className="opacity-75">FLEET SIZE</div>
            <div className="font-bold">{shipsCount} SHIPS</div>
          </div>
        </div>

        <div className="border border-solid border-current/35 bg-black/20 p-2">
          <div className="mb-1 text-[10px] opacity-75">Pack preview</div>
          {previewShips.length === 0 ? (
            <div className="py-6 text-center text-[10px] opacity-60">
              No veteran preview.
            </div>
          ) : previewSingleColumn ? (
            <div className="flex justify-center">
              <div className="h-64 w-64 shrink-0">
                <ShipImage
                  ship={previewShips[0]!}
                  showLoadingState={false}
                  rankStarsSize="large"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-center gap-2">
              <div className="h-64 w-64 shrink-0">
                <ShipImage
                  ship={previewShips[0]!}
                  showLoadingState={false}
                  rankStarsSize="large"
                />
              </div>
              <div className="flex shrink-0 flex-col items-start justify-end gap-0.5 pb-0.5">
                {previewShips.slice(1).map((ship) => (
                  <div key={ship.id.toString()} className="h-16 w-16 shrink-0">
                    <ShipImage ship={ship} showLoadingState={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] uppercase tracking-[0.08em] opacity-80 mt-auto">
          {status === "error"
            ? "[Error — tap to retry]"
            : status === "success"
              ? "[Ships minted!]"
              : isActive
                ? (STEP_LABELS[status] ?? "…")
                : "[Pay with USD]"}
        </div>
        {status === "error" && error && (
          <div className="text-[10px] text-warning-red leading-tight">
            {error}
          </div>
        )}
      </div>
    </button>
  );
}
```

---

## Step 7 — `ShipPurchaseInterface.tsx` changes

### 7a. Prop type extension

```ts
// Change interface:
interface ShipPurchaseInterfaceProps {
  onClose: () => void;
  paymentMethod?: "FLOW" | "UTC" | "USD";
  onPaymentMethodChange?: (method: "FLOW" | "UTC" | "USD") => void;
}
```

### 7b. New imports

```ts
import { FlowPaymentButton } from "./FlowPaymentButton";
import { FLOW_USD_TIERS } from "../config/flowPayment";
import { getSelectedChainId } from "../config/networks";
```

### 7c. USD branch in the component

Add after the UTC guard block:

```tsx
const activeGameChainId = useAccount().chainId ?? getSelectedChainId();

// ... existing pack/tier loading code stays the same ...

// In the grid map, replace ShipPurchaseButton conditionally:
{paymentMethod === 'USD' ? (
  <FlowPaymentButton
    key={index}
    tier={tier}
    gameChainId={activeGameChainId}
    flowTier={FLOW_USD_TIERS[index] ?? FLOW_USD_TIERS[0]!}
    shipsCount={shipsCount ?? 0}
    tierCallout={tierCallout}
    badge={badge}
    previewShips={previewShips}
    colors={colors}
    onSuccess={() => { refetch(); onClose(); }}
  />
) : (
  <ShipPurchaseButton ... />  // existing — unchanged
)}
```

Footer text for USD:

```tsx
{paymentMethod === 'USD' && (
  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-text-muted" ...>
    Pay with any token from any chain. Powered by Fireblocks Flow.
  </p>
)}
```

---

## Step 8 — `ManageNavy.tsx` changes

### 8a. State type

```ts
const [paymentMethod, setPaymentMethod] = React.useState<
  "FLOW" | "UTC" | "USD"
>("FLOW");
```

### 8b. Add USD button (after UTC button, ~line 1748)

```tsx
<button
  onClick={() => setPaymentMethod("USD")}
  className={`px-3 py-1 border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
    paymentMethod === "USD"
      ? "border-phosphor-green text-phosphor-green bg-phosphor-green/10"
      : "border-gunmetal text-muted hover:border-steel hover:text-secondary"
  }`}
  style={{ borderRadius: 0 }}
>
  USD
</button>
```

---

## Step 9 — Contract Setup (before testing)

The minter wallet needs to be authorized on each chain where ships can be purchased:

```bash
# Call on Ships contract — replace addresses with actual values
setIsAllowedToCreateShips(MINTER_WALLET_ADDRESS, true)
```

Do this on Flow Testnet (and other chains) via the contract owner's wallet through Etherscan/Flowscan or a script.

---

## Confirm `SHIPS_PER_TIER` values

Before deploying, confirm the actual ships-per-tier from the contract:

```bash
# Call tierShips(index) for each tier on the Ships contract on each chain
# Current deployed values on flow-testnet Ships contract:
# tierShips(0), tierShips(1), tierShips(2), tierShips(3), tierShips(4)
```

Update `SHIPS_PER_TIER` in the fulfill route to match.

---

## Open Questions / Risks

| Item                                                 | Status                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fireblocks Flow enabled on `d572a0c2-…`?             | Likely auto-available at ETHGlobal; try Step 1 curl first — if 403, Dynamic booth enables it on the spot                                                                                                               |
| Which chains does Fireblocks Flow support as source? | Ethereum, Base, Polygon, Arbitrum, Optimism, Solana (mainnet). Flow Testnet / Ronin / Xai likely NOT supported as source chains — user needs to pay from a major chain. Ships still mint on their selected game chain. |
| In-memory Map for pending purchases                  | Resets on server restart. Acceptable for hackathon. Replace with Redis/DB for production.                                                                                                                              |
| ERC-20 approval in Step 6                            | Wallet shows two popups (approve + transfer). No wait between them in current code — add `publicClient.waitForTransactionReceipt` between approval and main tx if needed.                                              |
| `SHIPS_PER_TIER` hardcoded                           | Must match contract. Fetch dynamically from contract in fulfill route to be safe.                                                                                                                                      |
| Quote expires 60s                                    | Consider a visible countdown in the UI between quoting and signing.                                                                                                                                                    |

---

## Implementation Order

1. Confirm Fireblocks Flow enabled → curl → add env vars
2. Authorize minter wallet on Ships contracts on each game chain
3. Confirm `SHIPS_PER_TIER` values from contract
4. Create `app/config/flowPayment.ts`
5. Create `app/api/flow/create-transaction/route.ts`
6. Create `app/api/flow/fulfill/route.ts`
7. Create `app/hooks/useFireblocksFlowPayment.ts`
8. Create `app/components/FlowPaymentButton.tsx`
9. Edit `app/components/ShipPurchaseInterface.tsx`
10. Edit `app/components/ManageNavy.tsx`
11. Test: TOKENS + UTC tabs still work; USD tab shows cards; full flow on Base mainnet with small amounts

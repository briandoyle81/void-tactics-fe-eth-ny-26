# Dynamic: Social Login + Embedded Wallet Integration

**Prize target:** Best Wallet Glow Up / Best Overall Use — $2,000–$2,500
**Demo story:** Log in with Google → play a game → confirm a move with no wallet popup.

---

## What This Integration Does

Replaces RainbowKit with Dynamic. The result:

- **New users** click [LOG IN], see Google/email options, get an MPC embedded wallet created automatically — no MetaMask required.
- **Existing crypto users** can still connect MetaMask or any external wallet as before.
- **In-game move submission** is unchanged for embedded-wallet users: clicking the confirm widget signs silently via Dynamic's embedded wallet. No popup ever appears.

The game confirm widget IS the transaction UX. No new UI component is needed.

---

## Step 1 — Bump wagmi v2 → v3

Dynamic requires **wagmi ≤ v3.1.0**. The project is on wagmi `^2.19.5`. Do this upgrade in isolation — get a clean build before touching Dynamic at all.

```bash
npm install wagmi@^3.1.0

# viem: verify compatibility with wagmi v3 and upgrade if needed
npm install viem@latest
```

Run `npm run build` immediately and fix any TypeScript errors. Common places to check:

- `app/utils/switchWalletChain.ts` — imports `Config, Connector` from `@wagmi/core`; verify the `switchChain` API
- `app/utils/ensureUiChainsInWallet.ts` — any chain-addition utilities
- `app/hooks/useSwitchToSelectedChainIfNeeded.ts` — wagmi switch chain hook usage
- All 34 hooks in `app/hooks/` — most core hooks (`useReadContract`, `useWriteContract`, `useWatchContractEvent`, `useWaitForTransactionReceipt`, `useAccount`, `useBalance`) are expected to be stable, but confirm

Do not proceed to Dynamic installation until `npm run build` and `npm run dev` are clean.

---

## Step 2 — Package Changes (Dynamic)

```bash
# Remove RainbowKit
npm uninstall @rainbow-me/rainbowkit

# Install Dynamic
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethereum @dynamic-labs/wagmi-connector
```

---

## Step 3 — Environment Setup

### Dashboard

1. Create an environment at https://app.dynamic.xyz/
2. Under **Log In Methods**: enable **Google** and **Email** (magic link or OTP)
3. Under **Wallets**: enable **Embedded Wallets (MPC)** and set creation to **automatic on sign-up**
4. Under **Chains & Networks**: confirm Flow EVM is enabled (chain id 747)

### Environment variables

```bash
# .env.local — add:
NEXT_PUBLIC_DYNAMIC_ENV_ID=your-environment-id-from-dashboard

# Remove (no longer needed):
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# NEXT_PUBLIC_WALLETCONNECT_ID
```

### Content Security Policy

If the app sets a `frame-src` CSP header, whitelist `https://app.dynamicauth.com` — Dynamic uses an iframe for the embedded wallet MPC operations.

---

## Step 4 — Rewrite `app/providers.tsx`

### Current provider tree

```
WagmiProvider (getDefaultConfig)
  QueryClientProvider
    InvalidateQueriesOnChainChange
    PosthogAppChainSync
    RainbowKitProvider
      TransactionProvider
        children
        MobileAlphaNoticeModal
```

### New provider tree

```
DynamicContextProvider (settings: environmentId + EthereumWalletConnectors)
  DynamicWagmiConnector   ← replaces WagmiProvider; provides wagmi context internally
    QueryClientProvider
      InvalidateQueriesOnChainChange
      PosthogAppChainSync
      TransactionProvider
        children
        MobileAlphaNoticeModal
```

### Code

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";

function InvalidateQueriesOnChainChange() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = () => void queryClient.invalidateQueries();
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, handler);
    return () =>
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, handler);
  }, [queryClient]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <DynamicWagmiConnector>
        <QueryClientProvider client={queryClient}>
          <InvalidateQueriesOnChainChange />
          <PosthogAppChainSync />
          <TransactionProvider>
            {children}
            <MobileAlphaNoticeModal />
          </TransactionProvider>
        </QueryClientProvider>
      </DynamicWagmiConnector>
    </DynamicContextProvider>
  );
}
```

**What's removed:** `getDefaultConfig`, `WagmiProvider`, `RainbowKitProvider`, the rainbowkit CSS import, the `useMemo` chain config, `walletConnectProjectId`.
**What's kept:** `InvalidateQueriesOnChainChange`, `PosthogAppChainSync`, `TransactionProvider`, `MobileAlphaNoticeModal` — all unchanged.

Note: Chain definitions (Flow Testnet, Saigon, Base Sepolia, Xai Testnet) no longer need to be passed here. The Dynamic connector picks up the connected wallet's chain. The app's existing `selectedChainId` localStorage logic in `Header.tsx` continues to drive contract reads — that is unchanged.

---

## Step 5 — Update `app/components/Header.tsx`

The header has two RainbowKit dependencies:

### 4a. `HeaderDisconnectedConnect` (lines 94–175)

This sub-component uses `ConnectButton.Custom` only to get `openConnectModal`. Replace the whole component:

```tsx
// Remove:
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Add:
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

function HeaderDisconnectedConnect({
  connectButtonClassName,
}: {
  connectButtonClassName: string;
}) {
  const { setShowAuthFlow } = useDynamicContext();

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      type="button"
      className={connectButtonClassName}
      style={{
        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        borderColor: "var(--color-cyan)",
        color: "var(--color-cyan)",
        backgroundColor: "var(--color-steel)",
        borderRadius: 0,
      }}
    >
      [LOG IN]
    </button>
  );
}
```

The "Wrong network" branch is no longer needed here — Dynamic handles chain switching through its own UI, and the header's custom network picker already handles chain changes for the app's contract reads.

### 4b. `handleDisconnect` (line 574)

Replace `disconnect()` from `useDisconnect()` with `handleLogOut()` from `useDynamicContext`:

```tsx
// Remove:
import { useDisconnect } from "wagmi";
const { disconnect } = useDisconnect();

// Add (in the component body):
const { handleLogOut } = useDynamicContext();

// In handleDisconnect:
const handleDisconnect = async () => {
  try {
    userChoseNetworkThisSessionRef.current = false;
    await handleLogOut();
    toast.success("Successfully disconnected!");
  } catch (error) {
    console.error("Error disconnecting:", error);
    toast.error("Failed to disconnect. Please try again.");
  }
};
```

Everything else in `Header.tsx` — the network picker, balance display, UTC balance, address display, mobile menu — is untouched.

---

## Step 6 — Update `app/components/SimulatedGameDisplay.tsx`

One usage of `useConnectModal` at line 71/255/416:

```tsx
// Remove:
import { useConnectModal } from "@rainbow-me/rainbowkit";
// ... (line 255)
const { openConnectModal } = useConnectModal();

// Add:
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
// ... (in component body)
const { setShowAuthFlow } = useDynamicContext();

// Replace (line 416):
openConnectModal?.();
// With:
setShowAuthFlow(true);
```

Also remove `openConnectModal` from the `useCallback` dependency array at line 473.

---

## Step 7 — Delete `app/components/Connect.tsx`

`Connect.tsx` is not imported anywhere in the codebase — it is orphaned. Delete it.

---

## Step 8 — Verify No Changes Needed (Explicitly)

| File                                       | Why untouched                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `app/components/TransactionButton.tsx`     | Uses `useWriteContract` — works unchanged through Dynamic's wagmi connector              |
| `app/components/GameGridConfirmWidget.tsx` | Already has `confirmButton` prop slot — no connection to wallet layer                    |
| `app/components/GameDisplay.tsx`           | Already passes `<TransactionButton>` as `confirmButton` — embedded wallet signs silently |
| `app/providers/TransactionContext.tsx`     | Pure wagmi abstraction — no RainbowKit dependency                                        |
| `app/hooks/` (all 34 hooks)                | Use wagmi directly — compatible through Dynamic connector                                |
| `app/config/networks.ts`                   | Chain definitions used by contract reads — unchanged                                     |
| `app/config/contracts.ts`                  | ABI imports — unchanged                                                                  |

---

## Step 9 — Build and Verify

```bash
npm run build
```

After a clean build, run `npm run dev` and verify:

1. **Social login:** Click [LOG IN] → Dynamic modal appears with Google/email options → complete auth → wallet auto-created → header shows address and balance
2. **External wallet:** [LOG IN] → choose MetaMask → connects as before
3. **Move submission (embedded wallet):** Enter a game → drag a ship → click confirm widget → NO wallet popup → transaction submits and confirms
4. **Move submission (MetaMask):** Same flow → MetaMask popup appears as expected
5. **Log out:** [LOG OUT] → Dynamic clears session → header returns to [LOG IN] state
6. **Network picker:** Still works — header's custom chain selector drives `selectedChainId` for contract reads
7. **RPC call count:** Open DevTools Network tab — confirm no unbounded growth on re-renders

---

## The Demo Flow (30 seconds)

1. Open the app in an incognito window (no MetaMask)
2. Click **[LOG IN]** — Dynamic modal opens
3. Click **Sign in with Google** — approve in Google popup
4. Embedded wallet is created automatically — header shows address
5. Navigate to a game in progress (or start one)
6. Drag a ship to a target square — confirm widget appears
7. Click **[SUBMIT MOVE]** — no wallet popup — transaction fires
8. Game state updates

This is the "no popup" story for the Dynamic prize demo.

---

## Open Questions

1. **wagmi v3 breaking changes** — Step 1 is isolated to this upgrade. Get a clean build before touching Dynamic. The 34 custom hooks in `app/hooks/` all need to pass.
2. **Embedded wallet on Flow Testnet** — verify Dynamic's MPC infrastructure supports EVM chain id 747 (Flow EVM). Check the Dynamic dashboard Chains & Networks section.
3. **`PosthogAppChainSync`** — currently uses `useAccount` from wagmi to sync the connected chain to PostHog. Verify it still reads the correct chain after the provider swap.
4. **`DynamicWagmiConnector` and `QueryClientProvider` ordering** — the docs show `DynamicWagmiConnector` as the inner provider without a separate `WagmiProvider`. Confirm this is correct for the version installed — if wagmi v3 still requires an explicit `WagmiProvider`, add it between `DynamicWagmiConnector` and `QueryClientProvider`.

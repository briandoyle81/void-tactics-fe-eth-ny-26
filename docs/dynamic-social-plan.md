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

## ⚠️ wagmi Version Note

The project is on wagmi `^2.19.5`. Dynamic supports wagmi up to `v3.1.0`, and the peer dep on `@dynamic-labs/wagmi-connector` is `wagmi: "^2.14.11"` — so the current version already satisfies it. **We are not bumping wagmi right now.**

However, RainbowKit v2 requires `wagmi: "^2.9.0"`, so removing RainbowKit will break the lockfile's wagmi resolution. Watch for peer-dep warnings after the RainbowKit uninstall; if they surface, pin `wagmi@3.1.0` and audit all 34 hooks in `app/hooks/` for the v2→v3 diff before proceeding.

---

## Step 1 — Package Changes

```bash
# Remove RainbowKit
npm uninstall @rainbow-me/rainbowkit

# Install Dynamic
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethereum @dynamic-labs/wagmi-connector

# viem: ensure up to date (Dynamic peer dep: viem "^2.45.3")
npm install viem@latest
```

---

## Step 2 — Environment Setup

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

## Step 3 — Rewrite `app/providers.tsx`

### Current provider tree

```
WagmiProvider (getDefaultConfig from RainbowKit)
  QueryClientProvider
    InvalidateQueriesOnChainChange
    PosthogAppChainSync
    RainbowKitProvider
      TransactionProvider
        children
        MobileAlphaNoticeModal
```

### New provider tree

Per Dynamic's official docs, `DynamicWagmiConnector` goes **inside** `WagmiProvider` — it does NOT replace it.

```
DynamicContextProvider (settings: environmentId + EthereumWalletConnectors)
  WagmiProvider config={wagmiConfig}    ← createConfig at module level, not useMemo
    QueryClientProvider
      DynamicWagmiConnector             ← goes inside WagmiProvider
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
import { WagmiProvider, createConfig, http } from "wagmi";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";

// createConfig must be at module level — never inside a component or useMemo.
const wagmiConfig = createConfig({
  chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
  multiInjectedProviderDiscovery: false, // Dynamic implements MIPD itself
  transports: {
    [flowTestnet.id]: http(),
    [saigon.id]: http(),
    [baseSepolia.id]: http(),
    [xaiTestnet.id]: http(),
  },
});

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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <InvalidateQueriesOnChainChange />
            <PosthogAppChainSync />
            <TransactionProvider>
              {children}
              <MobileAlphaNoticeModal />
            </TransactionProvider>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
```

**What's removed:** `getDefaultConfig`, `RainbowKitProvider`, the rainbowkit CSS import, `useMemo` chain config, `walletConnectProjectId`.
**What's kept:** `InvalidateQueriesOnChainChange`, `PosthogAppChainSync`, `TransactionProvider`, `MobileAlphaNoticeModal` — all unchanged.

---

## Step 4 — Update `app/components/Header.tsx`

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

## Step 5 — Update `app/components/SimulatedGameDisplay.tsx`

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

## Step 6 — Delete `app/components/Connect.tsx`

`Connect.tsx` is not imported anywhere in the codebase — it is orphaned. Delete it.

---

## Step 7 — Verify No Changes Needed (Explicitly)

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

## Step 8 — Build and Verify

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

## Fireblocks Flow (Next Stage — $3,000 Prize Track)

**Fireblocks Flow** (not Firebase — Dynamic was acquired by Fireblocks) is a separate product that lets users pay from any wallet/exchange/chain and have funds settle in any token on any chain. It's the **Best Use of Flow** prize track at ETH NYC 2026.

Key facts:
- Enterprise feature — **must ask Dynamic at their booth to enable it** for the hackathon environment
- Direction-agnostic: handles deposits in, withdrawals out, cross-chain conversions
- Auto swap/bridge behind the scenes — user never manually bridges
- JS SDK and raw HTTP API available; pre-built UI widget coming soon
- HMAC-signed webhooks fire on every state transition

Integration is a separate step after the wallet glow-up is complete.

---

## Open Questions

1. **Embedded wallet on Flow Testnet** — verify Dynamic's MPC infrastructure supports EVM chain id 747 (Flow EVM). Check the Dynamic dashboard Chains & Networks section.
2. **`PosthogAppChainSync`** — currently uses `useAccount` from wagmi to sync the connected chain to PostHog. Verify it still reads the correct chain after the provider swap.
3. **wagmi peer-dep warnings** — after removing RainbowKit, check `npm install` output for peer conflicts. If wagmi resolution breaks, bump to `wagmi@3.1.0` and audit all 34 hooks for the v2→v3 diff before proceeding.
4. **Fireblocks Flow enablement** — it's enterprise-only; confirm with the Dynamic team at the hackathon booth that it's enabled for the environment.

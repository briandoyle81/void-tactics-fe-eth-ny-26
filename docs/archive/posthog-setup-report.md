<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into **Void Tactics** (WarpFlow frontend). The following changes were made:

- **`instrumentation-client.ts`** (new) — Initializes PostHog client-side via Next.js 15.3+ instrumentation hook with exception capture, reverse proxy routing, and debug mode in development.
- **`next.config.ts`** — Added PostHog reverse proxy rewrites (`/ingest/*`) and `skipTrailingSlashRedirect: true` for correct API request routing.
- **`.env.local`** — Set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables.
- **`app/components/Connect.tsx`** — Added wallet connection tracking: identifies the user in PostHog with their wallet address and captures `wallet_connected` when a wallet first connects in a session.
- **`app/components/ShipPurchaseButton.tsx`** — Captures `ship_purchased` on successful ship purchase with `tier`, `payment_method`, and `price_eth` properties.
- **`app/components/UTCPurchaseButton.tsx`** — Captures `utc_purchased` on successful UTC token purchase with `tier` and `utc_amount`.
- **`app/components/FreeShipClaimButton.tsx`** — Captures `free_ship_claimed` when the free starter ship claim is confirmed on-chain.
- **`app/components/LobbyCreateButton.tsx`** — Captures `lobby_created` on successful lobby creation with `cost_limit_eth`, `turn_time_seconds`, `creator_goes_first`, `max_score`, and `is_reserved`.
- **`app/components/LobbyJoinButton.tsx`** — Captures `lobby_joined` with `lobby_id` on successful lobby join.
- **`app/components/LobbyAcceptButton.tsx`** — Captures `game_accepted` with `lobby_id` when a game challenge is accepted.
- **`app/components/ShipActionButton.tsx`** — Captures `ships_constructed` (with `action` and `ship_count`) or `ships_recycled` (with `ship_count`) depending on the action type.
- **`app/components/OnboardingTutorial.tsx`** — Captures `tutorial_started` once when the onboarding tutorial component mounts.
- **`app/hooks/useOnboardingTutorial.ts`** — Captures `tutorial_completed` with `completion_branch` (retreat or sniper) when the user reaches the final tutorial step.
- **`app/page.tsx`** — Captures `tab_navigated` with `tab_name` when the user clicks a main navigation tab.

## Events

| Event | Description | File |
|---|---|---|
| `wallet_connected` | User connects their wallet; also calls `posthog.identify()` with wallet address | `app/components/Connect.tsx` |
| `ship_purchased` | Ship purchase confirmed on-chain. Props: `tier`, `payment_method`, `price_eth` | `app/components/ShipPurchaseButton.tsx` |
| `utc_purchased` | UTC token purchase confirmed. Props: `tier`, `utc_amount` | `app/components/UTCPurchaseButton.tsx` |
| `free_ship_claimed` | Free starter ships claimed on-chain | `app/components/FreeShipClaimButton.tsx` |
| `lobby_created` | Game lobby created. Props: `cost_limit_eth`, `turn_time_seconds`, `creator_goes_first`, `max_score`, `is_reserved` | `app/components/LobbyCreateButton.tsx` |
| `lobby_joined` | Player joins an open lobby. Props: `lobby_id` | `app/components/LobbyJoinButton.tsx` |
| `game_accepted` | Player accepts a game challenge. Props: `lobby_id` | `app/components/LobbyAcceptButton.tsx` |
| `ships_constructed` | Ships constructed. Props: `action`, `ship_count` | `app/components/ShipActionButton.tsx` |
| `ships_recycled` | Ships recycled/scrapped. Props: `ship_count` | `app/components/ShipActionButton.tsx` |
| `tutorial_started` | Onboarding tutorial begins | `app/components/OnboardingTutorial.tsx` |
| `tutorial_completed` | Tutorial final step reached. Props: `completion_branch` (retreat \| sniper) | `app/hooks/useOnboardingTutorial.ts` |
| `tab_navigated` | User switches main navigation tabs. Props: `tab_name` | `app/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/391844/dashboard/1494609
- **New Player Onboarding Funnel** (wallet connected → free ship claimed → lobby created): https://us.posthog.com/project/391844/insights/xVLcIDhU
- **Daily Wallet Connections** (DAU trend): https://us.posthog.com/project/391844/insights/RLM6TC7o
- **Ship Purchase Volume by Payment Method** (FLOW vs UTC breakdown): https://us.posthog.com/project/391844/insights/HJN8sGk7
- **Tutorial Completion Funnel** (started → completed): https://us.posthog.com/project/391844/insights/UHW77e6l
- **Gameplay Activity Breakdown** (lobbies, games, constructions, recycling): https://us.posthog.com/project/391844/insights/lJ0b8JhN

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

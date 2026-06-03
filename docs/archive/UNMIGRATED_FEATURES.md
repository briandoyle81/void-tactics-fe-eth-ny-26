# Unmigrated Features from Blockchain Version

Features present in the original smart contracts that are absent or incomplete in the current backend.

---

## Economy / Rewards ✅

All reward amounts (`recycleRewardUtc`, `killRewardUtc`, `lobbyCreationCostUtc`, `purchaseThresholdForRewards`) are now stored in the DB `Config` table under key `"economy_config"` and loaded via `app/lib/economyConfig.ts`, following the same pattern as ship costs. Defaults match prior hardcoded values. Edit the config row to change values at runtime without a deploy.

---

## Ship Customization ✅

`POST /api/ships/:id/customize` modifies equipment, traits, and shiny status. Cost formula mirrors the contract exactly: `baseCost (99 UTC) × 2^totalModifications`, where `totalModifications = ship.modifiedCount + newChanges`. Each equipment slot change counts as 1, each trait level step counts as 1, shiny toggle counts as 3. Ship must be constructed and not in fleet. A gear icon on each constructed ShipCard in ManageNavy opens the modal with live cost preview. `modifiedCount` is tracked on the Ship DB record.

---

## Trading / Marketplace

**Ship trading (ERC-721 transfers)**
The Ships contract was an NFT; players could sell or transfer individual ships to other wallets. No P2P transfer mechanism or marketplace exists in the backend. Info.tsx still advertises "buy, sell, trade on a global open market."

---

## Referral System

**Referral program**
ShipPurchaser tracked `referralCount`, `referralStages`, and `referralPercentages`. Buyers who used a referral code earned the referrer UTC at tiered rates. Not implemented anywhere in the backend or UI.

---

## Lobby / Lobby Economy ✅

**`freeGamesPerAddress`** — tracked via `User.lobbiesCreatedCount`; the first `freeGamesPerAddress` lobby creations (default 1) are free, subsequent ones cost `lobbyCreationCostUtc` UTC. Both values are admin-configurable via the DB `Config` table under `"economy_config"`.

**`quitWithPenalty`** — `POST /api/lobbies/[id]/quit-with-penalty`: joiner calls after submitting their fleet when the creator has not submitted theirs within `turnTimeSeconds`. Penalizes the creator with `kickCount++` and a `kickTimeoutUntil` lockout of `kickCount × 3600 s` (min 300 s). UI button shown in the joiner action panel when joiner has fleet but creator does not.

**`timeoutJoiner`** — `POST /api/lobbies/[id]/timeout-joiner`: creator calls when joiner has not submitted their fleet within `turnTimeSeconds` of joining. Penalizes the joiner identically. UI button shown in the creator action panel during fleet selection.

**`rejectGame`** — `POST /api/lobbies/[id]/reject`: the `reservedJoiner` (stored in `Lobby.reservedJoinerId`) calls this to decline a private invitation; clears `reservedJoinerId` so the lobby becomes open. `LobbyRejectButton` calls this endpoint. The `rejectGame` hook now calls the real API instead of the generic leave-lobby fallback.

**Kick-timeout enforcement** — `POST /api/lobbies` and `POST /api/lobbies/[id]/join` both check `User.kickTimeoutUntil > now` and return 403 with the expiry time if the player is blocked.

**`createLobbyForAddresses`** — admin-only `POST /api/admin/lobbies`; creates a `FLEET_SELECTION` lobby with both players pre-set, identified by email. `Lobby.reservedJoinerId` column added; private lobbies surface correctly in the lobby list for the reserved player.

**`additionalLobbyFee`** — the contract charged 1 FLOW (native token) per lobby after the free allowance. Adapted to UTC: lobbies after the free allowance cost `lobbyCreationCostUtc` UTC (same pool as other economy values).

---

## Leaderboard ✅

`GET /api/leaderboard` returns the top 20 players ranked by wins (ties broken by fewer total games). Each entry includes display name (username or email prefix), wins, losses, total games, and win rate. The current user's row is highlighted in the table. The leaderboard is shown at the bottom of the Profile tab; no auth required to fetch it.

---

## Tutorial Completion ✅

`tutorialCompleted Boolean` and `tutorialPath String?` added to the User schema. `POST /api/tutorial` records the win or loss path and creates reward ships (`isFree: true, constructed: true`): **2 ships** for the win (sniper) path, **3 ships** for the loss (retreat) path. `GET /api/tutorial` returns `{ completed, path }` for the current user. `SimulatedGameDisplay` now calls the API on reward claim, invalidates the ships cache so new ships appear immediately in Manage Navy, and uses the server response as the source of truth for the "already claimed" state (localStorage cache kept as offline fallback).

---

## Real-Time Updates

**Event-driven opponent move detection**
The frontend still polls for game state changes. The migration plan identified SSE (`GET /api/games/:id/events`) as the next step after polling. It was never built, so players must wait for the poll interval to see their opponent's move.

---

## Ship Kill Rank ✅

`shipsDestroyed` increments on the backend on every kill. ShipCard shows the rank badge (`R1`–`R6`) and a color-coded progress bar with kill count and kills-to-next-rank. The NFT properties stat grid includes a "Kills" row. Rank bonuses (+10–50% to range, damage, and hull) are applied by `calculateAttributesFromContracts`. Info.tsx copy updated to list the six rank thresholds and bonuses explicitly.

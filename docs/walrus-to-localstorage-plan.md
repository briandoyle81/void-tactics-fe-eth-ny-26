# Plan: Remove Walrus, Use localStorage for Game Recording

## Why

Walrus (decentralized blob storage) currently backs game move recording and
replay. We're dropping the Walrus dependency and storing recordings in the
browser's `localStorage` instead — **this is a durable decision**, not a
stopgap, so the design below optimizes for a single-device-only recording
model rather than preserving Walrus's tiered/shared-storage shape. This
trades away cross-device viewing of in-progress games and public replay
links, in exchange for removing an external network dependency (two testnet
HTTP endpoints, an API proxy route, and an in-memory pointer map).

This doc inventories every Walrus touchpoint (courtesy of a full-codebase
sweep) and lays out the swap.

## Current architecture (what exists today)

Two tiers of recording, both going through Walrus over plain `fetch` (no SDK
dependency — just hardcoded testnet URLs):

- **Live snapshot** (`EPOCHS_LIVE = 1`): re-uploaded after every confirmed
  move, so a second device/tab can follow an in-progress game via a
  short-lived pointer (`app/api/game-blob/route.ts`, an in-memory
  `Map<string,string>`).
- **Archive** (`EPOCHS_ARCHIVE = 15`): uploaded once when
  `game.metadata.winner` is set, then the resulting blob id is written
  on-chain via `GameBlobRegistry.record(...)` (and `Tournament.recordResult`
  for tournament matches), so anyone can look it up later and replay it.

### Files touched

| File | Role | Action |
|---|---|---|
| `app/utils/walrus.ts` | `uploadToWalrus`, `fetchFromWalrus`, base64url/hex blobId conversion, hardcoded publisher/aggregator URLs | Replace upload/fetch functions with localStorage get/set; **keep** `serializeBlob`/`deserializeBlob`/`jsonReplacer`/`jsonReviver` (bigint-safe JSON, storage-agnostic) |
| `app/api/walrus/upload/route.ts` | Server proxy for Walrus publisher POST | Delete — localStorage writes happen client-side, no server round-trip needed |
| `app/api/game-blob/route.ts` | In-memory mid-game pointer (`gameId:player` → `rawBlobId`) | Delete — the multi-device pointer has no localStorage equivalent (see "What we lose" below) |
| `app/components/GameDisplay.tsx` | `uploadGameRecordToWalrus`, `updateGameBlobPointer`, `fetchAndStartReplay` (~lines 394-540); replay UI (~lines 4098-4185) | Rework upload/fetch calls to read/write localStorage keyed by `gameId`; drop pointer update calls |
| `app/hooks/useGameRecord.ts` | Reads on-chain `GameBlobRegistry.getBlob`, then fetches from Walrus aggregator | Currently **dead code** (no importers found) — decide: delete, or repurpose for a future local match-detail view |
| `app/utils/serializeGameRecord.ts` | `buildInitialRecord`/`appendTurn`/`finalizeRecord` — pure builders, no I/O | No change needed, storage-agnostic |
| `app/types/types.ts` | `GameRecord`, `TurnRecord`, `TournamentMatch.walrusBlobId` | No change to `GameRecord`/`TurnRecord`; `walrusBlobId` field stays (see contract note below) |
| `app/components/TournamentBracket.tsx` | "View replay" link shown when `match.walrusBlobId !== ZERO_BLOB` | Decide whether tournament replay is in scope at all right now — see open questions |
| `app/hooks/useTournamentAdmin.ts` | Passes `walrusBlobId` through to `recordResult`/`resolveDraw` contract calls | No change — contract field name stays `walrusBlobId` regardless of storage backend (Solidity side, separate repo) |
| `app/config/contracts.ts`, `deployed_addresses.json` | `GAME_BLOB_REGISTRY` address/ABI wiring | No change unless we also stop writing the on-chain pointer (see open question below) |
| `app/components/SimulatedGameDisplay.tsx` | Replay UI scaffolding, currently inert (`replayTurns` never populated — tutorial never uploads to Walrus) | Leave inert, or wire to localStorage now for free — see open questions |
| `README.md` | Documents "Game Recording and Match Replay (Walrus)" feature | Update copy once implementation changes |

Three places currently hardcode the aggregator URL independently
(`app/utils/walrus.ts`, `GameDisplay.tsx:521`, `useGameRecord.ts:41`) — this
migration is a good time to consolidate to a single source, even though the
localStorage version won't need a URL at all.

## What we lose vs. Walrus

- **Cross-device / spectator viewing of live games**: the live-snapshot
  pointer exists specifically so a second device or another player can watch
  an in-progress game. localStorage is single-device/single-browser, so this
  capability goes away for now (this is the accepted tradeoff per the ask —
  flagging so it's an explicit, not accidental, regression).
- **Public/shareable replay links after a game ends**: today anyone can look
  up the on-chain `blobIdHex` and fetch the archive from Walrus. With
  localStorage, only the browser that played the game can replay it.
  `TournamentBracket.tsx`'s "View replay" link and the not-yet-built
  `/tournaments/[id]/matches/[id]` page assume global fetchability — these
  stay wired up (per the decision below), but will legitimately fail to find
  a local record on any browser other than the one that played the game.

## Decision: replay-not-found UX

**Resolved.** Rather than hiding replay entry points when we can't guarantee
a local record exists, keep them visible everywhere (the "Replay" button in
`GameDisplay.tsx`, and the "View replay" link in `TournamentBracket.tsx`).
When the user actually triggers replay and `loadGameRecord(gameId)` returns
nothing (no matching key in `localStorage` — e.g. a different browser/device
played the game, or storage was cleared), show an **alert in place of the
replay control cluster** (Prev/Next/Play-Pause/Exit) rather than rendering
empty/broken controls. Concretely in `GameDisplay.tsx`:

- `fetchAndStartReplay()` attempts `loadGameRecord(gameId)`; on a miss, set a
  `replayNotFound` (or similar) state instead of populating `replayTurns`.
- The replay section renders the alert (e.g. "Replay not available — this
  game wasn't recorded on this device") when `replayNotFound` is true,
  instead of the Prev/Next/Play-Pause/Exit cluster.
- Same pattern applies to `SimulatedGameDisplay.tsx` if/when its replay
  scaffolding gets wired up (see open question 3 below), and conceptually to
  a future `/tournaments/[id]/matches/[id]` page.

## Proposed approach

1. **`app/utils/walrus.ts` → rename/replace with a local storage module**
   (e.g. `app/utils/gameRecordStorage.ts`), exposing the same shape:
   - `saveGameRecord(gameId, record)` → `localStorage.setItem` with
     `serializeBlob`
   - `loadGameRecord(gameId)` → `localStorage.getItem` +
     `deserializeBlob`
   - Key scheme: one key per game (`voidtactics:gameRecord:<gameId>`), keep
     current record overwritten on every move (no separate live/archive tiers
     needed — localStorage doesn't have Walrus's epoch/expiry model, so a
     single "latest full record" per game is sufficient).
2. **`GameDisplay.tsx`**: replace `uploadGameRecordToWalrus` calls (both the
   per-move live upload and the end-of-game archive upload) with
   `saveGameRecord`; replace `fetchAndStartReplay`'s Walrus aggregator fetch
   with `loadGameRecord`, and branch on a miss to set the `replayNotFound`
   alert state instead of populating replay state (see "Decision:
   replay-not-found UX" above). Drop `updateGameBlobPointer` entirely (no
   pointer needed for single-device storage).
3. **Skip on-chain registration entirely**: no `GameBlobRegistry.record(...)`
   call and no `Tournament.recordResult` blobId write — the archive step
   simply stops writing anything on-chain. If `Tournament.recordResult`
   needs to fire for other bookkeeping (e.g. marking a match resolved)
   independent of the blobId, call it with the existing `ZERO_BLOB`
   sentinel rather than skipping the call altogether — confirm this against
   the contract's actual requirements when implementing.
4. **Delete** `app/api/walrus/upload/route.ts` and
   `app/api/game-blob/route.ts`.
5. **Delete `useGameRecord.ts`**: it was already dead code (no importers),
   and its entire premise — reading a `blobId` off `GameBlobRegistry` and
   fetching Walrus with it — no longer applies once we stop writing that
   registry at all. Remove it rather than keeping a stub.
6. **`TournamentBracket.tsx`**: keep the "View replay" link visible always;
   the destination view applies the same replay-not-found alert pattern when
   the local record is missing (see decision above). Note this link's
   original premise (`match.walrusBlobId !== ZERO_BLOB`) is now moot too
   since we never write a non-zero blobId — the condition should instead key
   off whether a local record exists for that match, or the link should
   just always be shown and let the alert handle the miss case.
7. **`SimulatedGameDisplay.tsx`**: hide the tutorial's replay entry point —
   do not wire it to localStorage. Tutorial games continue to have no
   recording and no visible "Replay" affordance at all (stronger than
   today's status quo of inert-but-technically-present controls).
8. Update `README.md` feature description.
9. Storage size sanity check: `localStorage` has a ~5-10MB per-origin quota.
   A `GameRecord` accumulates a full `GameDataView` snapshot per turn — worth
   confirming a long game doesn't blow the quota (may want to only store the
   initial state + move deltas rather than a full snapshot per turn, if size
   becomes an issue).

## Resolved

- **Durability**: this is a durable decision, not a stopgap (collapses to a
  single record per game, no need to preserve Walrus's tiered model).
- **Replay-not-found UX**: show an alert in place of the replay controls
  when no local record exists, rather than hiding entry points (see decision
  section above) — applies to live/tournament games.
- **On-chain registration**: skipped entirely; no blobId gets written to
  `GameBlobRegistry` or `Tournament.recordResult` going forward.
- **`useGameRecord.ts`**: deleted, not kept as a stub (see item 5 above).
- **Tutorial replay**: hidden entirely in `SimulatedGameDisplay.tsx` rather
  than left as inert scaffolding.

No open questions remain — ready to implement per the steps above.

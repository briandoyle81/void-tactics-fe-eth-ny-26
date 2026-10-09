# Frontend RPC-Cost Suggestions — Contract-Side Evaluation

**Written: 2026-10-08.** Describes contract state as of this date. Check the date against later handoff docs before relying on it.

This responds to the frontend's three suggestions for cutting RPC request and credit costs (batch AI turns, indexed player topics, aggregated views). It also records one change already made in response: map names and node titles/descriptions have been **removed from the contracts** (section 4). That change needs frontend work.

Size context: with current changes, `Game` is at 23.929 KiB (about 70 bytes of headroom) and `Ships` is at 23.986 KiB (about 14 bytes) against the 24 KiB EIP-170 limit. Nothing that adds bytecode to those two contracts is feasible.

---

## 1. Batch AI turns — partially feasible; smaller win than estimated

**Status: not built.**

The suggestion assumes the AI moves all its ships in one block per round. It doesn't. `Game._switchTurnIfOtherPlayerHasShips` **alternates turns ship by ship**. After each AI move the turn passes back to the human, unless the human has no unmoved ships left this round.

- **`takeAITurns(gameId, maxMoves)`:** feasible and rules-correct, as a loop that keeps going while `currentTurn == address(this)`. It only removes requests in the tail case, where the AI has more unmoved ships left than the human. It does **not** give the ~4× reduction estimated. Implementation notes: the loop must re-read `game.getGame` after each move, because the cached view goes stale. `maxMoves` must be a hard cap, since each AI decision is an expensive view in `AIBehavior`. Size headroom: `RoguelikeMatch` has about 1.5 KiB, `SinglePlayerMatch` about 8.6 KiB.
- **Run the AI automatically at the end of the human's move:** not feasible as things stand. The human already pays the AI's gas, so cost isn't the obstacle. The obstacles are:
  - Hooking it into `Game.moveShip` doesn't fit Game's ~70 bytes of headroom.
  - A wrapper on the match contract can't move the human's ship. `moveShip` requires `msg.sender == currentTurn` and that the sender owns the ship.
  - It would also only cover the one AI reply before the turn alternates back.

**Frontend guidance for now:** keep calling `takeAITurn` once per AI move. If `takeAITurns` gets built, call it when the AI has unmoved ships left and the human has none.

## 2. Indexed player topics — mostly already in place

**Status: not built. A small change is recommended.**

- `GameUpdate`, `Move`, `GameStarted` and both contracts' `AITurnTaken` already index `gameId`. Once a client knows its game IDs, it can already filter or subscribe to only those games' events. "Every client billed for every game's events" isn't the case today.
- **Gap: discovering which games a player is in.** `GameStarted(gameId indexed, lobbyId indexed, creator, joiner)` doesn't index the players. Recommended: index `creator` and `joiner`, removing `lobbyId`'s index (events allow at most 3 indexed topics). It's a cold path, so the bytecode change is small.
  - Single-player games already have this: `SinglePlayerMatch.NodeMatchStarted` has `address indexed human`, and `RoguelikeMatch.CombatNodeEntered` has `address indexed player`.
- **Not recommended:** adding creator/joiner topics to `GameUpdate`. That adds two storage reads to every move and bytecode Game can't spare, and it adds nothing beyond the existing `gameId` filter.
- Changing an event's signature changes its topic hash. Frontend log filters and any indexers must update at the redeploy that ships it.

## 3. Aggregated views — recommended, as a separate lens contract

**Status: not built.**

The recommendation is one new read-only `GameLens` contract holding all of these. It leaves `Game`/`Ships` untouched and can be redeployed on its own whenever the frontend needs a new view.

- **`getShipsOwned(owner, offset, limit)`:** this can't go in `Ships` (14 bytes free). It must be **paginated**. The existing `shipsOwnedCount`/`shipIdOwnedAt` pair exists because a full-array return blows past provider response and gas caps for large holders (GR-01).
- **`getRunView(player)`:** returns the `Run`, plus `getShipHP` for each roster ship, plus `isNodeLocked`/`isNodeDefeated` flags. The flags are for node IDs the caller passes in, or for the campaign graph below.
- **`getCampaignGraph(campaignId)`:** `RoguelikeNodeMap` node IDs are global (`nodeCount` spans every campaign), and nothing indexes nodes by campaign. The view should walk the graph outward from `campaignRootNode[campaignId]` through `children`, which also returns the edges, rather than scanning `1..nodeCount`.

## 4. ~~On-chain map names and node titles/descriptions~~ — REMOVED (2026-10-08)

**Status: done in the contracts repo. Takes effect at the next redeploy.** The live Base Sepolia deploy still has the old functions until then.

Neither was read by any contract logic. They existed only for display. Removing them saves about 4M gas and 66 transactions per deploy, removes one contract, and removes the frontend's reads of these strings. Gameplay gas is unchanged.

### What changed
- **`Maps.sol` / `IMaps.sol`:** removed `mapName(uint)`, `setMapName(uint, string)` and the `MapNameSet` event. Maps bytecode went from 18.10 to 17.12 KiB.
- **`NodeContentRegistry.sol`:** the contract is deleted entirely, including `getNodeContent`, `setNodeContentBatch`, the editor allowlist and the `NodeContentSet` event. It's no longer deployed or returned by the deploy module.
- **`DeployAndConfig.ts`:** no longer calls `setMapName`, and no longer seeds node content or grants node-content editor rights. Roguelike `winEffects` seeding is unchanged.
- The seed JSON files (`ignition/data/*StarterContent.json`) **keep** each map's `name` field. The deploy ignores it, so the frontend can use these files as its source for names.

### Frontend action items
1. **Map names:** source them from frontend data keyed by map key or by on-chain map ID. On a fresh deploy, IDs are assigned in this fixed order (the deploy chains every map creation to the previous one, so the order is guaranteed):
   - 1–30: `singlePlayerStarterContent.maps`, in array order
   - 31–60: `roguelikeStarterContent.maps`
   - 61–66: `pvpStarterContent.maps`

   Maps created later by admins have no on-chain name either. The frontend's own map data needs an entry for them.
2. **Node titles/descriptions:** remove the registry layer from the content fallback chain (it was registry → Postgres draft → static config → default). Postgres, or static config, is now the source of truth.
3. **Admin publish flow:** retire the "publish to chain" step that called `setNodeContentBatch`. The `NODE_CONTENT_PUBLISHER_PRIVATE_KEY` signer is no longer needed.
4. **ABIs and addresses:** drop the `NodeContentRegistry` address and ABI. Regenerate the `Maps` ABI and remove any `mapName` reads and `MapNameSet` log handling.
5. The mission seed export (`missionSeedExport.ts`) can keep writing `title`/`description`. The deploy ignores them, so stopping is optional.

# Single-Player Frontend Integration

**Written: 2026-07-28.** This describes contract state as of that date — check the contracts repo's recent commits if it's been a while, since this can go stale as the contracts evolve.

**Correction, same day:** the first version of this doc said `AIShips.AI_SHIP_ID_OFFSET`/`SinglePlayerMatch.NODE_MATCH_ID_OFFSET` were `2**128`. That was a real bug, not just a doc error — `2**128` is astronomically past `Number.MAX_SAFE_INTEGER` (2^53-1), so any JS-number-native id handling (which is what your shared grid components use) would silently collide every AI ship in a fleet onto the same coerced number. Both offsets are now `2**40` (~1.1T, ~8,192x under the safe-integer ceiling — bumped once more from an initial `2**32` fix purely for extra headroom, same cost either way) on the contract side specifically so they stay exact as JS numbers — no change needed on your end, the fix is entirely in the contracts. Everywhere below already reflects the corrected value.

**This replaces the previous version of this doc.** Single-player no longer goes through `Lobbies` at all — the reservation-based flow this doc used to describe (`Lobbies.createLobby` with `reservedJoiner`, `SinglePlayerMatch.acceptMatch`/`setupAIFleet`) has been removed from the contracts entirely. If your frontend still has that flow wired up, it will not compile against the current ABI. Everything below reflects the current contracts.

## The mental model

A human plays single-player by picking an unlocked node from a campaign graph (`NodeMap`) and calling one function, `SinglePlayerMatch.startNodeMatch`, which creates both fleets and starts the `Game` session in a single transaction. There's no lobby, no separate "accept"/"setup" step, and no waiting for a second party — the whole thing is one call from the human.

Everything _after_ the game starts is identical to PvP: same `Game.moveShip`, same turn/round/scoring rules, same `Game.getGame` read shape. The one AI-specific interaction pattern, unchanged from before: **`SinglePlayerMatch.takeAITurn` moves exactly one AI ship per call**, and the frontend calls it repeatedly until the turn returns to the human.

What's new since the last version of this doc, in order of how much it affects you:

1. **The entry flow is now one transaction** (`startNodeMatch`) instead of a five-step Lobbies dance.
2. **Campaign structure**: nodes form a real graph (branches, dead ends, shortcuts), not a flat list — you need `NodeMap`, not `Lobbies`, to read/render it.
3. **AI ships are no longer NFTs.** They're pooled and reused across matches in a separate contract (`AIShips`), behind a router (`ShipsRouter`) that `Game`/`Fleets`/`ShipAttributes` now point at instead of `Ships` directly. This changes how you look up an AI ship's name/equipment/art, and rules out a few things you might otherwise assume (see below).

## Full flow, in order

1. **Fetch the campaign graph and figure out what's unlocked.**

   ```js
   const allNodes = await nodeMap.read.getAllNodes(); // CampaignNode[] — id, mapId, prerequisites[], costLimit, turnTime, maxScore, creatorGoesFirst
   const unlocked = await Promise.all(
     allNodes.map((n) => nodeMap.read.isNodeUnlocked([player, n.id])),
   );
   const completed = await Promise.all(
     allNodes.map((n) => nodeMap.read.isNodeCompleted([player, n.id])),
   );
   ```

   **`prerequisites` is an array, and unlock is ANY-of, not ALL-of.** A node with `prerequisites: [5n, 8n]` unlocks if the player has completed node 5 _or_ node 8 — this is how shortcut nodes converge back into the main path. Render this as an actual graph (multiple incoming edges into one node), not a linear chain — the current seeded campaign has a 2-node dead-end branch and a hard-fight node whose completion skips three nodes on the main path (details below, under "current campaign shape").

   On-chain data has **no display names or flavor text** — just `mapId`, cost/turn/score numbers, and the prerequisite graph. You need your own `nodeId -> {title, description, art}` mapping; nothing in the contracts gives you that.

2. **Human builds a fleet and starts the match, in one call:**

   ```js
   const gameId = await singlePlayerMatch.simulate
     .startNodeMatch([nodeId, shipIds, positions])
     .then((r) => r.result);
   await singlePlayerMatch.write.startNodeMatch([nodeId, shipIds, positions]);
   ```

   - `shipIds`/`positions` are the human's own ships, same as a PvP creator fleet — same position rule (`col` 0-3, any row 0-10), same cost-limit check against `node.costLimit` (fetched in step 1; don't let the player submit a fleet that exceeds it, `Fleets.createFleet` will revert `InvalidFleetCost`).
   - Everything else about the match (map, turn time, max score, who goes first) comes from the node, not from the player — no "create lobby with these settings" step anymore.
   - Reverts `NodeNotUnlocked` if the node isn't unlocked for `msg.sender`, `NoAIPlacementsConfigured` if the node's map has no AI content (shouldn't happen for any seeded node, but matters if you let players hit not-yet-configured admin content).
   - **Get `gameId` from the return value or the `NodeMatchStarted(gameId, nodeId, human)` event — don't compute it yourself.** It's offset into a range disjoint from PvP game ids via `SinglePlayerMatch.NODE_MATCH_ID_OFFSET` (public, `2**40` — chosen to stay exact as a JS `number`, same reasoning as `AI_SHIP_ID_OFFSET` below), but read the real id back rather than deriving it, since the offset is an implementation detail you shouldn't need to hardcode.
   - The game is live immediately after this confirms — no polling for a second player to show up.

3. **Turn loop — same as PvP:**

   ```js
   await game.write.moveShip([
     gameId,
     shipId,
     destRow,
     destCol,
     actionType,
     actionTarget,
   ]);
   ```

   After it confirms, check `Game.getGame(gameId).turnState.currentTurn` — if it's `SinglePlayerMatch`'s address, the AI acts next.

4. **AI turn loop — unchanged from before:**

   ```js
   while (true) {
     const g = await game.read.getGame([gameId]);
     if (g.metadata.ended) break;
     if (g.turnState.currentTurn !== singlePlayerMatchAddress) break; // back to human
     await singlePlayerMatch.write.takeAITurn([gameId]);
   }
   ```

   One `takeAITurn` call moves exactly one AI ship. The turn can stay with the AI across several consecutive calls if it has more unmoved ships than the human did that round (same alternation rule as PvP). Bound the loop defensively, comfortably above the live `AIEncounters.maxPlacementsPerMap` (an owner-tunable value, default raised from 8 to 14 — don't hardcode the old constant).

   Permissionless, like before. Reverts `NotAITurn`/`GameEnded` — check `currentTurn`/`ended` rather than relying on catching those. Listen for `AITurnTaken(gameId, shipId, actionType, targetShipId)` to animate what happened.

5. **Repeat 3-4 until `Game.getGame(gameId).metadata.ended`.** On a human win, the node is automatically marked completed (unlocking whatever it gates) — nothing extra to call.

## AI ships: what changed and why it matters to you

AI ships used to be real ERC-721s minted fresh on `Ships.sol` every match. They're now **pooled, non-NFT entries in a separate contract, `AIShips`**, reused across matches instead of minted-and-abandoned. Concretely:

- **AI ship ids are larger than human ship ids, but still an exact JS `number`.** They live in a disjoint numeric range, `id >= AIShips.AI_SHIP_ID_OFFSET` (`2**40` ≈ 1.1T, publicly readable as a constant — deliberately chosen to stay under `Number.MAX_SAFE_INTEGER`, see the correction note at the top). `Game.getGame(gameId).shipIds`/`.shipPositions`/`.shipAttributes` already include these transparently — you don't need to do anything special to see an AI ship move or take damage. Your existing number-native `GridShip`/`GameGridCell` components work as-is; no bigint migration needed for this.
  - Client-side, `shipId >= AI_SHIP_ID_OFFSET` is a free, contract-call-free way to tell "is this an AI ship" if you need that for UI logic (e.g. a badge).

- **For ship _data_ (name/equipment/traits), call `ShipsRouter`, not `Ships` directly.** `Game.ships()`, `Fleets.ships()`, and `ShipAttributes.ships()` all now point at `ShipsRouter`'s address, not `Ships.sol`'s — if you were previously hardcoding `Ships`'s address for `getShip(id)`/`isShipDestroyed(id)` calls, switch to whichever of those you're already reading (or the router's own address directly). `ShipsRouter.getShip(id)`/`.isShipDestroyed(id)` transparently resolve to either `Ships.sol` (human) or `AIShips.sol` (AI) based on the id range — one call site works for both. Calling `Ships.sol.getShip(aiShipId)` directly will just return a zeroed/empty struct now; the ship isn't there.

- **AI ships are never ERC-721 tokens.** No `ownerOf`, no `tokenURI`, no `Transfer` events, nothing shows up if you enumerate tokens owned by `SinglePlayerMatch`'s address. If anything in your UI renders AI ship art through the same NFT metadata/`tokenURI` pipeline used for player ships, that will not work for AI ships — it never queries `AIShips` and there's no image renderer wired up for it. Build AI ship visuals from `SinglePlayerMatch.aiShipInfo(shipId)` (→ `{archetype, variant, special}`, unchanged in shape) plus `ShipsRouter.getShip(shipId)` for name/equipment/traits, same as before this refactor — just note the underlying data no longer comes from a real NFT.

- **Ids are reused across matches — don't cache AI ship data long-term.** Because slots get released and reallocated, the _same_ AI shipId can be a completely different ship (different name, different config) in a later match. Anything you fetch about an AI ship (via `aiShipInfo`/`ShipsRouter.getShip`) should be treated as scoped to the current `gameId`, fetched fresh when the match starts, not cached indefinitely keyed by shipId the way you might reasonably cache a player's own (permanent, NFT-backed) ships.

- **Player ships are completely unaffected.** Still real ERC-721s on `Ships.sol`, same purchase/customize/render pipeline, same everything. This only changes AI-side ships.

## Current campaign shape (10 nodes)

`NodeMap.getAllNodes()` gives you this graph directly, but here's the shape as seeded so you can sanity-check your rendering and build matching flavor copy (again: none of these names exist on-chain, this is just what the content is _for_):

```
node 1 (root, always unlocked)
  -> node 2
       -> node 3 -> node 4 -> node 5 ─────────────┐
       -> node 6 -> node 7  [dead end — nothing    │
                     requires node 7]              ├─> node 9 -> node 10 (final)
       -> node 8  [hard fight: full 5-ship AI       │
                    fleet, tighter cost limit than  │
                    the mainline route offers at    │
                    this point in the graph] ───────┘
```

- Node 9's `prerequisites` is `[5, 8]` — beating node 8 alone unlocks it, skipping nodes 3-5 (three nodes) entirely. That's the "shortcut."
- Node 7 is a genuine dead end: completing it doesn't unlock anything. Fine to frame as optional/bonus content in the UI (its scoring tile is worth more than the mainline nodes around it, as a small reward for taking the detour).
- If you're building a node-graph UI component for the first time (vs. the old flat "map 1, map 2" picker), this is the shape to test it against — a node with two incoming edges (9) and a node with zero outgoing edges besides its own dead-end child (7) are both real cases you'll hit immediately.

## What's _still_ not new for you

- Combat, movement, scoring, round/turn advancement, win conditions — identical to PvP, same `Game.sol` code path.
- `Game.getGame`, `Game.getShipAttributes`, `Game.getShipPosition` — same read APIs, same shapes, now just occasionally populated with large AI ship ids (see above).
- Player ship rendering — unchanged, still real NFTs, same pipeline.

## New/changed contract surface, for reference

- `SinglePlayerMatch.startNodeMatch(nodeId, shipIds, positions) -> gameId` — replaces the old `acceptMatch`/`setupAIFleet` two-step. Permissionless, one call, only the human calls it (it's their fleet).
- `SinglePlayerMatch.takeAITurn(gameId)` — unchanged, permissionless.
- `SinglePlayerMatch.aiShipInfo(shipId)` → `{archetype, variant, special}` — unchanged in shape.
- `NodeMap.getAllNodes()`, `.getNode(nodeId)`, `.getPrerequisites(nodeId)`, `.isNodeUnlocked(player, nodeId)`, `.isNodeCompleted(player, nodeId)`, `.nodeCount()` — the whole campaign-graph read surface. Replaces the old "which map" section entirely; there's no more `Lobbies`/`selectedMapId` player choice.
- `ShipsRouter.getShip(shipId)`, `.isShipDestroyed(shipId)` — the one call site for ship data regardless of human/AI. Get its address from `Game.ships()`/`Fleets.ships()`/`ShipAttributes.ships()`, or from your deployment config.
- `AIShips.AI_SHIP_ID_OFFSET` — public constant, `2**40`. Use for the free client-side "is this an AI ship" check.
- `SinglePlayerMatch.NODE_MATCH_ID_OFFSET` — public constant, `2**40`. Same idea for gameId, though you shouldn't normally need it (see step 2 above).
- `Types.Archetype` enum: `Grunt=0, Aggressor=1, Sniper=2, Support=3, Turtle=4, Rammer=5` — unchanged.
- `AIEncounters.getAIShipConfig(configId)` / `.getAllAIShipConfigs()` / `.getMapPlacements(mapId)` / `.mapHasPlacements(mapId)` — unchanged, still useful for previewing a node's AI fleet before the player commits to it.

## No longer part of the surface

- `Lobbies.createLobby(..., reservedJoiner: SinglePlayerMatch)` — this specific usage is gone; `Lobbies` is PvP-only now.
- `SinglePlayerMatch.acceptMatch(lobbyId)` / `.setupAIFleet(lobbyId)` — removed, replaced by `startNodeMatch`.
- Calling `Ships.sol.setTimestampDestroyed` directly (if you ever did, e.g. in test/debug tooling) — decomposed into `markDestroyed`/`recordKill`, orchestrated by `ShipsRouter.setTimestampDestroyed` now. Not something the frontend should be calling directly either way.

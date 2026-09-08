# Frontend Update Guide — 2026-08-27 Growth & Lobby Lifecycle Fixes

**Written: 2026-08-27.** Describes contract state as of this date — check the contracts repo's recent commits if it's been a while. Covers a growth/scale audit pass: two new pagination escape hatches for collections that don't fit an unbounded read at large scale, one new lobby-lifecycle mechanic (stale-lobby pruning), and two removed functions that had no real callers. For the `RandomManager` commit-reveal flow (mint → construct is 2 transactions), see `docs/update/Frontend_Updates_2026-08-26.md` — unchanged since that doc's last update.

## TL;DR

- **New, optional:** pagination for three collections that can outgrow a single `eth_call` at scale — ship ownership, AI ship configs, open lobbies. None of this requires any change today unless you're already hitting scale limits.
- **Removed:** two getters that returned *everything* across the whole game (not scoped to one campaign/player) and had zero real callers anywhere. If nothing in your code calls them, there's nothing to do.
- **New behavior:** an open, unjoined lobby that sits for 7+ days can now be permissionlessly delisted from the public "browse open lobbies" list. It's still fully joinable by direct id — this only affects whether it shows up in a browse query.

## 1. Ships: pagination for very large ship collections

`getShipIdsOwned(owner)` is unchanged and still the right call for normal accounts. Two new primitives exist for the rare case of an account that owns an extremely large number of ships:

```solidity
function shipsOwnedCount(address _owner) external view returns (uint);
function shipIdOwnedAt(address _owner, uint _index) external view returns (uint);
```

**Why:** `getShipIdsOwned` returns the owner's entire holdings in one array. Past roughly a million ships for one account, that response is large enough to fail against essentially any production RPC provider's `eth_call` cap — with no way to page around it today. These two let you enumerate a page at a time (`shipsOwnedCount` once, then `shipIdOwnedAt(owner, i)` for whichever range you need — a JSON-RPC batch request handles a whole page in one round trip).

**Action for you:** none for typical users. If you ever build tooling that needs to handle a whale-scale account (e.g. an internal admin view), use these instead of assuming `getShipIdsOwned` always succeeds.

## 2. `NodeMap.getAllNodes()` removed

**Gone.** It returned every node across *every* campaign combined, not scoped to one campaign. Measured empirically: it would become literally uncallable (exceeds Base's block gas limit) somewhere around 1,600 total nodes across all campaigns — a real, near-term ceiling as more campaigns get added, not a distant hypothetical. It also turned out to have no real use case: every actual caller already knows which campaign it's asking about.

Use the pair that was already the correct pattern:

```solidity
uint[] memory nodeIds = nodeMap.getNodesInCampaign(campaignId);
// then getNode(id) for each id you need
```

`docs/singleplayer-frontend-integration.md` (the base reference doc) has already been updated to this pattern — if your integration was built from an earlier version of that doc, re-check it.

**Action for you:** if anything calls `getAllNodes()`, switch it to `getNodesInCampaign` + `getNode`.

## 3. `AIEncounters`: pagination for AI ship configs

`getAllAIShipConfigs()` still exists and is still fine at today's config count. New bounded alternative:

```solidity
function getAIShipConfigsPaginated(uint _offset, uint _limit) external view returns (AIShipConfig[] memory);
```

0-indexed into the config sequence; returns fewer than `_limit` entries (down to an empty array) if the range runs past the end, rather than reverting.

**Why:** measured `getAllAIShipConfigs()` empirically — it fails outright (exceeds the block gas limit, not just "gets expensive") somewhere between 800 and 1,000 configs. At the config-growth rate already observed per faction, that's reachable well before 100 factions exist.

**Action for you:** if you have an admin config browser (e.g. for building new map AI placements), plan to move it to the paginated form before config count climbs into the high hundreds. No change needed for anything that reads a specific config by id (`getAIShipConfig(configId)`, unaffected) or a map's actual placements (`getMapPlacements(mapId)`, unaffected).

## 4. `Lobbies`: stale-lobby pruning + open-lobby pagination

Three additions and one removal:

```solidity
uint public staleLobbyThreshold; // default 7 days
function setStaleLobbyThreshold(uint _threshold) external; // onlyOwner
function pruneStaleLobby(uint _lobbyId) external; // permissionless
function getOpenLobbiesPaginated(uint _offset, uint _limit) external view returns (uint[] memory);
```

**`pruneStaleLobby`:** anyone can call this on a lobby that's been sitting open and unjoined for at least `staleLobbyThreshold` (7 days by default). It removes the lobby from the open-lobbies set only — nothing else about the lobby changes. Reverts:

| Error | Meaning |
|---|---|
| `LobbyNotOpen` | The lobby doesn't exist, already has a joiner, or isn't currently in the open set (nothing to prune). |
| `LobbyNotStaleYet` | It's still open, but hasn't been open long enough yet. |

**What this means for your UI:** a lobby disappearing from `getOpenLobbies()`/`getOpenLobbiesPaginated()` between two polls doesn't necessarily mean it was cancelled — it may have just been pruned for being stale. The lobby record itself, `getLobby(id)`, and a direct `joinLobby(id)` call all keep working exactly as before; pruning only affects whether it shows up in a "browse open lobbies" query. If you cache open-lobby ids for a shareable link, that link still works after pruning.

**`getOpenLobbiesPaginated`:** same bounded-pagination shape as the two getters above — use this instead of `getOpenLobbies()` if your browse-lobbies view needs a hard cost ceiling at scale.

**Removed: `getAllLobbiesForPlayerWithDupes(address)`.** Confirmed zero real callers before removing. It combined a player's own lobby history with the entire open-lobby set in one array, with duplicates you had to filter out client-side. If anything called it, use `getPlayerLobbies(player)` and `getOpenLobbies()`/`getOpenLobbiesPaginated()` as two separate calls instead — cleaner, and you were already deduping the old result yourself.

**Action for you:** no action required for typical usage. If your lobby-browse view doesn't already refetch periodically, consider it — and don't treat "this lobby is no longer in the open list" as proof it was cancelled.

## What did NOT change

- Ship purchase/claim/construct mechanics — see `docs/update/Frontend_Updates_2026-08-26.md` for the `RandomManager` 2-step flow, still current.
- Lobby creation, joining, fleet submission, game start — untouched.
- `AIEncounters`/`Maps` admin write functions (`createAIShipConfig`, `createPresetMap`, etc.) — untouched; only new read-only pagination was added alongside them.
- `Ships.getShipIdsOwned`, `AIEncounters.getAllAIShipConfigs`, `Lobbies.getOpenLobbies`, `Lobbies.getPlayerLobbies` — all still exist, unchanged, and still the right call for normal (non-whale-scale) usage.

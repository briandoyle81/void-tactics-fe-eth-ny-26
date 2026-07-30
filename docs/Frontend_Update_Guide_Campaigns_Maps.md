# Frontend Update Guide — Map Modes, Campaigns, and the Fleet Editor Bug

**Written: 2026-07-30.** This is a delta doc — it covers everything that changed *after* `docs/singleplayer-frontend-integration.md` was last written (the AI-ship-pooling/router work and the `2**40` id-offset fix). That doc is still the source of truth for the overall single-player flow; this one only covers what's new since. Check contracts-repo commits if it's been a while.

## 1. The ghost-ship editor bug — fixed on the contract side

You reported this: remove a ship in the admin fleet editor, hit Save, and the removed ship stays on-chain forever (`AIEncounters` has no clear/delete function, only upsert). Root cause confirmed and fixed.

**`AIEncounters.setMapPlacements(mapId, positions, configIds)` now has full-replace semantics.** It clears every existing placement on the map first, then applies whatever you send. You can now just send the complete new fleet deployment — any count, any positions, any config selection — and it fully replaces what was there, including cells you don't mention. Send empty arrays to clear a map's fleet entirely.

**Action for you:** delete whatever workaround/diffing logic you may have built around the old upsert-only behavior. The editor can now just send its current local state on Save, full stop. `setMapPlacement` (singular, single-cell) is unchanged — `configId = 0` still means "clear this one cell," documented in its NatSpec.

## 2. Map modes: PvP / PvE / Both

Every map now has a `MapMode` (`PvP = 0`, `PvE = 1`, `Both = 2`), set at creation and reclassifiable after:

- `Maps.createPresetMap(blocked, scoring, mode)`, `Maps.createPresetMap(blocked, mode)`, `Maps.createPresetScoringMap(scoring, mode)`, `Maps.createFullPresetMap(blocked, scoring, mode)` — **all four now take a required trailing `MapMode` param.** If you call these directly (e.g. a map-authoring tool), this is a breaking ABI change.
- `Maps.setMapMode(mapId, mode)` — new, editor-gated, reclassifies an existing map.
- `Maps.mapMode(mapId) view returns (MapMode)` — new getter.

**This is enforced, not just descriptive:**
- `Lobbies.createLobby`/`createLobbyForAddresses` now revert `InvalidMapId` if `selectedMapId` refers to a `PvE`-only map.
- `NodeMap.createNode`/`updateNode` now revert `InvalidMapMode` if the map isn't `PvE` or `Both`.

**Action for you:** if you have a PvP lobby map picker or a campaign node map picker, filter by mode (`mapMode(id) != PvE` for the PvP picker, `mapMode(id) != PvP` for the campaign picker) so players don't see maps that will fail server-side. All 10 currently-seeded campaign maps are `PvE`.

## 3. AI fleet size cap is now a live, owner-tunable number

`AIEncounters.maxPlacementsPerMap` was a hardcoded `constant` (8). It's now a plain `uint`, defaults to 8, changeable via `setMaxPlacementsPerMap(uint)` (owner-only). If your editor UI hardcodes "max 8 ships per map," read this value instead — it can change without a redeploy now.

## 4. AI fleet cost is no longer capped against the node's player cost limit — and there's a new descriptive `enemyThreat` field

Previously, `startNodeMatch` reused the node's `costLimit` (the human fleet's cost ceiling) as the AI fleet's cost ceiling too — an admin-curated encounter that summed to more cost than the node's own player limit would make the match fail to start. **That's gone.** The AI fleet's cost is never checked against anything now. Place whatever you want in `AIEncounters`, at whatever total cost, up to `maxPlacementsPerMap` ships.

To replace the "at least the numbers are in the same ballpark" signal that cap used to (accidentally) provide, `NodeMap.CampaignNode` has a new field:

```solidity
uint enemyThreat; // purely descriptive, never enforced — your own UI/balance reference
```

**Action for you:**
- If your admin editor validated "AI fleet cost ≤ node.costLimit" client-side to mirror the old contract behavior, remove that check — it's not real anymore.
- `costLimit` is still the real, enforced player fleet cost cap ("max player threat").
- `enemyThreat` is a number for your own reference/display (e.g. a difficulty readout) — nothing on-chain checks it against the actual AI fleet cost, so don't assume they match.

## 5. Multiple campaigns

`NodeMap` now supports grouping nodes into named-by-id campaigns, with a query surface designed for other contracts (or your frontend) to check progress without walking the whole node list.

- `NodeMap.createCampaign() returns (uint campaignId)` — editor-gated, sequential ids, no metadata (same "no on-chain display strings" convention as maps/AI configs — keep your own name/flavor-text mapping).
- Every node now belongs to one: `createNode`/`updateNode` both take a new **first-positioned** `campaignId` param (see signatures below) and revert `CampaignNotFound` if it doesn't exist. A node can be moved to a different campaign via `updateNode`.
- `NodeMap.getNodesInCampaign(campaignId) returns (uint[])`
- `NodeMap.getCampaignCompletion(player, campaignId) returns (uint[] nodeIds, bool[] completed)` — the main one for a progress screen: one call gets you the campaign's node ids and this player's completion state for each, in parallel arrays.
- `NodeMap.isCampaignFullyCompleted(player, campaignId) returns (bool)` — convenience for a "100% cleared" badge/gate.
- New `INodeMap.sol` interface exposes all of the above (plus `isNodeCompleted`/`isNodeUnlocked`/`campaignExists`/`campaignCount`) if you want a lighter import than the full `NodeMap` contract.

**Right now there is exactly one campaign** (`campaignId = 1`, all 10 seeded nodes belong to it) — this is infrastructure for when a second one gets built, not a sign one exists today. `NodeMap.getAllNodes()` (unchanged) still returns every node flat across all campaigns if that's all you need.

### Updated `createNode` / `updateNode` signatures

```solidity
function createNode(
    uint _campaignId,   // NEW — must already exist (createCampaign)
    uint _mapId,
    uint[] calldata _prerequisites,
    uint _costLimit,
    uint _turnTime,
    uint _maxScore,
    bool _creatorGoesFirst,
    uint _enemyThreat    // already new as of the last doc's threat-number work, if you hadn't picked it up yet
) external returns (uint nodeId);

function updateNode(
    uint _nodeId,
    uint _campaignId,   // NEW
    uint _mapId,
    uint[] calldata _prerequisites,
    uint _costLimit,
    uint _turnTime,
    uint _maxScore,
    bool _creatorGoesFirst,
    uint _enemyThreat
) external;
```

`CampaignNode` (the struct `getNode`/`getAllNodes` return) also gained `campaignId` — inserted right after `id`, before `mapId`. If you're reading it by field name (the normal case with viem/ethers ABI decoding) this is transparent; only matters if you're doing raw positional tuple decoding somewhere.

## 6. Map/AI-fleet content changed (informational)

Separately from the above capability changes, the actual seeded content was reworked for variety and balance: AI fleet formations across 8 of the 10 campaign maps no longer sit in a single vertical line at column 13 (mixed columns/shapes now), scoring-tile coordinates no longer collide across maps, and each node's `costLimit`/`enemyThreat` now scales from 500/350 (node 1) up to 2000/2500 (the final node), with the shortcut node fixed at 1500/2000. If your UI displays or hardcodes any specific tile coordinates or difficulty numbers from earlier testing, they've likely moved. Pull current values from `NodeMap.getNode`/`getAllNodes` and `AIEncounters.getMapPlacements` rather than anything cached from before this update.

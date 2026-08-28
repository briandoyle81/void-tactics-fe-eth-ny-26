# Frontend Update Guide — Map Modes, Campaigns, and the Fleet Editor Bug

**Written: 2026-07-30.** This is a delta doc — it covers everything that changed *after* `docs/singleplayer-frontend-integration.md` was last written (the AI-ship-pooling/router work and the `2**40` id-offset fix). That doc is still the source of truth for the overall single-player flow; this one only covers what's new since. Check contracts-repo commits if it's been a while.

**Revised 2026-08-25** — added section 7 (fleets can no longer mix ship variants; the Shattered Hive campaign now requires an all-variant-1 human fleet) and section 8 (the complete admin write surface for designing/editing campaign missions — this existed on-chain before today but was never fully written up here: editor-role management and incremental prerequisite editing were previously undocumented).

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

## 7. Fleets can no longer mix ship variants — and the Shattered Hive campaign now requires variant 1

**`Fleets.createFleet` reverts `MixedVariantFleet()` if the ships passed in don't all share the same `traits.variant`.** This applies everywhere fleets are created — PvP (`Lobbies.createFleet`) and single-player (`SinglePlayerMatch.startNodeMatch`) alike, since both call through the same `Fleets.createFleet`. A player can still own and switch between ships of both variants; they just can't field one fleet mixing them.

**Action for you:** if your fleet-builder UI lets a player free-pick any of their owned ships regardless of variant, filter the picker down to one variant at a time (e.g. a variant toggle/tab), or filter to match whichever ship the player picks first. Don't rely on the contract call failing as your only validation — that's a wasted transaction and a worse UX than filtering client-side.

**Separately, campaigns can now require a specific human fleet variant**, via a new NodeMap function:

```solidity
function setCampaignRequiredVariant(uint _campaignId, uint16 _variant) external; // onlyNodeEditor
function campaignRequiredVariant(uint _campaignId) external view returns (uint16); // 0 = unrestricted
```

`SinglePlayerMatch.startNodeMatch` reverts `WrongCampaignVariant()` if the human fleet's variant doesn't match a nonzero `campaignRequiredVariant` for that node's campaign. **The Shattered Hive campaign (`campaignId = 1`) is now configured to require variant 1** — the AI side is untouched and still fields variant-2 fleets (section 8 of `docs/update/faction-2.md`), so this campaign is now a fixed "variant-1 human vs. variant-2 AI" story, not a player choice.

**Action for you:** if your campaign fleet-select screen lets the player bring any owned ship, check `campaignRequiredVariant(campaignId)` before letting them enter fleet selection for a node — if nonzero, filter to that variant only (or show a clear "this campaign requires [faction]" message) rather than letting them build a fleet that will fail at `startNodeMatch`.

## 8. Complete admin write surface for designing/editing campaign missions

You asked whether the hooks/controls to build a campaign-mission editor exist — they do, on `NodeMap`, and most of them predate today but were never written up here in full. This section is the complete reference.

**Who can call these:** every function below is `onlyNodeEditor` (owner, or an address granted editor rights) unless noted otherwise.

```solidity
// Role management — owner only, not onlyNodeEditor (granting edit rights is
// itself a more sensitive action than editing).
function setNodeEditor(address _editor, bool _allowed) external; // onlyOwner
function isNodeEditor(address) external view returns (bool);      // check who currently has it

// Campaigns — a campaign is just a grouping id, no on-chain metadata
// (keep your own name/flavor-text mapping, same convention as maps/AI
// configs).
function createCampaign() external returns (uint campaignId); // sequential id
function campaignExists(uint) external view returns (bool);
function campaignCount() external view returns (uint);
function setCampaignRequiredVariant(uint _campaignId, uint16 _variant) external; // see section 7
function campaignRequiredVariant(uint) external view returns (uint16);

// Nodes — the actual missions. campaignId must already exist; mapId must
// exist and be PvE-or-Both mode (see section 2); prerequisites is the
// ANY-of unlock set (completing any ONE prerequisite unlocks the node —
// not all of them, so shortcut nodes can converge from multiple branches).
function createNode(
    uint _campaignId,
    uint _mapId,
    uint[] calldata _prerequisites,
    uint _costLimit,      // enforced: human fleet's cost cap
    uint _turnTime,
    uint _maxScore,
    bool _creatorGoesFirst,
    uint _enemyThreat     // descriptive only, never enforced — see section 4
) external returns (uint nodeId);

function updateNode(
    uint _nodeId,
    uint _campaignId,      // moves the node if different from its current one
    uint _mapId,
    uint[] calldata _prerequisites, // full replace, not a merge
    uint _costLimit,
    uint _turnTime,
    uint _maxScore,
    bool _creatorGoesFirst,
    uint _enemyThreat
) external;

// Incremental prerequisite editing — lighter-weight than a full updateNode
// when you only want to add/remove one unlock edge in a graph-editor UI.
// Both revert SelfPrerequisite if _prerequisiteId == _nodeId, and
// PrerequisiteNotFound if the referenced node doesn't exist.
// removePrerequisite additionally reverts PrerequisiteNotInNode if that
// node isn't currently one of _nodeId's prerequisites.
function addPrerequisite(uint _nodeId, uint _prerequisiteId) external;
function removePrerequisite(uint _nodeId, uint _prerequisiteId) external;
```

**There is no node-delete function.** A node, once created, always exists — "removing" a mission from play means either editing it into something else via `updateNode`, or (more commonly) just not linking anything to it as a prerequisite so players can no longer reach it. Keep this in mind for an editor's "delete" affordance — it should call `updateNode` or unlink, not expect a real delete.

**Read surface for building the editor UI** (all view functions, no gating):

```solidity
function getNode(uint _nodeId) external view returns (CampaignNode memory);
function getAllNodes() external view returns (CampaignNode[] memory);
function getNodesInCampaign(uint _campaignId) external view returns (uint[] memory);
function getPrerequisites(uint _nodeId) external view returns (uint[] memory);
function nodeCount() external view returns (uint);
function isNodeUnlocked(address _player, uint _nodeId) external view returns (bool);
function isNodeCompleted(address _player, uint _nodeId) external view returns (bool);
function getCampaignCompletion(address _player, uint _campaignId) external view returns (uint[] memory nodeIds, bool[] memory completed);
function isCampaignFullyCompleted(address _player, uint _campaignId) external view returns (bool);
```

`CampaignNode` (what `getNode`/`getAllNodes` return) has all the fields above plus `id` and `exists`: `{ id, campaignId, mapId, prerequisites[], costLimit, turnTime, maxScore, creatorGoesFirst, enemyThreat, exists }`.

**Action for you:** if you're building a real campaign-mission editor (as opposed to just reading the graph), this is everything you need — grant yourself/your admin tooling `isNodeEditor` via `setNodeEditor` (owner-only, ask whoever holds contract ownership), then `createCampaign` once per new storyline and `createNode`/`updateNode`/`addPrerequisite`/`removePrerequisite` to build out and adjust the mission graph. Don't forget `setCampaignRequiredVariant` (section 7) if a new campaign should be faction-locked.

# Frontend Handoff: Map Redesign, Impassable Terrain & Deployment Zones

**Written: 2026-09-23.** Everything that changed in the contracts since `docs/frontend-handoff-attributes-costs-and-ai-2026-09-21.md` (still the source of truth for attributes/costs/AI — nothing here supersedes it). Describes the contracts **on `main` in the working tree**; not yet deployed anywhere as of this writing — every address is "the new address after the next full redeploy," which is expected to happen shortly after this doc is written. Re-verify against the contracts if they have changed since this date.

Companion docs: `docs/roguelike-progression.md` (updated for this pass), `docs/ai-ship-configs.md` (unaffected, still current).

---

## 0. TL;DR — what to do

1. **Regenerate ABIs** for `Maps`, `IMaps`, `Fleets`, `IFleets` — all four gained new functions/events, and two gained breaking parameter/return changes (§1, §2).
2. **`Fleets.createFleet` has a new trailing `uint _mapId` parameter** (§2) — every call site must pass it now.
3. **`Maps.createFullPresetMap` has a new 2nd parameter** (`impassablePositions`) and **`getGameMapState` has a new 3rd return value** (`impassablePositions`) (§1) — admin/map-authoring tooling only, not something players call directly, but any FE code calling either must update.
4. **Every preset map now has richer data**: a real name (`mapName`), possibly a custom deployment-zone shape, and impassable (movement-blocking) tiles independent of the existing LOS-blocking `blocked` tiles (§1, §3).
5. **`Maps.mapCount()` is now 65, not 35** — see §4. If the FE lists/enumerates maps, the list grew and every campaign map's content changed (new terrain, not the old data at the same id).
6. **PvP preset maps exist for the first time** (§4) — 5 of them, selectable today via `Lobbies.createLobby`'s existing `_selectedMapId` parameter. No Lobbies ABI change, just real data to select from now.
7. **Deploy-script-only fix**: `FreeShipClaim`/`TutorialClaim` ownership is now correctly handed to `MAP_EDITOR` on a real deploy (§5) — not an ABI change.
8. If the FE hasn't yet fixed the Ram/Repair `ActionType.FactionAbility` issue from the 2026-09-21 doc's §9, that's still outstanding and unrelated to everything in this doc — check there first.

---

## 1. Impassable terrain — movement-blocking, independent of the existing (LOS-blocking) `blocked` tiles

### 1.1 The concept

Every map tile now has **two independent bits**, not one:
- `blocked` (existing) — blocks shooting line of sight only. A ship can still fly onto or through a blocked tile.
- `impassable` (new) — blocks **movement**, both landing on the tile and passing through it in a straight line. Transparent to shots.

Combined: soft cover (blocked only — flyable through, blocks LOS), hard cover (both — a real wall), a movement hazard (impassable only — transparent to shots but can't be entered or crossed), open ground (neither).

### 1.2 New / changed `Maps.sol` functions

**New:**
```solidity
function hasMovementPath(uint _gameId, int16 _row0, int16 _col0, int16 _row1, int16 _col1) public view returns (bool)
function getPresetMapImpassable(uint _mapId) external view returns (Position[] memory)
function isTileImpassable(uint _gameId, int16 _row, int16 _col) public view returns (bool)
function setImpassableTile(uint _gameId, int16 _row, int16 _col, bool _impassable) external
```
`hasMovementPath` mirrors the existing LOS check (`hasMaps`) — same straight-line (Bresenham) walk, same permissive-corner diagonal rule — but against the impassable bitmap, and without the "start tile blocked ⇒ false" exception (a ship standing on a tile can always leave it, even if that tile is later marked impassable). Note `setImpassableTile`/`isTileImpassable` take a **game id**, not a map id — they edit/read a live game's copy of the map, same as the existing `setBlockedTile`/`isTileBlocked`.

**Changed (breaking):**
```solidity
// Before: createFullPresetMap(Position[] blocked, ScoringPosition[] scoring, MapMode mode)
// Now — impassablePositions is the NEW 2nd parameter:
function createFullPresetMap(
    Position[] memory _blockedPositions,
    Position[] memory _impassablePositions,   // NEW
    ScoringPosition[] memory _scoringPositions,
    MapMode _mode
) external
```
```solidity
// getGameMapState gained a 3rd return value:
function getGameMapState(uint _gameId) external view returns (
    Position[] memory blockedPositions,
    ScoringPosition[] memory scoringPositions,
    Position[] memory impassablePositions   // NEW
)
```
No on-chain contract calls either of these — this is purely a frontend/admin-tooling-facing break.

### 1.3 Gameplay behavior change

`Game.moveShip` now reverts `InvalidMove()` if the straight-line path from the ship's current tile to its destination crosses an impassable tile anywhere along the way — not just at the destination. Enforced the same way line-of-sight already is (a straight-line check, not full pathfinding): a ship can occasionally be denied a destination a real detour could reach within its movement budget, the same abstraction level LOS already uses. **`RepairResolver`/`RamResolver`'s relocation effects are unaffected** — they place a ship directly, not via `moveShip`.

**AI has no special awareness of this.** If an AI ship's chosen path is blocked mid-line, it hits the existing try/catch fallback already in `SinglePlayerMatch`/`RoguelikeMatch` and Passes that turn, same as any other illegal AI move.

---

## 2. Deployment zones — per-map custom spawn shapes

### 2.1 The concept

Previously every map used one hardcoded spawn rule: creator ships in columns 0–3, joiner ships in columns 13–16, any row. That's now the **default**, but a map can instead define its own shape — a specific set of tiles confined to those same column ranges (never outside them, and never overlapping the "core" battlefield columns).

### 2.2 New `Maps.sol` functions

```solidity
function setCreatorZone(uint _mapId, Position[] calldata _tiles) external   // onlyMapEditor, full-replace
function setJoinerZone(uint _mapId, Position[] calldata _tiles) external    // onlyMapEditor, full-replace
function isValidDeploymentTile(uint _mapId, int16 _row, int16 _col, bool _isCreator) public view returns (bool)
function getCreatorZonePositions(uint _mapId) external view returns (Position[] memory)
function getJoinerZonePositions(uint _mapId) external view returns (Position[] memory)
```
An **empty array** (the default, unless explicitly set) means "use the engine default column band" — `getCreatorZonePositions`/`getJoinerZonePositions` return `[]` for a map that hasn't customized its zone. Treat that as "show the default rectangle," not "this map has no valid deployment tiles."

### 2.3 `Fleets.createFleet` — breaking ABI change

```solidity
// Before:
function createFleet(uint lobbyId, address owner, uint[] shipIds, Position[] startingPositions, uint costLimit, bool isCreator) external returns (uint)
// Now — mapId is a NEW trailing parameter:
function createFleet(uint lobbyId, address owner, uint[] shipIds, Position[] startingPositions, uint costLimit, bool isCreator, uint mapId) external returns (uint)
```
Pass the lobby's/match's already-resolved `mapId` — it's already available wherever `createFleet` is called from today (`Lobbies.selectedMapId`, a campaign/roguelike node's `mapId`). Passing `mapId = 0` falls back to the exact old hardcoded column check, unchanged — for any synthetic/placeholder fleet flow with no real map.

If a ship's starting position isn't valid for the map's zone (custom or default), `createFleet` reverts the existing `InvalidPosition()` — no new error.

---

## 3. On-chain map names

```solidity
mapping(uint => string) public mapName;
function setMapName(uint _mapId, string calldata _name) external   // onlyMapEditor
event MapNameSet(uint indexed mapId, string name);
```
Purely descriptive, purely additive — not a creation parameter, so it's freely renameable after deploy at any time by calling it again. Read via the public `mapName(mapId)` getter. Every seeded map now has a real name (e.g. `"Debris Ring — Sector 6"`, `"Reactor Core — Sole Contract"`) instead of nothing — if the FE has been showing a map's raw key (`m06`, `pvp05`) as its display name, it can switch to this.

---

## 4. Map content — 65 maps, not 35; PvP maps exist for the first time

Every preset map was regenerated with actual thematic design (symmetric or deliberately-imbalanced terrain, chokepoint lanes, named archetypes: Asteroid Field, Debris Ring, Trench Run, Twin Pillars, Reactor Core, Open Void) in place of the old effectively-random hand-placed tiles. `Maps.mapCount()` is now **65** (was 35 as of the 2026-09-21 doc):

| Ids | What | Notes |
|---|---|---|
| 1–30 | Campaign (`NodeMap`) maps, keys `m01`–`f06` | Same ids/keys as before, **entirely new terrain/scoring/impassable/name/zone data** — any cached tile positions or blocked-tile counts are stale |
| 31–60 | Roguelike maps, keys `rlM01`–`rlF06` | **New: every roguelike Combat node now has its own dedicated map** (previously only 5 did, ids 31–35, and those 5 were literal clones of campaign terrain). AI rosters: the first 5 (`rlM01`-`03`/`rlD01`/`rlS01`, missions 1–3) keep their own hand-tuned variant-1 rosters; the rest copy their campaign counterpart's exact variant-2 roster onto new, dedicated terrain |
| 61–65 | PvP maps, keys `pvp01`–`pvp05` | **New — the first PvP-mode preset maps to ever exist.** Not attached to any campaign/roguelike node. Selectable today via `Lobbies.createLobby`/`createLobbyForAddresses`'s existing `_selectedMapId` param (already validates `mode == PvP \|\| mode == Both`) — no Lobbies ABI change needed, just real data to select from now |

`AIEncounters.getMapPlacements(mapId)` positions were updated for every PvE map to match its new terrain; AI roster **composition** (which ship configs) is unchanged except where noted above.

If the FE has a map-picker/browser UI, it will now show real names (§3), and PvP lobby creation has real content to offer for the first time.

---

## 5. Deploy-script fix: FreeShipClaim/TutorialClaim ownership (not an ABI change)

Unrelated to the map work, found while auditing the deploy module: on a real (`PRODUCTION=true`) deploy, ownership of `FreeShipClaim` and `TutorialClaim` was never handed to the `MAP_EDITOR` account the way every other admin contract is — they were left owned by the deploying wallet. Fixed by adding both to the existing ownership-transfer block. No ABI change; only matters to whoever operates a live deployment (they can now call `setEligibilityProvider` etc. from the `MAP_EDITOR` account like everywhere else, instead of needing the original deployer key).

---

## 6. Frontend checklist

- [ ] Regenerate ABIs: `Maps`, `IMaps`, `Fleets`, `IFleets`.
- [ ] Every `Fleets.createFleet` call site: add the trailing `mapId` argument (use `0` only for a genuinely map-less/synthetic fleet).
- [ ] Any admin/map-authoring tooling calling `createFullPresetMap`: add the `impassablePositions` argument (2nd position).
- [ ] Any code reading `getGameMapState`: handle the 3rd return value (`impassablePositions`).
- [ ] Map browser/picker UI: show `mapName(mapId)` instead of the raw key; expect up to 65 maps; PvP maps are real now.
- [ ] Deployment-zone-aware ship placement UI (if any): read `getCreatorZonePositions`/`getJoinerZonePositions` — empty array means "use the default rectangle," not "no valid tiles."
- [ ] Combat/movement UI: a move can now fail because the straight-line path crosses impassable terrain partway through, not just at the destination — surface `InvalidMove()` the same way an out-of-range move already is.
- [ ] Cached/hard-coded assumptions about any specific campaign map's terrain (blocked-tile counts/positions, scoring-tile positions/values) are stale — refresh from the contract.
- [ ] If not already done: the 2026-09-21 doc's §9 Ram/Repair `ActionType.FactionAbility` fix — confirm whether that's live yet.

---

## 7. Not changed / out of scope

- Attributes, costs, AI behavior trees, variant balance — unchanged since 2026-09-21; that doc is still current for all of it.
- `AIShipConfigs` (the 52 configs' equipment/stats/archetypes) — unchanged; only their map placements (positions, not roster composition) moved.
- Node/campaign graph topology (edges, prerequisites, `costLimit`/`turnTime`/`maxScore`) — unchanged.
- `Ships.sol` — untouched throughout this pass (it has essentially zero remaining contract-size headroom; every change in this pass was deliberately routed around it).
- Nothing has been deployed as of this writing: `PRODUCTION` is `false`, and the full test suite passes (778 tests) against ephemeral deploys only. Real addresses will be supplied separately once the redeploy this doc anticipates actually happens.

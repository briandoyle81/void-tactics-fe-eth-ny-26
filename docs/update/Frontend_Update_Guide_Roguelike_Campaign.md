# Frontend Update Guide — Roguelike Campaign Mode

**Written: 2026-08-25.** Brand-new feature, not a delta on an earlier doc. Describes contract state as of this date — check the contracts repo's recent commits if it's been a while.

## TL;DR

A second, structurally different single-player campaign mode now exists, entirely alongside the existing one (`NodeMap.sol`/`SinglePlayerMatch.sol`, covered in `docs/singleplayer-frontend-integration.md` and `docs/update/Frontend_Update_Guide_Campaigns_Maps.md`). **Nothing about the existing campaign changed** — this is new infrastructure in new contracts, for a new "run"-based game mode:

- The player commits a fleet **once**, at the start of a run (`RoguelikeMatch.startRun`), not per-mission.
- That roster persists — **with accumulated hull damage carried between missions** — until the run ends (a loss/draw/retreat) or is won outright.
- The mission graph (`RoguelikeNodeMap`) branches, and committing to one branch **permanently locks out its siblings for that run** (see "Branch lockout" below) — a real roguelike run structure, not the old campaign's freely-replayable graph.
- Some nodes are **resupply nodes**: no combat, just repairing (for a UTC cost), changing roster composition, and possibly a new fleet-cost cap (`RoguelikeResupply.sol`).
- Actual combat plays out on the same core `Game.sol` your existing single-player UI already knows how to render (`moveShip`, `takeAITurn`, `getGame`, `getShipAttributes` — all unchanged). The only new thing is which contract orchestrates the match and what `gameId` range it uses.

New contracts: `RoguelikeNodeMap.sol`, `RoguelikeRun.sol`, `RoguelikeMatch.sol`, `RoguelikeResupply.sol`, `RoguelikeAIController.sol` (backend-only, you never call it), `SinglePlayerOrchestratorRegistry.sol` (backend-only, not player-facing).

---

## 1. Mental model: a "run"

Call `RoguelikeRun.getRun(playerAddress)` any time to get the player's current run state:

```solidity
enum RunStatus { None, Active, Won, Ended }

struct Run {
    RunStatus status;
    uint generation;         // internal bookkeeping, ignore
    uint campaignId;
    uint currentNodeId;      // where the player is right now
    uint currentCostCap;     // the fleet-cost ceiling in effect right now
    uint reservationFleetId; // internal, ignore
    uint[] rosterShipIds;    // the ships currently committed to this run
}
```

`RunStatus.None` means "never started a run" (or started one long enough ago it's since ended and generation moved on — treat `None`/`Won`/`Ended` all as "not currently in a run" for gating your UI). Only `Active` means the player can act.

Other useful reads:
- `RoguelikeRun.getShipHP(player, shipId) → uint8` — the ship's **persisted hull points** for this run. `0` means "not yet damaged this run" (i.e., it'll enter its next fight at fresh 100%, not literally 0 HP — don't render this as "destroyed").
- `RoguelikeRun.isNodeLocked(player, nodeId) → bool` — whether a specific node is locked out for the player's *current* run.
- `RoguelikeRun.hasActiveRun(player) → bool` — convenience for `status == Active`.

**One important simplification:** there is no per-mission squad selection. The run's **entire current roster** fights every combat node — you can't bench a subset of ships for one fight. If that's ever wanted, it isn't built; flag it and we can add it.

## 2. Starting a run

```solidity
function startRun(uint campaignId, uint[] calldata shipIds) external returns (uint rootNodeId);
```

- `shipIds` is the player's chosen roster — must be non-empty, all one variant (see "Variant restriction" below and `Fleets.MixedVariantFleet`, already documented in `docs/update/Frontend_Update_Guide_Campaigns_Maps.md` §7 — it applies here too), and not already `inFleet` elsewhere.
- Reverts `RunAlreadyActive` if the player already has one in progress — check `hasActiveRun` first and show them their in-progress run instead of a "start" button.
- Reverts `CampaignNotFound` / `CampaignHasNoRoot` if the campaign isn't set up yet (admin-side issue, not a player error to handle gracefully beyond a generic message).
- Reverts `WrongCampaignVariant` if the campaign requires a specific ship variant and the roster's first ship doesn't match (mirrors the existing campaign's `NodeMap.campaignRequiredVariant`/`WrongCampaignVariant` pattern).

On success, every roster ship becomes `inFleet == true` (a real `Fleets.Fleet` reserves them — same field your UI already reads to grey out a ship elsewhere) and stays that way until the run ends. **A roster ship can't be used in the old campaign, PvP, or anything else while a run is active.**

## 3. Moving through the graph

Two entry points, depending on the target node's kind:

```solidity
function enterCombatNode(uint targetNodeId, Position[] calldata positions) external returns (uint gameId);
function enterResupplyNode(uint targetNodeId) external;
```

`positions` must have exactly as many entries as the run's current roster, in the same order — same `{row, col}` shape and creator-side column constraints (0-3) you already use for the existing campaign's `startNodeMatch`.

Both revert `WrongNodeKind` if you call the wrong one for that node's actual kind (check `RoguelikeNodeMap.getNode(nodeId).kind` first — `0 = Combat`, `1 = Resupply`).

Both revert `CannotAdvance` if `targetNodeId` isn't a legal move from the player's `currentNodeId` — see branch lockout rules below. **Always drive your "where can I go" UI from `RoguelikeNodeMap.getChildren(currentNodeId)` filtered by `RoguelikeRun.isNodeLocked`, not from assumptions** — the same node id might be enterable in one run and locked in another.

### Branch lockout — read this carefully

`RoguelikeNodeMap` nodes have children, not prerequisites (opposite of the old campaign's `NodeMap`). Each parent→child edge has a `twoWay` flag. The rule, in full:

- The very first node you enter after `startRun` (the campaign's root) is always enterable — no traversal needed.
- Committing to a child **locks every other child of that same parent, and locks the parent itself** — for that run only (a fresh run starts with nothing locked).
- **Exception:** if the edge you just crossed is `twoWay`, the parent is *not* locked — you can walk back across that specific edge later. This does **not** protect any sibling from being locked; only the parent-you-came-from is exempted, and only via that one edge.
- There is no "jump to any unlocked node" — movement is always to a child of your current node, or back across a two-way edge to the node you arrived from.

Practically: **most edges should be one-way** (the roguelike "no take-backs" feel). Mark an edge `twoWay` specifically for something like a resupply hub you want the player to be able to return to after finishing a side mission, while its sibling missions stay locked out once any one of them is chosen.

## 4. Combat

Once `enterCombatNode` succeeds, everything is identical to the existing single-player campaign's combat UI:

- `gameId` is returned by the call (also derivable: `RoguelikeMatch.ROGUELIKE_GAME_ID_OFFSET() + n`, a disjoint range from both PvP lobby ids and the old campaign's `SinglePlayerMatch.NODE_MATCH_ID_OFFSET` — same JS-safe-integer reasoning as that constant).
- Use `Game.getGame(gameId)`, `Game.moveShip(...)`, `Game.getShipAttributes(gameId, shipId)` exactly as you already do.
- The AI's turn is taken via `RoguelikeMatch.takeAITurn(gameId)` (permissionless, same as `SinglePlayerMatch.takeAITurn` — anyone can call it, call it right after the human's move confirms, once per remaining AI ship, exactly like today).
- AI composition comes from the same `AIEncounters` map placements as the old campaign — nothing new to learn there.

**Damage now genuinely carries between missions.** A ship that ends a fight at 60% hull enters its *next* combat node still at roughly that HP (see the auto-heal note below) — `Game.getShipAttributes` will show it starting below max. Don't assume every match starts every ship at 100% the way the old campaign always does.

**When you win**, the run automatically either continues (moves are still gated to the node you just cleared, now unlocked forward per its children) or, if the node you won has no children at all, the run ends as `Won` and every surviving ship is released back to normal (`inFleet = false`, usable anywhere again). **When you lose, draw, or the run is retreated**, the run ends the same way (see §6) — check `RoguelikeRun.getRun(player).status` after a match ends to know which happened.

### Auto-heal on a win

Each campaign has an admin-set `campaignAutoHealPercent` (0-100, read via `RoguelikeNodeMap.campaignAutoHealPercent(campaignId)`). On a win, every survivor's HP is raised **up to** that percent of its max if it ended below it — never healed down if it was already higher. If you want to show the player "your fleet limped back in and got patched up to at least X%," this is the number.

## 5. Resupply nodes (`RoguelikeResupply.sol`)

Two player actions, both only valid while the player's `currentNodeId` is actually a Resupply-kind node (reverts `NotResupplyNode` otherwise):

```solidity
function resupplyRepair(uint[] calldata shipIds) external;
function resupplyModifyRoster(uint[] calldata shipIdsToAdd, uint[] calldata shipIdsToRemove) external;
```

**Repair**: full-heals every listed ship (must be in the current roster — `ShipNotInRoster` otherwise) and charges UTC proportional to missing HP: `cost = missingHP * RoguelikeResupply.repairCostPerHP()` (a single global admin-set rate — read it to show a price preview before the player confirms). **Requires an ERC20 `approve` on `UniversalCredits` for `RoguelikeResupply`'s address first** — same pull-payment pattern as `DroneYard.modifyShip`, which your UI presumably already has an approve-flow for. Reverts `InsufficientFunds(required, available)` if the player's UTC balance is short.

**Roster changes**: pass ship ids to add and/or remove in one call. Adding reverts `ShipNotOwned` / `ShipAlreadyInFleet` / `WrongCampaignVariant` (same checks as `startRun`). The whole roster (post-change) is re-validated against the run's current cost cap — an add that pushes total cost over the cap reverts the same `InvalidFleetCost` the existing `Fleets` contract already uses elsewhere, so no new error to learn there.

**Cost cap changes**: if the resupply node has a nonzero `costCapOverride` (`RoguelikeNodeMap.getNode(nodeId).costCapOverride`), simply *entering* it (`enterResupplyNode`) updates `RoguelikeRun.currentCostCap` going forward — no separate action needed. It's a one-way ratchet: it doesn't retroactively kick already-reserved ships even if the new cap is lower, it only constrains what you can do from here on.

## 6. Retreating / ending a run

```solidity
function retreatRun(uint gameId) external; // gameId = 0 if no match is currently active
```

- Between nodes (no active match): pass `0`. Immediately ends the run, releases the roster.
- Mid-combat: pass the active `gameId`. Forfeits that match as a loss (via the same `Game.forceEndSession` mechanism the old campaign's AI-surrender path already uses under the hood), which ends the run the same way a real loss would.

There is no partial retreat / "go back to the last resupply node with survivors" — any non-win outcome ends the whole run.

## 7. Building an admin/mission editor for this campaign type

Same idea as `docs/update/Frontend_Update_Guide_Campaigns_Maps.md` §8 (the existing campaign's editor reference), different shape. `RoguelikeNodeMap` functions (all `onlyNodeEditor` — owner, or an address granted via `setNodeEditor`, unless noted):

```solidity
function setNodeEditor(address editor, bool allowed) external; // onlyOwner
function createCampaign() external returns (uint campaignId);
function setCampaignRoot(uint campaignId, uint nodeId) external; // required — no auto-detected root
function setCampaignAutoHealPercent(uint campaignId, uint8 percent) external; // 0-100
function setCampaignRequiredVariant(uint campaignId, uint16 variant) external; // 0 = unrestricted
function setCampaignInitialCostCap(uint campaignId, uint costCap) external; // the run's starting cap

function createNode(
    uint campaignId,
    RoguelikeNodeKind kind,   // 0 = Combat, 1 = Resupply
    uint mapId,               // Combat only, pass 0 for Resupply
    uint turnTime,            // Combat only
    uint maxScore,             // Combat only
    bool creatorGoesFirst,     // Combat only
    uint enemyThreat,          // Combat only, descriptive
    uint costCapOverride       // Resupply only, pass 0 for Combat / "no change"
) external returns (uint nodeId);

function updateNode(uint nodeId, /* same fields as createNode */) external;
function addChild(uint parentId, uint childId, bool twoWay) external;
function removeChild(uint parentId, uint childId) external;
```

Read surface for the editor UI: `getNode(nodeId)`, `getChildren(nodeId)`, `getEdge(parentId, childId) → bool twoWay`, `campaignExists`/`campaignCount`/`campaignRootNode`/`campaignAutoHealPercent`/`campaignRequiredVariant`/`campaignInitialCostCap` (all public mappings), `nodeCount()`.

**A node with no children is the campaign's end** — that's the only signal, there's no explicit "final node" flag. Design your editor so marking something "the end" just means not linking any children to it. There's no delete — repurpose via `updateNode` or leave it unlinked.

`RoguelikeResupply.setRepairCostPerHP(uint cost) external` (`onlyOwner`) is the only other admin knob, plus its own `withdraw(address to)` (`onlyOwner`) to sweep accumulated UTC repair fees.

## 8. Errors reference (for surfacing sane messages, not just "transaction failed")

| Error | Where | Meaning |
|---|---|---|
| `EmptyRoster` | `startRun` | Need at least one ship. |
| `CampaignNotFound` / `CampaignHasNoRoot` | `startRun` | Admin hasn't finished setting up this campaign. |
| `WrongCampaignVariant` | `startRun`, `resupplyModifyRoster` | Ship variant doesn't match the campaign's requirement. |
| `RunAlreadyActive` | `RoguelikeRun.startRun` (bubbles up through `RoguelikeMatch.startRun`) | Player already has a run in progress. |
| `CannotAdvance` | `enterCombatNode`/`enterResupplyNode` | Not a legal move from the current node right now (locked, or not a child/valid-back-edge). |
| `WrongNodeKind` | `enterCombatNode`/`enterResupplyNode` | Called the combat entry point on a resupply node or vice versa. |
| `NotResupplyNode` | `resupplyRepair`/`resupplyModifyRoster` | Player isn't currently at a resupply node. |
| `ShipNotInRoster` | `resupplyRepair` | Tried to repair a ship not in the current roster. |
| `ShipNotOwned` / `ShipAlreadyInFleet` | `resupplyModifyRoster` | Can't add a ship you don't own, or one already committed elsewhere. |
| `InsufficientFunds(required, available)` | `resupplyRepair` | Not enough UTC (and/or missing `approve`). |
| `NotYourGame` | `retreatRun` | Passed a `gameId` that isn't this player's active match. |
| `NoActiveRun` | most run actions | No active run for `msg.sender`. |

## 9. What did NOT change

`NodeMap.sol`, `SinglePlayerMatch.sol`, the existing Shattered Hive campaign, and everything in `docs/singleplayer-frontend-integration.md` / `docs/update/Frontend_Update_Guide_Campaigns_Maps.md` — all unchanged, both campaign types are expected to coexist and both may be used going forward.

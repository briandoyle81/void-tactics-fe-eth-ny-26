# Frontend Handoff: Attributes & Costs Editing, and Everything Since

**Written: 2026-09-21.** A point-in-time summary of what the frontend must change after the contract work of 2026-09-20/21 (ship attributes and costs redesign, per-variant AI, variant 2 rebalance, roguelike progression, AI ship configs). It describes the contracts **on `main` in the working tree**, none of which has been deployed to a live network — every address below is "the new address after the next full redeploy". Re-verify against the contracts if they have changed since this date.

Companion docs (read these for detail, they are the source of truth for their topic):
`docs/ship-costs-and-attributes-runbook.md` · `docs/ai-behavior-registry.md` · `docs/variant-balance.md` · `docs/roguelike-progression.md` · `docs/ai-ship-configs.md`

---

## 0. TL;DR — what to do

0. **Critical, check first (§9):** if the frontend still submits Ram/Repair as a plain move onto the enemy's tile, **fix that before anything else** — the live contracts require an explicit `ActionType.FactionAbility` call, so variant 1 Ram and variant 2 Repair currently don't work at all through the old code path. Unrelated to the rest of this doc; not new as of 9-20/21.
1. **Re-point / regenerate ABIs** for: `ShipAttributes`, the five special resolvers (`EMPResolver`, `RepairDronesResolver`, `FlakArrayResolver`, `ElectricStormResolver`, `DroneSwarmResolver`), `SinglePlayerMatch`, `RoguelikeMatch`, `Game` (one function signature), and the **new** `AIBehaviorRegistry`, `Variant1AI`, `Variant2AI`. `RoguelikeAIController` no longer exists.
2. **Rebuild the attributes editor** (§1): attributes are now versioned **per variant**, exactly like costs. There is no "start new attributes version" step any more — one `setVariantAttributes` call publishes a complete new version and makes it live.
3. **Costs editor** (§2): same call as before; only validation changed.
4. **Variant 2's specials are slots 1–3**, not 4–6 (§3). Anything keyed on the enum value must be keyed by `(variant, slot)`.
5. Update any **hard-coded stat tables/previews** to the new variant balance (§4).
6. Note the roguelike/AI-content changes (§6) if the FE shows enemy rosters, maps, or rewards.

---

## 1. Attributes editing (the big change)

### 1.1 Old model → new model

|                      | Before                                                                                                                     | Now                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Version counter      | **one global** attributes version                                                                                          | **per variant** (`getCurrentAttributesVersion(variant)`, `getLatestAttributesVersion(variant)`)                                    |
| "New version"        | `startNewAttributesVersion()` → a new **empty** version went live for _every_ variant (all variants broke until re-filled) | **gone.**                                                                                                                          |
| Write                | `setVariantAttributes(params)` with a caller-chosen `params.version` (had to be ≤ current)                                 | `setVariantAttributes(params)` **publishes `latest + 1`** for that variant and makes it live in the same call. No `version` field. |
| History              | old versions kept but partly unreadable                                                                                    | old versions **kept, immutable, fully readable** via `getVariantAttributes(variant, version)`                                      |
| Rollback             | `setCurrentAttributesVersion(version)` (unvalidated)                                                                       | `setCurrentAttributesVersion(variant, version)` — validated `1 ≤ version ≤ latest[variant]`, else `InvalidAttributesVersion()`     |
| Unconfigured variant | opaque array-out-of-bounds panic                                                                                           | named error `VariantNotConfigured(variant)`                                                                                        |
| Input validation     | none                                                                                                                       | array lengths + rank rules checked; a bad table can never go live                                                                  |

The old FE description ("global attributes version, start a new one, then fill each variant; costs versions are separate and per variant") is **no longer accurate**: both halves are now per-variant and follow the variant picker.

### 1.2 What "attributes" contains now

One published table per `(variant, version)` — `VariantAttributeData`:

```
baseHull, baseSpeed                (uint8)
foreAccuracy[3], hull[3], engineSpeeds[3]   tier bonuses, indexed by traits tier 0–2
guns[8]      { range, damage, movement }   indexed by MainWeapon enum 0–7
armors[8]    { damageReduction, movement } indexed by Armor enum 0–7
shields[8]   { damageReduction, movement } indexed by Shields enum 0–7
specials[8]  { range, strength, movement } indexed by Special enum 0–7 (see §3)
rankThresholds[5]   (uint32) kills needed for ranks 2..6, strictly ascending, first > 0
rankBonusPct[6]     (uint8)  stat bonus % for ranks 1..6, each ≤ 100
```

**New vs before:** `rankThresholds` and `rankBonusPct` (rank tiers and bonuses used to be hard-coded — they are now editable and versioned with everything else).

### 1.3 Function / event / error changes (ABI diff)

`ShipAttributes` is a **new deployment** (new address).

**Removed**

- `startNewAttributesVersion()`
- `getAttributesVersionBase(version, variant)` → use `getVariantAttributes(variant, version)`
- `getCurrentAttributesVersion()` (no-arg) and the public `currentAttributesVersion` / `attributesVersions` getters
- `getRank(shipsDestroyed)` (pure)
- Events `AttributesVersionCreated`, `VariantAttributesSet`
- Struct `AttributesVersion` (in `Types.sol`)

**Changed**

- `setCurrentAttributesVersion(version)` → `setCurrentAttributesVersion(uint16 variant, uint16 version)`
- `getCurrentAttributesVersion()` → `getCurrentAttributesVersion(uint16 variant)`
- `setVariantAttributes(params)`: `SetVariantAttributesParams` **loses** `version`, **gains** `rankThresholds (uint32[])` and `rankBonusPct (uint8[])`
- `getRank(shipsDestroyed)` → `getRank(uint16 variant, uint shipsDestroyed)` (view)
- Event `CurrentAttributesVersionSet(version)` → `CurrentAttributesVersionSet(uint16 variant, uint16 version)`
- `setCosts(variant, costs)`: same signature, but array lengths are now validated (§2)

**Added**

- `getLatestAttributesVersion(uint16 variant)`
- `getVariantAttributes(uint16 variant, uint16 version)` → full `VariantAttributeData` (`version = 0` means "current")
- `getSpecialRangeAt(variant, version, special)` / `getSpecialStrengthAt(variant, version, special)` — read a special at a specific pinned version (§5)
- Event `VariantAttributesPublished(uint16 variant, uint16 version)`
- Errors `VariantNotConfigured(uint16)`, `InvalidArrayLength()`, `InvalidRankConfig()`

All writes are `onlyOwner` (on a real deploy: the `MAP_EDITOR` account after the ownership-transfer step).

### 1.4 Required array shapes (else `InvalidArrayLength()`)

| Field                                   | Length                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `foreAccuracy`, `hull`, `engineSpeeds`  | **3**                                                                            |
| `guns`, `armors`, `shields`, `specials` | **8** (one per enum value — slots 4–7 are inert `future*` filler)                |
| `rankThresholds`                        | **5** (strictly ascending, first > 0)                                            |
| `rankBonusPct`                          | **6** (each ≤ 100) — violations of either rank rule revert `InvalidRankConfig()` |

Filler for unused slots should be inert (zero stats), so a future slot is never free-and-strong. Today's rank values: thresholds `[10, 30, 100, 300, 1000]`, bonuses `[0, 10, 20, 30, 40, 50]`.

### 1.5 The new editor flow (per variant)

1. **Variant picker** drives _both_ the attributes and costs panels.
2. **Load**: `getVariantAttributes(variant, 0)` → current table. If `getCurrentAttributesVersion(variant) == 0` (or the call reverts `VariantNotConfigured`), show a "not configured" state; seeding it is just a publish, optionally pre-filled from another variant's `getVariantAttributes` — this **replaces** the old "seed a blank variant" idea (there is no on-chain copy function).
3. **Edit** client-side; every array is a **full table**, not a delta.
4. **Publish**: `setVariantAttributes(params)` → new version = `latest + 1`, live immediately; listen for `VariantAttributesPublished(variant, version)`. Show the new version number from `getCurrentAttributesVersion(variant)`.
5. **History / rollback**: list versions `1..getLatestAttributesVersion(variant)` (each readable with `getVariantAttributes`); rollback = `setCurrentAttributesVersion(variant, v)`. Rollback only changes what _new_ calculations use; no version is ever deleted and `latest` never moves.
6. **Do not** offer a "start new version" button. Publishing _is_ creating a version.

```ts
// Publish a rebalanced table for variant 2 (viem)
const current = await shipAttributes.read.getVariantAttributes([2, 0]); // 0 = current
await shipAttributes.write.setVariantAttributes([
  {
    variant: 2,
    baseHull: current.baseHull,
    baseSpeed: current.baseSpeed,
    foreAccuracy: current.foreAccuracy,
    hull: current.hull,
    engineSpeeds: current.engineSpeeds,
    guns: edited.guns, // length 8
    armors: current.armors, // length 8
    shields: current.shields, // length 8
    specials: current.specials, // length 8
    rankThresholds: current.rankThresholds, // length 5
    rankBonusPct: current.rankBonusPct, // length 6
  },
]); // -> version = getLatestAttributesVersion(2) + 1, live now
```

### 1.6 Effects to explain in the UI

- **In-flight games are not affected** by a publish or rollback: each ship's stats _and_ special numbers are frozen at the version live when the game started (§5). New games use the new version.
- **A publish does not touch costs.** If a rebalance should change prices, that is a separate `setCosts` (§2).
- **Stat overflow gotcha:** stat math uses checked `uint8`; a rank bonus that pushes a stat past 255 makes that ship's attribute calculation revert (fails loud). The contract caps bonus at 100% but cannot dry-run every stat — warn/validate in the editor.
- **Computed floors:** a ship's final `range` and `movement` are never below 1 (§4). Table entries can still be 0 or negative; only the computed total is raised.

---

## 2. Costs editing (small changes)

Costs were already per-variant with a per-variant version; that model **did not change**. What changed:

- **Validation:** `setCosts` reverts `InvalidArrayLength()` unless `accuracy`, `hull`, `speed` have length **3** and `mainWeapon`, `armor`, `shields`, `special` have length **8**.
- **Cost overflow fixed:** a ship's total is summed in `uint16` (it used to revert past 255). Individual table entries are still `uint8` (≤ 255).
- **Same behavior as before (worth showing in the UI):** `setCosts` bumps that variant's cost version (`CostsSet(variant, version)`, caller's `version` is ignored), instantly making every existing ship of that variant **stale** — `Fleets.createFleet` reverts `ShipCostVersionMismatch` until the ship is refreshed with `Ships.syncShipCosts(ids[])` (permissionless; the **whole batch reverts `ShipInFleet`** if any id is in a fleet, so filter those out).
- **No cost history / rollback.** Costs stay overwrite-with-bump on purpose (ships stamp `costsVersion`).
- Reference values: costs are **identical** for variant 1 and 2 except the special-slot costs (they are different specials): variant 1 `[0, 10, 20, 15, 0, 0, 0, 0]`, variant 2 `[0, 15, 20, 10, 0, 0, 0, 0]`.
- Detecting "not configured": `getCurrentCostsVersion(variant) == 0` (or `getCosts(variant)[0] == 0`); `calculateShipCost` reverts `InvalidCostsVersion` until costs are set.

**Adding a brand-new variant** needs both halves independently: `setCosts(newVariant, …)` _and_ `setVariantAttributes({ variant: newVariant, … })`, and both **before** raising `Ships.maxVariant`. It also needs an AI registered in `AIBehaviorRegistry` before any AI ship of that variant is placed (§7). See runbook E.

---

## 3. Variant 2's specials are now slots 1, 2, 3

- **Behavior and strength are looked up by variant first, then by slot** (`Game.specialResolvers[variant][slot]`, `specials[slot]` in the variant's own table). Variant 1's slot 1 and variant 2's slot 1 are unrelated. The `Special` enum is the fixed set `None, Slot1 … Slot7`; the meaning of a slot exists only within its variant.
- **Variant 1:** Slot1 = EMP, Slot2 = Repair Drones, Slot3 = Flak Array. **Variant 2:** Slot1 = Electric Storm, Slot2 = Drone Swarm, Slot3 = Additional Thruster (passive; already in the ship's movement). Slots 4–7 are unused for both.
- Variant 2's specials used to be enum values 4/5/6. Anything on the FE (special name lookups, icons, tooltips, filters) that keys on the raw enum value must now key on `(variant, slot)`. `RenderMetadata.specialNames` is per variant.
- **Renderers:** the variant 2 special sub-renderers were renamed `RenderSpecial4V2/5V2/6V2` → **`RenderSpecial1V2/2V2/3V2`** (and `RenderSpecialV2` now dispatches Slot1/2/3). If the FE or metadata tooling references the old contract names/addresses, update them; `scripts/renderer-pipeline/manifest.variant2.json` and README are updated.
- **Faction abilities** are separate from specials and are **innate to every ship** of the faction: variant 1 = **Ram**, variant 2 = **Repair** (range 1, heals 50). `Game.setFactionAbilityResolver(variant, resolver)` **dropped its `isHeal` argument**, and `factionAbilityIsHeal(variant)` is removed (each faction's AI knows its own faction). Only relevant to admin/deploy tooling.

---

## 4. Variant balance changes (update any hard-coded numbers)

The default tables were retuned so variant 2 is **heavier, slower, shorter-range and harder-hitting**, at equal cost. Details and simulation results: `docs/variant-balance.md`. If the FE shows computed ship stats from the contract nothing needs changing; if it has **hard-coded previews, calculators or tooltips**, update them:

|                                            | Variant 1                | Variant 2                    |
| ------------------------------------------ | ------------------------ | ---------------------------- |
| Base hull / hull tier bonuses              | 100 / 0,10,20            | **125** / **0,12,25**        |
| Base speed                                 | 4                        | **3**                        |
| Generic gun (range/damage)                 | Laser 3/50               | **Medium Mining Laser 2/60** |
| Sniper gun                                 | Railgun 6/40             | **Linear Accelerator 5/50**  |
| Missile gun (range/dmg/move)               | Missile Launcher 4/60/−1 | **Torpedo Launcher 3/70/−1** |
| Close gun                                  | Plasma Cannon 2/80       | **Mining Drill 1/95**        |
| Armor L/M/H — damage reduction; movement   | 15/30/45%; 0/−1/−2       | **20/40/60%; 0/−1/−3**       |
| Shields L/M/H — damage reduction; movement | 15/30/45%; +1/0/−1       | **20/40/60%; +1/0/−2**       |

- **Variant 2 has its own gun names** (above); use them in labels for variant 2 ships.
- **Floors:** computed `range` and `movement` are never below 1.
- **"None" movement bonus counts once** (+1 for a ship with neither armor nor shields; taken from the armor table's None entry; the shields table's None movement is never read and is 0). Base speed was raised by 1 in both variants to compensate, so effective in-play movement is unchanged.
- Armor **or** shields (not both) can be equipped via DroneYard; damage reduction tops out at 60% per piece (90% at rank 6).

---

## 5. Specials are pinned per game (behavior change to know about)

Combat stats were already snapshotted per game. **Special-effect numbers (range/strength) were not** — resolvers read the live table — so a publish mid-game could change an in-flight game. That is fixed: the five special resolvers (and `Variant1AI`'s heal-range check) read `getSpecialRangeAt` / `getSpecialStrengthAt` at the **acting ship's pinned version** (`Attributes.version`, stored per ship at game start).

FE implications:

- `Attributes.version` on a ship in a game is now the **per-variant attributes version** pinned at game start (non-zero once calculated; it also serves as the "already calculated" sentinel).
- For **in-game tooltips** showing a special's range/strength, use `getSpecialRangeAt(variant, ship.attributes.version, slot)` / `getSpecialStrengthAt(...)`. The plain `getSpecialRange/Strength/get*Data(enum, variant)` getters read the **live** table — fine for pre-game/editor display, wrong for an in-flight game.

---

## 6. Content changes (AI ships, roguelike, maps)

### AI ship configs

The 52 single-player/roguelike AI ship configs were **redesigned** (`ignition/data/singlePlayerStarterContent.json`, tables in `docs/ai-ship-configs.md`): every faction's ships now equip and use their own kit (variant 1: EMP, Repair Drones, Flak, plus a **Rammer** archetype with Ram; variant 2: Storm, Swarm, Thruster), with costs rising with level. Config **ids and stats changed** — anything caching config ids/names or assuming "AI ships have no special" must refresh. AI ships now carry specials, so render them.

### Roguelike progression

- **The first three roguelike missions fight variant 1; every later mission fights variant 2.** A node's mission number = number of _Combat_ nodes from the root to it, inclusive (`m01`=1, `m02`=2, `m03`/`d01`/`s01`=3). The player side is unchanged (`requiredVariant: 1`).
- Five **roguelike-only maps** were added (`rlM01`, `rlM02`, `rlM03`, `rlD01`, `rlS01`, map ids **31–35**; clones of campaign maps `m01, m02, m03, d01, s01` with variant 1 rosters). `Maps.mapCount()` is now **35** (was 30). The five matching roguelike nodes' `mapId` now point at them; the NodeMap campaign still uses ids 1–30 unchanged. A FE that lists maps will see five extra ones.
- **No DEC from the first three missions:** kill rewards are paid in the destroyed ship's faction token and only variant 2 has a reward token registered, so destroying variant 1 ships emits `RewardSkipped(variant, destroyerOwner)`. Don't promise rewards there (or register a variant 1 token).

### AI behavior (for tooltips / "why did it do that")

Each faction now has its own AI (see §7). Notable rules (2026-09-21): **every variant 1 ship rams** a 0-HP enemy that is standing on a scoring tile (before anything else); **every variant 2 ship**, in priority order, repairs a damaged/disabled friendly on a scoring tile → claims a scoring tile → repairs a disabled friendly → (fights) → last of all repairs itself or any damaged friendly in range. Full tree tables: `docs/ai-behavior-registry.md`.

---

## 7. AI architecture changes (ABI)

- **New contracts:** `AIBehaviorRegistry` (`setVariantAI(variant, ai)`, `aiFor(variant)`, event `VariantAISet`, error `NoAIForVariant(uint16)`), `Variant1AI`, `Variant2AI` (implement `IVariantAI.decide(ctx, archetype, special)`; a faction's AI is upgradeable by re-registering it).
- **Removed contract:** `RoguelikeAIController`.
- `RoguelikeMatch`: `aiController()` → `aiRegistry()`; `setAIControllerAddress` → `setAIRegistryAddress`; the last constructor argument is now the registry address.
- `SinglePlayerMatch`: new `aiRegistry()` and `setAIRegistryAddress(address)`; its unused `shipAttributes` reference (constructor arg and `setShipAttributesAddress`) is gone.
- An AI ship of a variant with **no registered AI reverts `NoAIForVariant`** on its first turn; register the AI before placing that variant's AI ships.
- Event/turn interface is unchanged: `AITurnTaken(gameId, shipId, actionType, targetShipId)`. A decision the game rejects still falls back to a Pass.
- Per-turn gas for AI turns is somewhat higher (an external call into the variant AI), but `SinglePlayerMatch` shrank (~19.6 KB → ~15.3 KB).
- **`Game` storage layout note (indexers / test helpers only):** removing `factionAbilityIsHeal` shifts later `Game` state variables down one slot (`games` is now slot 9). Anything reading `Game` storage directly must be updated; normal ABI calls are unaffected.

---

## 8. Frontend checklist

- [ ] Regenerate ABIs + addresses: `ShipAttributes`, 5 special resolvers, `SinglePlayerMatch`, `RoguelikeMatch`, `Game`, new `AIBehaviorRegistry`/`Variant1AI`/`Variant2AI`; drop `RoguelikeAIController`.
- [ ] Attributes editor: per-variant version display; load via `getVariantAttributes(variant, 0)`; publish via `setVariantAttributes` (no `version`, with `rankThresholds`/`rankBonusPct`); remove "Start new version"; add version history + rollback via `setCurrentAttributesVersion(variant, v)`.
- [ ] Editor validation mirroring the contract: lengths 3/8/5/6, ascending thresholds, bonus ≤ 100, uint8/int8 ranges, overflow warning.
- [ ] Costs editor: length validation (3 and 8), stale-ship warning after `setCosts`, `syncShipCosts` helper that skips ships in fleets.
- [ ] Handle `VariantNotConfigured`, `InvalidArrayLength`, `InvalidRankConfig`, `InvalidAttributesVersion`, `InvalidCostsVersion`, `NoAIForVariant` errors.
- [ ] Listen to `VariantAttributesPublished`, `CurrentAttributesVersionSet(variant, version)`, `CostsSet`.
- [ ] Rank display: use `getRank(variant, kills)`; rank tiers are now data, not constants.
- [ ] Special naming/rendering keyed by `(variant, slot)`; variant 2 slots 1–3; update renderer contract references.
- [ ] Update hard-coded variant stat tables/previews and variant 2 gun names (§4).
- [ ] In-game special tooltips: use `…At(variant, ship.attributes.version, slot)`.
- [ ] Roguelike/map UI: 35 maps, first three missions are variant 1 with no DEC, refreshed AI configs (ids/stats/specials).

## 9. Critical bug: Ram/Repair must be submitted as `ActionType.FactionAbility`, not a plain move

**Not part of the 2026-09-20/21 contract work** — this mechanic has been live since the earliest commit in this repo (`0d26434 "Naked fork for hackathon"`, 2026-09-09), so it predates every other section here. Flagging it now because it means **variant 1 players cannot Ram and variant 2 players cannot Repair at all** on whatever deployment the frontend currently points at, if the frontend still assumes the old model. Confirmed directly against the contracts on 2026-09-22.

### The two models

- **Old model (do not use):** ramming was an automatic side effect of a plain move — the frontend lets the player pick the enemy's own occupied tile as the destination and submits `ActionType.Pass` with a zeroed-out target.
- **Current model (`Game.sol` as of this repo):** Ram (variant 1) and Repair (variant 2) are each a faction's **innate ability**, dispatched through an explicit `ActionType.FactionAbility` call and resolved by a dedicated contract — `RamResolver` for variant 1, `RepairResolver` for variant 2 (`Game.factionAbilityResolvers[variant]`). `RamResolver.sol`'s own header comment states this plainly: it is "the resolver-backed replacement for what used to be an automatic side effect of any ship's plain move."

### What the frontend must submit

```
Game.moveShip(gameId, shipId, destRow, destCol, ActionType.FactionAbility, targetShipId)
```

- **`(destRow, destCol)` must be a normal legal destination** — in bounds, within the ship's movement, and on an **unoccupied** tile. `moveShip` runs this exact occupancy/movement check for every action type except `Retreat`, `FactionAbility` included, so the enemy's own tile is never a legal destination here (it will revert `InvalidMove()`, not silently no-op).
- **`targetShipId`** is the ship being rammed or repaired. It is passed straight through to the resolver (`Game._performFactionAbility` → `RamResolver.resolveEffect` / `RepairResolver.resolveEffect`).
- The destination must additionally be within the resolver's own range of the target (both resolvers default to range 1 — adjacent) or the resolver reverts `OutOfRange()`.

### Per-resolver rules

|                  | Variant 1 — `RamResolver`                                                                                                                                                                                                                                                       | Variant 2 — `RepairResolver`                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target side      | **enemy** (`acting.isCreator == target.isCreator` reverts `InvalidRamTarget`)                                                                                                                                                                                                   | **friendly** (`acting.isCreator != target.isCreator` reverts `TargetNotFriendly`)                                                                  |
| Target condition | must be at **0 HP** (`targetAttrs.hullPoints != 0` reverts `InvalidRamTarget`)                                                                                                                                                                                                  | no HP condition checked by the resolver itself                                                                                                     |
| Effect           | evicts the target (retreat, not destroy) **and relocates the rammer onto the target's now-vacated tile** — a second `SpecialEffect`, applied after the eviction, independent of the `(destRow, destCol)` submitted; also `+1` to the rammer's own reactor timer (3 destroys it) | heals the target's hull by the resolver's `strength` (default 50); no relocation — the healer simply ends up at the submitted `(destRow, destCol)` |
| Range            | `range` (default **1**), owner-settable                                                                                                                                                                                                                                         | `range` (default **1**), owner-settable                                                                                                            |

**Important for the FE's post-action UI:** after a successful Ram, the rammer's **final position is the victim's old tile**, not the `(destRow, destCol)` that was submitted — re-read the ship's position from the game state after the tx rather than assuming it equals the submitted destination. A Repair does not relocate anyone; the healer ends up exactly where it moved to.

### Which live deployments this affects

This repo's own `ignition/deployments/` only has a record for **Base Sepolia** (`chain-84532`) — that deployment has both resolvers wired (`RamResolver`, `RepairResolver` in `deployed_addresses.json`). This project's `hardhat.config.ts` targets four other networks (`flow-testnet`, `ronin-saigon`, `polygon-amoy`, `xai-testnet`, plus mainnet `flow`); this repo has no local record of what's currently deployed on those, so whether they're still on the pre-fork automatic-ram model or have been upgraded is **not verifiable from this repo** — check each chain's actual deployed contracts before assuming either way.

## 10. Free ship claim & tutorial eligibility verification (reference — not part of this change)

Unrelated to the 2026-09-20/21 work above (`FreeShipClaim.sol` / `TutorialClaim.sol` were not touched by it), included here for reference since it came up alongside this doc.

- `FreeShipClaim.claimFreeShips` and `TutorialClaim`'s completion functions each gate on their own `IEligibilityProvider eligibilityProvider`, but only **if it is set**:
  ```solidity
  if (address(eligibilityProvider) != address(0)) {
      if (!eligibilityProvider.isEligible(msg.sender)) revert NotEligible(msg.sender);
  }
  ```
  `address(0)` (the default) means **no verification at all** — fully open claiming/completion. The two contracts have **separate** toggles even when they share one provider instance.
- **Local/test deploys already have this disabled**: `ignition/modules/DeployAndConfig.ts` wires `MockAlwaysEligible` (always returns eligible) when `PRODUCTION` is `false` — that's every `npx hardhat test` run and every ephemeral deploy. Nothing to do here.
- **On a live deployment** with real verification wired (`SelfieCheckEligibilityProvider`, only deployed when `PRODUCTION` is `true`), disabling verification means the contract owner (`MAP_EDITOR` after the ownership handover) calling:
  ```
  freeShipClaim.setEligibilityProvider(address(0))
  tutorialClaim.setEligibilityProvider(address(0))   // separately, if tutorial completion should also open up
  ```
  This is a write against a live/deployed contract — not something covered by this repo's test suite or ephemeral deploys, and not something to script or run without the person operating that deployment explicitly asking for it.

## 11. Not changed / out of scope

- Ship generation odds, purchase flow, fleet cost limits, and the cost table values themselves (only validation was added).
- `GenerateNewShip` still seeds prize-ship kill counts aligned to the **old** rank thresholds (1–9 / 10–29 / 30–99 / 100–299), and `TutorialClaim` sets `shipsDestroyed = 10` expecting rank 2; changing `rankThresholds` shifts which rank those ships land on.
- Nothing has been deployed: `PRODUCTION` in `ignition/modules/DeployAndConfig.ts` is `false`, and the full test suite passes (757 tests) against ephemeral deploys only.
- Older docs still mention removed APIs (`startNewAttributesVersion`, `aiController`, `RoguelikeAIController`, `factionAbilityIsHeal`, `RenderSpecial4V2`) in historical context: `docs/eth-global-remote-strategy.md` and `docs/pre-audit.md`; they are records of past state, not current guidance.

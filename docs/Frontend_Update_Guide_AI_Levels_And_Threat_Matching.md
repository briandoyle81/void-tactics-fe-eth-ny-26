# Frontend Update Guide — AI Behavior, AI Ship Levels, and Threat-Matched Fleets

**Written: 2026-07-31.** This is a delta doc — it covers everything that changed *after* `Frontend_Update_Guide_Campaigns_Maps.md` (2026-07-30). Read that one first if you haven't already; this one only covers what's new since. `docs/singleplayer-frontend-integration.md` is still the base reference for the overall single-player flow.

**Update 2026-08-18:** section 3's "25 configs" is now stale — see `docs/faction-2.md` section 8. `AIEncounters.aiShipConfigs` is now **50** entries: the original 25 variant-1 configs described below are untouched, plus 25 new variant-2 configs added alongside them. All 30 seeded campaign map placements were repointed to the new variant-2 configs, so the *live* campaign now fields variant-2 AI fleets — the cost table and archetype behavior in this section still describe the (still-existing, still on-chain, just no longer placed on any seeded map) variant-1 configs specifically. Don't hardcode "50" as a ceiling either; re-read `getAllAIShipConfigs().length`.

## 1. AI movement/targeting behavior changed (no ABI impact, but visible in play)

Pure gameplay-logic change inside `AIBehavior.sol` — no new functions, no signature changes, nothing for you to wire up. Documenting it because it changes what players will see:

- Every AI archetype (not just Turtle) now factors scoring tiles into its movement decisions. Ships with long-range weapons (Railgun, MissileLauncher) bias toward scoring tiles on the AI's own side of the map; short-range weapons (Laser, PlasmaCannon) bias toward tiles in the middle/human's side. Tile-seeking is preferred over chasing a distant enemy when closing the gap wouldn't bring anything into weapon range this turn anyway.
- When choosing a target to shoot, the AI now prioritizes any enemy ship currently standing on a scoring tile over one that isn't, ahead of its previous "focus lowest HP" tiebreak.
- Support's priority order changed: it still heals/shoots for free from its current position first (unchanged), but its movement fallback now seeks an unclaimed scoring tile before falling back to trailing an injured ally.

**Action for you:** none required. If you have any replay/commentary text that describes AI intent ("AI is chasing your ship"), be aware it may now be heading for a scoring tile instead.

## 2. AI fleet teardown got cheaper at game end (no ABI impact)

Root-caused and fixed a real out-of-gas bug: the `moveShip` call that ends a game used to fetch every remaining ship's *entire* `Ship` struct (name, colors, everything) just to decrement a cost counter, once per ship in both fleets. That's gone — game-end fleet cleanup (`Fleets.clearFleet`) no longer does that lookup at all.

**Action for you:** if you were padding gas estimates for `moveShip` to work around this, you likely don't need to anymore. No signature changes.

## 3. AI ship catalog: 25 configs now (5 archetypes × 5 power levels)

`AIEncounters.aiShipConfigs` went from 5 entries (one per archetype) to 25 — Levels I through V for each of Grunt/Aggressor/Sniper/Support/Turtle. Same `getAIShipConfig`/`getAllAIShipConfigs` getters, just more rows. If your admin fleet editor has a config picker, it should already handle this since nothing about the shape changed — just confirm it isn't hardcoding "5 configs" or config ids 1-5 anywhere.

Also fixed: **Grunt and Sniper previously had zero armor and zero shields** (an oversight, not intentional). Every archetype now carries exactly one of the two (never both — armor XOR shields is enforced by design, not on-chain): Grunt/Aggressor/Turtle use armor, Sniper/Support use shields. This changed their on-chain cost (`calculateShipCost`) slightly; if you cached/displayed old cost numbers for these five base configs, refresh from `getAIShipConfig`.

Approximate on-chain cost per config, if you want it for a difficulty/tier display (deterministic — AI configs use fixed equipment, not RNG, so this won't drift):

| Archetype | I | II | III | IV | V |
|---|---|---|---|---|---|
| Grunt | 80 | 110 | 155 | 160 | 165 |
| Aggressor | 115 | 155 | 170 | 175 | 180 |
| Sniper | 100 | 135 | 165 | 175 | 185 |
| Support | 105 | 135 | 180 | 190 | 200 |
| Turtle | 90 | 125 | 155 | 160 | 165 |

**Action for you:** don't hardcode these — pull live via `getAllAIShipConfigs`/`calculateShipCost` if you display them, in case balance changes later.

## 4. `maxPlacementsPerMap` raised from 8 to 14

Still the same owner-tunable live knob (`AIEncounters.maxPlacementsPerMap`/`setMaxPlacementsPerMap`) from the last doc — just the deploy-time default changed from 8 to 14, because the hardest campaign maps now need up to 14 AI ships to hit their intended difficulty (see below). **If your admin fleet editor hardcoded "max 8 ships per map" anywhere instead of reading the live value, fix that now** — it was already the recommended action last time, but it'll actually bite if you skipped it, since some maps now exceed 8.

## 5. AI fleet sizes changed on 8 of the 10 campaign maps — and now exactly match `enemyThreat`

`enemyThreat` (the descriptive difficulty number on `NodeMap.CampaignNode`, introduced 2026-07-30) was never enforced against the actual AI fleet cost — it could drift arbitrarily. It no longer drifts: every node's AI fleet cost now sums to *exactly* its `enemyThreat` value.

| Node (key) | enemyThreat | AI ships |
|---|---|---|
| node1 | 350 | 3 (unchanged) |
| node2 | 700 | 5 (unchanged) |
| outpost | 1050 | 6 (was 2) |
| junkyard | 1400 | 8 (was 2) |
| driftWreck | 1050 | 6 (was 1) |
| silentHulk | 1400 | 8 (was 2) |
| asteroidField | 1750 | 10 (was 3) |
| warlordsRedoubt | 2000 | 12 (was 5) |
| gauntlet | 2100 | 12 (was 4) |
| bastion | 2500 | 14 (was 5) |

Every original ship's archetype and position was kept as-is (just re-leveled); new ships were added on top for the maps that needed more firepower to hit target.

**Action for you:**
- If anything (loading screens, difficulty previews, pre-battle rosters) hardcoded a ship count or specific config keys per node/map, it's now wrong — re-pull from `AIEncounters.getMapPlacements(mapId)`.
- `startNodeMatch` gas cost scales with the AI fleet size it mints in one transaction — bastion's is now the most expensive call in the game (~2.2M–4.0M gas observed in testing, vs. much less before). If you have a fixed/low gas limit or gas-estimation cap for `startNodeMatch`, raise it or make sure you're using live estimation, especially for the four hardest nodes (asteroidField, warlordsRedoubt, gauntlet, bastion). `takeAITurn` is unaffected by any of this — it's always exactly one ship's decision per call regardless of fleet size, so its cost stays flat (~300–460K gas observed).

## 6. Reminder: AI ships are still not ERC-721s

Came up as a question this session, unchanged from the router/pooling work — confirming for the record since it's easy to assume otherwise now that AI ships have "levels" like a progression system. `AIShips.sol` is `Ownable` only, no ERC-721 inheritance, no mint/transfer/tokenURI. AI ships are never owned or tradable; they're pooled/reused struct records behind `ShipsRouter`, same as described in `docs/singleplayer-frontend-integration.md`.

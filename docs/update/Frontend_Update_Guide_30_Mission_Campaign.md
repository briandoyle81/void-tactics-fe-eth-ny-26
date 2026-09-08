# Frontend Update Guide — 30-Mission Campaign, AI Hold Behavior

**Written: 2026-08-03.** Delta doc — covers everything since `docs/update/Frontend_Update_Guide_AI_Levels_And_Threat_Matching.md` (2026-07-31). Read that one (and `docs/update/Frontend_Update_Guide_Campaigns_Maps.md` before it) for earlier context; this one only covers what's new.

## 1. The campaign is now 30 missions, not 10 — this is a breaking content change

Every campaign node id, map id, and their stats changed. If you have anything hardcoding node ids 1-10, node keys like "warlordsRedoubt"/"bastion", or assuming a 10-node graph, it will break or show stale data. **Action for you: don't hardcode any of this — always read the live graph via `NodeMap.getNodesInCampaign`/`getNode`/`getAllNodes` and `AIEncounters.getMapPlacements`.**

### Graph shape

Same topology as before, just scaled ~3x — a mainline, a dead-end side branch, and a shortcut branch that reconverges before the final stretch:

- **Mainline** (node ids **1-15**): straight chain, node 1 → node 2 → ... → node 15. This is the primary, steadily-escalating path.
- **Dead end** (node ids **16-21**): branches off node 2, chains to itself, terminates at node 21 (nothing requires it — same "two-node dead end" role as `silentHulk` before, just 6 nodes long now).
- **Shortcut** (node ids **22-24**): also branches off node 2, a short 3-node chain that's *harder* than the mainline node it parallels (spikes above node 15's difficulty, same role `warlordsRedoubt` played before).
- **Final stretch** (node ids **25-30**): node 25's prerequisites are `[15, 24]` — an ANY-of, so beating either the full mainline (node 15) *or* just the 3-node shortcut (node 24) unlocks it. Nodes 26-30 chain linearly after that to the true final mission (node 30).

### Difficulty curve

Scales smoothly from an easy opener to the same difficulty ceiling the old campaign ended at, with a defined midpoint:

| | Node 1 (start) | Node 15 (midpoint) | Node 30 (finale) |
|---|---|---|---|
| Player cost limit | 500 | 1000 | 2000 |
| Enemy threat (descriptive) | 350 | 1000 | 2500 |
| Victory score (`maxScore`) | 15 | 100 | 200 |
| Scoring tiles | 1 @ 5 pts | 5 @ 10 pts | 8 @ 15 pts |
| Blocked-tile coverage | ~2% | ~30% | ~35% |
| AI fleet size | 3 ships | 6 ships | 14 ships |

Every node's actual AI fleet cost matches its `enemyThreat` number (exact or within 5, out of a scale running to 2500) — same guarantee as the last doc, still holds across all 30.

**Action for you:**
- Any UI that lists/paginates campaign nodes should handle 30 entries now, not 10.
- If you display a "campaign progress" percentage or map, it should be driven by `getCampaignCompletion`/`isCampaignFullyCompleted` against the live node count, not a hardcoded 10.
- If you cached or hardcoded any of the old node names (`starter`, `nebula`, `outpost`, `junkyard`, `asteroidField`, `driftWreck`, `silentHulk`, `warlordsRedoubt`, `gauntlet`, `bastion`) or their ids, those are gone. The new nodes have plain keys (`m01`-`m15`, `d01`-`d06`, `s01`-`s03`, `f01`-`f06`) used only as internal deploy-script labels — nothing on-chain exposes node names/flavor text (same "no display strings on-chain" convention as before), so your own name/flavor-text mapping needs a full rewrite against the new id range regardless.

## 2. AI ship movement: ships holding a scoring tile now stay put instead of wandering off

Pure behavior change in `AIBehavior.sol` — no ABI impact, nothing to wire up, but visible in play and worth knowing about if you have commentary/replay text describing AI intent:

- An AI ship that's already standing on a scoring tile, with no enemy in weapon range, now just holds position (Pass) instead of being pulled away by "seek a different tile" or "chase the enemy" logic. It only leaves if **all three** hold: moving would actually let it take a shot this turn, another living ally could reach the tile if it leaves, and no enemy is currently positioned to threaten the tile.
- Turtle-archetype ships specifically: when the best available scoring tile is already held by another ship, Turtle now advances only until it's within 1 tile of it, then holds there, instead of repeatedly trying (and failing) to step exactly onto an occupied cell.

**Action for you:** none required. Net effect: the AI defends contested scoring tiles more sensibly and doesn't visibly dither near ground it already holds.

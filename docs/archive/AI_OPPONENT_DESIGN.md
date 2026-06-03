# AI Opponent Design — Void Tactics (Web2 Branch)

No ML, no training. Either heuristics or tree search going N plies deep per difficulty level.

---

## Game Mechanics Reference

Key mechanics the AI must understand to play correctly:

- **Scoring**: Points are earned by occupying capture squares at the **end of each round**. First player to `maxScore` wins. Kills do not directly score points.
- **Distance**: Manhattan distance (`|Δrow| + |Δcol|`) is used for weapon range.
- **Disabled ships**: A ship at 0 HP is disabled, not dead. It can still flee (costs its turn).
- **Reactor critical timer**: Increments when:
  - A disabled (0 HP) ship is hit by any weapon
  - A round ends while a ship has 0 HP
  - A ship is hit by EMP (regardless of current HP)
- **Death**: A ship dies when its reactor critical timer reaches **3 or higher**.
- **EMP**: Does no HP damage. Increments reactor critical timer by 1 on any target.

---

## The Branching Factor Problem

Before picking heuristics vs. tree search, the critical question is what one "move" means. If each player controls N ships per turn and each ship has ~10 legal actions, a single full turn has 10^N branches:

| Ships | Actions/ship | Branches/turn |
|-------|-------------|---------------|
| 3     | 10          | 1,000         |
| 5     | 10          | 100,000       |
| 7     | 10          | 10,000,000    |

Searching multiple turns deep at 5+ ships with naive minimax is impractical. This forces a structural choice:

### Option A — Per-ship sequential search
Treat each ship's action as a separate ply. The tree becomes `depth = turns × ships_per_turn`. Each node has ~10 branches (one ship's options). Minimax is feasible. The cost: coordination between ships within a turn is lost — the AI can't plan "EMP then kill" as a combined action.

### Option B — Turn-level search with pruning
Treat a full turn (all ships moved) as one ply. Use alpha-beta pruning aggressively, plus move ordering (try attacks before moves). At 3 ships the branching factor is manageable. At 5+ ships you'd need beam search (keep only the top K branches at each node) or iterative deepening with a time budget.

### Option C — Hybrid (recommended)
Use heuristics to prune the action space per ship (only consider the top 3–4 candidates per ship), then run tree search over the reduced tree. Reduces 10^N to 3^N. At 5 ships: 243 branches per turn — very searchable. This keeps the branching factor viable at larger fleet sizes without sacrificing coordination.

---

## Heuristics Alone vs. Tree Search

**Heuristics only** (greedy, one turn at a time):
- Fast, simple, predictable
- Misses multi-turn combinations (won't sacrifice capture position now to deny enemy a tile next turn)
- Feels like a Recruit-level opponent
- Good as the lowest difficulty tier and as the per-ship pruning filter that feeds the search

**Tree search (minimax + alpha-beta)**:
- Plans ahead, produces genuine tactical play
- Can discover EMP sequences to push a ship toward reactor death, capture tile timing, coordinated denial
- Difficulty is naturally tunable by search depth
- Requires a board evaluation function (see below)

Tree search is clearly better for mid/high difficulty. Use both: heuristics for low difficulty and as the move-ordering/pruning layer inside the search.

---

## Evaluation Function

Implemented in `app/utils/aiEvaluate.ts`. Scores a board state from the AI's perspective — positive = good for AI.

### Factors (in priority order)

| Factor | Weight | Notes |
|--------|--------|-------|
| Score delta | 600 × urgency | Scales up as either player approaches `maxScore` |
| Capture square control | 400 per tile held | Weighted by tile point value — primary win mechanism |
| Capture square contested | −200 per enemy tile | |
| Fleet size advantage | 250 per ship | Fewer ships = less capture coverage |
| HP advantage | 1.5 per 1% lead | Aggregate % health across fleet |
| Disabled self (0 HP) | −350 per ship | Takes reactor damage each round-end; must flee or die |
| Disabled enemy (0 HP) | +300 per ship | On a timer; costs them a turn to flee |
| Reactor critical 1 (self) | −450 | Two ticks from death |
| Reactor critical 2 (self) | −800 | One tick from death |
| Reactor critical 1 (enemy) | +300 | Winning the attrition race |
| Reactor critical 2 (enemy) | +550 | Nearly dead |
| Ships in weapon range | +60 per enemy | Manhattan distance vs. ship range |
| Exposed to enemy | −60 per AI ship | |

### Key design notes

- **Capture squares dominate** because they are the only scoring mechanism. The AI must weight tile control above raw combat advantage.
- **Reactor critical is graded**, not binary — timer=2 is an emergency (flee or die next tick), timer=1 is urgent but survivable.
- **Disabled ships are not dead** — a 0-HP enemy still occupies a tile, still costs us board presence to finish off, and can flee. Weight accordingly.
- **Range uses Manhattan distance** — no line-of-sight approximation in the eval; exact LOS checks belong in the move generator, not here.
- **Score urgency multiplier** — the score-delta weight grows as `1 + (max(aiScore, enemyScore) / maxScore)`. At 90% of maxScore the weight is nearly doubled, making the AI prioritise closing out a won game and blocking an opponent close to winning.

---

## Difficulty Levels

| Level     | Algorithm                                  | Search depth             | Notes |
|-----------|--------------------------------------------|--------------------------|-------|
| Recruit   | Heuristic only                             | —                        | Greedy best-per-ship, ~20% random error injected |
| Veteran   | Minimax + alpha-beta                       | 2 plies (1 full round)   | Sees one full exchange |
| Commander | Minimax + alpha-beta                       | 4 plies (2 full rounds)  | Real tactical planning |
| Elite     | Minimax + alpha-beta + iterative deepening | 6 plies or 500ms budget  | Searches as deep as time allows |

"2 plies" = AI turn + opponent's best response. Minimum for sensible play. 4 plies is where the AI starts feeling genuinely threatening.

---

## Implementation Plan

1. ✅ **Write the evaluation function.** Lives in `app/utils/aiEvaluate.ts`. Exports `evaluateGameState(state, aiIsCreator, scoringPositions)`, `isDoomed(attr)`, and `isDead(attr)`.

2. ✅ **Implement greedy heuristic (Recruit).** For each ship, score every legal action using the eval delta and pick the best. Inject ~20% random error at this tier. This also serves as the candidate-pruning layer inside the search — run it first to rank moves, then pass only the top 3–4 per ship into the tree.

3. ✅ **Add minimax with alpha-beta (Veteran / Commander).** Use the heuristic ranking as move ordering — trying better moves first dramatically improves pruning effectiveness. Apply round-end reactor ticks at ply boundaries (any 0-HP ship that survived the turn takes +1 reactor critical).

4. ✅ **Add time-budgeted iterative deepening (Elite).** Search as deep as possible within 500ms, use the result from the deepest fully-completed ply. Future-proofs difficulty scaling without needing to tune a fixed depth.

5. ✅ **Prune the action space per ship** to the top 3–4 heuristic candidates before expanding the tree. Keeps the branching factor at 3^N rather than 10^N — critical for fleets larger than 3 ships.

**Estimated implementation:** 500–800 lines beyond the eval function. The candidate pruning and round-end state simulation (reactor tick, score calculation) are the most game-specific parts — the minimax scaffolding is boilerplate.

---

## AI Fleet Selection

Fleet selection is two separate problems: what ships the AI owns, and which it picks for a given game.

### Problem 1 — AI roster

The AI needs a pool of ships to select from. A pre-defined pool of 15–20 ships is the right call — it's easy to balance and you control exactly what the AI can field. Cover a spread of archetypes:

| Archetype | Weapon | Special | Role |
|-----------|--------|---------|------|
| Sniper | Railgun | None | Long-range pressure |
| Brawler | Plasma | None | Short-range high damage |
| EMP specialist | Any | EMP | Reactor critical pressure |
| Support | Any | Repair | Sustain |
| Tank | Laser/Railgun | None | Heavy armor, absorbs hits |

On-demand ship generation is an alternative but harder to balance. Revisit if variety becomes a design goal.

### Problem 2 — Selection algorithm

The AI selects a subset of its roster within the lobby's `costLimit`. Two cases:

**AI is creator (picks blind)**

Score every legal combination of ships by a fleet effectiveness metric and pick the highest within `costLimit`. Fleet sizes are small enough that exhaustive combination search is feasible.

Effectiveness metric:
```
fleet_score =
  + total_HP
  + total_damage_output
  + range_spread_bonus     // penalise all-short or all-long range
  + special_coverage_bonus // reward having at least one EMP
  - special_redundancy_penalty // two repair ships < one repair + one EMP
```

**AI is joiner (sees creator's fleet first)**

Same scoring, plus a counter-pick adjustment applied to each candidate ship before scoring:
- Creator fleet is heavy armor → boost plasma and EMP candidates
- Creator fleet is high mobility → boost railgun (punishes movement)
- Creator fleet has no repair → EMP pressure is safer to invest in

This is a meaningful advantage for the joiner role and makes the AI feel tactically aware.

### Fleet composition rules (apply to both cases)

- **Always include at least one EMP ship.** Reactor critical pressure is the strongest attrition tool in the game.
- **Ensure range spread.** A fleet of all plasma (range 2) gets kited; all railgun gets swarmed at close range.
- **Avoid redundant specials.** Two repair ships is almost always worse than one repair + one EMP.
- **Map awareness.** If map dimensions are available at selection time: narrow/small maps → weight short-range high-damage; open maps → weight railgun.

### Ship placement

After selection, ships must be placed in the deploy zone. The AI should:
1. Place EMP and long-range ships toward the back of the deploy zone (keep them out of early melee).
2. Place tanky/armor ships forward as a screen.
3. Spread ships laterally to contest multiple capture squares from turn one rather than clustering.

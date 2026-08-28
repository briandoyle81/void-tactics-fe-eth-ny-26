# Frontend Update Guide — 2026-08-26 Miscellaneous Fixes

**Written: 2026-08-26.** Describes contract state as of this date — check the contracts repo's recent commits if it's been a while. Three unrelated changes today: `RandomManager.sol`'s commit-reveal rewrite (ship construction needs one extra step — see below), a new revert condition on the three targeted combat effects, and two new reverts in the roguelike campaign mode (`RoguelikeMatch.sol`). Nothing else in the ship-purchase/construct flow changed.

## New: two roguelike-campaign reverts (`RoguelikeMatch.sol`)

**Note:** these postdate the roguelike-campaign frontend doc you already have — not reflected there, only here.

**File:** `contracts/RoguelikeMatch.sol` (see `docs/pre-audit.md` SP-04/SP-05).

| Error | Where | Meaning |
|---|---|---|
| `NodeAlreadyDefeated` | `enterCombatNode` | This Combat node was already won earlier in the current run and is being re-entered via a `twoWay` back-edge (e.g. a resupply hub with routes to more than one fight). Re-fighting it is blocked outright — its kill rewards were already paid out once and can't be farmed again this run. Grey out/disable that route in the UI once a node shows as defeated rather than letting the player attempt it. |
| `ActiveGameInProgress` | `retreatRun(0)` | Can't abandon the run "between nodes" while a combat match is still live. Call `retreatRun(activeGameId)` to forfeit the match first, then `retreatRun(0)` to end the run — or just let the match resolve naturally. |

## New: targeting an already-destroyed/fled ship now reverts

**File(s):** `contracts/DroneSwarmResolver.sol`, `contracts/EMPResolver.sol`, `contracts/RamResolver.sol` (see `docs/pre-audit.md` SP-02).

`Drone Swarm`, `EMP`, and `Ram` special-ability targeting all previously accepted a `targetShipId` that belonged to a ship already destroyed or fled from the game — `shipPositions` entries aren't deleted on removal, only status-flipped, so the existing `target.shipId == 0` check didn't catch this. Each resolver's `validateTarget` (or equivalent pre-check) now also reverts if `target.status != 0`:

| Contract | Error |
|---|---|
| `DroneSwarmResolver` | `TargetNotFound` |
| `EMPResolver` | `TargetNotFound` |
| `RamResolver` | `InvalidRamTarget` |

**Why this matters for the UI:** if your targeting picker builds its candidate list from a snapshot that isn't refreshed every turn, a target that died or fled since the snapshot was taken will now cause the action to revert instead of (previously) silently corrupting round-transition state. Refresh live ship status right before submitting one of these three actions, or catch the revert and re-prompt target selection.

---

# RandomManager Commit-Reveal Rewrite

## TL;DR

Buying/claiming ships is unchanged. Constructing them now needs a **reveal step in between**, in its own transaction, before `constructShip`/`constructAllMyShips`/`constructShips` will succeed:

1. Buy or claim ships (`purchaseWithFlow`, `FreeShipClaim.claimFreeShips`, etc.) — **unchanged**. Each new ship still gets a `serialNumber` at mint time via `RandomManager.requestRandomness()`, same as before.
2. **New:** call `RandomManager.revealRandomness(serialNumber)` for each ship's serial number — anyone can call this (the player, a backend keeper, doesn't matter who), but it can't succeed immediately; see "The wait" below.
3. Call `constructShip`/`constructAllMyShips`/`constructShips` — **unchanged call**, but it will now revert `NotYetRevealed` if step 2 hasn't happened yet for a given ship.

This was a security fix (see `docs/pre-audit.md`'s C-01/C-02 remediation addendum for the full writeup) — the old `RandomManager` let anyone predict or manipulate ship traits before committing to construct. It's not a cosmetic change; skipping step 2 isn't optional, and doing steps 2 and 3 back-to-back before the wait has elapsed will revert.

## The wait

Step 2 can't succeed the instant after step 1 — it has to wait until the chain's randomness source has actually refreshed, which on Base is **not every block**. Measured empirically: Base's `block.prevrandao` only changes roughly every 6 L2 blocks (~12 seconds), because it's relayed from Ethereum L1's own randomness, not generated fresh per L2 block.

Practically:
- Best case: ~1 block (~2s) if the mint happened to land right before a refresh.
- Worst case: ~6 blocks (~12s) if it landed right after one.
- **Don't hardcode a wait time or a fixed block count.** Call the new view instead:

```solidity
function canReveal(uint requestId) external view returns (bool);
```

Poll this (or just try `revealRandomness` and retry on a `TooSoonToReveal` revert with a short backoff) rather than assuming any specific number of blocks or seconds. If Base's block-time ratio ever changes, this adapts automatically — a hardcoded wait wouldn't.

## Suggested integration pattern

```
1. purchaseWithFlow(...) / claimFreeShips(...)
2. Read the new ship id(s) and their serialNumber(s) (Ships.ships(id).traits.serialNumber)
3. Poll canReveal(serialNumber) until true (or catch TooSoonToReveal and retry)
4. revealRandomness(serialNumber)  — once per ship
5. constructShip(id) / constructAllMyShips() / constructShips(ids)
```

Steps 3–4 can be done by the player's own wallet (one extra signature/tx per ship, or batch if you build a multicall helper) or automated server-side by a keeper that watches for unrevealed requests and calls `revealRandomness` on their behalf — the function has no access control, so either works. If you want the smoothest player-facing UX, a backend keeper calling step 4 automatically (as soon as `canReveal` goes true) so the player only ever sees "buy" then "construct" is the way to avoid surfacing this extra step in the UI at all.

## Errors reference

| Error | Where | Meaning |
|---|---|---|
| `RequestNotFound` | `revealRandomness`, `fulfillRandomRequest`, `canReveal` (returns `false` instead of reverting) | The id was never issued by `requestRandomness` (or is 0). Shouldn't happen from normal ship serial numbers. |
| `AlreadyRevealed` | `revealRandomness` | Someone already revealed this request — harmless if your own retry logic races with a keeper; just proceed to construct. |
| `TooSoonToReveal` | `revealRandomness` | The randomness source hasn't refreshed since the request was made yet. Wait and retry, or check `canReveal` first. |
| `NotYetRevealed` | `fulfillRandomRequest` (called internally by `constructShip`) | You called construct before reveal. Do step 4 above first. |

## What did NOT change

- Ship purchase/claim mechanics, pricing, tiers, referrals — all untouched.
- `constructShip`/`constructAllMyShips`/`constructShips`' call signatures — identical to before.
- Everything downstream of construction (ship traits, rendering, gameplay) — unaffected; traits are still derived the same way, just from a value that's now actually unpredictable at request time instead of freely previewable.

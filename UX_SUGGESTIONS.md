# UX Suggestions

Generated 2026-05-20 from a code-based review of all major UI surfaces.

---

## Navigation & Global Shell

**1. ✅ "Your Turn" indicator on the Games tab label.**
No way to know it's your turn without switching to the Games tab. A small dot or badge (e.g. `[GAMES •]`) when an active game has your initiative would eliminate constant tab-checking.

**2. ✅ Reduce tab count for new users.**
Seven tabs appear the moment a wallet connects, including Maps, Customize Ship, and Profile — meaningless until a player has ships and games. Consider showing Info → Manage Navy → Lobbies initially, revealing Games / Profile / Maps progressively as the player hits relevant milestones.

**3. ✅ `[BUY TOKENS]` in the header is a dead end.**
Permanently disabled with no tooltip or explanation. Either remove it, replace with a link to where tokens can actually be acquired, or show a "Coming soon" tooltip so it doesn't look like a broken feature.

**4. ✅ Network variant mismatch is a silent killer.**
When the selected chain has a contract version mismatch, a toast fires for 8 seconds and disappears. If the user misses it, the next transaction fails on-chain with no explanation. This should be a persistent banner or inline warning, not a transient toast.

---

## Info Tab / Onboarding

**5. ✅ The tutorial has no completion state.**
After finishing the tutorial, `[PLAY NOW]` re-opens it as if it's fresh. A returning player can't tell if they're re-watching or if there's new content. Distinguish the states — e.g. `[REPLAY TUTORIAL]` vs `[PLAY NOW]` — and show a completion checkmark or "completed" badge.

**6. ✅ `[LOG IN TO CLAIM FREE SHIPS]` reads as a broken button.**
A disabled button with no context makes users think the feature is broken, not wallet-gated. Replace it with explanatory copy — e.g. "Connect wallet to claim free ships" as a prompt, with the button only appearing once connected.

**7. ✅ Free ship cooldown is invisible until after the first claim.**
The cooldown timer only appears after a player has already claimed once. Add a brief note near the claim button before the first claim — e.g. "First batch is free and instant. New batches are available every X hours."

---

## Lobbies

**8. ✅ Silent fleet shrinkage when cost versions change.**
If a ship becomes invalid mid-selection (contract cost version updated), it disappears from the fleet without feedback. The user submits a smaller fleet than they built with no explanation. Add a toast: "1 ship was removed from your fleet — its cost data is out of date."

**9. ~~No fleet cost limit visible during composition.~~** Already implemented — a `{totalCost}/{costLimit}` meter is shown during fleet composition, color-coded green/amber/red based on proximity to the cap.

**10. ✅ Deployment zone boundaries aren't taught.**
New players have no idea they can only place ships in their side's columns until they try to drag outside the zone and nothing happens. Add a faint zone highlight or a single line of instructional text the first time a player opens fleet composition.

**11. ~~No pre-flight validation before fleet submission.~~** Already implemented — submit is disabled with descriptive labels for empty fleet, over max ship count, over cost limit, and under 90% threat threshold.

**12. ✅ Joining a lobby gives no context about the opponent.**
The player sees a lobby and joins blind — no opponent win/loss record, no estimated wait time before the game starts. At minimum, show the creator's win/loss record next to their address.

---

## Games Tab

**13. ✅ Turn timer has no consequence explanation.**
The countdown reaches 00:00 but nothing tells the player what happens — forfeit? Auto-advance? Players who don't know will either panic or ignore it. Add a tooltip or note: "Timer expiry forfeits your turn."

**14. ~~Score display is ambiguous.~~**
"2 / 1 of 3" could mean best-of-3 matches, 3 rounds, or 3 total points. Spell it out: `60 pts / 100 to win` or `Round 2 of 3`.

**15. ✅ Engagement history in Profile doesn't link back to game view.**
Clicking a past game in Profile does nothing. It should open the game view (read-only for finished games) or navigate to the Games tab with that game pre-selected.

---

## Manage Navy

**16. ✅ The three onboarding tutorials feel like arbitrary gates.**
The Drone Factory → Construct Delivery → Buy Ships sequence fires sequentially but the player can't see what's coming or how many steps remain. A simple progress indicator — "Step 1 of 3: Claim your first ships" — would make the sequence feel intentional.

**17. ✅ Recycle eligibility is invisible.**
`[RECYCLE]` is gated behind 10+ purchases, but nothing in the UI mentions this or that the feature exists. Add an inert `[RECYCLE — LOCKED]` button with a tooltip: "Unlocks after your 10th ship purchase."

**18. ✅ Achievements section is pure scaffolding.**
Profile shows `// No achievements unlocked` with no list of what achievements exist or how to earn them. Either remove the section until it's implemented, or show a greyed-out list of locked achievements with unlock criteria so players know what they're working toward.

---

## Mobile

**19. Fleet positioning grid is too small to use on touch.**
Each grid cell is likely under 30 px on a phone. Dragging a ship to an exact cell is nearly impossible with a finger. For mobile, consider a tap-to-place model: tap a ship in the list → grid highlights valid positions → tap a cell to place.

**20. Address display is nearly useless for disambiguation.**
`0x0000...0001` and `0x0000...0002` are visually identical. Show an ENS name when available; for raw addresses, show the last 6 chars instead of 4 (more entropy), or use a per-address blockie/avatar icon that's visually distinct.

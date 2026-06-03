# Bugs & Updates

## Bugs

- ~~**Weapon animations missing from previous move**~~ — Fixed: all four beam animations (Laser, Missile, Plasma, Railgun) now show for last-move display when `lastMoveActionType === Shoot`, regardless of `selectedWeaponType`. Missile also had a secondary bug using `targetShipId` instead of `directedWeaponBeamTargetId` which was fixed at the same time. EMP and Repair Drone already had dedicated last-move animation blocks.

- ~~**Previous move shown incorrectly in replay mode**~~ — Fixed: `displayedLastMove` now reads from the replay snapshot's `lastMove` instead of the live `game.lastMove`. Both `shouldShowLastMove` and `shouldShowLastMoveOnGrid` now use `displayGame` (the snapshot) for winner and ship-position checks, so indicators correctly reflect the replayed turn at every step.

- ~~**Submit confirm widget anchors to player ship, not target**~~ — Fixed: widget now anchors to the target ship; also added targeting reticle (corner brackets) on the locked-on target cell.

- **No easy way to deselect RAM action** — Once RAM is automatically selected (when an eligible disabled enemy is in range), there is no clear way to switch back to a regular weapon without clicking around. Needs an explicit cancel/switch control or clearer UI affordance.

- **Move preview lingers when hovering enemy ship in range without moving** — If the player has not chosen a move destination and mouses over an enemy ship that is within weapon range, a move preview ghost appears on the current cell. The preview should only show when the player has actively chosen a destination; hovering an in-range enemy without moving should not trigger it.

- **Retreat incorrectly shows movement arrow and preview position** — When a ship selects Retreat, the grid renders a movement arrow and a ghost preview tile as if a normal move is being planned. Retreat should not show either; the ship stays in place and only the retreat action indicator should be visible.

## Updates

- **Victory/defeat screen not clear enough** — The end-of-game state does not communicate the outcome prominently or satisfyingly. Needs a more impactful visual treatment so players immediately know whether they won or lost.

- **Fleet status panel: disabled allied ships hard to distinguish from live enemy ships** — Disabled (0 HP) friendly ships share visual styling with active enemy ships in the fleet status thumbnails. Needs a clearer visual treatment — e.g. a distinct overlay, desaturation, or different border style — so players can immediately tell a disabled ally from a healthy enemy at a glance.

- **Ships not dying instantly at 3 reactor overload** — Ships that accumulate 3 reactor overload stacks should be destroyed immediately, but currently they survive. The destruction trigger on reaching the third overload is not firing as expected.

- **Ships with ≥ 3 reactor overload not destroyed at round end** — The end-of-round cleanup that should destroy ships at or above the 3-stack overload threshold is not triggering. Affected ships survive into the next round instead of being removed.

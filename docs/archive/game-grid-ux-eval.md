# Game Grid UI/UX Evaluation

*Comparing to XCOM, Into the Breach, Advance Wars, Fire Emblem, and Battletech*

---

## What Works — Keep

**Color language is solid.**
Green for movement, amber for weapons, cyan for specials/friendlies, red for targets. This maps to genre conventions well. Into the Breach and XCOM use the same green/red split, and the amber intermediate feels natural for "threat range you can reach after moving."

**Ghost/preview before commit is correct.**
Staging a move shows the ship at its destination before you submit. Every good tactics game does this. The two-step (stage → submit) is the right pattern.

**Damage preview numbers.**
Showing projected damage on target ships before committing is one of the best UX decisions in the genre (Fire Emblem, Into the Breach both do this). Keep it.

**Grey overlay for "already moved" ships.**
Clear, immediate visual signal that a ship is spent this round. XCOM uses the same approach. Works.

**Right-click to deselect.**
Correct idiom for PC. Keeps the user from having to click empty tiles or find an escape button.

**Drag-and-drop.**
A natural secondary input that expert players will prefer. Most tactics games don't even offer it.

**Health strip at the bottom of the cell.**
Elegant — doesn't obscure the ship art, gives at-a-glance HP status. Better than floating number HP that clutters the grid.

**Zoom + pan.**
For a 17×11 board with multiple ship images and overlays, zoom is essential on anything smaller than a large monitor. Right-click pan is intuitive once discovered.

**Turn alert sound.**
Correspondence/async games need this. Keep and potentially add a visual flash.

**Replay.**
Very few web tactics games have this. It's a differentiator.

**Nebula/blocked-tile rendering.**
The image overlay for blocked LOS tiles gives the board environmental texture without being noisy.

---

## What to Change

### ✅ 1. Triple-click ship cycling is opaque
Currently: 1st click = select (movement + threat), 2nd click = lock position / gun-only view, 3rd click = deselect. None of this is discoverable. Players in XCOM, Fire Emblem, and Advance Wars expect: click = select, click empty space or press Escape = deselect. The "gun-only from this position" mode should be an explicit button or hotkey ("Hold position + shoot"), not a hidden 2nd-click state.

### ✅ 2. "Pass" action is invisible
When a ship is selected with no target, Submit sends a Pass. Players won't know this. Advance Wars shows a grayed-out "Wait" option explicitly. The submit button should change label to "Pass Turn / Skip Ship" and explain what it does.

### ✅ 3. Confirmation buttons are spatially disconnected from the action
The Submit/Cancel row appears in a side panel while the staged move is shown on the grid. Players look at the grid when making decisions. The buttons should either be near the selected ship (inline overlay near the grid cell) or at minimum have a persistent, prominent position that doesn't require hunting.

**Implemented:** When a move is staged (previewPosition set to a cell different from the ship's current position), a ✓ / ✗ widget appears directly on the grid anchored to the destination cell, inside the zoom transform so it tracks correctly. The panel Submit/Cancel remain as a fallback. The widget is hidden during replay, for Hold (stay-in-place), and for Retreat.

### ✅ 4. No "End Round" clarity
The flow is: move one ship → submit → move next → submit, repeating until all ships moved. When all ships are moved, the round ends automatically. This implicit end is confusing — players expect an "End Turn" button they press when done (Advance Wars, Fire Emblem, XCOM all have this). Consider adding an explicit "End Round" button that appears once all ships are moved, or at least a round-complete notification.

### ✅ 5. Enemy threat range is not browsable
You can hover enemy ships to see their tooltip, but you can't click them to see their movement + shooting range without being mid-action. Into the Breach and XCOM let you click any unit (even enemy) to inspect their range. This is critical information for planning. Either allow click-to-inspect on enemy ships, or add a persistent "hover to see threat" overlay mode.

**Implemented:** Clicking any ship — enemy or friendly — selects it and shows its full movement range and threat overlay, identical to selecting your own ships. The action panel prevents issuing orders for ships you don't own.

### 6. Movement highlight bleeds into shooting range too easily
When a ship has both long move range and long weapon range, the amber shooting overlay (move+shoot combined) covers most of the board. This is technically correct but visually overwhelming. Advance Wars hides the weapon range unless you explicitly request it. Consider showing only movement range on first select, and weapon range only when hovering a target or pressing a key.

### ✅ 7. No path arrow on movement hover
When hovering a movement tile, there's no line showing the ship's path to that tile. Into the Breach and most modern tactics games draw a dotted/arrow path from ship to hover tile. It helps players understand movement rules and board topology. Currently tiles just get a green tint.

### ✅ 8. Ram action discovery is poor
Ramming requires clicking an enemy within movement range while a ship is selected, which cycles through ram → weapon. This interaction is hidden — new players will never find it. Ram should be an explicit action button in the action panel (like a weapon toggle), the same way retreating has its own explicit button.

### 9. Weapon selection UI is easy to miss
The weapon/special toggle is in the side panel and doesn't have a strong visual affordance. In Battletech and XCOM, weapon selection is the most prominent element of the attack phase. Consider persistent weapon-type buttons next to the Submit button, or auto-showing the selector when a target is selected.

### 10. No attack confirmation for high-stakes moves
Genre convention (especially Fire Emblem) is to show a battle forecast before you commit — "you will deal X, they will deal Y, probability of destruction." The damage preview labels are good but passive. For a destroy-level shot, a brief confirmation beat would reduce misclicks.

### 11. Turn timer visibility scales poorly under pressure
The countdown is shown as a small text number + progress bar. When time is low (under 30 seconds), most tactics games flash the timer or play a warning sound. Consider color-shifting the timer to amber at 50% and red at 20%, with an audible warning.

### 12. Fleet roster panel collapses context when planning
The ship stat cards scroll off-screen on smaller viewports. During your turn you need to know every friendly ship's status at a glance. Advance Wars and XCOM keep a compact unit roster always visible. A condensed row of ship HP badges along the panel edge would help without requiring full card scrollback.

---

## Priority Order

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| ✅ 1 | Pass action labeling | Low | High |
| ✅ 2 | Enemy range inspection | Medium | High |
| 3 | Turn timer urgency signals | Low | Medium |
| ✅ 4 | Triple-click → explicit hold-position button | Medium | High |
| ✅ 5 | Path arrows on movement hover | Medium | Medium |
| 6 | End Round button / explicit round-complete signal | Low | Medium |
| ✅ 7 | Ram as explicit action | Medium | Medium |
| 8 | Weapon selection prominence | Low | Medium |
| 9 | Range overlay decluttering (move-only default) | Medium | Medium |
| 10 | High-stakes move confirmation | High | Low |

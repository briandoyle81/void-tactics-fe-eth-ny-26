# Mobile UX Tasks

Generated 2026-05-21 from a code-based audit of all major UI surfaces at 375–430px viewport width.

---

## GameDisplay (In-Game View)

**1. ✅ Mobile panel tab touch targets are too small.**
`status / actions / events / fleets` tabs use `py-1 text-[10px]` — roughly 22px tall, well under the 44px minimum. Increase to `py-2 text-xs` and ensure each tab is at least 44px tall.
*File: `GameDisplay.tsx` ~L3309*

**2. ✅ Portrait mode hard-block needs a better UX.**
Players who open a game in portrait see a plain text message: "Rotate your device to continue." There's no visual hint (rotation animation, device graphic) to make clear what they need to do. Add a rotation animation graphic or icon to make the instruction immediately scannable.
*File: `GameDisplay.tsx` ~L2708*

**3. ✅ Weapon selector dropdown may clip off-screen.**
The weapon dropdown in the mobile left panel uses `top-[calc(100%+4px)]` absolute positioning. If the selector is near the bottom of the panel, the dropdown renders below the viewport. Switch to `bottom-[calc(100%+4px)]` when near the lower edge, or use a fixed-position overlay.
*File: `GameDisplay.tsx` ~L3430*

**4. ✅ Score values in mobile status panel are `text-[11px]`.**
"Me 200/300" and "Opp 150/300" are displayed at 11px. Increase to at least `text-xs` (12px) or `text-sm` (14px) for legibility at a glance.
*File: `GameDisplay.tsx` ~L3364*

---

## Lobbies (Fleet Composition Grid)

**5. ✅ Fleet placement grid is unusable on touch. (from UX_SUGGESTIONS #19)**
Dragging a ship token to an exact grid cell is unreliable with a finger. On mobile, implement a tap-to-place model: tap a ship in the list to select it → valid grid cells highlight → tap a cell to place. Drag-to-place can remain on desktop.

**6. ✅ Deploy zone highlight disappears before fleet submission.**
The "YOUR ZONE" amber overlay is only shown before a fleet is placed. Once ships are placed the visual zone is gone — which means players may not remember which columns belong to them if they need to adjust. Keep a subtle zone border visible throughout composition.
*File: `MapDisplay.tsx`, `Lobbies.tsx`*

---

## ManageNavy

**7. ✅ Filter window can overflow the right edge on mobile.**
The filter button uses `left: Math.max(12, rect.left)` as a `fixed` anchor. On a 375px screen with the button at e.g. `left=60`, the `w-[min(96vw,72rem)]` window extends to `60 + 96vw`, which is ~45px off the right edge. Clamp so the window never overflows: cap `left` at `Math.min(rect.left, window.innerWidth - windowWidth)` or just pin to `left: 0` on narrow viewports.
*File: `ManageNavy.tsx` ~L1796*

---

## Profile

**8. ✅ Engagement history rows overflow at 375px.**
Each row tries to fit "Game #NNN [VICTORY] vs 0x1234…5678 Dec 13, 2024" on a single line. On narrow screens this clips or wraps uncontrolled. Restructure to two lines: `Game #NNN [VICTORY]` on the first, `vs <opponent> · <date>` on the second, letting the existing row-2 (score/round/ships) remain as-is.
*File: `Profile.tsx` ~L179*

---

## Notice Bars

**9. ✅ Alpha Discord and Flow Wallet notice bars clamp text to one line.**
`line-clamp-1` truncates the notice on narrow screens where it would naturally wrap. Use `line-clamp-2 sm:line-clamp-1` so mobile users see the full message.
*Files: `AlphaDiscordNoticeBar.tsx` ~L74, `FlowWalletNoticeBar.tsx`*

---

## Global / Cross-Cutting

**10. ✅ Address display lacks visual entropy. (from UX_SUGGESTIONS #20)**
All displays already use `0x` + first 4 hex + `…` + last 4 hex consistently. ENS skipped — users are on testnets (Flow/Ronin/Base Sepolia/Xai), requiring a separate hardcoded mainnet RPC with no real benefit.

**11. ✅ Bottom content padding is excessive on mobile.**
`pb-16` (64px) on the main content area leaves a large dead zone above the footer on short phone screens. Reduce to `pb-8 sm:pb-16 md:pb-20`.
*File: `page.tsx` ~L406*

**12. ✅ Tab bar tabs are small on 375px with 7+ tabs.**
With a full tab set, tabs shrink to ~80px wide and `text-xs`. The scroll hint arrows help, but the active tab should auto-scroll into view when the user returns to the page. Also consider whether the minimum tab height of `min-h-11` (44px) is maintained on all viewport widths.
*File: `page.tsx` ~L465*

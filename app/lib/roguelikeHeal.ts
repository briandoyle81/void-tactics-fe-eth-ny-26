/**
 * A roster ship's hull after a roguelike win, matching the contracts:
 * RoguelikeMatch.onGameEnded raises it to floor(max * autoHealPercent / 100)
 * (never lowering it, and carrying a 0-hull ship forward at 1), then
 * HealAboveFloorWinEffect.onWin raises it to floor(max * healAboveFloorPercent
 * / 100) when the node has that effect (pass 0 otherwise).
 */
export function hullAfterRoguelikeWin({
  hullPoints,
  maxHullPoints,
  autoHealPercent,
  healAboveFloorPercent,
}: {
  hullPoints: number;
  maxHullPoints: number;
  autoHealPercent: number;
  healAboveFloorPercent: number;
}): number {
  const floorAt = (percent: number) => Math.floor((maxHullPoints * percent) / 100);
  let hull = Math.min(maxHullPoints, Math.max(hullPoints, floorAt(autoHealPercent)));
  if (hull === 0) hull = 1;
  const healTarget = floorAt(healAboveFloorPercent);
  if (healTarget > hull) hull = Math.min(maxHullPoints, healTarget);
  return hull;
}

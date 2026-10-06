import type { VictoryReason } from "../components/GameResultModal";

// Shared by GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2). Number-
// native: each view converts its own ship data before calling this.

export interface VictoryReasonEnemyShip {
  /** 0 = alive, 1 = destroyed, 2 = fled (retreated) */
  status?: 0 | 1 | 2;
  /** null when attributes are unknown; treated as still flying. */
  hullPoints: number | null;
}

/**
 * True when a ship is out of the fight by damage: marked destroyed, or still
 * marked active but at 0 hull (disabled). Fled ships and ships with unknown
 * attributes are not counted. Shared with the mission dialog triggers
 * (missionDialog.ts) so "destroyed" means the same thing in both places.
 */
export function isShipKnockedOut(ship: VictoryReasonEnemyShip): boolean {
  return ship.status === 1 || ((ship.status ?? 0) === 0 && (ship.hullPoints ?? 1) <= 0);
}

/**
 * Why the player won, inferred from final game state:
 * - reached the score target -> site control
 * - enemy still had flyable ships -> the match ended early (enemy fled the
 *   match; a turn-timeout claim is indistinguishable on-chain and is shown
 *   as fled too)
 * - every enemy ship left by retreating -> fled
 * - otherwise the enemy was knocked out (destroyed or disabled) -> destroyed
 */
export function inferVictoryReason({
  myScore,
  maxScore,
  enemyShips,
}: {
  myScore: number;
  maxScore: number;
  enemyShips: readonly VictoryReasonEnemyShip[];
}): VictoryReason {
  if (maxScore > 0 && myScore >= maxScore) return "siteControl";

  const isFlying = (s: VictoryReasonEnemyShip) =>
    (s.status ?? 0) === 0 && (s.hullPoints ?? 1) > 0;
  if (enemyShips.some(isFlying)) return "enemyFled";

  const anyKnockedOut = enemyShips.some(isShipKnockedOut);
  return anyKnockedOut || enemyShips.length === 0 ? "fleetDestroyed" : "enemyFled";
}

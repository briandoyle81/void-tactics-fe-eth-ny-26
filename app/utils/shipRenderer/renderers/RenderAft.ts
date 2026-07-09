/**
 * RenderAft router
 * Ported from RenderAft.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderAft0 } from "./RenderAft0";
import { renderAft1 } from "./RenderAft1";
import { renderAft2 } from "./RenderAft2";

export function renderAft(ship: ShipVisual): string {
  // Use the speed to determine which aft class to use
  if (ship.traits.speed === 0) {
    return renderAft0(ship);
  } else if (ship.traits.speed === 1) {
    return renderAft1(ship);
  } else {
    return renderAft2(ship);
  }
}

/**
 * RenderWeapon router
 * Ported from RenderWeapon.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderWeapon1 } from "./RenderWeapon1";
import { renderWeapon2 } from "./RenderWeapon2";
import { renderWeapon3 } from "./RenderWeapon3";
import { renderWeapon4 } from "./RenderWeapon4";

// MainWeapon enum values (from contract)
// Based on TypeScript types: 0=Laser, 1=Railgun, 2=Missile, 3=Plasma
const MainWeapon = {
  Laser: 0,
  Railgun: 1,
  MissileLauncher: 2,
  PlasmaCannon: 3,
} as const;

export function renderWeapon(ship: ShipVisual): string {
  if (ship.equipment.mainWeapon === MainWeapon.Laser) {
    return renderWeapon1(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.Railgun) {
    return renderWeapon2(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.MissileLauncher) {
    return renderWeapon3(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.PlasmaCannon) {
    return renderWeapon4(ship);
  }
  return "";
}

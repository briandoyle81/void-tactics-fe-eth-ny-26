/**
 * RenderWeaponV2 router
 * Ported from RenderWeaponV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderWeapon1V2 } from "./RenderWeapon1V2";
import { renderWeapon2V2 } from "./RenderWeapon2V2";
import { renderWeapon3V2 } from "./RenderWeapon3V2";
import { renderWeapon4V2 } from "./RenderWeapon4V2";

// MainWeapon enum values (from contract)
// Based on TypeScript types: 0=Laser, 1=Railgun, 2=Missile, 3=Plasma
const MainWeapon = {
  Laser: 0,
  Railgun: 1,
  MissileLauncher: 2,
  PlasmaCannon: 3,
} as const;

export function renderWeaponV2(ship: ShipVisual): string {
  if (ship.equipment.mainWeapon === MainWeapon.Laser) {
    return renderWeapon1V2(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.Railgun) {
    return renderWeapon2V2(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.MissileLauncher) {
    return renderWeapon3V2(ship);
  } else if (ship.equipment.mainWeapon === MainWeapon.PlasmaCannon) {
    return renderWeapon4V2(ship);
  }
  return "";
}

/**
 * Variant-2 ("Drone") assembly step
 * Ported from ImageRendererV2.sol
 */

import { ShipVisual } from "../../types/shipVisual";
import { renderSpecialV2 } from "./renderersV2/RenderSpecialV2";
import { renderAftV2 } from "./renderersV2/RenderAftV2";
import { renderWeaponV2 } from "./renderersV2/RenderWeaponV2";
import { renderBodyV2 } from "./renderersV2/RenderBodyV2";
import { renderForeV2 } from "./renderersV2/RenderForeV2";

/**
 * Assembles the variant-2 SVG body (bottom to top). Destroyed/unconstructed
 * placeholder handling and base64 encoding stay centralized in
 * ImageRenderer.ts, matching how variant 1's assembly is structured.
 */
export function renderShipV2Body(ship: ShipVisual): string {
  let svg = "";

  try {
    svg += renderSpecialV2(ship); // Special effects (bottom)
  } catch (error) {
    console.error("Error in renderSpecialV2:", error);
    throw error;
  }

  try {
    svg += renderAftV2(ship); // Aft section
  } catch (error) {
    console.error("Error in renderAftV2:", error);
    throw error;
  }

  try {
    svg += renderWeaponV2(ship); // Weapons
  } catch (error) {
    console.error("Error in renderWeaponV2:", error);
    throw error;
  }

  try {
    svg += renderBodyV2(ship); // Body
  } catch (error) {
    console.error("Error in renderBodyV2:", error);
    throw error;
  }

  try {
    svg += renderForeV2(ship); // Fore section (top)
  } catch (error) {
    console.error("Error in renderForeV2:", error);
    throw error;
  }

  return svg;
}

/**
 * Main ImageRenderer orchestrator
 * Ported from ImageRenderer.sol
 */

import { Ship } from "../../types/types";
import { renderSpecial } from "./renderers/RenderSpecial";
import { renderAft } from "./renderers/RenderAft";
import { renderWeapon } from "./renderers/RenderWeapon";
import { renderBody } from "./renderers/RenderBody";
import { renderFore } from "./renderers/RenderFore";

// IPFS URIs for different ship states
const UNCONSTRUCTED_IMAGE =
  "ipfs://bafkreibc3fdrdsw4l7zy4wjrgalvfhg6kfd3wmijwefny3nxj5244x2tr4";
const DESTROYED_IMAGE =
  "ipfs://bafkreige3z6iopsmgyzefidhydbaikpipxwrstqzuylw2y2c4rvwnn6yvm";

// Base SVG template with viewBox and dimensions
const BASE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">';
const SVG_END = "</svg>";

/**
 * Renders a ship to an SVG data URI
 * @param ship The ship to render
 * @returns Data URI string (data:image/svg+xml;base64,...)
 */
export function renderShip(ship: Ship): string {
  try {
    // Return appropriate image URI based on ship state
    if (ship.shipData.timestampDestroyed > Number(0)) {
      return DESTROYED_IMAGE;
    } else if (!ship.shipData.constructed) {
      return UNCONSTRUCTED_IMAGE;
    }

    // Validate ship structure
    if (!ship.equipment || !ship.traits || !ship.shipData) {
      console.error("Invalid ship structure:", ship);
      throw new Error("Ship missing required properties (equipment, traits, or shipData)");
    }

    // For constructed and non-destroyed ships, render the SVG
    let svg = BASE_SVG;

    // Call each renderer in sequence from bottom to top
    try {
      svg += renderSpecial(ship); // Special effects (bottom)
    } catch (error) {
      console.error("Error in renderSpecial:", error);
      throw error;
    }

    try {
      svg += renderAft(ship); // Aft section
    } catch (error) {
      console.error("Error in renderAft:", error);
      throw error;
    }

    try {
      svg += renderWeapon(ship); // Weapons
    } catch (error) {
      console.error("Error in renderWeapon:", error);
      throw error;
    }

    try {
      svg += renderBody(ship); // Body
    } catch (error) {
      console.error("Error in renderBody:", error);
      throw error;
    }

    try {
      svg += renderFore(ship); // Fore section (top)
    } catch (error) {
      console.error("Error in renderFore:", error);
      throw error;
    }

    // Close the SVG
    svg += SVG_END;

    // Validate SVG before encoding
    if (!svg || svg.length === 0) {
      throw new Error("Generated SVG is empty");
    }

    // Convert SVG to base64 data URI
    // Use simple btoa encoding (SVG should be ASCII-compatible)
    try {
      const base64Svg = btoa(svg);
      return `data:image/svg+xml;base64,${base64Svg}`;
    } catch (encodingError) {
      console.error("Error encoding SVG to base64:", encodingError);
      // Fallback: use data URI without base64 (less efficient but should work)
      const encodedSvg = encodeURIComponent(svg);
      return `data:image/svg+xml,${encodedSvg}`;
    }
  } catch (error) {
    console.error("Error rendering ship:", error, ship);
    throw error;
  }
}

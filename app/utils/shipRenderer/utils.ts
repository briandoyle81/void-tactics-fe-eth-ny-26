/**
 * Utility functions ported from RenderUtils.sol
 * These functions are used throughout the renderer system
 */

/**
 * Convert hex color string to RGB values
 * Ported from hexToUint24
 */
export function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  if (hexColor.length !== 7 || hexColor[0] !== "#") {
    throw new Error("Invalid hex color format");
  }

  let result = 0;
  for (let i = 1; i < 7; i++) {
    const char = hexColor[i];
    let digit: number;

    if (char >= "0" && char <= "9") {
      digit = char.charCodeAt(0) - 48;
    } else if (char >= "a" && char <= "f") {
      digit = char.charCodeAt(0) - 87;
    } else if (char >= "A" && char <= "F") {
      digit = char.charCodeAt(0) - 55;
    } else {
      throw new Error("Invalid hex character");
    }
    result = (result << 4) | digit;
  }

  return {
    r: (result >> 16) & 0xff,
    g: (result >> 8) & 0xff,
    b: result & 0xff,
  };
}

/**
 * Blend colors using 75% blend ratio
 * Ported from blendColors
 */
export function blendColors(
  r1: number,
  g1: number,
  b1: number,
  hexColor: string
): string {
  const { r: r2, g: g2, b: b2 } = hexToRgb(hexColor);

  const r = Math.floor((r1 * 25 + r2 * 75) / 100);
  const g = Math.floor((g1 * 25 + g2 * 75) / 100);
  const b = Math.floor((b1 * 25 + b2 * 75) / 100);

  return `#${toHexString(r)}${toHexString(g)}${toHexString(b)}`;
}

/**
 * Convert number to 2-digit hex string
 * Ported from toHexString
 */
export function toHexString(value: number): string {
  const hex = value.toString(16).padStart(2, "0");
  return hex.toLowerCase();
}

/**
 * Parse HSL string and extract values
 * Helper for blendHSL
 */
function parseHSL(hslString: string): { h: number; s: number; l: number } {
  const b = hslString;
  if (b.length < 10) {
    throw new Error("Invalid HSL string format");
  }

  // Find the numbers in the string (format: "hsl(200, 40%, 47%)")
  let start = 4; // Skip "hsl("
  let end = start;
  while (end < b.length && b[end] !== ",") end++;
  const h = parseUint(b, start, end);

  start = end + 1;
  while (start < b.length && (b[start] === " " || b[start] === ",")) start++;
  end = start;
  while (end < b.length && b[end] !== "%") end++;
  const s = parseUint(b, start, end);

  start = end + 1;
  while (start < b.length && (b[start] === " " || b[start] === ",")) start++;
  end = start;
  while (end < b.length && b[end] !== "%") end++;
  const l = parseUint(b, start, end);

  return { h, s, l };
}

/**
 * Parse unsigned integer from string
 * Ported from parseUint
 */
function parseUint(str: string, start: number, end: number): number {
  let result = 0;
  for (let i = start; i < end; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode >= 48 && charCode <= 57) {
      result = result * 10 + (charCode - 48);
    }
  }
  return result;
}

/**
 * Convert number to string
 * Ported from uintToString
 */
function uintToString(value: number): string {
  if (value === 0) {
    return "0";
  }

  let temp = value;
  let digits = 0;
  while (temp !== 0) {
    digits++;
    temp = Math.floor(temp / 10);
  }

  const buffer: string[] = [];
  let remaining = value;
  while (remaining !== 0) {
    digits -= 1;
    buffer[digits] = String.fromCharCode(48 + (remaining % 10));
    remaining = Math.floor(remaining / 10);
  }

  return buffer.join("");
}

/**
 * Blend HSL colors
 * Ported from blendHSL
 */
export function blendHSL(
  h: number,
  s: number,
  l: number,
  hslString: string
): string {
  const { h: h2, s: s2, l: l2 } = parseHSL(hslString);
  const { blendedH, blendedS, blendedL } = blendValues(h, s, l, h2, s2, l2);

  // Return the blended HSL string
  return buildHslString(blendedH, blendedS, blendedL);
}

/**
 * Shared 50/50-ish blend math, factored out of blendHSL so blendHSLV2 can
 * reuse it without duplicating the ratio logic.
 * Ported from blendValues
 */
function blendValues(
  h: number,
  s: number,
  l: number,
  h2: number,
  s2: number,
  l2: number
): { blendedH: number; blendedS: number; blendedL: number } {
  // H: 50/50 blend, but don't change hue too much if saturation is > 40
  let blendedH: number;
  if (s2 > 40) {
    blendedH = Math.floor((h2 * 95 + h * 5) / 100);
  } else {
    blendedH = Math.floor((h2 * 50 + h * 50) / 100);
  }

  // S: Blend with different ratios based on base saturation
  let blendedS: number;
  if (s2 > 40) {
    blendedS = Math.floor((s2 * 95 + s * 5) / 100);
  } else {
    blendedS = Math.floor((s2 * 35 + s * 65) / 100);
  }

  // L: 85% old, 15% new
  const blendedL = Math.floor((l2 * 85 + l * 15) / 100);

  return { blendedH, blendedS, blendedL };
}

/**
 * Ported from hslString
 */
function buildHslString(h: number, s: number, l: number): string {
  return `hsl(${uintToString(h)}, ${uintToString(s)}%, ${uintToString(l)}%)`;
}

/**
 * True for colors in variant 2's dense orange/amber accent-highlight range
 * (weapon glows, engine lights, etc.).
 * Ported from isOrangeAccent
 */
function isOrangeAccent(h2: number, s2: number): boolean {
  return h2 <= 45 && s2 >= 55;
}

/**
 * Variant 2's shiny tint: for vivid orange accents, fully replaces hue and
 * saturation with the ship's own (h, s) instead of blending (blendHSL barely
 * moves already-saturated colors, which keeps orange accents orange on every
 * shiny variant-2 ship). Every other color keeps blendHSL's blend behavior.
 * Ported from blendHSLV2
 */
export function blendHSLV2(
  h: number,
  s: number,
  l: number,
  hslString: string
): string {
  const { h: h2, s: s2, l: l2 } = parseHSL(hslString);

  if (isOrangeAccent(h2, s2)) {
    return buildHslString(h, s, l2);
  }

  const { blendedH, blendedS, blendedL } = blendValues(h, s, l, h2, s2, l2);
  return buildHslString(blendedH, blendedS, blendedL);
}

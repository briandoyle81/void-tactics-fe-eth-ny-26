/**
 * DEC (Drone Energy Cores) is shown as whole cores, no decimals. Balances
 * round down so the display never shows more than you hold; costs round up
 * so you never appear to afford something you can't.
 */
export function formatDec(value: number, round: "down" | "up" = "down"): string {
  if (!Number.isFinite(value)) return "0";
  const whole = round === "up" ? Math.ceil(value) : Math.floor(value);
  return whole.toLocaleString("en-US");
}

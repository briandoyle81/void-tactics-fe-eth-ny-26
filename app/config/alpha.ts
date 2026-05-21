/**
 * Alpha Discord invite. Override with NEXT_PUBLIC_ALPHA_DISCORD_URL (e.g. https://discord.gg/yourcode).
 */
export const ALPHA_DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_ALPHA_DISCORD_URL?.trim() ||
  "https://discord.gg/SPzndFWvHZ";

/** The only wallet address allowed to view and edit the Maps tab. */
export const MAP_ADMIN_ADDRESS = "0x69a5B3aE8598fC5A5419eaa1f2A59Db2D052e346";

/**
 * Alpha Discord invite. Override with NEXT_PUBLIC_ALPHA_DISCORD_URL (e.g. https://discord.gg/yourcode).
 */
export const ALPHA_DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_ALPHA_DISCORD_URL?.trim() ||
  "https://discord.gg/SPzndFWvHZ";

/** Emails allowed to view and edit the Maps tab. */
export const MAP_ADMIN_EMAILS: string[] = ["briandoyle81@gmail.com"];

/**
 * Alpha Discord invite. Override with NEXT_PUBLIC_ALPHA_DISCORD_URL (e.g. https://discord.gg/yourcode).
 */
export const ALPHA_DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_ALPHA_DISCORD_URL?.trim() ||
  "https://discord.gg/SPzndFWvHZ";

/** The only wallet address allowed to view and edit the Maps tab. */
export const MAP_ADMIN_ADDRESS = "0x69a5B3aE8598fC5A5419eaa1f2A59Db2D052e346";

/**
 * Web2-mode counterpart to MAP_ADMIN_ADDRESS / the on-chain contract-owner
 * checks (useShipAttributesOwner, useShipPurchasePricesAccess) — there's no
 * wallet in web2 mode, so admin access to the Maps / Ship Attributes /
 * Purchase Prices tabs is instead gated on the signed-in Google account's
 * email being in this list.
 */
export const WEB2_ADMIN_EMAILS = ["briandoyle81@gmail.com"];

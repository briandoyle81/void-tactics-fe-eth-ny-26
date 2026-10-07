import { PLAY_PATH } from "../config/routes";

export type HostRouteDecision =
  /** Serve the path as requested. */
  | { type: "next"; noIndex: boolean }
  /** Serve a different path under the same URL. */
  | { type: "rewrite"; pathname: string; noIndex: boolean }
  /** Send the browser elsewhere; `url` is absolute or root-relative. */
  | { type: "redirect"; url: string };

export interface HostRoutingConfig {
  /** Origin of the game client host, e.g. https://play.voidtactics.xyz. */
  playUrl?: string;
  /** Origin of the website, e.g. https://voidtactics.xyz. */
  siteUrl?: string;
}

/** Paths that belong to the game client rather than the website. */
const CLIENT_PATH = /^\/(?:play|admin|tournaments)(?:\/|$)|^\/\d+\/?$/;

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Decides how a request is routed between the website and the game client.
 *
 * - On the play host, "/" serves the client and every page is marked
 *   no-index.
 * - On the site host (and its www), client paths (/play, /admin,
 *   /tournaments, /<gameId>) and old `/?chain=` links redirect to the play
 *   host.
 * - Anywhere else (local dev, previews, or no play host configured), the
 *   client stays at /play and `/?chain=` links redirect there.
 *
 * Pure so it can be tested; proxy.ts applies the decision.
 */
export function resolveHostRoute(
  host: string,
  pathname: string,
  search: string,
  config: HostRoutingConfig,
): HostRouteDecision {
  const playHost = hostOf(config.playUrl);
  const hasChainParam = new URLSearchParams(search).has("chain");

  if (playHost && host === playHost) {
    if (pathname === "/") return { type: "rewrite", pathname: PLAY_PATH, noIndex: true };
    return { type: "next", noIndex: true };
  }

  const siteHost = hostOf(config.siteUrl);
  const isSiteHost = siteHost !== null && (host === siteHost || host === `www.${siteHost}`);

  if (playHost && isSiteHost) {
    const playOrigin = new URL(config.playUrl!).origin;
    if (CLIENT_PATH.test(pathname)) {
      const isPlayPath = pathname === PLAY_PATH || pathname.startsWith(`${PLAY_PATH}/`);
      const target = isPlayPath ? pathname.slice(PLAY_PATH.length) || "/" : pathname;
      return { type: "redirect", url: `${playOrigin}${target}${search}` };
    }
    if (pathname === "/" && hasChainParam) {
      return { type: "redirect", url: `${playOrigin}/${search}` };
    }
    return { type: "next", noIndex: false };
  }

  if (pathname === "/" && hasChainParam) {
    return { type: "redirect", url: `${PLAY_PATH}${search}` };
  }
  return { type: "next", noIndex: false };
}

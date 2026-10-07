// Top-level routes for the website / game client split.
//
// The website (marketing) lives at "/", the game client at PLAY_PATH and the
// admin Ops Console at ADMIN_PATH. When NEXT_PUBLIC_PLAY_URL is set (e.g.
// https://play.voidtactics.xyz), proxy.ts also serves the client at "/" on
// that host and redirects client paths on the site host to it — see
// app/utils/hostRouting.ts. Links inside the app always use these paths;
// they work on every host.

/** The game client. */
export const PLAY_PATH = "/play";

/** Admin tools: maps, AI encounters, ship attributes, purchase prices. */
export const ADMIN_PATH = "/admin";

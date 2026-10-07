import { PLAY_PATH } from "../config/routes";

// The game client (app/play/page.tsx) switches tabs on window/document
// events like "void-tactics-navigate-to-profile". Shared chrome such as the
// Header is also shown on pages without the client (Ops Console, spectator),
// where nothing listens — so it navigates there instead, pre-seeding the tab
// the client restores on mount.

const ACTIVE_TAB_STORAGE_KEY = "void-tactics-active-tab";
/** Sub-section (e.g. a Store sub-tab) for the client to open on mount. */
export const PENDING_CLIENT_DETAIL_STORAGE_KEY = "void-tactics-pending-client-detail";

/** Set by the game client while it's mounted. */
export function setGameClientMounted(mounted: boolean): void {
  if (typeof document === "undefined") return;
  if (mounted) document.documentElement.dataset.vtGameClient = "1";
  else delete document.documentElement.dataset.vtGameClient;
}

/**
 * Opens `tab` in the game client: fires `eventName` (with `detail`, e.g.
 * `{ section: "credits" }`) when the client is on screen, otherwise
 * navigates to it with `push` (a router push) or a full page load.
 */
export function navigateToClientTab(
  tab: string,
  eventName: string,
  push?: (href: string) => void,
  detail?: Record<string, string>,
): void {
  if (typeof window === "undefined") return;
  if (document.documentElement.dataset.vtGameClient === "1") {
    window.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }));
    document.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }));
    return;
  }
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  if (detail) localStorage.setItem(PENDING_CLIENT_DETAIL_STORAGE_KEY, JSON.stringify(detail));
  if (push) push(PLAY_PATH);
  else window.location.assign(PLAY_PATH);
}

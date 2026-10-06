// Switches to the Games tab with a specific game pre-selected — shared by
// NodeMatchModal.tsx (after launching a new mission) and
// CampaignNodePreview.tsx ("Enter Combat", resuming one already running).
// Mirrors Lobbies.tsx's navigateToGamesTab, plus pre-seeding the exact
// localStorage keys Games.tsx's own restore-on-mount effect reads
// (storageKey/viewModeKey there) so it opens straight into this game
// instead of landing on the list.
export function navigateToGame(address: string | undefined, gameId: bigint): void {
  if (typeof window === "undefined") return;
  if (address) {
    localStorage.setItem(`selectedGameId-${address}`, gameId.toString());
    localStorage.setItem(`gamesViewMode-${address}`, "detail");
  }
  localStorage.setItem("void-tactics-active-tab", "Games");
  localStorage.setItem("void-tactics-force-games-tab", "true");
  window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
  document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
}

/**
 * Web2 counterpart: same tab switch, pre-seeding the keys GamesWeb2.tsx's
 * restore-on-mount effect reads (selectedGameIdWeb2-/gamesViewModeWeb2-).
 */
export function navigateToGameWeb2(userId: string | null | undefined, gameId: number | string): void {
  if (typeof window === "undefined") return;
  if (userId) {
    localStorage.setItem(`selectedGameIdWeb2-${userId}`, String(gameId));
    localStorage.setItem(`gamesViewModeWeb2-${userId}`, "detail");
  }
  localStorage.setItem("void-tactics-active-tab", "Games");
  localStorage.setItem("void-tactics-force-games-tab", "true");
  window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
  document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
}

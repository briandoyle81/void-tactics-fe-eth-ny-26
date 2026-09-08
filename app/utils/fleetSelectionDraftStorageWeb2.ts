/**
 * Web2 counterpart to fleetSelectionDraftStorage.ts — same per-lobby fleet
 * picker draft persistence (ship ids + map positions) in localStorage so a
 * refresh or closing the modal without submitting doesn't lose work, keyed
 * by userId instead of chainId+address (web2 has no chain concept).
 */

export type FleetDraftStoredWeb2 = {
  shipIds: number[];
  positions: Array<{ shipId: number; row: number; col: number }>;
};

function storageKey(userId: string): string {
  return `void-tactics-fleet-draft-web2-v1:${userId}`;
}

export function readFleetDraftsWeb2(
  userId: string | undefined,
): Record<string, FleetDraftStoredWeb2> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, FleetDraftStoredWeb2>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeFleetDraftWeb2(
  userId: string,
  lobbyId: number,
  shipIds: number[],
  positions: Array<{ shipId: number; row: number; col: number }>,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const all = readFleetDraftsWeb2(userId);
    const id = lobbyId.toString();
    if (shipIds.length === 0) {
      delete all[id];
    } else {
      all[id] = { shipIds, positions };
    }
    const k = storageKey(userId);
    if (Object.keys(all).length === 0) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, JSON.stringify(all));
    }
  } catch (e) {
    console.warn("Failed to persist fleet draft:", e);
  }
}

export function removeFleetDraftWeb2(userId: string, lobbyId: number): void {
  writeFleetDraftWeb2(userId, lobbyId, [], []);
}

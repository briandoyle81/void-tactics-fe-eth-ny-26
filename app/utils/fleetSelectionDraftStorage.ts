/**
 * Persist per-lobby fleet picker drafts (ship ids + map positions) in localStorage
 * so refresh or closing the modal without submitting does not lose work.
 */

export type FleetDraftStored = {
  shipIds: string[];
  positions: Array<{ shipId: string; row: number; col: number }>;
};

function storageKey(chainId: number, address: string): string {
  return `void-tactics-fleet-draft-v1:${chainId}:${address.toLowerCase()}`;
}

export function readFleetDrafts(
  chainId: number,
  address: string | undefined,
): Record<string, FleetDraftStored> {
  if (typeof window === "undefined" || !address) return {};
  try {
    const raw = localStorage.getItem(storageKey(chainId, address));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, FleetDraftStored>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeFleetDraft(
  chainId: number,
  address: string,
  lobbyId: number,
  shipIds: number[],
  positions: Array<{ shipId: number; row: number; col: number }>,
): void {
  if (typeof window === "undefined" || !address) return;
  try {
    const all = readFleetDrafts(chainId, address);
    const id = String(lobbyId);
    if (shipIds.length === 0) {
      delete all[id];
    } else {
      all[id] = {
        shipIds: shipIds.map((x) => x.toString()),
        positions: positions.map((p) => ({
          shipId: p.shipId.toString(),
          row: p.row,
          col: p.col,
        })),
      };
    }
    const k = storageKey(chainId, address);
    if (Object.keys(all).length === 0) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, JSON.stringify(all));
    }
  } catch (e) {
    console.warn("Failed to persist fleet draft:", e);
  }
}

export function removeFleetDraft(
  chainId: number,
  address: string,
  lobbyId: number,
): void {
  writeFleetDraft(chainId, address, lobbyId, [], []);
}

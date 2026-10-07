// Run progress shown as node pips on the Command Deck's Operations tile:
// missions cleared, where the fleet is now, then the longest route still
// ahead (resupply stops marked). Number-native — the web3/web2 adapters
// convert node ids before calling this.

export type RunPipState = "done" | "now" | "todo" | "resupply";

export interface RunGraphNode {
  id: number;
  isResupply: boolean;
  childIds: number[];
}

/** Most pips the tile shows; older cleared missions drop off the front first. */
export const MAX_RUN_PIPS = 12;

export function buildRunPips(
  nodes: readonly RunGraphNode[],
  currentNodeId: number,
  defeatedNodeIds: Iterable<number>,
  maxPips: number = MAX_RUN_PIPS,
): RunPipState[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(currentNodeId)) return [];
  const defeated = new Set(defeatedNodeIds);

  const done = nodes.filter((n) => n.id !== currentNodeId && defeated.has(n.id)).length;

  // Longest route forward through nodes not yet defeated. Two-way edges make
  // the graph cyclic, so a node already on the current route is skipped.
  const onRoute = new Set<number>();
  const longestAhead = (id: number): RunPipState[] => {
    onRoute.add(id);
    let best: RunPipState[] = [];
    for (const childId of byId.get(id)?.childIds ?? []) {
      const child = byId.get(childId);
      if (!child || defeated.has(childId) || onRoute.has(childId)) continue;
      const route: RunPipState[] = [child.isResupply ? "resupply" : "todo", ...longestAhead(childId)];
      if (route.length > best.length) best = route;
    }
    onRoute.delete(id);
    return best;
  };
  const ahead = longestAhead(currentNodeId);

  const pips: RunPipState[] = [...Array<RunPipState>(done).fill("done"), "now", ...ahead];
  if (pips.length <= maxPips) return pips;
  // Trim cleared missions first, then the far end of the route.
  const overflow = pips.length - maxPips;
  const trimmedDone = Math.min(overflow, done);
  return pips.slice(trimmedDone, trimmedDone + maxPips);
}

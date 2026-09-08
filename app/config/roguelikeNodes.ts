// Display copy for roguelike nodes — same situation as campaignNodes.ts:
// nothing on-chain (or in the web2 RoguelikeNode model) stores a name/
// description, so this is a hand-maintained nodeId -> content map, shared
// verbatim between the web3 and web2 roguelike graphs (both admin panels —
// RoguelikeNodeMapAdminPanel.tsx/RoguelikeNodeMapAdminPanelWeb2.tsx — are
// expected to keep matching node ids on each side, the same assumption
// campaignNodes.ts already makes for the original campaign).
//
// PLACEHOLDER COPY: titles/descriptions below are filler, not final
// narrative text — replace before shipping. A node id with no entry falls
// back to DEFAULT_ROGUELIKE_NODE_CONTENT rather than crashing (see
// getRoguelikeNodeContent's consumers: RoguelikeNodeCard,
// RoguelikeGraph.tsx/RoguelikeGraphWeb2.tsx's node preview panels).
//
// Graph shape (read from campaign 1 on Base Sepolia's RoguelikeNodeMap,
// 35 nodes as of this writing — same mainline/dead-end/shortcut/final-
// stretch shape as the original 30-node campaign, with 5 Resupply nodes
// (kind=1) woven into each branch):
//   - Mainline (1-15, resupply at 31/32): 1 -> 2 -> 3 -> 4 -> 5 -> 31(R)
//     -> 6 -> 7 -> 8 -> 9 -> 10 -> 32(R) -> 11 -> 12 -> 13 -> 14 -> 15.
//   - Dead end (16-21, resupply at 33): branches off node 2, 16 -> 17 -> 18
//     -> 33(R) -> 19 -> 20 -> 21 — terminates, nothing requires it.
//   - Shortcut (22-24, resupply at 34): also branches off node 2, 22 -> 34(R)
//     -> 23 -> 24, reconverges at node 25.
//   - Final stretch (25-30, resupply at 35): node 25 is reachable from
//     either 15 or 24, then 26 -> 27 -> 35(R) -> 28 -> 29 -> 30, the finale.
export interface RoguelikeNodeContent {
  title: string;
  description: string;
}

export const ROGUELIKE_NODE_CONTENT: Record<number, RoguelikeNodeContent> = {
  1: {
    title: "Point of Entry",
    description: "PLACEHOLDER — opening skirmish, root of the run.",
  },
  2: {
    title: "Fork in the Void",
    description:
      "PLACEHOLDER — the path splits here: mainline ahead, plus a dead-end detour and a harder shortcut both branch off this node.",
  },
  3: {
    title: "Perimeter Sweep",
    description: "PLACEHOLDER — mainline route.",
  },
  4: {
    title: "Choke Point",
    description: "PLACEHOLDER — mainline route.",
  },
  5: {
    title: "Last Mainline Outpost",
    description: "PLACEHOLDER — mainline route, into a resupply hub next.",
  },
  31: {
    title: "Forward Depot",
    description: "PLACEHOLDER — resupply hub between mainline nodes 5 and 6.",
  },
  6: {
    title: "Debris Run",
    description: "PLACEHOLDER — mainline route.",
  },
  7: {
    title: "Signal Relay",
    description: "PLACEHOLDER — mainline route.",
  },
  8: {
    title: "Kill Box",
    description: "PLACEHOLDER — mainline route.",
  },
  9: {
    title: "Entrenched Line",
    description: "PLACEHOLDER — mainline route.",
  },
  10: {
    title: "Fracture Point",
    description: "PLACEHOLDER — mainline route, into a resupply hub next.",
  },
  32: {
    title: "Refit Station",
    description: "PLACEHOLDER — resupply hub between mainline nodes 10 and 11.",
  },
  11: {
    title: "Static Ground",
    description: "PLACEHOLDER — mainline route.",
  },
  12: {
    title: "Push Line",
    description: "PLACEHOLDER — mainline route.",
  },
  13: {
    title: "Sentinel Watch",
    description: "PLACEHOLDER — mainline route.",
  },
  14: {
    title: "Edge of the Front",
    description: "PLACEHOLDER — mainline route, approaching the midpoint.",
  },
  15: {
    title: "Mainline Bastion",
    description:
      "PLACEHOLDER — mainline midpoint. Clearing this (or node 24, the shortcut) opens node 25.",
  },
  16: {
    title: "Detour Beacon",
    description: "PLACEHOLDER — branch toward the dead-end detour.",
  },
  17: {
    title: "Abandoned Waypoint",
    description: "PLACEHOLDER — dead end, chains onward to node 18.",
  },
  18: {
    title: "Drift Zone",
    description: "PLACEHOLDER — dead end, into a resupply hub next.",
  },
  33: {
    title: "Salvager's Cache",
    description: "PLACEHOLDER — resupply hub between dead-end nodes 18 and 19.",
  },
  19: {
    title: "Convoy Graveyard",
    description: "PLACEHOLDER — dead end.",
  },
  20: {
    title: "Empty Reach",
    description: "PLACEHOLDER — dead end.",
  },
  21: {
    title: "The Ossuary",
    description:
      "PLACEHOLDER — dead-end terminus, nothing requires it. Higher reward for the detour.",
  },
  22: {
    title: "Hard Vector",
    description:
      "PLACEHOLDER — branch toward the shortcut. Harder than the mainline node it parallels.",
  },
  34: {
    title: "Black Market Dock",
    description: "PLACEHOLDER — resupply hub guarding the shortcut, steep costs.",
  },
  23: {
    title: "Warlord's Approach",
    description: "PLACEHOLDER — shortcut route, spikes above mainline difficulty.",
  },
  24: {
    title: "The Crucible",
    description:
      "PLACEHOLDER — shortcut terminus: hardest fight on the way to node 25. Clearing it alone opens node 25, skipping the mainline.",
  },
  25: {
    title: "Confluence",
    description:
      "PLACEHOLDER — mainline and shortcut converge here (reachable from node 15 OR node 24).",
  },
  26: {
    title: "Broken Column",
    description: "PLACEHOLDER — final stretch.",
  },
  27: {
    title: "Final Approach",
    description: "PLACEHOLDER — final stretch, into a resupply hub next.",
  },
  35: {
    title: "Last Depot",
    description: "PLACEHOLDER — final resupply hub before the finale, steepest costs.",
  },
  28: {
    title: "Inner Ring",
    description: "PLACEHOLDER — final stretch.",
  },
  29: {
    title: "The Reckoning",
    description: "PLACEHOLDER — final stretch, penultimate mission.",
  },
  30: {
    title: "Last Stand",
    description: "PLACEHOLDER — run finale.",
  },
};

export const DEFAULT_ROGUELIKE_NODE_CONTENT: RoguelikeNodeContent = {
  title: "Unknown Sector",
  description: "No briefing available for this node yet.",
};

// Accepts bigint (web3 node ids) or number (web2 node ids) — this file is
// pure data/config with no chain dependency, shared verbatim between
// RoguelikeGraph.tsx and RoguelikeGraphWeb2.tsx.
export function getRoguelikeNodeContent(nodeId: bigint | number): RoguelikeNodeContent {
  return ROGUELIKE_NODE_CONTENT[Number(nodeId)] ?? DEFAULT_ROGUELIKE_NODE_CONTENT;
}

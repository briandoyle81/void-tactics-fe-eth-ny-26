// Display copy for campaign nodes — nothing on-chain provides names/flavor
// text (NodeMap only stores mapId, cost/turn/score numbers, and the
// prerequisite graph), so this is a hand-maintained nodeId -> content map.
//
// PLACEHOLDER COPY: titles/descriptions below are filler, not final
// narrative text — replace before shipping. New nodes added on-chain before
// this map is updated fall back to DEFAULT_NODE_CONTENT rather than
// crashing (see useCampaignGraph's consumers).
//
// Graph shape (per docs/Frontend_Update_Guide_30Mission_Campaign_AIHold.md,
// 2026-08-03 — the 30-node campaign, not the old 10-node one):
//   - Mainline (1-15): straight chain 2 -> ... -> 15.
//   - Dead end (16-21): branches off node 2, chains to itself, terminates at
//     21 — nothing requires it, same "detour with a bigger reward" role as
//     the old campaign's dead end.
//   - Shortcut (22-24): also branches off node 2, a short, harder-than-
//     mainline 3-node chain that reconverges at node 25.
//   - Final stretch (25-30): node 25's prerequisites are [15, 24] (ANY-of —
//     beat the mainline OR the shortcut), then 26-30 chain linearly to the
//     true finale.
export interface CampaignNodeContent {
  title: string;
  description: string;
  art?: string;
}

export const CAMPAIGN_NODE_CONTENT: Record<number, CampaignNodeContent> = {
  1: {
    title: "First Contact",
    description: "PLACEHOLDER — opening skirmish, root of the campaign.",
  },
  2: {
    title: "Outer Patrol",
    description:
      "PLACEHOLDER — the path splits here: mainline ahead, plus a dead-end detour and a harder shortcut both branch off this node.",
  },
  3: {
    title: "Border Skirmish",
    description: "PLACEHOLDER — mainline route.",
  },
  4: {
    title: "Contested Lane",
    description: "PLACEHOLDER — mainline route.",
  },
  5: {
    title: "Supply Line",
    description: "PLACEHOLDER — mainline route.",
  },
  6: {
    title: "Debris Field",
    description: "PLACEHOLDER — mainline route.",
  },
  7: {
    title: "Relay Station",
    description: "PLACEHOLDER — mainline route.",
  },
  8: {
    title: "Ambush Corridor",
    description: "PLACEHOLDER — mainline route.",
  },
  9: {
    title: "Held Position",
    description: "PLACEHOLDER — mainline route.",
  },
  10: {
    title: "Breach Point",
    description: "PLACEHOLDER — mainline route.",
  },
  11: {
    title: "Static Front",
    description: "PLACEHOLDER — mainline route.",
  },
  12: {
    title: "Advance Line",
    description: "PLACEHOLDER — mainline route.",
  },
  13: {
    title: "Vanguard Watch",
    description: "PLACEHOLDER — mainline route.",
  },
  14: {
    title: "Threshold",
    description: "PLACEHOLDER — mainline route, approaching the midpoint.",
  },
  15: {
    title: "Midpoint Bastion",
    description:
      "PLACEHOLDER — mainline midpoint. Beating this (or node 24, the shortcut) unlocks node 25.",
  },
  16: {
    title: "Side Passage",
    description: "PLACEHOLDER — branch toward the dead-end detour.",
  },
  17: {
    title: "Forgotten Outpost",
    description: "PLACEHOLDER — dead end, chains onward to node 18.",
  },
  18: {
    title: "Silent Drift",
    description: "PLACEHOLDER — dead end.",
  },
  19: {
    title: "Wrecked Convoy",
    description: "PLACEHOLDER — dead end.",
  },
  20: {
    title: "Hollow Reach",
    description: "PLACEHOLDER — dead end.",
  },
  21: {
    title: "The Boneyard",
    description:
      "PLACEHOLDER — dead-end terminus, nothing requires it. Higher scoring-tile value as a reward for the detour.",
  },
  22: {
    title: "Shortcut Approach",
    description:
      "PLACEHOLDER — branch toward the shortcut. Harder than the mainline node it parallels.",
  },
  23: {
    title: "Warlord's Gate",
    description: "PLACEHOLDER — shortcut route, spikes above mainline difficulty.",
  },
  24: {
    title: "The Gauntlet",
    description:
      "PLACEHOLDER — shortcut terminus: hardest fight on the way to node 25. Beating it alone unlocks node 25, skipping the mainline.",
  },
  25: {
    title: "Rally Point",
    description:
      "PLACEHOLDER — mainline and shortcut converge here (unlocked by completing node 15 OR node 24).",
  },
  26: {
    title: "Fractured Line",
    description: "PLACEHOLDER — final stretch.",
  },
  27: {
    title: "Last Approach",
    description: "PLACEHOLDER — final stretch.",
  },
  28: {
    title: "Inner Perimeter",
    description: "PLACEHOLDER — final stretch.",
  },
  29: {
    title: "The Precipice",
    description: "PLACEHOLDER — final stretch, penultimate mission.",
  },
  30: {
    title: "Final Stand",
    description: "PLACEHOLDER — campaign finale.",
  },
};

export const DEFAULT_NODE_CONTENT: CampaignNodeContent = {
  title: "Unknown Sector",
  description: "No briefing available for this node yet.",
};

export function getNodeContent(nodeId: bigint): CampaignNodeContent {
  return CAMPAIGN_NODE_CONTENT[Number(nodeId)] ?? DEFAULT_NODE_CONTENT;
}

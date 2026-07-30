// Display copy for campaign nodes — nothing on-chain provides names/flavor
// text (NodeMap only stores mapId, cost/turn/score numbers, and the
// prerequisite graph), so this is a hand-maintained nodeId -> content map.
//
// PLACEHOLDER COPY: titles/descriptions below are filler, not final
// narrative text — replace before shipping. New nodes added on-chain before
// this map is updated fall back to DEFAULT_NODE_CONTENT rather than
// crashing (see useCampaignGraph's consumers).
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
    description: "PLACEHOLDER — the path splits here.",
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
    title: "Choke Point",
    description: "PLACEHOLDER — mainline route, converges at node 9.",
  },
  6: {
    title: "Side Passage",
    description: "PLACEHOLDER — branch toward the dead-end detour.",
  },
  7: {
    title: "Forgotten Outpost",
    description:
      "PLACEHOLDER — dead end, nothing requires it. Higher scoring tile value as a reward for the detour.",
  },
  8: {
    title: "The Gauntlet",
    description:
      "PLACEHOLDER — hard fight: full 5-ship AI fleet, tighter cost limit than the mainline offers here. Beating it alone unlocks node 9, skipping 3–5.",
  },
  9: {
    title: "Rally Point",
    description:
      "PLACEHOLDER — the shortcut and the mainline converge here (unlocked by completing node 5 OR node 8).",
  },
  10: {
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

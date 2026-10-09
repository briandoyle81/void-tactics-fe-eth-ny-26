// Web3 mission text and map names. The contracts no longer store them
// (Maps.mapName and NodeContentRegistry were removed — see
// docs/redesign-10-7/frontend-handoff-rpc-cost-suggestions-2026-10-08.md §4),
// so they ship with the app, keyed by on-chain id:
// - app/data/content/mapNames.ts: map name by map id, edited by hand.
// - app/data/dialog/nodeContent.ts: node title and description by node id,
//   next to the rest of each mission's writing (briefing speakers, dialog).
// Both are edited by hand, not in the app's editors. Web2 keeps its own
// content in Postgres.

import { MAP_NAMES } from "../data/content/mapNames";
import { CAMPAIGN_NODE_CONTENT, ROGUELIKE_NODE_CONTENT } from "../data/dialog/nodeContent";
import type { NodeContentText } from "../types/dialog";

export type ContentGraphType = "CAMPAIGN" | "ROGUELIKE";

export type StaticNodeContent = NodeContentText;

export const STATIC_MAP_NAMES: Readonly<Record<number, string>> = MAP_NAMES;

export const STATIC_NODE_CONTENT: Readonly<Record<ContentGraphType, Readonly<Record<number, StaticNodeContent>>>> = {
  ROGUELIKE: ROGUELIKE_NODE_CONTENT,
  CAMPAIGN: CAMPAIGN_NODE_CONTENT,
};

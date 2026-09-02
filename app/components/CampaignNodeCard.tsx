"use client";

import { getNodeContent } from "../config/campaignNodes";

// Shared verbatim between CampaignGraph.tsx (web3, bigint node ids) and
// CampaignGraphWeb2.tsx (web2, number node ids) — only ever reads id/
// unlocked/completed, none of which need chain-specific typing, so a plain
// structural interface here (rather than importing useNodeMap's
// CampaignGraphNode) keeps this component genuinely chain-agnostic instead
// of accidentally coupling it to the web3 hook.
interface CampaignNodeCardNode {
  id: bigint | number;
  unlocked: boolean;
  completed: boolean;
}

export const CAMPAIGN_NODE_WIDTH = 96;
export const CAMPAIGN_NODE_HEIGHT = 64;
const STAR_SIZE = 18;

// The card's content is top-aligned inside its CAMPAIGN_NODE_WIDTH x
// CAMPAIGN_NODE_HEIGHT box (circle first, label below), so the circle's
// center sits above the box's vertical center — not at it. JumpLanes in
// CampaignGraph.tsx needs the circle's actual center (not the
// circle+label bounding box's center) so connector lines terminate right
// at the star instead of drifting down toward the label.
export const CAMPAIGN_NODE_CIRCLE_OFFSET_Y = STAR_SIZE / 2 - CAMPAIGN_NODE_HEIGHT / 2;

interface CampaignNodeCardProps {
  node: CampaignNodeCardNode;
  isSelected: boolean;
  onSelect: () => void;
  /** Overrides campaignNodes.ts's static getNodeContent(id) lookup — pass
   * the DB-merged title (see useNodeContent.ts) so an admin's edit shows up
   * on the map immediately, not just in the preview/edit panel below. */
  title?: string;
  /** Shows a small edit-mode badge — set by the caller only while its own
   * Edit Mode toggle is on. */
  editMode?: boolean;
  /** Connect-mode visual state (see CampaignGraph.tsx's connectMode state
   * machine): the node being linked FROM, a valid click target, or a target
   * that can't be linked (e.g. the source itself). */
  connectHighlight?: "source" | "candidate" | "invalid";
}

// Star-chart node: a small glowing point (state drives the color — steady
// phosphor-green where you've been, pulsing cyan where you can go next,
// neutral slate everywhere else on the chart) with a compact label
// underneath. Nodes you can't reach yet are NOT dimmed/grayed — the whole
// chart stays visible at full opacity; only your current position and the
// lanes leading to your next available nodes are highlighted (see
// JumpLanes in CampaignGraph.tsx). Replay is allowed on-chain
// (startNodeMatch only checks isNodeUnlocked, never "already completed" —
// confirmed against SinglePlayerMatch.sol), so completed nodes stay
// clickable.
export function CampaignNodeCard({
  node,
  isSelected,
  onSelect,
  title,
  editMode,
  connectHighlight,
}: CampaignNodeCardProps) {
  const resolvedTitle = title ?? getNodeContent(node.id).title;
  // In edit mode every node stays clickable (an editor previews/edits
  // locked nodes too) — outside edit mode, only unlocked nodes are.
  const clickable = editMode || node.unlocked;

  const starColor = node.completed
    ? "var(--color-phosphor-green)"
    : node.unlocked
      ? "var(--color-cyan)"
      : "var(--color-text-secondary)";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!clickable}
      className={`group relative flex flex-col items-center gap-3 font-mono ${
        clickable ? "cursor-pointer" : "cursor-not-allowed"
      } ${connectHighlight === "invalid" ? "opacity-40" : ""}`}
      style={{
        width: CAMPAIGN_NODE_WIDTH,
        height: CAMPAIGN_NODE_HEIGHT,
      }}
    >
      {isSelected && (
        <span
          className="campaign-reticle pointer-events-none absolute rounded-full border"
          style={{
            width: STAR_SIZE + 16,
            height: STAR_SIZE + 16,
            top: -8,
            borderColor: "var(--color-amber)",
          }}
        />
      )}

      {editMode && (
        <span
          className="pointer-events-none absolute text-[10px] leading-none"
          style={{ top: -20, right: 8, color: "var(--color-amber)" }}
        >
          ✎
        </span>
      )}

      <span
        className={`block rounded-full ${node.unlocked && !node.completed ? "campaign-node-unlocked" : ""}`}
        style={{
          width: STAR_SIZE,
          height: STAR_SIZE,
          backgroundColor: node.completed || node.unlocked ? starColor : "var(--color-near-black)",
          border: `2px solid ${
            connectHighlight === "source"
              ? "var(--color-amber)"
              : connectHighlight === "candidate"
                ? "var(--color-phosphor-green)"
                : starColor
          }`,
          boxShadow: connectHighlight === "source" ? "0 0 8px var(--color-amber)" : undefined,
        }}
      />

      <span
        className="line-clamp-2 w-full break-words text-center text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-primary)" }}
      >
        {resolvedTitle}
      </span>
    </button>
  );
}

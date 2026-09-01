"use client";

import { RoguelikeNodeKind } from "../types/roguelike";
import { CAMPAIGN_NODE_WIDTH, CAMPAIGN_NODE_HEIGHT } from "./CampaignNodeCard";

// Roguelike counterpart to CampaignNodeCard — same "star-chart node" visual
// language (glowing circle + label, campaign-reticle selection ring) so the
// two campaign types' maps read as one system, rendered via the same shared
// CampaignGraphCanvas. Content differs (no static per-id title config like
// the original campaign's campaignNodes.ts — roguelike nodes are admin-
// created dynamically, so the label is just kind + id) and adds an
// `isCurrent` marker the original campaign has no concept of (there's no
// "where you are right now" in the freely-replayable original campaign).
// Number-native and chain-agnostic, shared verbatim between RoguelikeGraph.tsx
// (web3) and RoguelikeGraphWeb2.tsx (web2) — see feedback_number_native_
// shared_components memory.
export interface RoguelikeNodeCardNode {
  id: number;
  kind: RoguelikeNodeKind;
  unlocked: boolean;
  completed: boolean;
  isCurrent: boolean;
}

const STAR_SIZE = 18;

interface RoguelikeNodeCardProps {
  node: RoguelikeNodeCardNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function RoguelikeNodeCard({ node, isSelected, onSelect }: RoguelikeNodeCardProps) {
  // Every node stays clickable, unlike CampaignNodeCard (which disables
  // locked nodes) — "unlocked" here means "enterable right now from your
  // current position," not "ever reachable," so letting the player preview
  // a currently-locked-out node (why it's locked, what it was) is useful
  // rather than misleading.
  const starColor = node.isCurrent
    ? "var(--color-amber)"
    : node.completed
      ? "var(--color-phosphor-green)"
      : node.unlocked
        ? "var(--color-cyan)"
        : "var(--color-text-secondary)";

  const kindLabel = node.kind === RoguelikeNodeKind.Combat ? "COMBAT" : "RESUPPLY";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col items-center gap-3 font-mono cursor-pointer"
      style={{ width: CAMPAIGN_NODE_WIDTH, height: CAMPAIGN_NODE_HEIGHT }}
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

      {node.isCurrent && (
        <span
          className="pointer-events-none absolute text-[10px] leading-none"
          style={{ top: -20, color: "var(--color-amber)" }}
        >
          ▼
        </span>
      )}

      <span
        className={`block rounded-full ${
          node.isCurrent || (node.unlocked && !node.completed) ? "campaign-node-unlocked" : ""
        }`}
        style={{
          width: STAR_SIZE,
          height: STAR_SIZE,
          backgroundColor: node.completed || node.unlocked || node.isCurrent ? starColor : "var(--color-near-black)",
          border: `2px solid ${starColor}`,
        }}
      />

      <span
        className="line-clamp-2 w-full break-words text-center text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-text-primary)" }}
      >
        {kindLabel} #{node.id}
      </span>
    </button>
  );
}

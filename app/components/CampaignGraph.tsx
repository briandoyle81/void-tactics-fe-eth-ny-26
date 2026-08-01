"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignGraph, type CampaignGraphNode } from "../hooks/useNodeMap";
import {
  CampaignNodeCard,
  CAMPAIGN_NODE_WIDTH,
  CAMPAIGN_NODE_HEIGHT,
  CAMPAIGN_NODE_CIRCLE_OFFSET_Y,
} from "./CampaignNodeCard";
import { CampaignNodePreview } from "./CampaignNodePreview";

const MIN_COL_WIDTH = 230;
const ROW_HEIGHT = 170;
const CANVAS_PADDING = 56;
const CANVAS_MIN_HEIGHT = 560;

// The depth-derived column is usually right, but some nodes are narrative
// shortcuts where raw prerequisite depth undersells how far along the
// branch they actually are — node 8 "The Gauntlet" skips ahead to node 9,
// bypassing the mainline (see campaignNodes.ts), so it reads better sitting
// further right than its shallow prerequisite depth would place it. Keyed
// by node id, values are 1-indexed (column 1 = leftmost) to match how
// columns are talked about outside the code. Only affects where the node
// itself renders — other nodes' depths (computed from their prerequisites)
// are unaffected, since this is applied after depth calculation, not inside
// it.
const MANUAL_COLUMN_OVERRIDES: Record<number, number> = {
  8: 4,
};

interface NodePosition {
  x: number;
  y: number;
  col: number;
}

interface GraphLayout {
  columns: CampaignGraphNode[][];
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
}

// Depth = 1 + max(prerequisite depths), root nodes (no prerequisites) sit
// at depth 0 — this is what turns the graph into columns/tiers. Split out
// from the pixel-layout math below so the column count is known before
// colWidth is picked (colWidth depends on how many columns need to fit the
// container).
function groupNodesByDepth(nodes: CampaignGraphNode[]): CampaignGraphNode[][] {
  const byId = new Map(nodes.map((n) => [n.id.toString(), n]));
  const depthCache = new Map<string, number>();

  function depthOf(node: CampaignGraphNode, seen: Set<string>): number {
    const key = node.id.toString();
    if (depthCache.has(key)) return depthCache.get(key)!;
    if (node.prerequisites.length === 0) {
      depthCache.set(key, 0);
      return 0;
    }
    if (seen.has(key)) return 0; // guard against a cycle in bad data
    seen.add(key);
    const prereqDepths = node.prerequisites.map((pid) => {
      const prereq = byId.get(pid.toString());
      return prereq ? depthOf(prereq, seen) : 0;
    });
    const depth = 1 + Math.max(...prereqDepths);
    depthCache.set(key, depth);
    return depth;
  }

  const columns: CampaignGraphNode[][] = [];
  nodes.forEach((node) => {
    const rawDepth = depthOf(node, new Set());
    const override = MANUAL_COLUMN_OVERRIDES[Number(node.id)];
    const depth = override !== undefined ? override - 1 : rawDepth;
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(node);
  });
  columns.forEach((col) => col?.sort((a, b) => Number(a.id - b.id)));
  return columns;
}

// Column/tier layout: nodes sharing a depth stack vertically, centered
// against the tallest column, in id order. This is a plain BFS-by-depth,
// not a real graph-layout algorithm — the campaign is small (10 nodes
// today) and doesn't justify pulling in a layout library — but it gives
// every node a real {x, y}, which is what lets the jump-lane connectors
// below be drawn as actual lines instead of text. `colWidth` is picked by
// the caller (see CampaignGraph) to stretch columns to fill the available
// container width, down to MIN_COL_WIDTH before horizontal scroll kicks in.
function layoutGraph(columns: CampaignGraphNode[][], colWidth: number): GraphLayout {
  const maxRows = Math.max(1, ...columns.map((c) => (c ?? []).length));
  const totalHeight = maxRows * ROW_HEIGHT;

  const positions = new Map<string, NodePosition>();
  columns.forEach((col, colIndex) => {
    const list = col ?? [];
    const colHeight = list.length * ROW_HEIGHT;
    const yOffset = (totalHeight - colHeight) / 2;
    list.forEach((node, rowIndex) => {
      positions.set(node.id.toString(), {
        x: colIndex * colWidth + colWidth / 2,
        y: yOffset + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
        col: colIndex,
      });
    });
  });

  return {
    columns,
    positions,
    width: columns.length * colWidth,
    height: totalHeight,
  };
}

// Starfield backdrop — two stacked CSS-only repeating radial-gradient
// layers (no images/canvas): a static field for texture, plus a dimmer
// twinkling field for ambient motion (disabled under prefers-reduced-motion
// via the campaign-starfield-twinkle class in globals.css).
function Starfield() {
  const staticStars: React.CSSProperties = {
    backgroundImage: `
      radial-gradient(1px 1px at 24px 32px, rgba(226,232,240,0.55) 50%, transparent 51%),
      radial-gradient(1px 1px at 96px 84px, rgba(226,232,240,0.4) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 156px 46px, rgba(86,214,255,0.5) 50%, transparent 51%),
      radial-gradient(1px 1px at 206px 128px, rgba(226,232,240,0.35) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 44px 140px, rgba(107,255,143,0.3) 50%, transparent 51%)
    `,
    backgroundSize: "280px 170px",
    backgroundRepeat: "repeat",
  };
  const twinkleStars: React.CSSProperties = {
    backgroundImage: `
      radial-gradient(1px 1px at 70px 20px, rgba(255,255,255,0.6) 50%, transparent 51%),
      radial-gradient(1px 1px at 180px 96px, rgba(255,255,255,0.5) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 12px 108px, rgba(255,184,77,0.4) 50%, transparent 51%)
    `,
    backgroundSize: "260px 190px",
    backgroundRepeat: "repeat",
  };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--color-near-black)" }}>
      <div className="absolute inset-0" style={staticStars} />
      <div className="campaign-starfield-twinkle absolute inset-0" style={twinkleStars} />
    </div>
  );
}

interface JumpLanesProps {
  layout: GraphLayout;
}

// Prerequisite connectors as actual SVG lines, drawn for every edge on the
// chart so the graph's structure always reads clearly — nothing is hidden
// or grayed out just because it isn't reachable yet. Color-coding layers
// highlight on top of that baseline: a solid phosphor-green lane once both
// ends are cleared, a flowing cyan lane for the live frontier (prerequisite
// done, this node now reachable — i.e. "the lines we can take currently"),
// and a plain neutral lane everywhere else. A node like #9 with two
// incoming edges (prerequisites is ANY-of, not ALL-of — see
// docs/singleplayer-frontend-integration.md) just gets two lanes converging
// on it, which is the whole point of drawing real lines here instead of a
// text "Requires: #5 or #8" label.
//
// Edges that skip more than one column (e.g. node 8 "The Gauntlet", whose
// only prerequisite is node 2 "Outer Patrol" two columns to its left — see
// MANUAL_COLUMN_OVERRIDES above) are bowed into a curve instead of drawn as
// a straight line. A straight line between distant columns can happen to
// pass almost exactly through an unrelated node sitting in between,
// visually implying a connection that doesn't exist on-chain — bowing the
// line clear of the direct path avoids that regardless of exact node
// positions.
function JumpLanes({ layout }: JumpLanesProps) {
  const edges: React.ReactNode[] = [];
  layout.columns.flat().forEach((node) => {
    const to = layout.positions.get(node.id.toString());
    if (!to) return;
    node.prerequisites.forEach((prereqId) => {
      const prereq = layout.columns.flat().find((n) => n.id === prereqId);
      const from = layout.positions.get(prereqId.toString());
      if (!prereq || !from) return;

      const isCleared = node.completed;
      const isFrontier = !isCleared && prereq.completed;
      const stroke = isCleared
        ? "var(--color-phosphor-green)"
        : isFrontier
          ? "var(--color-cyan)"
          : "var(--color-text-secondary)";
      const commonProps = {
        stroke,
        strokeWidth: isFrontier || isCleared ? 2 : 1.5,
        strokeDasharray: isCleared ? undefined : isFrontier ? "6 6" : "3 5",
        className: isFrontier ? "campaign-lane-active" : undefined,
        opacity: isCleared || isFrontier ? 0.9 : 0.8,
        fill: "none",
      };

      const fromY = from.y + CAMPAIGN_NODE_CIRCLE_OFFSET_Y;
      const toY = to.y + CAMPAIGN_NODE_CIRCLE_OFFSET_Y;
      const key = `${prereqId.toString()}-${node.id.toString()}`;
      const colSpan = Math.abs(to.col - from.col);

      if (colSpan > 1) {
        const midX = (from.x + to.x) / 2;
        const midY = (fromY + toY) / 2;
        // Bow away from the straight-line midpoint, toward whichever side
        // has less going on — down if the line's natural midpoint sits in
        // the top half of the canvas, up otherwise.
        const bow = midY < layout.height / 2 ? ROW_HEIGHT * 0.6 : -ROW_HEIGHT * 0.6;
        edges.push(
          <path
            key={key}
            d={`M ${from.x} ${fromY} Q ${midX} ${midY + bow} ${to.x} ${toY}`}
            {...commonProps}
          />,
        );
      } else {
        edges.push(
          <line key={key} x1={from.x} y1={fromY} x2={to.x} y2={toY} {...commonProps} />,
        );
      }
    });
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={layout.width}
      height={layout.height}
    >
      {edges}
    </svg>
  );
}

// Remembers the last-viewed node per wallet, matching Games.tsx's
// `selectedGameId-${address}` convention — falls back to "anonymous" for a
// disconnected viewer so the map still remembers something sane.
function campaignSelectedNodeStorageKey(address: string | undefined): string {
  return `campaign-selected-node-${address || "anonymous"}`;
}

export function CampaignGraph() {
  const { address } = useAccount();
  const { nodes, isLoading, error, refetch } = useCampaignGraph(address);
  const [selectedNodeId, setSelectedNodeIdState] = React.useState<bigint | null>(null);
  const setSelectedNodeId = React.useCallback(
    (nodeId: bigint) => {
      setSelectedNodeIdState(nodeId);
      if (typeof window !== "undefined") {
        localStorage.setItem(campaignSelectedNodeStorageKey(address), nodeId.toString());
      }
    },
    [address],
  );
  const queryClient = useQueryClient();
  const [isResettingCache, setIsResettingCache] = React.useState(false);

  // Debug affordance: NodeMap/AIEncounters reads (node list, unlock/complete
  // state, enemy fleet configs, map placements) all go through wagmi's
  // TanStack Query cache, keyed by (address, chainId, functionName, args) —
  // same mechanism as everywhere else in the app, no separate localStorage
  // layer. This wipes that cache entirely and forces every active read
  // (including the ones CampaignNodePreview owns for the selected node) to
  // refetch, to rule caching in or out when campaign data looks stale after
  // an admin edit.
  const handleResetCache = async () => {
    setIsResettingCache(true);
    try {
      queryClient.clear();
      await refetch();
    } finally {
      setIsResettingCache(false);
    }
  };
  const debugResetButton = (
    <button
      type="button"
      onClick={() => void handleResetCache()}
      disabled={isResettingCache}
      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border disabled:opacity-50"
      style={{
        color: "var(--color-cyan)",
        borderColor: "var(--color-cyan)",
        backgroundColor: "var(--color-near-black)",
      }}
    >
      {isResettingCache ? "[RESETTING CACHE...]" : "[DEBUG: RESET CAMPAIGN CACHE]"}
    </button>
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = React.useMemo(() => groupNodesByDepth(nodes), [nodes]);
  // Stretch columns to fill the measured container width — at wide enough
  // viewports the whole map fits with no scrolling; below MIN_COL_WIDTH,
  // horizontal scroll (already on the container) is the fallback. The 1px
  // fudge keeps the computed width from landing exactly on the overflow
  // boundary (containerRef is decoupled from the scrollbar itself — see
  // below — but staying off the boundary is cheap extra safety).
  const colWidth = containerWidth
    ? Math.max(MIN_COL_WIDTH, (containerWidth - CANVAS_PADDING * 2 - 1) / Math.max(columns.length, 1))
    : MIN_COL_WIDTH;
  const layout = React.useMemo(() => layoutGraph(columns, colWidth), [columns, colWidth]);
  const canvasHeight = Math.max(layout.height + CANVAS_PADDING * 2, CANVAS_MIN_HEIGHT);
  const contentTop = (canvasHeight - layout.height) / 2;
  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  // Restore the last-viewed node once the graph loads; fall back to the
  // root node (first render, or a saved id that's no longer valid — e.g. a
  // different wallet, or campaign content changed) so the preview panel is
  // never empty.
  React.useEffect(() => {
    if (selectedNodeId !== null || nodes.length === 0) return;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(campaignSelectedNodeStorageKey(address))
        : null;
    const savedNode = saved ? nodes.find((n) => n.id.toString() === saved) : undefined;
    setSelectedNodeIdState(savedNode ? savedNode.id : nodes[0].id);
  }, [nodes, selectedNodeId, address]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-text-muted">
          Loading campaign...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-warning-red">
          [ERR] Failed to load campaign: {error.message}
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-text-muted">
          No campaign nodes configured yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {debugResetButton}
      {/* containerRef sits on this plain, non-scrolling wrapper (not the
          overflow-x-auto box below) so its measured width can never be
          affected by a scrollbar appearing/disappearing inside it — that
          coupling is what causes a ResizeObserver feedback loop (scrollbar
          appears -> measured width shrinks -> layout shrinks -> scrollbar
          disappears -> measured width grows -> layout grows -> scrollbar
          reappears -> ...), which can peg the main thread. */}
      <div ref={containerRef} className="relative w-full">
        <div
          className="relative w-full overflow-x-auto border-2"
          style={{
            borderColor: "var(--color-steel)",
            borderRadius: 0,
            minHeight: CANVAS_MIN_HEIGHT,
          }}
        >
          <div
            className="relative"
            style={{ width: layout.width + CANVAS_PADDING * 2, height: canvasHeight }}
          >
            <Starfield />
            <div
              className="absolute"
              style={{ left: CANVAS_PADDING, top: contentTop, width: layout.width, height: layout.height }}
            >
              <JumpLanes layout={layout} />
              {layout.columns.flat().map((node) => {
                const pos = layout.positions.get(node.id.toString());
                if (!pos) return null;
                return (
                  <div
                    key={node.id.toString()}
                    style={{
                      position: "absolute",
                      left: pos.x - CAMPAIGN_NODE_WIDTH / 2,
                      top: pos.y - CAMPAIGN_NODE_HEIGHT / 2,
                    }}
                  >
                    <CampaignNodeCard
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      onSelect={() => setSelectedNodeId(node.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedNode && <CampaignNodePreview node={selectedNode} />}
    </div>
  );
}

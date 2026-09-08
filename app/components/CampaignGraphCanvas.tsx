"use client";

import React from "react";
import { CAMPAIGN_NODE_WIDTH, CAMPAIGN_NODE_HEIGHT, CAMPAIGN_NODE_CIRCLE_OFFSET_Y } from "./CampaignNodeCard";

const MIN_COL_WIDTH = 230;
const ROW_HEIGHT = 170;
const CANVAS_PADDING = 56;
const CANVAS_MIN_HEIGHT = 560;

export interface CampaignGraphCanvasNode {
  id: number;
  prerequisites: number[];
  completed: boolean;
  unlocked: boolean;
}

interface NodePosition {
  x: number;
  y: number;
  col: number;
}

interface GraphLayout<TNode extends CampaignGraphCanvasNode> {
  columns: TNode[][];
  positions: Map<number, NodePosition>;
  width: number;
  height: number;
}

// Depth = 1 + max(prerequisite depths), root nodes (no prerequisites) sit
// at depth 0 — this is what turns the graph into columns/tiers.
function groupNodesByDepth<TNode extends CampaignGraphCanvasNode>(
  nodes: TNode[],
  manualColumnOverrides: Record<number, number>,
): TNode[][] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depthCache = new Map<number, number>();

  function depthOf(node: TNode, seen: Set<number>): number {
    if (depthCache.has(node.id)) return depthCache.get(node.id)!;
    if (node.prerequisites.length === 0) {
      depthCache.set(node.id, 0);
      return 0;
    }
    if (seen.has(node.id)) return 0; // guard against a cycle in bad data
    seen.add(node.id);
    const prereqDepths = node.prerequisites.map((pid) => {
      const prereq = byId.get(pid);
      return prereq ? depthOf(prereq, seen) : 0;
    });
    const depth = 1 + Math.max(...prereqDepths);
    depthCache.set(node.id, depth);
    return depth;
  }

  const columns: TNode[][] = [];
  nodes.forEach((node) => {
    const rawDepth = depthOf(node, new Set());
    const override = manualColumnOverrides[node.id];
    const depth = override !== undefined ? override - 1 : rawDepth;
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(node);
  });
  columns.forEach((col) => col?.sort((a, b) => a.id - b.id));
  return columns;
}

function layoutGraph<TNode extends CampaignGraphCanvasNode>(
  columns: TNode[][],
  colWidth: number,
): GraphLayout<TNode> {
  const maxRows = Math.max(1, ...columns.map((c) => (c ?? []).length));
  const totalHeight = maxRows * ROW_HEIGHT;

  const positions = new Map<number, NodePosition>();
  columns.forEach((col, colIndex) => {
    const list = col ?? [];
    const colHeight = list.length * ROW_HEIGHT;
    const yOffset = (totalHeight - colHeight) / 2;
    list.forEach((node, rowIndex) => {
      positions.set(node.id, {
        x: colIndex * colWidth + colWidth / 2,
        y: yOffset + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
        col: colIndex,
      });
    });
  });

  return { columns, positions, width: columns.length * colWidth, height: totalHeight };
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

// Prerequisite connectors as actual SVG lines — see CampaignGraph.tsx's
// original doc-comment for the full rationale (real lines instead of a
// "Requires: #5 or #8" text label; solid green once cleared, flowing cyan
// for the live frontier, bowed curves for edges spanning >1 column so a
// straight line never happens to pass through an unrelated node).
function JumpLanes({
  layout,
  selectedNodeId,
}: {
  layout: GraphLayout<CampaignGraphCanvasNode>;
  selectedNodeId: number | null;
}) {
  const edges: React.ReactNode[] = [];
  layout.columns.flat().forEach((node) => {
    const to = layout.positions.get(node.id);
    if (!to) return;
    const isSelectedRoute = selectedNodeId != null && node.id === selectedNodeId && !node.completed;
    node.prerequisites.forEach((prereqId) => {
      const prereq = layout.columns.flat().find((n) => n.id === prereqId);
      const from = layout.positions.get(prereqId);
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
      const glowOuterProps = {
        stroke: "var(--color-amber)",
        strokeWidth: 9,
        strokeLinecap: "round" as const,
        opacity: 0.9,
        fill: "none",
        className: "campaign-route-glow",
      };
      const glowCoreProps = {
        stroke: "#fff3d6",
        strokeWidth: 2.5,
        strokeLinecap: "round" as const,
        opacity: 0.95,
        fill: "none",
      };

      const fromY = from.y + CAMPAIGN_NODE_CIRCLE_OFFSET_Y;
      const toY = to.y + CAMPAIGN_NODE_CIRCLE_OFFSET_Y;
      const key = `${prereqId}-${node.id}`;
      const colSpan = Math.abs(to.col - from.col);

      if (colSpan > 1) {
        const midX = (from.x + to.x) / 2;
        const midY = (fromY + toY) / 2;
        const bow = midY < layout.height / 2 ? ROW_HEIGHT * 0.6 : -ROW_HEIGHT * 0.6;
        const d = `M ${from.x} ${fromY} Q ${midX} ${midY + bow} ${to.x} ${toY}`;
        if (isSelectedRoute) {
          edges.push(<path key={`${key}-glow-outer`} d={d} {...glowOuterProps} />);
          edges.push(<path key={`${key}-glow-core`} d={d} {...glowCoreProps} />);
        }
        edges.push(<path key={key} d={d} {...commonProps} />);
      } else {
        if (isSelectedRoute) {
          edges.push(
            <line key={`${key}-glow-outer`} x1={from.x} y1={fromY} x2={to.x} y2={toY} {...glowOuterProps} />,
          );
          edges.push(
            <line key={`${key}-glow-core`} x1={from.x} y1={fromY} x2={to.x} y2={toY} {...glowCoreProps} />,
          );
        }
        edges.push(<line key={key} x1={from.x} y1={fromY} x2={to.x} y2={toY} {...commonProps} />);
      }
    });
  });

  return (
    <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height}>
      {edges}
    </svg>
  );
}

export interface CampaignGraphCanvasProps<TNode extends CampaignGraphCanvasNode> {
  nodes: TNode[];
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
  renderNode: (node: TNode, isSelected: boolean, onSelect: () => void) => React.ReactNode;
  manualColumnOverrides?: Record<number, number>;
  headerExtra?: React.ReactNode;
  /** Rendered below the graph canvas — the node detail/preview panel. */
  children?: React.ReactNode;
}

// Shared campaign-graph canvas (depth-tiered columns, SVG prerequisite
// lanes, starfield backdrop, ResizeObserver-driven responsive column
// width) — used identically by CampaignGraph.tsx (web3) and
// CampaignGraphWeb2.tsx (web2). Number-native: callers adapt their own
// bigint/number node ids down to plain numbers before passing in (the
// only bigint↔number conversion point, per feedback_number_native_shared_
// components memory), and render their own CampaignNodeCard-based node via
// the renderNode prop so each caller's onSelect wiring can stay in its own
// id type.
export function CampaignGraphCanvas<TNode extends CampaignGraphCanvasNode>({
  nodes,
  selectedNodeId,
  onSelectNode,
  renderNode,
  manualColumnOverrides = {},
  headerExtra,
  children,
}: CampaignGraphCanvasProps<TNode>) {
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

  const columns = React.useMemo(
    () => groupNodesByDepth(nodes, manualColumnOverrides),
    [nodes, manualColumnOverrides],
  );
  const colWidth = containerWidth
    ? Math.max(MIN_COL_WIDTH, (containerWidth - CANVAS_PADDING * 2 - 1) / Math.max(columns.length, 1))
    : MIN_COL_WIDTH;
  const layout = React.useMemo(() => layoutGraph(columns, colWidth), [columns, colWidth]);
  const canvasHeight = Math.max(layout.height + CANVAS_PADDING * 2, CANVAS_MIN_HEIGHT);
  const contentTop = (canvasHeight - layout.height) / 2;

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        {headerExtra}
        <div className="text-center font-mono text-sm text-text-muted">
          No campaign nodes configured yet.
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {headerExtra}
      {/* containerRef sits on this plain, non-scrolling wrapper (not the
          overflow-x-auto box below) so its measured width can never be
          affected by a scrollbar appearing/disappearing inside it. */}
      <div ref={containerRef} className="relative w-full">
        <div
          className="relative w-full overflow-x-auto border-2"
          style={{ borderColor: "var(--color-steel)", borderRadius: 0, minHeight: CANVAS_MIN_HEIGHT }}
        >
          <div className="relative" style={{ width: layout.width + CANVAS_PADDING * 2, height: canvasHeight }}>
            <Starfield />
            <div
              className="absolute"
              style={{ left: CANVAS_PADDING, top: contentTop, width: layout.width, height: layout.height }}
            >
              <JumpLanes layout={layout} selectedNodeId={selectedNodeId} />
              {layout.columns.flat().map((node) => {
                const pos = layout.positions.get(node.id);
                if (!pos) return null;
                return (
                  <div
                    key={node.id}
                    style={{
                      position: "absolute",
                      left: pos.x - CAMPAIGN_NODE_WIDTH / 2,
                      top: pos.y - CAMPAIGN_NODE_HEIGHT / 2,
                    }}
                  >
                    {renderNode(node, selectedNodeId === node.id, () => onSelectNode(node.id))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { cellLayoutBox, scaleCellPx } from "./gridLayout";
import { createOverlaySizeSync, setCircle, setLine } from "./overlayPaint";

interface MiningDrillAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

const CORE = "#fff6c8";
const STRAND_A = "#ffb020";
const STRAND_B = "#ffe566";
const STRAND_C = "#ff7a1a";
const HALO = "#ff8a1a";
const STEPS = 32;
const TURNS = 2.4;
const SPIN_RAD_PER_MS = -0.012;

function drillOrigin(
  grid: HTMLElement,
  row: number,
  col: number,
  facingRight: boolean,
) {
  const box = cellLayoutBox(grid, row, col);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dir = facingRight ? 1 : -1;
  return {
    x: cx + dir * (box.width * 0.1 + scaleCellPx(box.width, 11)),
    y: cy - box.height * 0.14 + scaleCellPx(box.height, -4),
  };
}

function helixPath(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  phase: number,
  radius: number,
): string {
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const r = radius * t;
    const ang = t * TURNS * Math.PI * 2 + phase;
    const swirl = Math.cos(ang) * r;
    const depth = Math.sin(ang) * r * 0.28;
    const x = ox + dx * t + px * swirl + ux * depth;
    const y = oy + dy * t + py * swirl + uy * depth;
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

export const MiningDrillAnimation = React.memo(function MiningDrillAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: MiningDrillAnimationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const haloRef = useRef<SVGLineElement | null>(null);
  const coreRef = useRef<SVGLineElement | null>(null);
  const strandRefs = useRef<Array<SVGPathElement | null>>([]);
  const tipGlowRef = useRef<SVGCircleElement | null>(null);
  const tipCoreRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const attackerRowRef = useRef(attackerRow);
  const attackerColRef = useRef(attackerCol);
  const targetRowRef = useRef(targetRow);
  const targetColRef = useRef(targetCol);
  const facingRightRef = useRef(facingRight);
  attackerRowRef.current = attackerRow;
  attackerColRef.current = attackerCol;
  targetRowRef.current = targetRow;
  targetColRef.current = targetCol;
  facingRightRef.current = facingRight;

  const syncOverlaySize = useMemo(
    () =>
      createOverlaySizeSync(
        () => gridContainerRef.current,
        (width, height) => {
          const svg = svgRef.current;
          if (!svg) return;
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          svg.style.width = `${width}px`;
          svg.style.height = `${height}px`;
        },
      ),
    [gridContainerRef],
  );

  useEffect(() => {
    const grid = gridContainerRef.current;
    const ro = grid ? new ResizeObserver(() => syncOverlaySize()) : null;
    if (grid && ro) ro.observe(grid);
    syncOverlaySize();
    startedAtRef.current = performance.now();

    const paint = (now: number) => {
      const container = gridContainerRef.current;
      const group = groupRef.current;
      if (!container || !group) {
        rafRef.current = requestAnimationFrame(paint);
        return;
      }

      syncOverlaySize();
      const origin = drillOrigin(
        container,
        attackerRowRef.current,
        attackerColRef.current,
        facingRightRef.current,
      );
      const box = cellLayoutBox(
        container,
        targetRowRef.current,
        targetColRef.current,
      );
      const endX = box.x + box.width / 2;
      const endY = box.y + box.height / 2;
      const cell = Math.min(box.width, box.height);
      const radius = Math.max(5, cell * 0.16);
      const phase = (now - startedAtRef.current) * SPIN_RAD_PER_MS;

      group.style.display = "";
      setLine(haloRef.current, origin.x, origin.y, endX, endY);
      setLine(coreRef.current, origin.x, origin.y, endX, endY);
      const phases = [phase, phase + (Math.PI * 2) / 3, phase + (Math.PI * 4) / 3];
      strandRefs.current.forEach((strand, i) => {
        if (!strand) return;
        strand.setAttribute(
          "d",
          helixPath(origin.x, origin.y, endX, endY, phases[i] ?? phase, radius),
        );
      });
      setCircle(tipGlowRef.current, endX, endY, radius * 1.15);
      setCircle(tipCoreRef.current, endX, endY, radius * 0.32);

      rafRef.current = requestAnimationFrame(paint);
    };

    rafRef.current = requestAnimationFrame(paint);
    return () => {
      ro?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gridContainerRef, syncOverlaySize]);

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none z-20"
      style={{ left: 0, top: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="none"
    >
      <g ref={groupRef} style={{ display: "none" }}>
        <line
          ref={haloRef}
          stroke={HALO}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.18}
        />
        <path
          ref={(el) => {
            strandRefs.current[0] = el;
          }}
          fill="none"
          stroke={STRAND_A}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
        <path
          ref={(el) => {
            strandRefs.current[1] = el;
          }}
          fill="none"
          stroke={STRAND_B}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        <path
          ref={(el) => {
            strandRefs.current[2] = el;
          }}
          fill="none"
          stroke={STRAND_C}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
        <line
          ref={coreRef}
          stroke={CORE}
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.95}
        />
        <circle ref={tipGlowRef} fill={HALO} opacity={0.35} />
        <circle ref={tipCoreRef} fill={CORE} opacity={0.95} />
      </g>
    </svg>
  );
});

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  LASER_FIRE_INTERVAL_MS,
  LASER_FLARE_FADEOUT_MS,
  LASER_FLARE_SLOTS,
  LASER_LINE_FADEOUT_MS,
  LASER_LINE_SLOTS,
  LASER_TRACE_PERIOD_MS,
} from "../../constants/animationTiming";
import { cellLayoutBox, gridLayoutSize, scaleCellPx } from "./gridLayout";
import {
  createOverlaySizeSync,
  restartCssAnimation,
  setCircle,
  setLine,
  startCancelledRaf,
  startVisibilityAwareInterval,
} from "./overlayPaint";

const BEAM_GREEN = "#6bff8f";
const BEAM_CORE = "#eafff0";
const TRAIL_TAIL = "#6e1610";
const TRAIL_MID = "#e08a3a";
const TRAIL_TIP = "#fff36a";
const SPARK_EMBER = "#fff6b0";
const SPARK_CORE = "#ffffff";
const MINING_SPARK_COUNT = 16;
const TRAIL_SEG_COUNT = 72;
/** Offset from cell center as a fraction of cell height. ±0.20 is the middle 40%. */
const TRACE_Y_BAND = 0.2;

interface LaserShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
  /** Variant 2 is the Mining Laser: one green wander beam. Variant 1 is the red pulse volley. */
  variant?: number;
}

function faction1LaserOrigin(
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
    x: cx + dir * box.width * 0.08,
    y: cy - box.height * (facingRight ? 0.3 : 0.15),
  };
}

function miningLaserOrigin(
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
    x: cx + dir * (box.width * 0.05 + scaleCellPx(box.width, 23)),
    y: cy + (facingRight ? -box.height * 0.15 : 0) + scaleCellPx(box.height, -2),
  };
}

const Faction1LaserAnimation = React.memo(function Faction1LaserAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: Omit<LaserShootingAnimationProps, "variant">) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineGroupRefs = useRef<Array<SVGGElement | null>>([]);
  const flareGroupRefs = useRef<Array<SVGGElement | null>>([]);
  const lineRectRefs = useRef<Array<SVGRectElement[] | null>>([]);
  const flareCircleRefs = useRef<Array<SVGCircleElement[] | null>>([]);
  const lineSlotRef = useRef(0);
  const flareSlotRef = useRef(0);
  const mountedRef = useRef(true);
  const timersRef = useRef<Set<number>>(new Set());
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
  const layoutCacheRef = useRef<{
    w: number;
    h: number;
    ar: number;
    ac: number;
    tr: number;
    tc: number;
    face: boolean;
    origin: { x: number; y: number };
    box: { x: number; y: number; width: number; height: number };
  } | null>(null);

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
    mountedRef.current = true;
    const grid = gridContainerRef.current;
    const ro = grid ? new ResizeObserver(() => {
      layoutCacheRef.current = null;
      syncOverlaySize();
    }) : null;
    if (grid && ro) ro.observe(grid);
    syncOverlaySize();

    const layout = () => {
      const container = gridContainerRef.current;
      if (!container) return null;
      const ar = attackerRowRef.current;
      const ac = attackerColRef.current;
      const tr = targetRowRef.current;
      const tc = targetColRef.current;
      const face = facingRightRef.current;
      let cached = layoutCacheRef.current;
      if (
        !cached ||
        cached.ar !== ar ||
        cached.ac !== ac ||
        cached.tr !== tr ||
        cached.tc !== tc ||
        cached.face !== face
      ) {
        const { width, height } = gridLayoutSize(container);
        cached = {
          w: width,
          h: height,
          ar,
          ac,
          tr,
          tc,
          face,
          origin: faction1LaserOrigin(container, ar, ac, face),
          box: cellLayoutBox(container, tr, tc),
        };
        layoutCacheRef.current = cached;
        syncOverlaySize();
      }
      return cached;
    };

    const lineHideTimers = Array<number>(LASER_LINE_SLOTS).fill(0);
    const flareHideTimers = Array<number>(LASER_FLARE_SLOTS).fill(0);

    const hideLater = (
      slotTimers: number[],
      slot: number,
      el: SVGElement | null,
      ms: number,
    ) => {
      const prev = slotTimers[slot];
      if (prev) {
        window.clearTimeout(prev);
        timersRef.current.delete(prev);
      }
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        slotTimers[slot] = 0;
        if (el) el.style.display = "none";
      }, ms);
      slotTimers[slot] = timer;
      timersRef.current.add(timer);
    };

    const createLine = () => {
      if (!mountedRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const cached = layout();
      if (!cached) return;
      const { origin, box } = cached;
      const endX = box.x + box.width / 2 + (Math.random() - 0.5) * box.width * 0.5;
      const endY = box.y + box.height / 2 + (Math.random() - 0.5) * box.height * 0.5;
      const dx = endX - origin.x;
      const dy = endY - origin.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const tr = `rotate(${angle} ${origin.x} ${origin.y})`;

      const lineSlot = lineSlotRef.current % LASER_LINE_SLOTS;
      lineSlotRef.current += 1;
      const lineGroup = lineGroupRefs.current[lineSlot];
      if (lineGroup) {
        let rects = lineRectRefs.current[lineSlot];
        if (!rects) {
          rects = Array.from(lineGroup.querySelectorAll("rect"));
          lineRectRefs.current[lineSlot] = rects;
        }
        const specs = [
          { yOff: 5, height: 10 },
          { yOff: 1.5, height: 3 },
          { yOff: 0.5, height: 1 },
        ];
        rects.forEach((rect, i) => {
          const spec = specs[i];
          if (!spec) return;
          rect.setAttribute("x", String(origin.x));
          rect.setAttribute("y", String(origin.y - spec.yOff));
          rect.setAttribute("width", String(length));
          rect.setAttribute("height", String(spec.height));
          rect.setAttribute("transform", tr);
        });
        restartCssAnimation(lineGroup, "animate-laser-fade");
        hideLater(lineHideTimers, lineSlot, lineGroup, LASER_LINE_FADEOUT_MS);
      }

      const flareSize = 18 + Math.random() * 10;
      const flareSlot = flareSlotRef.current % LASER_FLARE_SLOTS;
      flareSlotRef.current += 1;
      const flareGroup = flareGroupRefs.current[flareSlot];
      if (flareGroup) {
        let circles = flareCircleRefs.current[flareSlot];
        if (!circles) {
          circles = Array.from(flareGroup.querySelectorAll("circle"));
          flareCircleRefs.current[flareSlot] = circles;
        }
        if (circles[0]) {
          circles[0].setAttribute("cx", String(endX));
          circles[0].setAttribute("cy", String(endY));
          circles[0].setAttribute("r", String(flareSize * 0.28));
        }
        if (circles[1]) {
          circles[1].setAttribute("cx", String(endX));
          circles[1].setAttribute("cy", String(endY));
          circles[1].setAttribute("r", String(flareSize * 0.14));
        }
        restartCssAnimation(flareGroup, "laser-impact-flare-svg");
        hideLater(flareHideTimers, flareSlot, flareGroup, LASER_FLARE_FADEOUT_MS);
      }
    };

    createLine();
    const stopInterval = startVisibilityAwareInterval(createLine, LASER_FIRE_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      stopInterval();
      ro?.disconnect();
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current.clear();
    };
  }, [gridContainerRef, syncOverlaySize]);

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none z-20 overflow-visible"
      style={{ left: 0, top: 0, width: 0, height: 0 }}
      preserveAspectRatio="none"
    >
      {Array.from({ length: LASER_LINE_SLOTS }, (_, i) => (
        <g
          key={`line-${i}`}
          ref={(el) => {
            lineGroupRefs.current[i] = el;
          }}
          className="animate-laser-fade"
          style={{ display: "none" }}
        >
          <rect fill="red" opacity={0.15} />
          <rect fill="red" />
          <rect fill="#ffaaaa" />
        </g>
      ))}
      {Array.from({ length: LASER_FLARE_SLOTS }, (_, i) => (
        <g
          key={`flare-${i}`}
          ref={(el) => {
            flareGroupRefs.current[i] = el;
          }}
          className="laser-impact-flare-svg"
          style={{ display: "none" }}
        >
          <circle fill="#ff3333" opacity={0.85} />
          <circle fill="#ffffff" opacity={0.95} />
        </g>
      ))}
    </svg>
  );
});

type TracePoint = { x: number; y: number };

const TRACE_X_BAND = 0.42;

function randIn(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function hexRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * u)},${Math.round(ag + (bg - ag) * u)},${Math.round(ab + (bb - ab) * u)})`;
}

/** t=0 oldest (dull red), t=1 newest at the impact (bright yellow).
 *  Hot colors occupy half the trail so the scar cools twice as fast. */
function trailHeatColor(t: number): string {
  if (t < 0.725) return lerpColor(TRAIL_TAIL, TRAIL_MID, t / 0.725);
  return lerpColor(TRAIL_MID, TRAIL_TIP, (t - 0.725) / 0.275);
}

function lerpTracePoint(pts: TracePoint[], index: number): TracePoint {
  const i = Math.max(0, Math.min(pts.length - 1, index));
  const lo = Math.floor(i);
  const hi = Math.min(pts.length - 1, lo + 1);
  const f = i - lo;
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * f,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * f,
  };
}

function clampTrace(p: TracePoint): TracePoint {
  return {
    x: Math.max(-TRACE_X_BAND, Math.min(TRACE_X_BAND, p.x)),
    y: Math.max(-TRACE_Y_BAND, Math.min(TRACE_Y_BAND, p.y)),
  };
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function makeTracePath(): TracePoint[] {
  const start = {
    x: randIn(-TRACE_X_BAND, TRACE_X_BAND),
    y: randIn(-TRACE_Y_BAND, TRACE_Y_BAND),
  };
  let end = {
    x: randIn(-TRACE_X_BAND, TRACE_X_BAND),
    y: randIn(-TRACE_Y_BAND, TRACE_Y_BAND),
  };
  if (Math.hypot(end.x - start.x, end.y - start.y) < 0.55) {
    end = clampTrace({
      x: start.x >= 0 ? -TRACE_X_BAND * randIn(0.75, 1) : TRACE_X_BAND * randIn(0.75, 1),
      y: randIn(-TRACE_Y_BAND, TRACE_Y_BAND),
    });
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [start];
  for (let i = 1; i <= 2; i++) {
    const u = i / 3;
    const side = i % 2 === 0 ? 1 : -1;
    pts.push(
      clampTrace({
        x: start.x + dx * u + nx * randIn(0.14, 0.24) * side,
        y: start.y + dy * u + ny * randIn(0.1, 0.18) * side,
      }),
    );
  }
  pts.push(end);
  return pts;
}

function sampleTracePath(pts: TracePoint[], t: number): TracePoint {
  const n = pts.length;
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const len = Math.max(
      Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y),
      0.04,
    );
    lens.push(len);
    total += len;
  }
  let dist = Math.max(0, Math.min(1, t)) * total;
  let i = 0;
  while (i < n - 2 && dist > lens[i]) {
    dist -= lens[i];
    i += 1;
  }
  const f = dist / lens[i];
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n - 1, i + 2)];
  return clampTrace({
    x: catmull(p0.x, p1.x, p2.x, p3.x, f),
    y: catmull(p0.y, p1.y, p2.y, p3.y, f),
  });
}

const MiningLaserAnimation = React.memo(function MiningLaserAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: Omit<LaserShootingAnimationProps, "variant">) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const trailGroupRef = useRef<SVGGElement | null>(null);
  const trailSegRefs = useRef<Array<SVGLineElement | null>>([]);
  const haloRef = useRef<SVGLineElement | null>(null);
  const glowRef = useRef<SVGLineElement | null>(null);
  const beamRef = useRef<SVGLineElement | null>(null);
  const coreRef = useRef<SVGLineElement | null>(null);
  const sparkGlowRef = useRef<SVGCircleElement | null>(null);
  const sparkCoreRef = useRef<SVGCircleElement | null>(null);
  const sparkRefs = useRef<Array<SVGCircleElement | null>>([]);
  const sparkAnglesRef = useRef<number[]>([]);
  const sparkAgeRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const lastTraceTRef = useRef(0);
  const trailLocalsRef = useRef<TracePoint[]>([]);
  const layoutCacheRef = useRef<{
    w: number;
    h: number;
    ar: number;
    ac: number;
    tr: number;
    tc: number;
    face: boolean;
    origin: { x: number; y: number };
    box: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const trailFilterId = `mining-trail-${React.useId().replace(/:/g, "")}`;

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
    const ro = grid ? new ResizeObserver(() => {
      layoutCacheRef.current = null;
      syncOverlaySize();
    }) : null;
    if (grid && ro) ro.observe(grid);
    syncOverlaySize();
    startedAtRef.current = performance.now();
    lastTraceTRef.current = 0;
    trailLocalsRef.current = [];
    let tracePath = makeTracePath();

    const paint = (now: number) => {
      const container = gridContainerRef.current;
      const group = groupRef.current;
      if (!container || !group) return;

      const ar = attackerRowRef.current;
      const ac = attackerColRef.current;
      const tr = targetRowRef.current;
      const tc = targetColRef.current;
      const face = facingRightRef.current;
      let layout = layoutCacheRef.current;
      if (
        !layout ||
        layout.ar !== ar ||
        layout.ac !== ac ||
        layout.tr !== tr ||
        layout.tc !== tc ||
        layout.face !== face
      ) {
        const { width, height } = gridLayoutSize(container);
        layout = {
          w: width,
          h: height,
          ar,
          ac,
          tr,
          tc,
          face,
          origin: miningLaserOrigin(container, ar, ac, face),
          box: cellLayoutBox(container, tr, tc),
        };
        layoutCacheRef.current = layout;
        syncOverlaySize();
      }
      const origin = layout.origin;
      const box = layout.box;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const t = ((now - startedAtRef.current) / LASER_TRACE_PERIOD_MS) % 1;
      if (t < lastTraceTRef.current) {
        trailLocalsRef.current = [];
        tracePath = makeTracePath();
      }
      lastTraceTRef.current = t;
      const local = sampleTracePath(tracePath, t);
      const prev = trailLocalsRef.current[trailLocalsRef.current.length - 1];
      if (!prev || Math.hypot(local.x - prev.x, local.y - prev.y) > 0.006) {
        const trail = trailLocalsRef.current;
        trail.push(local);
        const maxPts = TRAIL_SEG_COUNT + 1;
        if (trail.length > maxPts) {
          trail.splice(0, trail.length - maxPts);
        }
      }
      const endX = cx + local.x * box.width;
      const endY = cy + local.y * box.height;
      const trailPts = trailLocalsRef.current;
      const trailGroup = trailGroupRef.current;
      if (trailGroup) {
        trailGroup.style.display = trailPts.length >= 2 ? "" : "none";
      }
      const segCount = trailPts.length >= 2
        ? Math.min(TRAIL_SEG_COUNT, trailPts.length - 1)
        : 0;
      trailSegRefs.current.forEach((seg, i) => {
        if (!seg) return;
        if (i >= segCount) {
          seg.style.display = "none";
          return;
        }
        const i0 = (i / segCount) * (trailPts.length - 1);
        const i1 = ((i + 1) / segCount) * (trailPts.length - 1);
        const a = lerpTracePoint(trailPts, i0);
        const b = lerpTracePoint(trailPts, i1);
        setLine(
          seg,
          cx + a.x * box.width,
          cy + a.y * box.height,
          cx + b.x * box.width,
          cy + b.y * box.height,
        );
        seg.setAttribute("stroke", trailHeatColor((i + 1) / segCount));
        seg.style.display = "";
      });

      group.style.display = "";
      setLine(haloRef.current, origin.x, origin.y, endX, endY);
      setLine(glowRef.current, origin.x, origin.y, endX, endY);
      setLine(beamRef.current, origin.x, origin.y, endX, endY);
      setLine(coreRef.current, origin.x, origin.y, endX, endY);
      setCircle(sparkGlowRef.current, endX, endY, 5.5);
      setCircle(sparkCoreRef.current, endX, endY, 1.7);

      sparkRefs.current.forEach((spark, si) => {
        if (!spark) return;
        const age = ((now / 160) + si * 0.13) % 1;
        const lastAge = sparkAgeRef.current[si];
        if (lastAge === undefined || age < lastAge) {
          sparkAnglesRef.current[si] = Math.random() * Math.PI * 2;
        }
        sparkAgeRef.current[si] = age;
        const ang = sparkAnglesRef.current[si];
        const reach = 8 + (si % 4) * 3.4;
        const spray = age * age;
        const sx = endX + Math.cos(ang) * reach * spray;
        const sy = endY + Math.sin(ang) * reach * spray;
        const fade = age < 0.1 ? age / 0.1 : 1 - age;
        setCircle(spark, sx, sy, 0.55 + (si % 3) * 0.25);
        spark.setAttribute("opacity", String(Math.min(1, Math.max(0, fade) * 4)));
      });
    };

    const stopRaf = startCancelledRaf(paint);
    return () => {
      stopRaf();
      ro?.disconnect();
    };
  }, [gridContainerRef, syncOverlaySize]);

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none z-20"
      style={{ left: 0, top: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="none"
    >
      <defs>
        <filter
          id={trailFilterId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g ref={trailGroupRef} style={{ display: "none" }} filter={`url(#${trailFilterId})`}>
        {Array.from({ length: TRAIL_SEG_COUNT }, (_, i) => (
          <line
            key={i}
            ref={(el) => {
              trailSegRefs.current[i] = el;
            }}
            stroke={TRAIL_TAIL}
            strokeWidth={4.2}
            strokeLinecap="round"
            opacity={0.88}
            style={{ display: "none" }}
          />
        ))}
      </g>
      <g ref={groupRef} style={{ display: "none" }}>
        <line
          ref={haloRef}
          stroke={BEAM_GREEN}
          strokeWidth={11}
          strokeLinecap="round"
          opacity={0.16}
        />
        <line
          ref={glowRef}
          stroke={BEAM_GREEN}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.42}
        />
        <line
          ref={beamRef}
          stroke={BEAM_GREEN}
          strokeWidth={3.5}
          strokeLinecap="round"
          opacity={0.95}
        />
        <line
          ref={coreRef}
          stroke={BEAM_CORE}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={0.95}
        />
        <circle ref={sparkGlowRef} fill={BEAM_GREEN} opacity={0.38} />
        <circle ref={sparkCoreRef} fill={BEAM_CORE} opacity={0.95} />
        {Array.from({ length: MINING_SPARK_COUNT }, (_, i) => (
          <circle
            key={i}
            ref={(el) => {
              sparkRefs.current[i] = el;
            }}
            fill={i % 2 === 0 ? SPARK_EMBER : SPARK_CORE}
            opacity={0}
            style={{ mixBlendMode: "plus-lighter" }}
          />
        ))}
      </g>
    </svg>
  );
});

export const LaserShootingAnimation = React.memo(function LaserShootingAnimation({
  variant = 1,
  ...props
}: LaserShootingAnimationProps) {
  if (Number(variant) === 2) {
    return <MiningLaserAnimation {...props} />;
  }
  return <Faction1LaserAnimation {...props} />;
});

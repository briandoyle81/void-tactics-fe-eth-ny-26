"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { createOverlaySizeSync, setCircle, setLine } from "./overlayPaint";
import { gridLayoutSize } from "./gridLayout";

interface AttackDroneAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

const DRONE_ORANGE = "#ff7a1a";
const DRONE_CORE = "#ffd08a";
const CUT_WHITE = "#fff4d6";
const DURATION_MS = 3200;
const SPARKS_PER_DRONE = 4;
const DRONE_COUNT = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

type Key = { at: number; x: number; y: number };

function sampleKeys(keys: Key[], p: number): { x: number; y: number } {
  if (p <= keys[0].at) return { x: keys[0].x, y: keys[0].y };
  const last = keys[keys.length - 1];
  if (p >= last.at) return { x: last.x, y: last.y };
  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1];
    const next = keys[i];
    if (p <= next.at) {
      const t = easeInOut((p - prev.at) / (next.at - prev.at));
      return { x: lerp(prev.x, next.x, t), y: lerp(prev.y, next.y, t) };
    }
  }
  return { x: last.x, y: last.y };
}

function cycleP(now: number, startedAt: number, delayMs: number) {
  const elapsed = now - startedAt - delayMs;
  if (elapsed < 0) return 0;
  return (elapsed % DURATION_MS) / DURATION_MS;
}

function cycleIndex(now: number, startedAt: number, delayMs: number) {
  const elapsed = now - startedAt - delayMs;
  if (elapsed < 0) return -1;
  return Math.floor(elapsed / DURATION_MS);
}

type TipPath = { cycle: number; x0: number; y0: number; x1: number; y1: number };

function randomTipPath(cycle: number, xBand: number, yBand: number): TipPath {
  const x0 = (Math.random() * 2 - 1) * xBand;
  const y0 = (Math.random() * 2 - 1) * yBand;
  let x1 = (Math.random() * 2 - 1) * xBand;
  let y1 = (Math.random() * 2 - 1) * yBand;
  if (Math.hypot(x1 - x0, y1 - y0) < xBand * 0.55) {
    x1 = -Math.sign(x0 || 1) * xBand * (0.55 + Math.random() * 0.45);
    y1 = (Math.random() * 2 - 1) * yBand;
  }
  return { cycle, x0, y0, x1, y1 };
}

function droneOpacity(p: number) {
  if (p <= 0 || p >= 1) return 0;
  if (p < 0.06) return p / 0.06;
  if (p > 0.94) return (1 - p) / 0.06;
  return 1;
}

function laserStrength(p: number) {
  if (p < 0.3 || p > 0.66) return 0;
  if (p < 0.32) return (p - 0.3) / 0.02;
  if (p > 0.64) return (0.66 - p) / 0.02;
  return 1;
}

export const AttackDroneAnimation = React.memo(function AttackDroneAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: AttackDroneAnimationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const droneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const haloRefs = useRef<Array<SVGLineElement | null>>([]);
  const beamRefs = useRef<Array<SVGLineElement | null>>([]);
  const coreRefs = useRef<Array<SVGLineElement | null>>([]);
  const tipGlowRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tipCoreRefs = useRef<Array<SVGCircleElement | null>>([]);
  const sparkRefs = useRef<Array<Array<SVGCircleElement | null>>>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const tipPathsRef = useRef<Array<TipPath | undefined>>([]);

  const attackerRowRef = useRef(attackerRow);
  const attackerColRef = useRef(attackerCol);
  const targetRowRef = useRef(targetRow);
  const targetColRef = useRef(targetCol);
  attackerRowRef.current = attackerRow;
  attackerColRef.current = attackerCol;
  targetRowRef.current = targetRow;
  targetColRef.current = targetCol;

  const drones = useMemo(
    () =>
      [
        { delayMs: 0, slashAngle: -0.85 },
        { delayMs: 150, slashAngle: -0.18 },
        { delayMs: 300, slashAngle: 0.52 },
        { delayMs: 450, slashAngle: 1.18 },
      ].map((d, i) => {
        const outScale = 0.65 + Math.random() * 0.6;
        const backScale = 0.65 + Math.random() * 0.6;
        const sign = i % 2 === 0 ? 1 : -1;
        return {
          ...d,
          outScale: outScale * sign,
          backScale: backScale * -sign,
        };
      }),
    [],
  );

  const compute = useCallback(() => {
    if (!gridContainerRef.current) return null;
    const { width, height, cellWidth, cellHeight } = gridLayoutSize(
      gridContainerRef.current,
    );

    const ax = attackerColRef.current * cellWidth + cellWidth / 2;
    const ay = attackerRowRef.current * cellHeight + cellHeight / 2;
    const tx = targetColRef.current * cellWidth + cellWidth / 2;
    const ty = targetRowRef.current * cellHeight + cellHeight / 2;

    const dx = tx - ax;
    const dy = ty - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bendBase = clamp(dist * 0.18, 10, 36);
    const inv = dist > 0 ? 1 / dist : 0;
    const px = -dy * inv;
    const py = dx * inv;
    const cell = Math.min(cellWidth, cellHeight);
    const standoff = clamp(cell * 0.4, 14, 28);
    const slash = clamp(cell * 0.38, 12, 24);

    return {
      width,
      height,
      ax,
      ay,
      tx,
      ty,
      dx,
      dy,
      bendBase,
      px,
      py,
      standoff,
      slash,
      xBand: cellWidth * 0.35,
      yBand: cellHeight * 0.25,
    };
  }, [gridContainerRef]);

  const syncOverlaySize = useMemo(
    () =>
      createOverlaySizeSync(
        () => gridContainerRef.current,
        (width, height) => {
          const root = rootRef.current;
          const svg = svgRef.current;
          if (root) {
            root.style.width = `${width}px`;
            root.style.height = `${height}px`;
          }
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
      const layout = compute();
      if (!layout) {
        rafRef.current = requestAnimationFrame(paint);
        return;
      }
      syncOverlaySize();

      const {
        ax,
        ay,
        tx,
        ty,
        dx,
        dy,
        bendBase,
        px,
        py,
        standoff,
        slash,
        xBand,
        yBand,
      } = layout;

      drones.forEach((d, i) => {
        const p = cycleP(now, startedAtRef.current, d.delayMs);
        const dirx = Math.cos(d.slashAngle);
        const diry = Math.sin(d.slashAngle);
        const perpx = -diry;
        const perpy = dirx;

        let s1x = perpx * standoff + dirx * slash;
        let s1y = perpy * standoff + diry * slash;
        let s2x = perpx * standoff - dirx * slash;
        let s2y = perpy * standoff - diry * slash;
        if (dx === 0 && dy === 0) {
          const angle = (i / DRONE_COUNT) * Math.PI * 2;
          s1x = Math.cos(angle) * standoff;
          s1y = Math.sin(angle) * slash;
          s2x = Math.cos(angle + Math.PI) * standoff;
          s2y = Math.sin(angle + Math.PI) * slash;
        }

        const m1x = dx * 0.55 + px * bendBase * d.outScale;
        const m1y = dy * 0.55 + py * bendBase * d.outScale;
        const m2x = dx * 0.55 + px * bendBase * d.backScale;
        const m2y = dy * 0.55 + py * bendBase * d.backScale;

        const pos = sampleKeys(
          [
            { at: 0, x: 0, y: 0 },
            { at: 0.2, x: m1x, y: m1y },
            { at: 0.32, x: dx + s1x, y: dy + s1y },
            { at: 0.64, x: dx + s2x, y: dy + s2y },
            { at: 0.68, x: dx + s2x * 0.35, y: dy + s2y * 0.35 },
            { at: 0.82, x: m2x, y: m2y },
            { at: 1, x: 0, y: 0 },
          ],
          p,
        );

        const droneX = ax + pos.x;
        const droneY = ay + pos.y;
        const opacity = droneOpacity(p);
        const droneEl = droneRefs.current[i];
        if (droneEl) {
          droneEl.style.transform = `translate(${droneX - 7}px, ${droneY - 7}px)`;
          droneEl.style.opacity = String(opacity);
        }

        const strength = laserStrength(p) * opacity;
        const slashT = (() => {
          if (p < 0.32) return 0;
          if (p < 0.64) return easeInOut((p - 0.32) / 0.32);
          return 1;
        })();

        const cycle = cycleIndex(now, startedAtRef.current, d.delayMs);
        let tipPath = tipPathsRef.current[i];
        if (!tipPath || tipPath.cycle !== cycle) {
          tipPath = randomTipPath(cycle, xBand, yBand);
          tipPathsRef.current[i] = tipPath;
        }
        const tipX = tx + lerp(tipPath.x0, tipPath.x1, slashT);
        const tipY = clamp(
          ty + lerp(tipPath.y0, tipPath.y1, slashT),
          ty - yBand,
          ty + yBand,
        );

        if (strength <= 0.01) {
          setLine(haloRefs.current[i], droneX, droneY, droneX, droneY);
          setLine(beamRefs.current[i], droneX, droneY, droneX, droneY);
          setLine(coreRefs.current[i], droneX, droneY, droneX, droneY);
          haloRefs.current[i]?.setAttribute("opacity", "0");
          beamRefs.current[i]?.setAttribute("opacity", "0");
          coreRefs.current[i]?.setAttribute("opacity", "0");
          tipGlowRefs.current[i]?.setAttribute("opacity", "0");
          tipCoreRefs.current[i]?.setAttribute("opacity", "0");
          sparkRefs.current[i]?.forEach((spark) => {
            spark?.setAttribute("opacity", "0");
          });
          return;
        }

        setLine(haloRefs.current[i], droneX, droneY, tipX, tipY);
        setLine(beamRefs.current[i], droneX, droneY, tipX, tipY);
        setLine(coreRefs.current[i], droneX, droneY, tipX, tipY);
        haloRefs.current[i]?.setAttribute("opacity", String(0.28 * strength));
        beamRefs.current[i]?.setAttribute("opacity", String(0.9 * strength));
        coreRefs.current[i]?.setAttribute("opacity", String(strength));
        setCircle(tipGlowRefs.current[i], tipX, tipY, 6.5);
        setCircle(tipCoreRefs.current[i], tipX, tipY, 1.8);
        tipGlowRefs.current[i]?.setAttribute("opacity", String(0.45 * strength));
        tipCoreRefs.current[i]?.setAttribute("opacity", String(0.95 * strength));

        const lx = tipX - droneX;
        const ly = tipY - droneY;
        const len = Math.hypot(lx, ly) || 1;
        const nx = -ly / len;
        const ny = lx / len;

        sparkRefs.current[i]?.forEach((spark, si) => {
          if (!spark) return;
          const age = (p * 7 + si * 0.23) % 1;
          const side = si % 2 === 0 ? 1 : -1;
          const reach = 7 + si * 3.2;
          const along = (si % 3) * 0.12;
          const sx = tipX + nx * reach * age * side + lx * along * age;
          const sy = tipY + ny * reach * age * side + ly * along * age;
          const fade = age < 0.12 ? age / 0.12 : 1 - age;
          setCircle(spark, sx, sy, 1.2 + (si % 2) * 0.6);
          spark.setAttribute("opacity", String(Math.max(0, fade) * strength));
        });
      });

      rafRef.current = requestAnimationFrame(paint);
    };

    rafRef.current = requestAnimationFrame(paint);
    return () => {
      ro?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [compute, drones, gridContainerRef, syncOverlaySize]);

  const layout = useMemo(() => compute(), [compute]);
  if (!layout) return null;

  return (
    <div
      ref={rootRef}
      className="absolute pointer-events-none z-60"
      style={{
        left: 0,
        top: 0,
        width: `${layout.width}px`,
        height: `${layout.height}px`,
      }}
    >
      <svg
        ref={svgRef}
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="none"
      >
        {drones.map((_, i) => (
          <g key={`beam-${i}`}>
            <line
              ref={(el) => {
                haloRefs.current[i] = el;
              }}
              stroke={DRONE_ORANGE}
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0"
            />
            <line
              ref={(el) => {
                beamRefs.current[i] = el;
              }}
              stroke={DRONE_ORANGE}
              strokeWidth="2.1"
              strokeLinecap="round"
              opacity="0"
            />
            <line
              ref={(el) => {
                coreRefs.current[i] = el;
              }}
              stroke={CUT_WHITE}
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0"
            />
            <circle
              ref={(el) => {
                tipGlowRefs.current[i] = el;
              }}
              r="6.5"
              fill={DRONE_ORANGE}
              opacity="0"
            />
            <circle
              ref={(el) => {
                tipCoreRefs.current[i] = el;
              }}
              r="1.8"
              fill={CUT_WHITE}
              opacity="0"
            />
            {Array.from({ length: SPARKS_PER_DRONE }, (__, si) => (
              <circle
                key={si}
                ref={(el) => {
                  if (!sparkRefs.current[i]) sparkRefs.current[i] = [];
                  sparkRefs.current[i][si] = el;
                }}
                r="1.4"
                fill={DRONE_CORE}
                opacity="0"
              />
            ))}
          </g>
        ))}
      </svg>
      {drones.map((d, i) => (
        <div
          key={i}
          ref={(el) => {
            droneRefs.current[i] = el;
          }}
          className="attack-drone"
        >
          <svg
            width="14"
            height="14"
            viewBox="-7 -7 14 14"
            style={{ overflow: "visible" }}
          >
            <circle cx="0" cy="0" r="6" fill={DRONE_ORANGE} opacity="0.14" />
            {(
              [
                [-1.2, -1.2, -4.8, -4.8],
                [1.2, -1.2, 4.8, -4.8],
                [-1.2, 1.2, -4.8, 4.8],
                [1.2, 1.2, 4.8, 4.8],
              ] as [number, number, number, number][]
            ).map(([x1, y1, x2, y2], ai) => (
              <line
                key={ai}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={DRONE_ORANGE}
                strokeWidth="0.9"
                opacity="0.9"
              />
            ))}
            {(
              [
                [-4.8, -4.8],
                [4.8, -4.8],
                [-4.8, 4.8],
                [4.8, 4.8],
              ] as [number, number][]
            ).map(([cx, cy], ri) => (
              <g key={ri}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill="none"
                  stroke={DRONE_ORANGE}
                  strokeWidth="0.6"
                  strokeDasharray="2 1.2"
                  opacity="0.8"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${cx} ${cy}`}
                    to={`360 ${cx} ${cy}`}
                    dur="0.28s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={cx} cy={cy} r="0.5" fill={DRONE_CORE} opacity="0.75" />
              </g>
            ))}
            <polygon
              points="0,-2.4 2.4,0 0,2.4 -2.4,0"
              fill={DRONE_ORANGE}
              opacity="0.95"
            />
            <circle cx="0" cy="0" r="0.85" fill={CUT_WHITE} />
            <circle
              cx="0"
              cy="0"
              r="5.5"
              fill="none"
              stroke={DRONE_CORE}
              strokeWidth="0.7"
              strokeDasharray="1.2 2.2"
              className="attack-drone__sparks"
              style={{ animationDelay: `${d.delayMs}ms` }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
});

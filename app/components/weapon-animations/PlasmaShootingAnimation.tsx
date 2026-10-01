"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  PLASMA_IMPACT_DURATION_MS,
  PLASMA_IMPACT_THROTTLE_MS,
  PLASMA_PARTICLE_INTERVAL_MS,
  PLASMA_PARTICLE_SLOTS,
  PLASMA_IMPACT_SLOTS,
} from "../../constants/animationTiming";
import { cellCenterOnGrid, gridLayoutSize } from "./gridLayout";
import { createOverlaySizeSync, setCircle, setHidden } from "./overlayPaint";

interface PlasmaShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

const PLASMA_COLORS = ["#56d6ff", "#6495ED", "#9370DB", "#4169E1", "#00CED1"];
const IMPACT_BLOB_COLORS = ["#56d6ff", "#6495ED", "#9370DB", "#4169E1", "#00CED1", "#b8a0ff", "#ffffff"];
const MAX_BLOBS = 12;

type PlasmaParticle = {
  x: number;
  y: number;
  spread: number;
  size: number;
  color: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startTime: number;
  travelTime: number;
};

type PlasmaImpact = {
  x: number;
  y: number;
  startTime: number;
  coreColor: string;
  blobs: Array<{ angle: number; radius: number; size: number; color: string }>;
};

type ImpactDom = {
  corona: SVGCircleElement | null;
  coreFlash: SVGCircleElement | null;
  core: SVGCircleElement | null;
  blobs: Array<SVGCircleElement | null>;
};

function emptyImpactDom(): ImpactDom {
  return {
    corona: null,
    coreFlash: null,
    core: null,
    blobs: Array.from({ length: MAX_BLOBS }, () => null),
  };
}

export const PlasmaShootingAnimation = React.memo(function PlasmaShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: PlasmaShootingAnimationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const particleRefs = useRef<Array<SVGCircleElement | null>>(
    Array.from({ length: PLASMA_PARTICLE_SLOTS }, () => null),
  );
  const impactGroupRefs = useRef<Array<SVGGElement | null>>(
    Array.from({ length: PLASMA_IMPACT_SLOTS }, () => null),
  );
  const impactDomRefs = useRef<ImpactDom[]>(
    Array.from({ length: PLASMA_IMPACT_SLOTS }, () => emptyImpactDom()),
  );
  const particlesRef = useRef<(PlasmaParticle | null)[]>(
    Array.from({ length: PLASMA_PARTICLE_SLOTS }, () => null),
  );
  const impactsRef = useRef<(PlasmaImpact | null)[]>(
    Array.from({ length: PLASMA_IMPACT_SLOTS }, () => null),
  );
  const lastImpactTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const spawnLayoutRef = useRef<{
    posKey: string;
    cellWidth: number;
    cellHeight: number;
    originX: number;
    originY: number;
    targetX: number;
    targetY: number;
  } | null>(null);
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
    let cancelled = false;

    const refreshSpawnLayout = () => {
      const grid = gridContainerRef.current;
      if (!grid) return null;
      const { cellWidth, cellHeight } = gridLayoutSize(grid);
      const center = cellCenterOnGrid(grid, attackerRowRef.current, attackerColRef.current);
      const targetCenter = cellCenterOnGrid(grid, targetRowRef.current, targetColRef.current);
      const layout = {
        posKey: `${attackerRowRef.current}|${attackerColRef.current}|${targetRowRef.current}|${targetColRef.current}|${facingRightRef.current ? 1 : 0}`,
        cellWidth,
        cellHeight,
        originX: center.x + (facingRightRef.current ? cellWidth * 0.09 : -cellWidth * 0.09),
        originY: center.y - cellHeight * 0.16,
        targetX: targetCenter.x,
        targetY: targetCenter.y,
      };
      spawnLayoutRef.current = layout;
      return layout;
    };

    const spawnParticle = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const posKey = `${attackerRowRef.current}|${attackerColRef.current}|${targetRowRef.current}|${targetColRef.current}|${facingRightRef.current ? 1 : 0}`;
      if (!spawnLayoutRef.current || spawnLayoutRef.current.posKey !== posKey) {
        refreshSpawnLayout();
      }
      const layout = spawnLayoutRef.current;
      if (!layout) return;
      let slot = particlesRef.current.findIndex((p) => p == null);
      if (slot < 0) slot = 0;
      particlesRef.current[slot] = {
        x: layout.originX,
        y: layout.originY,
        spread: (Math.random() - 0.5) * 0.15,
        size: 4 + Math.random() * 4,
        color: PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)],
        targetX: layout.targetX + (Math.random() - 0.5) * layout.cellWidth * 0.5,
        targetY: layout.targetY + (Math.random() - 0.5) * layout.cellHeight * 0.5,
        startX: layout.originX,
        startY: layout.originY,
        startTime: Date.now(),
        travelTime: 0.3 + Math.random() * 0.2,
      };
    };

    const paintImpact = (slot: number, impact: PlasmaImpact, now: number) => {
      const group = impactGroupRefs.current[slot];
      const els = impactDomRefs.current[slot];
      if (!group || !els) return;
      const t = Math.min((now - impact.startTime) / PLASMA_IMPACT_DURATION_MS, 1);
      const spreadT = Math.min(t * 3, 1);
      const spreadEase = 1 - Math.pow(1 - spreadT, 2);
      const coreRadius = Math.min(t * 12, 1) * 13;
      const coreOpacity = Math.pow(1 - t, 0.65);
      setHidden(group, false);
      setCircle(els.corona, impact.x, impact.y, coreRadius * 2.8);
      els.corona?.setAttribute("fill", impact.coreColor);
      els.corona?.setAttribute("opacity", String(coreOpacity * 0.12));
      els.blobs.forEach((node, i) => {
        const blob = impact.blobs[i];
        if (!node) return;
        if (!blob) {
          setHidden(node, true);
          return;
        }
        setHidden(node, false);
        setCircle(
          node,
          impact.x + Math.cos(blob.angle) * blob.radius * spreadEase,
          impact.y + Math.sin(blob.angle) * blob.radius * spreadEase,
          blob.size * (1 + t * 1.1),
        );
        node.setAttribute("fill", blob.color);
        node.setAttribute("opacity", String(Math.pow(1 - t, 0.45)));
      });
      setCircle(els.coreFlash, impact.x, impact.y, coreRadius);
      els.coreFlash?.setAttribute("opacity", String(coreOpacity * 0.55));
      setCircle(els.core, impact.x, impact.y, coreRadius * 0.55);
      els.core?.setAttribute("fill", impact.coreColor);
      els.core?.setAttribute("opacity", String(coreOpacity));
    };

    const addImpact = (x: number, y: number, now: number) => {
      const numBlobs = 8 + Math.floor(Math.random() * 4);
      const impact: PlasmaImpact = {
        x,
        y,
        startTime: now,
        coreColor: PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)],
        blobs: Array.from({ length: numBlobs }, () => ({
          angle: Math.random() * Math.PI * 2,
          radius: 7 + Math.random() * 16,
          size: 2 + Math.random() * 3.5,
          color: IMPACT_BLOB_COLORS[Math.floor(Math.random() * IMPACT_BLOB_COLORS.length)],
        })),
      };
      let slot = impactsRef.current.findIndex((imp) => imp == null);
      if (slot < 0) {
        let oldest = Infinity;
        slot = 0;
        impactsRef.current.forEach((imp, i) => {
          if (imp && imp.startTime < oldest) {
            oldest = imp.startTime;
            slot = i;
          }
        });
      }
      impactsRef.current[slot] = impact;
    };

    spawnParticle();
    const interval = window.setInterval(spawnParticle, PLASMA_PARTICLE_INTERVAL_MS);
    syncOverlaySize();
    refreshSpawnLayout();
    const grid = gridContainerRef.current;
    const ro = grid
      ? new ResizeObserver(() => {
          spawnLayoutRef.current = null;
          refreshSpawnLayout();
          syncOverlaySize();
        })
      : null;
    if (grid && ro) ro.observe(grid);

    const animate = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const now = Date.now();
      let impactThisTick: { x: number; y: number } | null = null;

      for (let i = 0; i < PLASMA_PARTICLE_SLOTS; i++) {
        const particle = particlesRef.current[i];
        const el = particleRefs.current[i];
        if (!particle) {
          setHidden(el, true);
          continue;
        }
        const travelTime = Math.max(particle.travelTime, 1 / 60);
        const progress = Math.min((now - particle.startTime) / 1000 / travelTime, 1);
        if (progress >= 1) {
          if (!impactThisTick && now - lastImpactTimeRef.current > PLASMA_IMPACT_THROTTLE_MS) {
            lastImpactTimeRef.current = now;
            impactThisTick = { x: particle.targetX, y: particle.targetY };
          }
          particlesRef.current[i] = null;
          setHidden(el, true);
          continue;
        }
        const dx = particle.targetX - particle.startX;
        const dy = particle.targetY - particle.startY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const spreadDistance = particle.spread * distance * progress * 0.5;
        particle.x = particle.startX + dx * progress + Math.cos(angle + Math.PI / 2) * spreadDistance;
        particle.y = particle.startY + dy * progress + Math.sin(angle + Math.PI / 2) * spreadDistance;
        if (el) {
          setHidden(el, false);
          setCircle(el, particle.x, particle.y, particle.size);
          el.setAttribute("fill", particle.color);
        }
      }

      if (impactThisTick) {
        addImpact(impactThisTick.x, impactThisTick.y, now);
      }

      for (let i = 0; i < PLASMA_IMPACT_SLOTS; i++) {
        const impact = impactsRef.current[i];
        const group = impactGroupRefs.current[i];
        if (!group) continue;
        if (!impact || now - impact.startTime >= PLASMA_IMPACT_DURATION_MS) {
          impactsRef.current[i] = null;
          setHidden(group, true);
          continue;
        }
        paintImpact(i, impact, now);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      ro?.disconnect();
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gridContainerRef, syncOverlaySize]);

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none z-20"
      style={{ left: 0, top: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="none"
    >
      {Array.from({ length: PLASMA_IMPACT_SLOTS }, (_, slot) => (
        <g
          key={`imp-${slot}`}
          ref={(el) => {
            impactGroupRefs.current[slot] = el;
          }}
          style={{ display: "none" }}
        >
          <circle
            data-pl-corona
            ref={(el) => {
              impactDomRefs.current[slot].corona = el;
            }}
          />
          {Array.from({ length: MAX_BLOBS }, (_, i) => (
            <circle
              key={i}
              data-pl-blob
              style={{ display: "none" }}
              ref={(el) => {
                impactDomRefs.current[slot].blobs[i] = el;
              }}
            />
          ))}
          <circle
            data-pl-core-flash
            fill="#ffffff"
            ref={(el) => {
              impactDomRefs.current[slot].coreFlash = el;
            }}
          />
          <circle
            data-pl-core
            ref={(el) => {
              impactDomRefs.current[slot].core = el;
            }}
          />
        </g>
      ))}
      {Array.from({ length: PLASMA_PARTICLE_SLOTS }, (_, slot) => (
        <circle
          key={`p-${slot}`}
          ref={(el) => {
            particleRefs.current[slot] = el;
          }}
          opacity={1}
          style={{ display: "none" }}
        />
      ))}
    </svg>
  );
});

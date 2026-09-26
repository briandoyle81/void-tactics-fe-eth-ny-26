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
  const particlesRef = useRef<(PlasmaParticle | null)[]>(
    Array.from({ length: PLASMA_PARTICLE_SLOTS }, () => null),
  );
  const impactsRef = useRef<(PlasmaImpact | null)[]>(
    Array.from({ length: PLASMA_IMPACT_SLOTS }, () => null),
  );
  const lastImpactTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
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
    const spawnParticle = () => {
      const grid = gridContainerRef.current;
      if (!grid) return;
      const { cellWidth, cellHeight } = gridLayoutSize(grid);
      const center = cellCenterOnGrid(grid, attackerRowRef.current, attackerColRef.current);
      const origin = {
        x: center.x + (facingRightRef.current ? cellWidth * 0.09 : -cellWidth * 0.09),
        y: center.y - cellHeight * 0.16,
      };
      const targetCenter = cellCenterOnGrid(grid, targetRowRef.current, targetColRef.current);
      let slot = particlesRef.current.findIndex((p) => p == null);
      if (slot < 0) slot = 0;
      particlesRef.current[slot] = {
        x: origin.x,
        y: origin.y,
        spread: (Math.random() - 0.5) * 0.15,
        size: 4 + Math.random() * 4,
        color: PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)],
        targetX: targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5,
        targetY: targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5,
        startX: origin.x,
        startY: origin.y,
        startTime: Date.now(),
        travelTime: 0.3 + Math.random() * 0.2,
      };
    };

    const paintImpact = (group: SVGGElement, impact: PlasmaImpact, now: number) => {
      const t = Math.min((now - impact.startTime) / PLASMA_IMPACT_DURATION_MS, 1);
      const spreadT = Math.min(t * 3, 1);
      const spreadEase = 1 - Math.pow(1 - spreadT, 2);
      const coreRadius = Math.min(t * 12, 1) * 13;
      const coreOpacity = Math.pow(1 - t, 0.65);
      setHidden(group, false);
      const corona = group.querySelector("[data-pl-corona]") as SVGCircleElement | null;
      const coreFlash = group.querySelector("[data-pl-core-flash]") as SVGCircleElement | null;
      const core = group.querySelector("[data-pl-core]") as SVGCircleElement | null;
      const blobs = group.querySelectorAll("[data-pl-blob]");
      setCircle(corona, impact.x, impact.y, coreRadius * 2.8);
      corona?.setAttribute("fill", impact.coreColor);
      corona?.setAttribute("opacity", String(coreOpacity * 0.12));
      blobs.forEach((node, i) => {
        const blob = impact.blobs[i];
        if (!blob) {
          setHidden(node, true);
          return;
        }
        setHidden(node, false);
        setCircle(
          node as SVGCircleElement,
          impact.x + Math.cos(blob.angle) * blob.radius * spreadEase,
          impact.y + Math.sin(blob.angle) * blob.radius * spreadEase,
          blob.size * (1 + t * 1.1),
        );
        (node as SVGCircleElement).setAttribute("fill", blob.color);
        (node as SVGCircleElement).setAttribute("opacity", String(Math.pow(1 - t, 0.45)));
      });
      setCircle(coreFlash, impact.x, impact.y, coreRadius);
      coreFlash?.setAttribute("opacity", String(coreOpacity * 0.55));
      setCircle(core, impact.x, impact.y, coreRadius * 0.55);
      core?.setAttribute("fill", impact.coreColor);
      core?.setAttribute("opacity", String(coreOpacity));
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
    const ro = gridContainerRef.current
      ? new ResizeObserver(() => syncOverlaySize())
      : null;
    if (gridContainerRef.current && ro) ro.observe(gridContainerRef.current);

    const animate = () => {
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
        paintImpact(group, impact, now);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      window.clearInterval(interval);
      ro?.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gridContainerRef, attackerRow, attackerCol, targetRow, targetCol, facingRight, syncOverlaySize]);

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
          <circle data-pl-corona />
          {Array.from({ length: MAX_BLOBS }, (_, i) => (
            <circle key={i} data-pl-blob style={{ display: "none" }} />
          ))}
          <circle data-pl-core-flash fill="#ffffff" />
          <circle data-pl-core />
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

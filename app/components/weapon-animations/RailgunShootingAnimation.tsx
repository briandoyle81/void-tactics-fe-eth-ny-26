"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import {
  RAILGUN_IMPACT_DURATION_MS,
  RAILGUN_FLASH_DURATION_MS,
  RAILGUN_PEN_DURATION_MS,
  RAILGUN_MUZZLE_FADEOUT_MS,
  RAILGUN_RESPAWN_DELAY_MS,
  RAILGUN_IMPACT_SLOTS,
} from "../../constants/animationTiming";
import { cellCenterOnGrid, gridLayoutSize } from "./gridLayout";
import { createOverlaySizeSync, setCircle, setHidden, setLine, startCancelledRaf } from "./overlayPaint";

interface RailgunShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
  /** Variant 2 is the Linear Accelerator: same shot family, bigger and slower. */
  variant?: number;
}

const SPALL_SPREAD = (48 * Math.PI) / 180;
const MAX_SPALL = 22;

type RailgunProjectile = {
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startTime: number;
  travelTime: number;
};

type RailgunImpact = {
  x: number;
  y: number;
  startTime: number;
  boltAngle: number;
  surfaceHit: boolean;
  spall: Array<{ angle: number; speed: number; size: number; color: string }>;
};

function spallColor(normSpread: number): string {
  if (normSpread < 0.3) return ["#ffffff", "#e8f8ff", "#56d6ff"][Math.floor(Math.random() * 3)];
  if (normSpread < 0.65) return ["#ffe866", "#ffcc22", "#ffaa00"][Math.floor(Math.random() * 3)];
  return ["#ff8800", "#ff5500", "#cc3300"][Math.floor(Math.random() * 3)];
}

function buildRailgunImpact(
  projectile: RailgunProjectile,
  now: number,
  surfaceHit: boolean,
  projectileScale: number,
): RailgunImpact {
  const boltAngle = Math.atan2(
    projectile.targetY - projectile.startY,
    projectile.targetX - projectile.startX,
  );
  const numSpall = (surfaceHit ? 15 : 13) + Math.floor(Math.random() * 6);
  const back = boltAngle + Math.PI;
  const spall = Array.from({ length: numSpall }, (_, i) => {
    const isChunk = i < (surfaceHit ? 6 : 4);
    if (surfaceHit) {
      const rawSpread = (Math.random() * 2 - 1) * Math.PI * 0.72;
      return {
        angle: back + rawSpread,
        speed: isChunk ? 28 + Math.random() * 36 : 55 + Math.random() * 70,
        size:
          (isChunk ? 2.6 + Math.random() * 2.0 : 0.9 + Math.random() * 1.5) *
          projectileScale,
        color: spallColor(Math.abs(rawSpread) / (Math.PI * 0.72)),
      };
    }
    const rawSpread = (Math.random() * 2 - 1) * SPALL_SPREAD * (isChunk ? 0.55 : 1);
    return {
      angle: boltAngle + rawSpread,
      speed: isChunk ? 55 + Math.random() * 55 : 110 + Math.random() * 130,
      size:
        (isChunk ? 2.2 + Math.random() * 1.6 : 0.7 + Math.random() * 1.4) *
        projectileScale,
      color: spallColor(Math.abs(rawSpread) / SPALL_SPREAD),
    };
  });
  return {
    x: projectile.targetX,
    y: projectile.targetY,
    startTime: now,
    boltAngle,
    surfaceHit,
    spall,
  };
}

type RailgunImpactDom = {
  surface: SVGGElement | null;
  penetrate: SVGGElement | null;
  crush: SVGLineElement | null;
  bloom: SVGCircleElement | null;
  bloomCore: SVGCircleElement | null;
  ring: SVGCircleElement | null;
  penLine: SVGLineElement | null;
  entryGlow: SVGCircleElement | null;
  entryCore: SVGCircleElement | null;
  spallLines: SVGLineElement[];
};

function bindRailgunImpactDom(group: SVGGElement): RailgunImpactDom {
  return {
    surface: group.querySelector("[data-rg-surface]"),
    penetrate: group.querySelector("[data-rg-penetrate]"),
    crush: group.querySelector("[data-rg-crush]"),
    bloom: group.querySelector("[data-rg-bloom]"),
    bloomCore: group.querySelector("[data-rg-bloom-core]"),
    ring: group.querySelector("[data-rg-ring]"),
    penLine: group.querySelector("[data-rg-pen]"),
    entryGlow: group.querySelector("[data-rg-entry-glow]"),
    entryCore: group.querySelector("[data-rg-entry-core]"),
    spallLines: Array.from(group.querySelectorAll("[data-rg-spall]")),
  };
}

export const RailgunShootingAnimation = React.memo(function RailgunShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
  variant = 1,
}: RailgunShootingAnimationProps) {
  const isLinearAccelerator = Number(variant) === 2;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const muzzleLayerRef = useRef<HTMLDivElement | null>(null);
  const muzzleRef = useRef<HTMLDivElement | null>(null);
  const gradientRef = useRef<SVGLinearGradientElement | null>(null);
  const projectileGroupRef = useRef<SVGGElement | null>(null);
  const trailRef = useRef<SVGLineElement | null>(null);
  const slugGlowRef = useRef<SVGLineElement | null>(null);
  const slugCoreRef = useRef<SVGLineElement | null>(null);
  const tipGlowRef = useRef<SVGCircleElement | null>(null);
  const tipCoreRef = useRef<SVGCircleElement | null>(null);
  const impactGroupRefs = useRef<Array<SVGGElement | null>>(
    Array.from({ length: RAILGUN_IMPACT_SLOTS }, () => null),
  );
  const impactDomRefs = useRef<(RailgunImpactDom | null)[]>(
    Array.from({ length: RAILGUN_IMPACT_SLOTS }, () => null),
  );
  const layoutCacheRef = useRef<{
    posKey: string;
    cellWidth: number;
    cellHeight: number;
    originX: number;
    originY: number;
    targetCX: number;
    targetCY: number;
  } | null>(null);

  const projectileRef = useRef<RailgunProjectile | null>(null);
  const impactsRef = useRef<(RailgunImpact | null)[]>(
    Array.from({ length: RAILGUN_IMPACT_SLOTS }, () => null),
  );
  const respawnAtRef = useRef(0);
  const muzzleUntilRef = useRef(0);
  const hasFiredRef = useRef("");
  const instanceId = useRef(Math.random().toString(36).slice(2));
  const spawnRef = useRef<() => void>(() => {});
  const isLinearAcceleratorRef = useRef(isLinearAccelerator);
  const projectileScaleRef = useRef(isLinearAccelerator ? 2.2 : 1);
  const speedCellsPerSecRef = useRef(isLinearAccelerator ? 3.5 : 8);
  const facingRightRef = useRef(facingRight);
  const attackerRowRef = useRef(attackerRow);
  const attackerColRef = useRef(attackerCol);
  const targetRowRef = useRef(targetRow);
  const targetColRef = useRef(targetCol);
  isLinearAcceleratorRef.current = isLinearAccelerator;
  projectileScaleRef.current = isLinearAccelerator ? 2.2 : 1;
  speedCellsPerSecRef.current = isLinearAccelerator ? 3.5 : 8;
  facingRightRef.current = facingRight;
  attackerRowRef.current = attackerRow;
  attackerColRef.current = attackerCol;
  targetRowRef.current = targetRow;
  targetColRef.current = targetCol;

  const syncOverlaySize = useMemo(
    () =>
      createOverlaySizeSync(
        () => gridContainerRef.current,
        (width, height) => {
          const svg = svgRef.current;
          const muzzleLayer = muzzleLayerRef.current;
          if (!svg) return;
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          svg.style.width = `${width}px`;
          svg.style.height = `${height}px`;
          if (muzzleLayer) {
            muzzleLayer.style.width = `${width}px`;
            muzzleLayer.style.height = `${height}px`;
          }
        },
      ),
    [gridContainerRef],
  );

  const paintProjectile = useCallback((p: RailgunProjectile) => {
    const scale = projectileScaleRef.current;
    const isLA = isLinearAcceleratorRef.current;
    const rad = (p.angle * Math.PI) / 180;
    const slugLen = isLA ? 18 : 0;
    const slugTailX = p.x - Math.cos(rad) * slugLen;
    const slugTailY = p.y - Math.sin(rad) * slugLen;

    setHidden(projectileGroupRef.current, false);
    gradientRef.current?.setAttribute("x1", String(p.startX));
    gradientRef.current?.setAttribute("y1", String(p.startY));
    gradientRef.current?.setAttribute("x2", String(p.x));
    gradientRef.current?.setAttribute("y2", String(p.y));
    setLine(trailRef.current, p.startX, p.startY, p.x, p.y);
    trailRef.current?.setAttribute("stroke-width", String(3 * scale));
    setHidden(slugGlowRef.current, !isLA);
    setHidden(slugCoreRef.current, !isLA);
    if (isLA) {
      setLine(slugGlowRef.current, slugTailX, slugTailY, p.x, p.y);
      setLine(slugCoreRef.current, slugTailX, slugTailY, p.x, p.y);
      slugGlowRef.current?.setAttribute("stroke-width", String(5.5 * scale));
      slugCoreRef.current?.setAttribute("stroke-width", String(3.2 * scale));
    }
    setCircle(tipGlowRef.current, p.x, p.y, 5 * scale);
    setCircle(tipCoreRef.current, p.x, p.y, 2.5 * scale);
  }, []);

  const paintImpact = useCallback((slot: number, impact: RailgunImpact, now: number) => {
    const group = impactGroupRefs.current[slot];
    if (!group) return;
    let els = impactDomRefs.current[slot];
    if (!els) {
      els = bindRailgunImpactDom(group);
      impactDomRefs.current[slot] = els;
    }
    const scale = projectileScaleRef.current;
    const elapsed = now - impact.startTime;
    const elapsedSec = elapsed / 1000;
    const flashT = Math.max(0, 1 - elapsed / RAILGUN_FLASH_DURATION_MS);
    const flashRadius = (1 - flashT) * 16 * scale;
    const flashOpacity = flashT;
    const penT = Math.max(0, 1 - elapsed / RAILGUN_PEN_DURATION_MS);
    const t = Math.min(elapsed / RAILGUN_IMPACT_DURATION_MS, 1);
    const spallOpacity = Math.max(0, 1 - t);
    const easeOut = 1 - Math.pow(1 - t, 2);
    const cos = Math.cos(impact.boltAngle);
    const sin = Math.sin(impact.boltAngle);

    const {
      surface,
      penetrate,
      crush,
      bloom,
      bloomCore,
      ring,
      penLine,
      entryGlow,
      entryCore,
      spallLines,
    } = els;

    setHidden(group, false);
    setHidden(surface, !impact.surfaceHit);
    setHidden(penetrate, impact.surfaceHit);

    if (impact.surfaceHit) {
      setLine(
        crush,
        impact.x - cos * 12 * scale,
        impact.y - sin * 12 * scale,
        impact.x,
        impact.y,
      );
      crush?.setAttribute("stroke-width", String(4.5 * scale));
      crush?.setAttribute("opacity", String(flashOpacity * 0.9));
      setCircle(bloom, impact.x, impact.y, flashRadius * 2.1);
      bloom?.setAttribute("opacity", String(flashOpacity * 0.22));
      setCircle(bloomCore, impact.x, impact.y, flashRadius * 1.15);
      bloomCore?.setAttribute("opacity", String(flashOpacity * 0.85));
      setCircle(ring, impact.x, impact.y, easeOut * 22 * scale);
      ring?.setAttribute("stroke-width", String(Math.max(0.6, 2.8 * scale * (1 - t))));
      ring?.setAttribute("opacity", String(Math.max(0, 1 - t * 1.7) * 0.75));
    } else {
      setLine(
        penLine,
        impact.x - cos * 9 * scale,
        impact.y - sin * 9 * scale,
        impact.x + cos * 14 * scale,
        impact.y + sin * 14 * scale,
      );
      penLine?.setAttribute("stroke-width", String(3.5 * scale));
      penLine?.setAttribute("opacity", String(penT * 0.85));
      setCircle(entryGlow, impact.x, impact.y, flashRadius * 1.8);
      entryGlow?.setAttribute("opacity", String(flashOpacity * 0.25));
      setCircle(entryCore, impact.x, impact.y, flashRadius);
      entryCore?.setAttribute("opacity", String(flashOpacity * 0.9));
    }

    spallLines.forEach((line, i) => {
      const piece = impact.spall[i];
      if (!piece) {
        setHidden(line, true);
        return;
      }
      const dist = piece.speed * elapsedSec;
      const px = impact.x + Math.cos(piece.angle) * dist;
      const py = impact.y + Math.sin(piece.angle) * dist;
      const trailLen = Math.min(piece.speed * (impact.surfaceHit ? 0.025 : 0.04), dist);
      setHidden(line, false);
      setLine(
        line,
        px - Math.cos(piece.angle) * trailLen,
        py - Math.sin(piece.angle) * trailLen,
        px,
        py,
      );
      line.setAttribute("stroke", piece.color);
      line.setAttribute("stroke-width", String(piece.size));
      line.setAttribute("opacity", String(spallOpacity));
    });
  }, []);

  const showMuzzle = useCallback((x: number, y: number, now: number) => {
    const el = muzzleRef.current;
    if (!el) return;
    const size = Math.round(26 * (isLinearAcceleratorRef.current ? 1.45 : 1));
    el.style.left = `${x - size / 2}px`;
    el.style.top = `${y - size / 2}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.classList.remove("railgun-muzzle-flash");
    setHidden(el, false);
    void el.offsetWidth;
    el.classList.add("railgun-muzzle-flash");
    muzzleUntilRef.current = now + RAILGUN_MUZZLE_FADEOUT_MS;
  }, []);

  const spawnProjectile = useCallback(() => {
    const grid = gridContainerRef.current;
    if (!grid || projectileRef.current) return;

    const posKey = `${attackerRowRef.current}|${attackerColRef.current}|${targetRowRef.current}|${targetColRef.current}|${facingRightRef.current ? 1 : 0}`;
    let layout = layoutCacheRef.current;
    if (!layout || layout.posKey !== posKey) {
      const center = cellCenterOnGrid(grid, attackerRowRef.current, attackerColRef.current);
      const { cellWidth, cellHeight } = gridLayoutSize(grid);
      const targetCenter = cellCenterOnGrid(grid, targetRowRef.current, targetColRef.current);
      const forward = cellWidth * (0.30 + (isLinearAcceleratorRef.current ? 0.14 : 0));
      layout = {
        posKey,
        cellWidth,
        cellHeight,
        originX: center.x + (facingRightRef.current ? forward : -forward),
        originY: center.y - cellHeight * 0.15,
        targetCX: targetCenter.x,
        targetCY: targetCenter.y,
      };
      layoutCacheRef.current = layout;
    }
    const attackerCenter = { x: layout.originX, y: layout.originY };
    const targetX = layout.targetCX + (Math.random() - 0.5) * layout.cellWidth * 0.5;
    const targetY = layout.targetCY + (Math.random() - 0.5) * layout.cellHeight * 0.5;
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const avgCellSize = (layout.cellWidth + layout.cellHeight) / 2;
    const SPEED = avgCellSize * speedCellsPerSecRef.current;
    const travelTime = Math.max(distance, avgCellSize * 0.12) / Math.max(SPEED, 1);
    const now = Date.now();

    const projectile: RailgunProjectile = {
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: attackerCenter.y,
      startTime: now,
      travelTime,
    };
    projectileRef.current = projectile;
    respawnAtRef.current = 0;
    syncOverlaySize();
    paintProjectile(projectile);
    showMuzzle(attackerCenter.x, attackerCenter.y, now);
  }, [gridContainerRef, paintProjectile, showMuzzle, syncOverlaySize]);

  spawnRef.current = spawnProjectile;

  useEffect(() => {
    const grid = gridContainerRef.current;
    const ro = grid ? new ResizeObserver(() => {
      layoutCacheRef.current = null;
      syncOverlaySize();
    }) : null;
    if (grid && ro) ro.observe(grid);
    syncOverlaySize();

    const animate = () => {
      const now = Date.now();

      const flying = projectileRef.current;
      if (flying) {
        const travelTime = Math.max(flying.travelTime, 1 / 60);
        const progress = Math.min((now - flying.startTime) / 1000 / travelTime, 1);
        if (progress >= 1) {
          const impact = buildRailgunImpact(
            flying,
            now,
            isLinearAcceleratorRef.current,
            projectileScaleRef.current,
          );
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
          projectileRef.current = null;
          setHidden(projectileGroupRef.current, true);
          respawnAtRef.current = now + RAILGUN_RESPAWN_DELAY_MS;
        } else {
          flying.x = flying.startX + (flying.targetX - flying.startX) * progress;
          flying.y = flying.startY + (flying.targetY - flying.startY) * progress;
          flying.angle =
            Math.atan2(flying.targetY - flying.y, flying.targetX - flying.x) *
            (180 / Math.PI);
          paintProjectile(flying);
        }
      } else if (respawnAtRef.current > 0 && now >= respawnAtRef.current) {
        spawnRef.current();
      }

      for (let i = 0; i < RAILGUN_IMPACT_SLOTS; i++) {
        const impact = impactsRef.current[i];
        const group = impactGroupRefs.current[i];
        if (!group) continue;
        if (!impact || now - impact.startTime >= RAILGUN_IMPACT_DURATION_MS) {
          impactsRef.current[i] = null;
          setHidden(group, true);
          continue;
        }
        paintImpact(i, impact, now);
      }

      if (muzzleUntilRef.current > 0 && now >= muzzleUntilRef.current) {
        setHidden(muzzleRef.current, true);
        muzzleUntilRef.current = 0;
      }
    };

    const stopRaf = startCancelledRaf(animate);
    return () => {
      stopRaf();
      ro?.disconnect();
    };
  }, [gridContainerRef, paintImpact, paintProjectile, syncOverlaySize]);

  useEffect(() => {
    const attackKey = `${attackerRow}-${attackerCol}-${targetRow}-${targetCol}-${variant}`;
    if (hasFiredRef.current === attackKey) return;
    hasFiredRef.current = attackKey;
    projectileRef.current = null;
    impactsRef.current = Array.from({ length: RAILGUN_IMPACT_SLOTS }, () => null);
    respawnAtRef.current = 0;
    setHidden(projectileGroupRef.current, true);
    for (const group of impactGroupRefs.current) setHidden(group, true);
    spawnProjectile();
  }, [attackerRow, attackerCol, targetRow, targetCol, variant, spawnProjectile]);

  const trailId = `rg-trail-${instanceId.current}`;

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient ref={gradientRef} id={trailId} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#56d6ff" stopOpacity="0" />
            <stop offset="60%" stopColor="#56d6ff" stopOpacity="0.45" />
            <stop offset="90%" stopColor="#56d6ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>

        {Array.from({ length: RAILGUN_IMPACT_SLOTS }, (_, slot) => (
          <g
            key={slot}
            ref={(el) => {
              impactGroupRefs.current[slot] = el;
            }}
            style={{ display: "none" }}
          >
            <g data-rg-surface style={{ display: "none" }}>
              <line data-rg-crush stroke="#56d6ff" strokeLinecap="round" />
              <circle data-rg-bloom fill="#56d6ff" />
              <circle data-rg-bloom-core fill="#ffffff" />
              <circle data-rg-ring fill="none" stroke="#56d6ff" />
            </g>
            <g data-rg-penetrate style={{ display: "none" }}>
              <line data-rg-pen stroke="#56d6ff" strokeLinecap="round" />
              <circle data-rg-entry-glow fill="#56d6ff" />
              <circle data-rg-entry-core fill="#ffffff" />
            </g>
            {Array.from({ length: MAX_SPALL }, (_, i) => (
              <line key={i} data-rg-spall strokeLinecap="round" style={{ display: "none" }} />
            ))}
          </g>
        ))}

        <g ref={projectileGroupRef} style={{ display: "none" }}>
          <line ref={trailRef} stroke={`url(#${trailId})`} strokeLinecap="round" />
          <line
            ref={slugGlowRef}
            stroke="#56d6ff"
            strokeLinecap="round"
            opacity={0.35}
            style={{ display: "none" }}
          />
          <line
            ref={slugCoreRef}
            stroke="#ffffff"
            strokeLinecap="round"
            opacity={0.95}
            style={{ display: "none" }}
          />
          <circle ref={tipGlowRef} fill="#56d6ff" opacity={0.3} />
          <circle ref={tipCoreRef} fill="#ffffff" />
        </g>
      </svg>

      <div
        ref={muzzleLayerRef}
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
      >
        <div ref={muzzleRef} className="railgun-muzzle-flash" style={{ display: "none" }} />
      </div>
    </>
  );
});

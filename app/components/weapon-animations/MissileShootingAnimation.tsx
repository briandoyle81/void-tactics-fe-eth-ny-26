"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  MISSILE_IMPACT_DURATION_MS,
  MISSILE_SECOND_FIRE_DELAY_MS,
  MISSILE_RESPAWN_DELAY_MS,
  MISSILE_SLOTS,
  MISSILE_IMPACT_SLOTS,
  TORPEDO_SPEED_SCALE,
  TORPEDO_IMPACT_DURATION_MS,
} from "../../constants/animationTiming";
import { cellCenterOnGrid, gridLayoutSize } from "./gridLayout";
import { createOverlaySizeSync, setCircle, setHidden, startCancelledRaf } from "./overlayPaint";

interface MissileShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
  /** Variant 2 is the Torpedo Launcher: one slower oval, ring shockwave. */
  variant?: number;
}

const IMPACT_COLORS = ["#ff4400", "#ff8800", "#ffcc00", "#ffffff", "#ff6600"];
const TRIANGLE_SIZE = 8;
const TRIANGLE_HEIGHT = 12;
const OVAL_RX = 11;
const OVAL_RY = 5.5;
const MAX_TRAIL = 10;
const MAX_DEBRIS = 10;

type Missile = {
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  spawnX: number;
  spawnY: number;
  driftStartTime: number;
  trail: { x: number; y: number }[];
};

type MissileImpact = {
  x: number;
  y: number;
  startTime: number;
  shockwave: boolean;
  particles: Array<{ angle: number; speed: number; size: number; color: string }>;
};

function makeMissile(
  attackerCenter: { x: number; y: number },
  targetX: number,
  targetY: number,
  startSpeed: number,
  driftTime: number,
): Missile {
  const dx = targetX - attackerCenter.x;
  const dy = targetY - attackerCenter.y;
  const targetAngle = Math.atan2(dy, dx);
  const angleVariation = (Math.random() - 0.5) * ((30 * Math.PI) / 180);
  const initialAngle = targetAngle + Math.PI / 2 + angleVariation;
  const driftDistance = startSpeed * driftTime;
  const driftX = attackerCenter.x + Math.cos(initialAngle) * driftDistance;
  const driftY = attackerCenter.y + Math.sin(initialAngle) * driftDistance;
  return {
    x: attackerCenter.x,
    y: attackerCenter.y,
    angle: Math.atan2(dy, dx) * (180 / Math.PI) + 90,
    targetX,
    targetY,
    startX: driftX,
    startY: driftY,
    spawnX: attackerCenter.x,
    spawnY: attackerCenter.y,
    driftStartTime: Date.now(),
    trail: [],
  };
}

function stepMissile(
  missile: Missile,
  now: number,
  topSpeed: number,
  startSpeed: number,
): { x: number; y: number; angle: number } | null {
  const INITIAL_DRIFT_TIME = 0.5;
  const ACCELERATION_TIME = 0.125;
  const ACCELERATION = (topSpeed - startSpeed) / ACCELERATION_TIME;
  const targetDx = missile.targetX - missile.spawnX;
  const targetDy = missile.targetY - missile.spawnY;
  const targetAngle = Math.atan2(targetDy, targetDx);
  const initialAngle = targetAngle + Math.PI / 2;
  const dx = missile.targetX - missile.startX;
  const dy = missile.targetY - missile.startY;
  const totalDistance = Math.sqrt(dx * dx + dy * dy);
  const accelerationDistance =
    startSpeed * ACCELERATION_TIME +
    0.5 * ACCELERATION * ACCELERATION_TIME * ACCELERATION_TIME;
  const reachesTargetDuringAccel = accelerationDistance >= totalDistance;
  const totalElapsed = (now - missile.driftStartTime) / 1000;
  const accelerationElapsed = totalElapsed - INITIAL_DRIFT_TIME;
  const angleDx = missile.targetX - (missile.x || missile.spawnX);
  const angleDy = missile.targetY - (missile.y || missile.spawnY);
  const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI) + 90;

  let currentX: number;
  let currentY: number;
  if (totalDistance < 0.5) {
    currentX = missile.targetX;
    currentY = missile.targetY;
  } else if (totalElapsed < INITIAL_DRIFT_TIME) {
    const driftDistance = startSpeed * totalElapsed;
    currentX = missile.spawnX + Math.cos(initialAngle) * driftDistance;
    currentY = missile.spawnY + Math.sin(initialAngle) * driftDistance;
  } else if (accelerationElapsed >= 0) {
    let distanceTraveled = 0;
    if (reachesTargetDuringAccel) {
      const a = 0.5 * ACCELERATION;
      const b = startSpeed;
      const c = -totalDistance;
      const discriminant = b * b - 4 * a * c;
      const timeToTarget = (-b + Math.sqrt(discriminant)) / (2 * a);
      distanceTraveled =
        accelerationElapsed < timeToTarget
          ? startSpeed * accelerationElapsed +
            0.5 * ACCELERATION * accelerationElapsed * accelerationElapsed
          : totalDistance;
    } else if (accelerationElapsed < ACCELERATION_TIME) {
      distanceTraveled =
        startSpeed * accelerationElapsed +
        0.5 * ACCELERATION * accelerationElapsed * accelerationElapsed;
    } else {
      const remainingDistance = totalDistance - accelerationDistance;
      const constantSpeedTime = remainingDistance / topSpeed;
      const timeInConstantPhase = accelerationElapsed - ACCELERATION_TIME;
      distanceTraveled =
        timeInConstantPhase < constantSpeedTime
          ? accelerationDistance + topSpeed * timeInConstantPhase
          : totalDistance;
    }
    const progress = Math.min(distanceTraveled / totalDistance, 1);
    currentX = missile.startX + (missile.targetX - missile.startX) * progress;
    currentY = missile.startY + (missile.targetY - missile.startY) * progress;
  } else {
    currentX = missile.x;
    currentY = missile.y;
  }

  const distanceToTarget = Math.hypot(currentX - missile.targetX, currentY - missile.targetY);
  if (distanceToTarget <= 0.1) return null;
  return { x: currentX, y: currentY, angle };
}

type MissileDom = {
  glow: SVGCircleElement | null;
  triangle: SVGPolygonElement | null;
  oval: SVGEllipseElement | null;
  trailDots: SVGCircleElement[];
};

type MissileImpactDom = {
  inner: SVGCircleElement | null;
  flash: SVGCircleElement | null;
  ring: SVGCircleElement | null;
  shockA: SVGCircleElement | null;
  shockB: SVGCircleElement | null;
  debris: SVGCircleElement[];
};

function bindMissileDom(group: SVGGElement): MissileDom {
  return {
    glow: group.querySelector("[data-ms-glow]"),
    triangle: group.querySelector("[data-ms-body]"),
    oval: group.querySelector("[data-ms-oval]"),
    trailDots: Array.from(group.querySelectorAll("[data-ms-trail]")),
  };
}

function bindMissileImpactDom(group: SVGGElement): MissileImpactDom {
  return {
    inner: group.querySelector("[data-ms-inner]"),
    flash: group.querySelector("[data-ms-flash]"),
    ring: group.querySelector("[data-ms-ring]"),
    shockA: group.querySelector("[data-ms-shock-a]"),
    shockB: group.querySelector("[data-ms-shock-b]"),
    debris: Array.from(group.querySelectorAll("[data-ms-debris]")),
  };
}

export const MissileShootingAnimation = React.memo(function MissileShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
  variant = 1,
}: MissileShootingAnimationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const missileGroupRefs = useRef<Array<SVGGElement | null>>(
    Array.from({ length: MISSILE_SLOTS }, () => null),
  );
  const impactGroupRefs = useRef<Array<SVGGElement | null>>(
    Array.from({ length: MISSILE_IMPACT_SLOTS }, () => null),
  );
  const missilesRef = useRef<(Missile | null)[]>(
    Array.from({ length: MISSILE_SLOTS }, () => null),
  );
  const impactsRef = useRef<(MissileImpact | null)[]>(
    Array.from({ length: MISSILE_IMPACT_SLOTS }, () => null),
  );
  const missileDomRefs = useRef<(MissileDom | null)[]>(
    Array.from({ length: MISSILE_SLOTS }, () => null),
  );
  const impactDomRefs = useRef<(MissileImpactDom | null)[]>(
    Array.from({ length: MISSILE_IMPACT_SLOTS }, () => null),
  );
  const layoutCacheRef = useRef<{
    posKey: string;
    cellWidth: number;
    cellHeight: number;
    avgCellSize: number;
    originX: number;
    originY: number;
    targetCX: number;
    targetCY: number;
  } | null>(null);
  const secondAtRef = useRef(0);
  const respawnAtRef = useRef(0);
  const attackerRowRef = useRef(attackerRow);
  const attackerColRef = useRef(attackerCol);
  const targetRowRef = useRef(targetRow);
  const targetColRef = useRef(targetCol);
  const facingRightRef = useRef(facingRight);
  const isTorpedoRef = useRef(Number(variant) === 2);
  attackerRowRef.current = attackerRow;
  attackerColRef.current = attackerCol;
  targetRowRef.current = targetRow;
  targetColRef.current = targetCol;
  facingRightRef.current = facingRight;
  isTorpedoRef.current = Number(variant) === 2;

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
    const refreshLayout = () => {
      const grid = gridContainerRef.current;
      if (!grid) return null;
      const { cellWidth, cellHeight } = gridLayoutSize(grid);
      const center = cellCenterOnGrid(grid, attackerRowRef.current, attackerColRef.current);
      const targetCenter = cellCenterOnGrid(grid, targetRowRef.current, targetColRef.current);
      const layout = {
        posKey: `${attackerRowRef.current}|${attackerColRef.current}|${targetRowRef.current}|${targetColRef.current}|${facingRightRef.current ? 1 : 0}`,
        cellWidth,
        cellHeight,
        avgCellSize: (cellWidth + cellHeight) / 2,
        originX: center.x + (facingRightRef.current ? cellWidth * 0.11 : -cellWidth * 0.11),
        originY: center.y - cellHeight * 0.16,
        targetCX: targetCenter.x,
        targetCY: targetCenter.y,
      };
      layoutCacheRef.current = layout;
      return layout;
    };
    const ensureLayout = () => {
      const posKey = `${attackerRowRef.current}|${attackerColRef.current}|${targetRowRef.current}|${targetColRef.current}|${facingRightRef.current ? 1 : 0}`;
      if (!layoutCacheRef.current || layoutCacheRef.current.posKey !== posKey) {
        return refreshLayout();
      }
      return layoutCacheRef.current;
    };

    const spawnOne = (slot: number) => {
      const layout = ensureLayout();
      if (!layout) return;
      const speedScale = isTorpedoRef.current ? TORPEDO_SPEED_SCALE : 1;
      const startSpeed = (layout.avgCellSize * 4 * speedScale) / 8;
      const origin = { x: layout.originX, y: layout.originY };
      const targetX = layout.targetCX + (Math.random() - 0.5) * layout.cellWidth * 0.5;
      const targetY = layout.targetCY + (Math.random() - 0.5) * layout.cellHeight * 0.5;
      missilesRef.current[slot] = makeMissile(origin, targetX, targetY, startSpeed, 0.5);
    };

    const spawnVolley = () => {
      missilesRef.current = Array.from({ length: MISSILE_SLOTS }, () => null);
      spawnOne(0);
      secondAtRef.current = isTorpedoRef.current
        ? 0
        : Date.now() + MISSILE_SECOND_FIRE_DELAY_MS;
      respawnAtRef.current = 0;
      syncOverlaySize();
    };

    const paintMissile = (slot: number, missile: Missile) => {
      const group = missileGroupRefs.current[slot];
      if (!group) return;
      let els = missileDomRefs.current[slot];
      if (!els) {
        els = bindMissileDom(group);
        missileDomRefs.current[slot] = els;
      }
      setHidden(group, false);
      const torpedo = isTorpedoRef.current;
      const aRad = (missile.angle * Math.PI) / 180;
      const tailLen = torpedo ? OVAL_RX : TRIANGLE_HEIGHT;
      const exX = missile.x - tailLen * Math.sin(aRad);
      const exY = missile.y + tailLen * Math.cos(aRad);
      setCircle(els.glow, exX, exY, torpedo ? 9 : 7);
      setHidden(els.triangle, torpedo);
      setHidden(els.oval, !torpedo);
      const tr = `translate(${missile.x}, ${missile.y}) rotate(${missile.angle})`;
      els.triangle?.setAttribute("transform", tr);
      els.oval?.setAttribute("transform", tr);
      els.trailDots.forEach((node, i) => {
        const pos = missile.trail[i];
        if (!pos) {
          setHidden(node, true);
          return;
        }
        const t = i / Math.max(missile.trail.length - 1, 1);
        setHidden(node, false);
        setCircle(node, pos.x, pos.y, Math.max(0.5, (1 - t * 0.65) * (torpedo ? 5 : 4)));
        node.setAttribute("opacity", String((1 - t) * 0.55));
      });
    };

    const paintImpact = (slot: number, impact: MissileImpact, now: number) => {
      const group = impactGroupRefs.current[slot];
      if (!group) return;
      let els = impactDomRefs.current[slot];
      if (!els) {
        els = bindMissileImpactDom(group);
        impactDomRefs.current[slot] = els;
      }
      const duration = impact.shockwave ? TORPEDO_IMPACT_DURATION_MS : MISSILE_IMPACT_DURATION_MS;
      const elapsed = now - impact.startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 2);
      setHidden(group, false);
      const { inner, flash, ring, shockA, shockB, debris } = els;

      if (impact.shockwave) {
        const flashOpacity = Math.max(0, 1 - t * 2.2);
        setCircle(inner, impact.x, impact.y, easeOut * 22);
        inner?.setAttribute("opacity", String(flashOpacity * 0.35));
        setCircle(flash, impact.x, impact.y, easeOut * 38);
        flash?.setAttribute("opacity", String(flashOpacity * 0.22));
        setHidden(ring, true);
        const r1 = easeOut * 92;
        const r2 = easeOut * 118;
        setHidden(shockA, false);
        setHidden(shockB, false);
        setCircle(shockA, impact.x, impact.y, r1);
        shockA?.setAttribute("stroke-width", String(Math.max(2, 16 * (1 - t))));
        shockA?.setAttribute("opacity", String(Math.max(0, 1 - t * 1.15)));
        setCircle(shockB, impact.x, impact.y, r2);
        shockB?.setAttribute("stroke-width", String(Math.max(1.2, 9 * (1 - t))));
        shockB?.setAttribute("opacity", String(Math.max(0, 0.85 - t)));
        debris.forEach((node) => setHidden(node, true));
        return;
      }

      const flashRadius = easeOut * 18;
      const flashOpacity = Math.max(0, 1 - t * 2.5);
      const ringRadius = easeOut * 28;
      const ringOpacity = Math.max(0, 1 - t * 1.6);
      setHidden(shockA, true);
      setHidden(shockB, true);
      setHidden(ring, false);
      setCircle(inner, impact.x, impact.y, flashRadius * 0.6);
      inner?.setAttribute("opacity", String(flashOpacity * 0.7));
      setCircle(flash, impact.x, impact.y, flashRadius);
      flash?.setAttribute("opacity", String(flashOpacity));
      setCircle(ring, impact.x, impact.y, ringRadius);
      ring?.setAttribute("stroke-width", String(Math.max(0.5, 2.5 * (1 - t))));
      ring?.setAttribute("opacity", String(ringOpacity));
      debris.forEach((node, i) => {
        const p = impact.particles[i];
        if (!p) {
          setHidden(node, true);
          return;
        }
        setHidden(node, false);
        setCircle(
          node as SVGCircleElement,
          impact.x + Math.cos(p.angle) * p.speed * easeOut,
          impact.y + Math.sin(p.angle) * p.speed * easeOut,
          Math.max(0.5, p.size * (1 - t * 0.6)),
        );
        (node as SVGCircleElement).setAttribute("fill", p.color);
        (node as SVGCircleElement).setAttribute("opacity", String(Math.max(0, 1 - t * 1.8)));
      });
    };

    const addImpact = (x: number, y: number, now: number) => {
      const numParticles = 6 + Math.floor(Math.random() * 4);
      const impact: MissileImpact = {
        x,
        y,
        startTime: now,
        shockwave: isTorpedoRef.current,
        particles: Array.from({ length: numParticles }, () => ({
          angle: Math.random() * Math.PI * 2,
          speed: 15 + Math.random() * 35,
          size: 1.5 + Math.random() * 3,
          color: IMPACT_COLORS[Math.floor(Math.random() * IMPACT_COLORS.length)],
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

    spawnVolley();

    const ro = gridContainerRef.current
      ? new ResizeObserver(() => {
          layoutCacheRef.current = null;
          refreshLayout();
          syncOverlaySize();
        })
      : null;
    if (gridContainerRef.current && ro) ro.observe(gridContainerRef.current);

    const animate = () => {
      const now = Date.now();
      const layout = ensureLayout();
      if (layout) {
        const speedScale = isTorpedoRef.current ? TORPEDO_SPEED_SCALE : 1;
        const topSpeed = layout.avgCellSize * 4 * speedScale;
        const startSpeed = topSpeed / 8;

        if (
          !isTorpedoRef.current &&
          secondAtRef.current > 0 &&
          now >= secondAtRef.current
        ) {
          secondAtRef.current = 0;
          if (!missilesRef.current[1]) spawnOne(1);
        }

        let flying = 0;
        for (let i = 0; i < MISSILE_SLOTS; i++) {
          const missile = missilesRef.current[i];
          const group = missileGroupRefs.current[i];
          if (!missile) {
            setHidden(group, true);
            continue;
          }
          const next = stepMissile(missile, now, topSpeed, startSpeed);
          if (!next) {
            addImpact(missile.targetX, missile.targetY, now);
            missilesRef.current[i] = null;
            setHidden(group, true);
            continue;
          }
          missile.x = next.x;
          missile.y = next.y;
          missile.angle = next.angle;
          const aRad = (next.angle * Math.PI) / 180;
          const tailLen = isTorpedoRef.current ? OVAL_RX : TRIANGLE_HEIGHT;
          missile.trail = [
            {
              x: next.x - tailLen * Math.sin(aRad),
              y: next.y + tailLen * Math.cos(aRad),
            },
            ...missile.trail.slice(0, MAX_TRAIL - 1),
          ];
          flying += 1;
          paintMissile(i, missile);
        }

        if (flying === 0 && secondAtRef.current === 0 && respawnAtRef.current === 0) {
          respawnAtRef.current = now + MISSILE_RESPAWN_DELAY_MS;
        } else if (respawnAtRef.current > 0 && now >= respawnAtRef.current) {
          spawnVolley();
        }
      }

      for (let i = 0; i < MISSILE_IMPACT_SLOTS; i++) {
        const impact = impactsRef.current[i];
        const group = impactGroupRefs.current[i];
        if (!group) continue;
        const impactMs = impact?.shockwave
          ? TORPEDO_IMPACT_DURATION_MS
          : MISSILE_IMPACT_DURATION_MS;
        if (!impact || now - impact.startTime >= impactMs) {
          impactsRef.current[i] = null;
          setHidden(group, true);
          continue;
        }
        paintImpact(i, impact, now);
      }
    };

    const stopRaf = startCancelledRaf(animate);
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
      {Array.from({ length: MISSILE_IMPACT_SLOTS }, (_, slot) => (
        <g
          key={`imp-${slot}`}
          ref={(el) => {
            impactGroupRefs.current[slot] = el;
          }}
          style={{ display: "none" }}
        >
          <circle data-ms-inner fill="#ff8800" />
          <circle data-ms-flash fill="#ffffff" />
          <circle data-ms-ring fill="none" stroke="#ff4400" />
          <circle
            data-ms-shock-a
            fill="none"
            stroke="#ffcc66"
            strokeLinecap="round"
            style={{ display: "none" }}
          />
          <circle
            data-ms-shock-b
            fill="none"
            stroke="#ff7722"
            strokeLinecap="round"
            style={{ display: "none" }}
          />
          {Array.from({ length: MAX_DEBRIS }, (_, i) => (
            <circle key={i} data-ms-debris style={{ display: "none" }} />
          ))}
        </g>
      ))}
      {Array.from({ length: MISSILE_SLOTS }, (_, slot) => (
        <g
          key={`msl-${slot}`}
          ref={(el) => {
            missileGroupRefs.current[slot] = el;
          }}
          style={{ display: "none" }}
        >
          {Array.from({ length: MAX_TRAIL }, (_, i) => (
            <circle key={i} data-ms-trail fill="#ffaa00" style={{ display: "none" }} />
          ))}
          <circle data-ms-glow fill="#ffcc00" opacity={0.2} />
          <polygon
            data-ms-body
            points={`0,0 ${-TRIANGLE_SIZE / 2},${TRIANGLE_HEIGHT} ${TRIANGLE_SIZE / 2},${TRIANGLE_HEIGHT}`}
            fill="#ff3300"
            stroke="#ff7700"
            strokeWidth="0.75"
          />
          <ellipse
            data-ms-oval
            cx="0"
            cy={OVAL_RX * 0.35}
            rx={OVAL_RY}
            ry={OVAL_RX}
            fill="#ff4400"
            stroke="#ffaa55"
            strokeWidth="1.1"
            style={{ display: "none" }}
          />
        </g>
      ))}
    </svg>
  );
});

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { MISSILE_IMPACT_DURATION_MS, MISSILE_SECOND_FIRE_DELAY_MS, MISSILE_RESPAWN_DELAY_MS } from "../../constants/animationTiming";

interface MissileShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

const IMPACT_COLORS = ["#ff4400", "#ff8800", "#ffcc00", "#ffffff", "#ff6600"];

export const MissileShootingAnimation = React.memo(function MissileShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: MissileShootingAnimationProps) {
  const [missiles, setMissiles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      angle: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      driftX: number;
      driftY: number;
      spawnX: number;
      spawnY: number;
      driftStartTime: number;
      startTime: number;
      trail: { x: number; y: number }[];
    }>
  >([]);

  const [impacts, setImpacts] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      startTime: number;
      particles: Array<{ angle: number; speed: number; size: number; color: string }>;
    }>
  >([]);

  const missileIdRef = useRef(0);
  const impactIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const animationFrameRef = useRef<number | null>(null);
  const impactAnimationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Offset from cell center to the missile launch port.
  // Facing right: +11% cell width, -16% cell height
  // Facing left:  -11% cell width, -16% cell height
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cw = rect.width / 17;
    const ch = rect.height / 11;
    return {
      x: center.x + (facingRight ? cw * 0.11 : -cw * 0.11),
      y: center.y - ch * 0.16,
    };
  }, [getCellCenter, attackerRow, attackerCol, gridContainerRef, facingRight]);

  // Select target spot and spawn missile
  const spawnMissile = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getAttackerOrigin();
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Select a random target spot within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const targetAngle = Math.atan2(dy, dx);

    // Initial direction: 90 degrees counter-clockwise from target direction
    // with random variation of up to ±30 degrees
    const angleVariation = (Math.random() - 0.5) * ((30 * Math.PI) / 180); // ±30 degrees in radians
    const initialAngle = targetAngle + Math.PI / 2 + angleVariation;

    // Calculate initial drift position (0.25 seconds at start speed)
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const TOP_SPEED = avgCellSize * 4;
    const START_SPEED = TOP_SPEED / 8;
    const INITIAL_DRIFT_TIME = 0.5;
    const driftDistance = START_SPEED * INITIAL_DRIFT_TIME;

    const driftX = attackerCenter.x + Math.cos(initialAngle) * driftDistance;
    const driftY = attackerCenter.y + Math.sin(initialAngle) * driftDistance;

    // Angle for triangle orientation (always point at target)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    // Spawn first missile at attacker position
    const firstMissile = {
      id: missileIdRef.current++,
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: driftX,
      startY: driftY,
      driftX,
      driftY,
      spawnX: attackerCenter.x,
      spawnY: attackerCenter.y,
      driftStartTime: Date.now(),
      startTime: Date.now() + INITIAL_DRIFT_TIME * 1000,
      trail: [] as { x: number; y: number }[],
    };

    setMissiles([firstMissile]);

    // Fire second missile 0.2 seconds after the first
    setTimeout(() => {
      // Select a new random target spot for the second missile
      const targetX2 = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
      const targetY2 =
        targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

      // Calculate direction to target for second missile
      const dx2 = targetX2 - attackerCenter.x;
      const dy2 = targetY2 - attackerCenter.y;
      const targetAngle2 = Math.atan2(dy2, dx2);

      // Initial direction with random variation
      const angleVariation2 = (Math.random() - 0.5) * ((30 * Math.PI) / 180);
      const initialAngle2 = targetAngle2 + Math.PI / 2 + angleVariation2;

      const driftDistance2 = START_SPEED * INITIAL_DRIFT_TIME;
      const driftX2 =
        attackerCenter.x + Math.cos(initialAngle2) * driftDistance2;
      const driftY2 =
        attackerCenter.y + Math.sin(initialAngle2) * driftDistance2;

      const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI) + 90;

      const secondMissile = {
        id: missileIdRef.current++,
        x: attackerCenter.x,
        y: attackerCenter.y,
        angle: angle2,
        targetX: targetX2,
        targetY: targetY2,
        startX: driftX2,
        startY: driftY2,
        driftX: driftX2,
        driftY: driftY2,
        spawnX: attackerCenter.x,
        spawnY: attackerCenter.y,
        driftStartTime: Date.now(),
        startTime: Date.now() + INITIAL_DRIFT_TIME * 1000,
        trail: [] as { x: number; y: number }[],
      };

      setMissiles((prev) => [...prev, secondMissile]);
    }, MISSILE_SECOND_FIRE_DELAY_MS);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
    getAttackerOrigin,
  ]);

  // Handle missile despawn and respawn
  useEffect(() => {
    if (missiles.length === 0) {
      // No missiles - wait 1 second then spawn next pair
      timeoutRef.current = setTimeout(() => {
        spawnMissile();
      }, MISSILE_RESPAWN_DELAY_MS);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [missiles.length, spawnMissile]);

  // Animate missile movement
  useEffect(() => {
    if (missiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const avgCellSize = (cellWidth + cellHeight) / 2;

    // Constant speed values (pixels per second)
    const TOP_SPEED = avgCellSize * 4;
    const START_SPEED = TOP_SPEED / 8;
    const INITIAL_DRIFT_TIME = 0.5;
    const ACCELERATION_TIME = 0.125;
    const ACCELERATION = (TOP_SPEED - START_SPEED) / ACCELERATION_TIME;

    const animate = () => {
      const updatedMissiles = missiles
        .map((missile) => {
          // Calculate direction to target for initial drift
          const targetDx = missile.targetX - missile.spawnX;
          const targetDy = missile.targetY - missile.spawnY;
          const targetAngle = Math.atan2(targetDy, targetDx);
          const initialAngle = targetAngle + Math.PI / 2; // 90 degrees CCW from target

          // Distance from drift position to target
          const dx = missile.targetX - missile.startX;
          const dy = missile.targetY - missile.startY;
          const totalDistance = Math.sqrt(dx * dx + dy * dy);

          // Calculate distance covered during acceleration phase
          const accelerationDistance =
            START_SPEED * ACCELERATION_TIME +
            0.5 * ACCELERATION * ACCELERATION_TIME * ACCELERATION_TIME;
          const reachesTargetDuringAccel =
            accelerationDistance >= totalDistance;

          const totalElapsed = (Date.now() - missile.driftStartTime) / 1000;
          const driftElapsed = totalElapsed;
          const accelerationElapsed = totalElapsed - INITIAL_DRIFT_TIME;

          let currentX: number;
          let currentY: number;

          // Always point at target
          const angleDx = missile.targetX - (missile.x || missile.spawnX);
          const angleDy = missile.targetY - (missile.y || missile.spawnY);
          const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI) + 90;

          if (driftElapsed < INITIAL_DRIFT_TIME) {
            // Initial drift phase: move 90 degrees from target direction at start speed
            const driftDistance = START_SPEED * driftElapsed;
            currentX = missile.spawnX + Math.cos(initialAngle) * driftDistance;
            currentY = missile.spawnY + Math.sin(initialAngle) * driftDistance;
          } else if (accelerationElapsed >= 0) {
            // Acceleration phase (after drift) - move from drift position to target
            let distanceTraveled = 0;

            if (reachesTargetDuringAccel) {
              // Target reached during acceleration
              const a = 0.5 * ACCELERATION;
              const b = START_SPEED;
              const c = -totalDistance;
              const discriminant = b * b - 4 * a * c;
              const timeToTarget = (-b + Math.sqrt(discriminant)) / (2 * a);

              if (accelerationElapsed < timeToTarget) {
                distanceTraveled =
                  START_SPEED * accelerationElapsed +
                  0.5 *
                    ACCELERATION *
                    accelerationElapsed *
                    accelerationElapsed;
              } else {
                distanceTraveled = totalDistance;
              }
            } else {
              // Acceleration then constant speed
              if (accelerationElapsed < ACCELERATION_TIME) {
                distanceTraveled =
                  START_SPEED * accelerationElapsed +
                  0.5 *
                    ACCELERATION *
                    accelerationElapsed *
                    accelerationElapsed;
              } else {
                const remainingDistance = totalDistance - accelerationDistance;
                const constantSpeedTime = remainingDistance / TOP_SPEED;
                const timeInConstantPhase =
                  accelerationElapsed - ACCELERATION_TIME;

                if (timeInConstantPhase < constantSpeedTime) {
                  distanceTraveled =
                    accelerationDistance + TOP_SPEED * timeInConstantPhase;
                } else {
                  distanceTraveled = totalDistance;
                }
              }
            }

            const progress = Math.min(distanceTraveled / totalDistance, 1);
            currentX =
              missile.startX + (missile.targetX - missile.startX) * progress;
            currentY =
              missile.startY + (missile.targetY - missile.startY) * progress;
          } else {
            // Shouldn't happen, but fallback
            currentX = missile.x;
            currentY = missile.y;
          }

          // Check if reached target
          const distanceToTarget = Math.sqrt(
            Math.pow(currentX - missile.targetX, 2) +
              Math.pow(currentY - missile.targetY, 2)
          );

          if (distanceToTarget <= 0.1) {
            const numParticles = 6 + Math.floor(Math.random() * 4);
            const particles = Array.from({ length: numParticles }, () => ({
              angle: Math.random() * Math.PI * 2,
              speed: 15 + Math.random() * 35,
              size: 1.5 + Math.random() * 3,
              color: IMPACT_COLORS[Math.floor(Math.random() * IMPACT_COLORS.length)],
            }));
            setImpacts((prev) => [
              ...prev,
              { id: impactIdRef.current++, x: currentX, y: currentY, startTime: Date.now(), particles },
            ]);
            return null;
          }

          // Store the exhaust (base) position in the trail, not the tip.
          // Base is at local (0, 12); world: translate + rotate gives:
          //   exhaustX = x - 12·sin(angle), exhaustY = y + 12·cos(angle)
          const TRIANGLE_HEIGHT = 12;
          const angleRad = (angle * Math.PI) / 180;
          const exhaustX = missile.x - TRIANGLE_HEIGHT * Math.sin(angleRad);
          const exhaustY = missile.y + TRIANGLE_HEIGHT * Math.cos(angleRad);

          const MAX_TRAIL = 10;
          const newTrail = [
            { x: exhaustX, y: exhaustY },
            ...missile.trail.slice(0, MAX_TRAIL - 1),
          ];

          return {
            ...missile,
            x: currentX,
            y: currentY,
            angle,
            trail: newTrail,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      setMissiles(updatedMissiles);

      if (updatedMissiles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [missiles, gridContainerRef]);

  // Drive impact animation re-renders and expire finished impacts.
  // Uses a functional updater so newly-added impacts are never clobbered.
  // Returns a new array every frame while impacts are alive so React re-renders
  // and JSX can read the current Date.now() for position/opacity calculations.
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      setImpacts((prev) => {
        if (prev.length === 0) return prev; // same ref → React bails out, no re-render
        return prev.filter((imp) => now - imp.startTime < MISSILE_IMPACT_DURATION_MS); // new array → re-render
      });
      impactAnimationRef.current = requestAnimationFrame(animate);
    };

    impactAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (impactAnimationRef.current) {
        cancelAnimationFrame(impactAnimationRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start first missile
  useEffect(() => {
    spawnMissile();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [spawnMissile]);

  if (!gridContainerRef.current || (missiles.length === 0 && impacts.length === 0)) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  // Acute isosceles triangle: tip at (0,0) pointing toward target, base below
  const triangleSize = 8;
  const triangleHeight = 12;
  const tipX = 0;
  const tipY = 0;
  const baseLeftX = -triangleSize / 2;
  const baseRightX = triangleSize / 2;
  const baseY = triangleHeight;

  const now = Date.now();

  return (
    <svg
      className="absolute pointer-events-none z-20"
      style={{ left: 0, top: 0, width: gridRect.width, height: gridRect.height }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {/* Impact effects */}
      {impacts.map((impact) => {
        const elapsed = now - impact.startTime;
        const t = Math.min(elapsed / MISSILE_IMPACT_DURATION_MS, 1);
        const easeOut = 1 - Math.pow(1 - t, 2);

        const flashRadius = easeOut * 18;
        const flashOpacity = Math.max(0, 1 - t * 2.5);

        const ringRadius = easeOut * 28;
        const ringOpacity = Math.max(0, 1 - t * 1.6);

        return (
          <g key={impact.id}>
            {/* Inner glow */}
            <circle cx={impact.x} cy={impact.y} r={flashRadius * 0.6} fill="#ff8800" opacity={flashOpacity * 0.7} />
            {/* White flash */}
            <circle cx={impact.x} cy={impact.y} r={flashRadius} fill="#ffffff" opacity={flashOpacity} />
            {/* Expanding ring */}
            <circle
              cx={impact.x}
              cy={impact.y}
              r={ringRadius}
              fill="none"
              stroke="#ff4400"
              strokeWidth={Math.max(0.5, 2.5 * (1 - t))}
              opacity={ringOpacity}
            />
            {/* Debris particles */}
            {impact.particles.map((p, i) => {
              const px = impact.x + Math.cos(p.angle) * p.speed * easeOut;
              const py = impact.y + Math.sin(p.angle) * p.speed * easeOut;
              return (
                <circle
                  key={i}
                  cx={px}
                  cy={py}
                  r={Math.max(0.5, p.size * (1 - t * 0.6))}
                  fill={p.color}
                  opacity={Math.max(0, 1 - t * 1.8)}
                />
              );
            })}
          </g>
        );
      })}

      {/* Missiles */}
      {missiles.map((missile) => {
        // Exhaust (base) world position: local (0, triangleHeight) after rotate+translate
        const aRad = (missile.angle * Math.PI) / 180;
        const exX = missile.x - triangleHeight * Math.sin(aRad);
        const exY = missile.y + triangleHeight * Math.cos(aRad);
        return (
          <g key={missile.id}>
            {/* Exhaust trail */}
            {missile.trail.map((pos, i) => {
              const t = i / Math.max(missile.trail.length - 1, 1);
              return (
                <circle
                  key={i}
                  cx={pos.x}
                  cy={pos.y}
                  r={Math.max(0.5, (1 - t * 0.65) * 4)}
                  fill="#ffaa00"
                  opacity={(1 - t) * 0.55}
                />
              );
            })}
            {/* Engine glow at exhaust end */}
            <circle cx={exX} cy={exY} r={7} fill="#ffcc00" opacity={0.2} />
            {/* Missile body */}
            <polygon
              points={`${tipX},${tipY} ${baseLeftX},${baseY} ${baseRightX},${baseY}`}
              fill="#ff3300"
              stroke="#ff7700"
              strokeWidth="0.75"
              transform={`translate(${missile.x}, ${missile.y}) rotate(${missile.angle})`}
            />
          </g>
        );
      })}
    </svg>
  );
});

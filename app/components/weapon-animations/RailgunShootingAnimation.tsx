"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface RailgunShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

const IMPACT_DURATION = 650; // ms — total spall lifetime
const FLASH_DURATION = 140;  // ms — entry flash
const PEN_DURATION   = 220;  // ms — penetration glow line
const SPALL_SPREAD   = (48 * Math.PI) / 180; // ±48° cone around bolt axis

function spallColor(normSpread: number): string {
  // normSpread: 0 = on-axis (hottest), 1 = edge of cone (coolest)
  if (normSpread < 0.3) return ["#ffffff", "#e8f8ff", "#56d6ff"][Math.floor(Math.random() * 3)];
  if (normSpread < 0.65) return ["#ffe866", "#ffcc22", "#ffaa00"][Math.floor(Math.random() * 3)];
  return ["#ff8800", "#ff5500", "#cc3300"][Math.floor(Math.random() * 3)];
}

export function RailgunShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: RailgunShootingAnimationProps) {
  const [projectiles, setProjectiles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      angle: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const [muzzleFlashes, setMuzzleFlashes] = useState<
    { id: number; x: number; y: number; size: number }[]
  >([]);
  const [impacts, setImpacts] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      startTime: number;
      boltAngle: number; // radians, direction of bolt travel (attacker → target)
      spall: Array<{ angle: number; speed: number; size: number; color: string }>;
    }>
  >([]);

  const projectileIdRef = useRef(0);
  const flashIdRef = useRef(0);
  const impactIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const impactAnimationRef = useRef<number | null>(null);
  const hasFiredRef = useRef<string>("");
  const instanceId = useRef(Math.random().toString(36).slice(2));

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Offset from cell center to the railgun barrel port.
  // Facing right: +60% cell width, -5% cell height
  // Facing left:  -60% cell width, -5% cell height
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
    const cw = rect.width / 17;
    const ch = rect.height / 11;
    return {
      x: center.x + (facingRight ? cw * 0.30 : -cw * 0.30),
      y: center.y - ch * 0.15,
    };
  }, [getCellCenter, attackerRow, attackerCol, gridContainerRef, facingRight]);

  // Spawn a new projectile
  const spawnProjectile = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getAttackerOrigin();
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Select a random target spot within target cell
    const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
    const cellWidth = gridRect.width / 17;
    const cellHeight = gridRect.height / 11;
    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // High speed constant rate (faster than missiles)
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const SPEED = avgCellSize * 8; // 8 cells per second (2x faster than missiles)
    const travelTime = distance / SPEED; // Constant speed, travel time varies by distance

    const newProjectile = {
      id: projectileIdRef.current++,
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: attackerCenter.y,
      startTime: Date.now(),
      travelTime,
    };

    setProjectiles((prev) => {
      if (prev.length > 0) return prev;
      return [newProjectile];
    });

    // Muzzle flash at attacker origin
    const flashId = flashIdRef.current++;
    const flashSize = 26;
    setMuzzleFlashes((prev) => [
      ...prev,
      { id: flashId, x: attackerCenter.x, y: attackerCenter.y, size: flashSize },
    ]);
    setTimeout(() => {
      setMuzzleFlashes((prev) => prev.filter((f) => f.id !== flashId));
    }, 150);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
    getAttackerOrigin,
  ]);

  // Handle projectile despawn and respawn (endless cycling with single projectile)
  useEffect(() => {
    if (projectiles.length === 0) {
      // All projectiles despawned, wait before spawning next one
      const timeoutId = setTimeout(() => {
        spawnProjectile();
      }, 2000); // 2 seconds between shots

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [projectiles.length, spawnProjectile]);

  // Animate projectiles — spawn impact when bolt arrives
  useEffect(() => {
    if (projectiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
    const cellWidth = gridRect.width / 17;
    const cellHeight = gridRect.height / 11;

    const animate = () => {
      const now = Date.now();
      const updatedProjectiles = projectiles
        .map((projectile) => {
          const elapsed = (now - projectile.startTime) / 1000;
          const progress = Math.min(elapsed / projectile.travelTime, 1);

          if (progress >= 1) {
            // Bolt arrived — spawn spall impact
            const boltAngle = Math.atan2(
              projectile.targetY - projectile.startY,
              projectile.targetX - projectile.startX
            );

            const numSpall = 13 + Math.floor(Math.random() * 6); // 13–18 pieces
            const spall = Array.from({ length: numSpall }, (_, i) => {
              const isChunk = i < 4; // first few are larger, slower chunks
              const rawSpread = (Math.random() * 2 - 1) * SPALL_SPREAD * (isChunk ? 0.55 : 1);
              return {
                angle: boltAngle + rawSpread,
                speed: isChunk
                  ? 55 + Math.random() * 55    // px/s — slower big chunks
                  : 110 + Math.random() * 130, // px/s — fast small spall
                size: isChunk ? 2.2 + Math.random() * 1.6 : 0.7 + Math.random() * 1.4,
                color: spallColor(Math.abs(rawSpread) / SPALL_SPREAD),
              };
            });

            setImpacts((prev) => [
              ...prev,
              {
                id: impactIdRef.current++,
                x: projectile.targetX,
                y: projectile.targetY,
                startTime: now,
                boltAngle,
                spall,
              },
            ]);
            return null;
          }

          // Constant speed movement
          const currentX =
            projectile.startX +
            (projectile.targetX - projectile.startX) * progress;
          const currentY =
            projectile.startY +
            (projectile.targetY - projectile.startY) * progress;

          // Always point at target
          const angleDx = projectile.targetX - currentX;
          const angleDy = projectile.targetY - currentY;
          const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI);

          return {
            ...projectile,
            x: currentX,
            y: currentY,
            angle,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setProjectiles(updatedProjectiles);

      if (updatedProjectiles.length > 0) {
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
  }, [projectiles, gridContainerRef]);

  // Drive impact re-renders and expire finished impacts (same pattern as missile/plasma)
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      setImpacts((prev) => {
        if (prev.length === 0) return prev;
        return prev.filter((imp) => now - imp.startTime < IMPACT_DURATION);
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

  // Reset and start cycling when attack parameters change
  useEffect(() => {
    const attackKey = `${attackerRow}-${attackerCol}-${targetRow}-${targetCol}`;
    if (hasFiredRef.current !== attackKey) {
      hasFiredRef.current = attackKey;
      setProjectiles([]);
      spawnProjectile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackerRow, attackerCol, targetRow, targetCol]);

  if (!gridContainerRef.current || (projectiles.length === 0 && muzzleFlashes.length === 0 && impacts.length === 0)) return null;

  const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
  const iid = instanceId.current;
  const now = Date.now();

  return (
    <>
      <svg
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: gridRect.width, height: gridRect.height }}
        viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          {projectiles.map((p) => (
            <linearGradient
              key={p.id}
              id={`rg-trail-${iid}-${p.id}`}
              x1={p.startX}
              y1={p.startY}
              x2={p.x}
              y2={p.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#56d6ff" stopOpacity="0" />
              <stop offset="60%" stopColor="#56d6ff" stopOpacity="0.45" />
              <stop offset="90%" stopColor="#56d6ff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>

        {/* Impact effects */}
        {impacts.map((impact) => {
          const elapsed = now - impact.startTime;
          const elapsedSec = elapsed / 1000;

          // Entry flash — blooms fast, fades in FLASH_DURATION ms
          const flashT = Math.max(0, 1 - elapsed / FLASH_DURATION);
          const flashRadius = (1 - flashT) * 16; // 0→16px as flash fades
          const flashOpacity = flashT;

          // Penetration glow line — lingers a bit longer
          const penT = Math.max(0, 1 - elapsed / PEN_DURATION);

          // Spall fade — linear over full IMPACT_DURATION
          const spallOpacity = Math.max(0, 1 - elapsed / IMPACT_DURATION);

          const cos = Math.cos(impact.boltAngle);
          const sin = Math.sin(impact.boltAngle);

          return (
            <g key={impact.id}>
              {/* Penetration glow: short line punching through the hull */}
              <line
                x1={impact.x - cos * 9}
                y1={impact.y - sin * 9}
                x2={impact.x + cos * 14}
                y2={impact.y + sin * 14}
                stroke="#56d6ff"
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={penT * 0.85}
              />

              {/* Entry flash */}
              <circle cx={impact.x} cy={impact.y} r={flashRadius * 1.8} fill="#56d6ff" opacity={flashOpacity * 0.25} />
              <circle cx={impact.x} cy={impact.y} r={flashRadius} fill="#ffffff" opacity={flashOpacity * 0.9} />

              {/* Spall — velocity streaks exiting the far side */}
              {impact.spall.map((piece, i) => {
                const dist = piece.speed * elapsedSec;
                const px = impact.x + Math.cos(piece.angle) * dist;
                const py = impact.y + Math.sin(piece.angle) * dist;
                // Short trail behind each fragment (40 ms worth of travel)
                const trailLen = Math.min(piece.speed * 0.04, dist);
                const tx = px - Math.cos(piece.angle) * trailLen;
                const ty = py - Math.sin(piece.angle) * trailLen;
                return (
                  <line
                    key={i}
                    x1={tx} y1={ty}
                    x2={px} y2={py}
                    stroke={piece.color}
                    strokeWidth={piece.size}
                    strokeLinecap="round"
                    opacity={spallOpacity}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Projectiles */}
        {projectiles.map((p) => (
          <g key={p.id}>
            {/* Comet trail: gradient line from spawn to current position */}
            <line
              x1={p.startX} y1={p.startY}
              x2={p.x} y2={p.y}
              stroke={`url(#rg-trail-${iid}-${p.id})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Outer glow at tip */}
            <circle cx={p.x} cy={p.y} r={5} fill="#56d6ff" opacity={0.3} />
            {/* Bright core at tip */}
            <circle cx={p.x} cy={p.y} r={2.5} fill="#ffffff" />
          </g>
        ))}
      </svg>

      {/* Muzzle flashes */}
      <div
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: gridRect.width, height: gridRect.height }}
      >
        {muzzleFlashes.map((f) => (
          <div
            key={f.id}
            className="railgun-muzzle-flash"
            style={{
              left: f.x - f.size / 2,
              top: f.y - f.size / 2,
              width: f.size,
              height: f.size,
            }}
          />
        ))}
      </div>
    </>
  );
}

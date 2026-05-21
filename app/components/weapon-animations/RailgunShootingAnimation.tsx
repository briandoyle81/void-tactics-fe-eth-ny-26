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
  const projectileIdRef = useRef(0);
  const flashIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const hasFiredRef = useRef<string>("");
  const instanceId = useRef(Math.random().toString(36).slice(2));

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

  // Offset from cell center to the railgun barrel port.
  // Facing right: +60% cell width, -5% cell height
  // Facing left:  -60% cell width, -5% cell height
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = gridContainerRef.current.getBoundingClientRect();
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
    const gridRect = gridContainerRef.current.getBoundingClientRect();
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

    // Remove projectile after it reaches target
    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== newProjectile.id));
    }, travelTime * 1000);
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

  // Animate projectiles
  useEffect(() => {
    if (projectiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 17;
    const cellHeight = gridRect.height / 11;

    const animate = () => {
      const now = Date.now();
      const updatedProjectiles = projectiles
        .map((projectile) => {
          const elapsed = (now - projectile.startTime) / 1000;
          const progress = Math.min(elapsed / projectile.travelTime, 1);

          if (progress >= 1) {
            // Projectile reached target - mark for removal
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

  // Reset and start cycling when attack parameters change
  useEffect(() => {
    // Create a unique key for this attack
    const attackKey = `${attackerRow}-${attackerCol}-${targetRow}-${targetCol}`;
    
    // If attack parameters changed, reset and start new cycle
    if (hasFiredRef.current !== attackKey) {
      hasFiredRef.current = attackKey;
      // Clear any existing projectiles
      setProjectiles([]);
      // Start the first projectile of the new cycle
      spawnProjectile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackerRow, attackerCol, targetRow, targetCol]);

  if (!gridContainerRef.current || (projectiles.length === 0 && muzzleFlashes.length === 0)) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();
  const iid = instanceId.current;

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

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface PlasmaShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

export function PlasmaShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: PlasmaShootingAnimationProps) {
  const PLASMA_COLORS = ["#56d6ff", "#6495ED", "#9370DB", "#4169E1", "#00CED1"];

  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      progress: number;
      spread: number;
      size: number;
      opacity: number;
      color: string;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

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

  // Offset from cell center to the plasma cannon port.
  // Facing right: +8% cell width, -15% cell height
  // Facing left:  -8% cell width, -15% cell height
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cw = rect.width / 17;
    const ch = rect.height / 11;
    return {
      x: center.x + (facingRight ? cw * 0.09 : -cw * 0.09),
      y: center.y - ch * 0.16,
    };
  }, [getCellCenter, attackerRow, attackerCol, gridContainerRef, facingRight]);

  // Create a new particle
  const createParticle = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerOrigin = getAttackerOrigin();
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Random point within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    // Calculate direction to target
    const dx = targetX - attackerOrigin.x;
    const dy = targetY - attackerOrigin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const spread = (Math.random() - 0.5) * 0.15;
    const size = 4 + Math.random() * 4;
    const opacity = 1.0;
    const color = PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)];

    const newParticle = {
      id: particleIdRef.current++,
      x: attackerOrigin.x,
      y: attackerOrigin.y,
      progress: 0,
      spread,
      size,
      opacity,
      color,
      targetX,
      targetY,
      startX: attackerOrigin.x,
      startY: attackerOrigin.y,
      startTime: Date.now(),
      travelTime: 0.3 + Math.random() * 0.2,
    };

    setParticles((prev) => [...prev, newParticle]);

    // Remove particle after it reaches target
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, newParticle.travelTime * 1000);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
    getAttackerOrigin,
  ]);

  // Continuously create particles
  useEffect(() => {
    // Create first particle immediately
    createParticle();

    // Create new particles continuously
    const interval = setInterval(() => {
      createParticle();
    }, 25); // Create a new particle every 25ms for a continuous stream (doubled from 50ms)

    return () => clearInterval(interval);
  }, [createParticle]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const now = Date.now();
      const updatedParticles = particles
        .map((particle) => {
          const elapsed = (now - particle.startTime) / 1000;
          const progress = Math.min(elapsed / particle.travelTime, 1);

          if (progress >= 1) {
            return null; // Particle reached target
          }

          // Calculate position along the path with spread
          const dx = particle.targetX - particle.startX;
          const dy = particle.targetY - particle.startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Apply spread (cone effect) - spread increases with progress
          const spreadDistance = particle.spread * distance * progress * 0.5;
          const spreadAngle = angle + Math.PI / 2; // Perpendicular to path

          const baseX = particle.startX + dx * progress;
          const baseY = particle.startY + dy * progress;
          const currentX = baseX + Math.cos(spreadAngle) * spreadDistance;
          const currentY = baseY + Math.sin(spreadAngle) * spreadDistance;

          return {
            ...particle,
            x: currentX,
            y: currentY,
            progress,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setParticles(updatedParticles);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  return (
    <svg
      className="absolute pointer-events-none z-20"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {particles.map((particle) => (
        <circle
          key={particle.id}
          cx={particle.x}
          cy={particle.y}
          r={particle.size}
          fill={particle.color}
          opacity={1}
        />
      ))}
    </svg>
  );
}

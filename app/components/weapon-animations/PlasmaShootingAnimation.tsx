"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { PLASMA_IMPACT_DURATION_MS, PLASMA_IMPACT_THROTTLE_MS, PLASMA_PARTICLE_INTERVAL_MS } from "../../constants/animationTiming";

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

export const PlasmaShootingAnimation = React.memo(function PlasmaShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: PlasmaShootingAnimationProps) {
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

  const [impacts, setImpacts] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      startTime: number;
      coreColor: string;
      blobs: Array<{ angle: number; radius: number; size: number; color: string }>;
    }>
  >([]);

  const particleIdRef = useRef(0);
  const impactIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const impactAnimationRef = useRef<number | null>(null);
  const lastImpactTimeRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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

  // Offset from cell center to the plasma cannon port.
  // Facing right: +8% cell width, -15% cell height
  // Facing left:  -8% cell width, -15% cell height
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
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
    const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

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
      if (!mountedRef.current) return;
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
    }, PLASMA_PARTICLE_INTERVAL_MS); // Create a new particle every 25ms for a continuous stream (doubled from 50ms)

    return () => clearInterval(interval);
  }, [createParticle]);

  // Animate particles — and trigger throttled melty impact when a particle arrives
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const now = Date.now();
      const updatedParticles = particles
        .map((particle) => {
          const elapsed = (now - particle.startTime) / 1000;
          const progress = Math.min(elapsed / particle.travelTime, 1);

          if (progress >= 1) {
            // Throttle: one impact spawn per PLASMA_IMPACT_THROTTLE_MS
            if (now - lastImpactTimeRef.current > PLASMA_IMPACT_THROTTLE_MS) {
              lastImpactTimeRef.current = now;
              const numBlobs = 8 + Math.floor(Math.random() * 4);
              const blobs = Array.from({ length: numBlobs }, () => ({
                angle: Math.random() * Math.PI * 2,
                radius: 7 + Math.random() * 16,
                size: 2 + Math.random() * 3.5,
                color: IMPACT_BLOB_COLORS[Math.floor(Math.random() * IMPACT_BLOB_COLORS.length)],
              }));
              setImpacts((prev) => [
                ...prev,
                {
                  id: impactIdRef.current++,
                  x: particle.targetX,
                  y: particle.targetY,
                  startTime: now,
                  coreColor: PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)],
                  blobs,
                },
              ]);
            }
            return null;
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

  // Drive impact re-renders and expire finished impacts.
  // Functional updater so new impacts added by the particle loop are never clobbered.
  // Returns a new array while impacts are alive (triggers re-render each frame so
  // JSX Date.now() advances); bails out with same ref when list is empty.
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      setImpacts((prev) => {
        if (prev.length === 0) return prev;
        return prev.filter((imp) => now - imp.startTime < PLASMA_IMPACT_DURATION_MS);
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

  if (!gridContainerRef.current) return null;

  const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
  const now = Date.now();

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
      {/* Melty impact effects — rendered below particles so stream fires over the pool */}
      {impacts.map((impact) => {
        const t = Math.min((now - impact.startTime) / PLASMA_IMPACT_DURATION_MS, 1);

        // Blobs spread out fast (first ~30% of duration) then drip under gravity
        const spreadT = Math.min(t * 3, 1);
        const spreadEase = 1 - Math.pow(1 - spreadT, 2);

        // Core: blooms quickly, fades slowly
        const coreRadius = Math.min(t * 12, 1) * 13;
        const coreOpacity = Math.pow(1 - t, 0.65);

        return (
          <g key={impact.id}>
            {/* Soft corona pool */}
            <circle
              cx={impact.x}
              cy={impact.y}
              r={coreRadius * 2.8}
              fill={impact.coreColor}
              opacity={coreOpacity * 0.12}
            />
            {/* Melt blobs — spread then drip */}
            {impact.blobs.map((blob, i) => {
              const bx = impact.x + Math.cos(blob.angle) * blob.radius * spreadEase;
              const by = impact.y + Math.sin(blob.angle) * blob.radius * spreadEase;
              return (
                <circle
                  key={i}
                  cx={bx}
                  cy={by}
                  r={blob.size * (1 + t * 1.1)} // expand as it melts
                  fill={blob.color}
                  opacity={Math.pow(1 - t, 0.45)} // slow, lingering fade
                />
              );
            })}
            {/* Core flash */}
            <circle cx={impact.x} cy={impact.y} r={coreRadius} fill="#ffffff" opacity={coreOpacity * 0.55} />
            <circle cx={impact.x} cy={impact.y} r={coreRadius * 0.55} fill={impact.coreColor} opacity={coreOpacity} />
          </g>
        );
      })}

      {/* Plasma particles */}
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
});

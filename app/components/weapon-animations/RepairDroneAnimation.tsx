"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";

interface RepairDroneAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function RepairDroneAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: RepairDroneAnimationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const drones = useMemo(() => {
    // Three drones with slightly different delays, phases, and arc shapes.
    // Arc midpoints are relative translations from the attacker origin.
    const base = [
      { delayMs: 0, phase: "0deg" },
      { delayMs: 180, phase: "120deg" },
      { delayMs: 360, phase: "240deg" },
    ];

    // Randomize arc magnitudes deterministically per mount
    return base.map((d, i) => {
      // Slightly different arc strengths per drone
      const outScale = 0.65 + Math.random() * 0.6; // 0.65–1.25
      const backScale = 0.65 + Math.random() * 0.6;
      // Alternate sign so arcs split left/right
      const sign = i % 2 === 0 ? 1 : -1;
      return {
        ...d,
        outScale: outScale * sign,
        backScale: backScale * -sign, // different direction on return
      };
    });
  }, []);

  const compute = useCallback(() => {
    if (!gridContainerRef.current) return null;
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 17;
    const cellHeight = gridRect.height / 11;

    const ax = attackerCol * cellWidth + cellWidth / 2;
    const ay = attackerRow * cellHeight + cellHeight / 2;
    const tx = targetCol * cellWidth + cellWidth / 2;
    const ty = targetRow * cellHeight + cellHeight / 2;

    const dx = tx - ax;
    const dy = ty - ay;

    // keep orbit radius proportional but sane
    const orbit = clamp(Math.min(cellWidth, cellHeight) * 0.22, 6, 12);

    // Arc bend strength based on distance but clamped
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bendBase = clamp(dist * 0.18, 10, 36);
    // Perpendicular unit vector (for arcing left/right)
    const inv = dist > 0 ? 1 / dist : 0;
    const px = -dy * inv;
    const py = dx * inv;

    return { gridRect, ax, ay, dx, dy, orbit, bendBase, px, py };
  }, [gridContainerRef, attackerRow, attackerCol, targetRow, targetCol]);

  const layout = useMemo(() => compute(), [compute]);

  // Recompute on resize (so positions stay aligned)
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const handler = () => {
      const next = compute();
      if (!next || !rootRef.current) return;
      rootRef.current.style.setProperty("--ax", `${next.ax}px`);
      rootRef.current.style.setProperty("--ay", `${next.ay}px`);
      rootRef.current.style.setProperty("--dx", `${next.dx}px`);
      rootRef.current.style.setProperty("--dy", `${next.dy}px`);
      rootRef.current.style.setProperty("--orbit", `${next.orbit}px`);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [compute, gridContainerRef]);

  if (!layout) return null;

  const { gridRect, ax, ay, dx, dy, orbit, bendBase, px, py } = layout;

  return (
    <div
      ref={rootRef}
      className="absolute pointer-events-none z-60"
      style={
        {
          left: 0,
          top: 0,
          width: `${gridRect.width}px`,
          height: `${gridRect.height}px`,
          // CSS vars for keyframes
          "--ax": `${ax}px`,
          "--ay": `${ay}px`,
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--orbit": `${orbit}px`,
          "--dur": `3.2s`, // 50% slower than 1.6s
        } as React.CSSProperties
      }
    >
      {drones.map((d, i) => {
        // Midpoint around ~55% of the way, with perpendicular bend
        const mBaseX = dx * 0.55;
        const mBaseY = dy * 0.55;

        const outBend = bendBase * d.outScale;
        const backBend = bendBase * d.backScale;

        let m1x = mBaseX + px * outBend;
        let m1y = mBaseY + py * outBend;
        let m2x = mBaseX + px * backBend;
        let m2y = mBaseY + py * backBend;

        // Self-repair: route each drone via a unique approach angle so they
        // orbit from the start instead of sitting motionless at the ship.
        if (dx === 0 && dy === 0) {
          const angle = (i / drones.length) * Math.PI * 2;
          m1x = Math.cos(angle) * orbit * 2;
          m1y = Math.sin(angle) * orbit;
          m2x = Math.cos(angle + Math.PI) * orbit * 2;
          m2y = Math.sin(angle + Math.PI) * orbit;
        }

        return (
        <div
          key={i}
          className="repair-drone"
          style={
            {
              animationDelay: `${d.delayMs}ms`,
              "--phase": d.phase,
              "--m1x": `${m1x}px`,
              "--m1y": `${m1y}px`,
              "--m2x": `${m2x}px`,
              "--m2y": `${m2y}px`,
            } as React.CSSProperties
          }
        >
          {/* X-frame quadcopter drone */}
          <svg
            width="14"
            height="14"
            viewBox="-7 -7 14 14"
            style={{ overflow: "visible" }}
          >
            {/* Soft glow halo */}
            <circle cx="0" cy="0" r="6" fill="#56d6ff" opacity="0.1" />
            {/* Arms — X configuration */}
            {([[-1.2,-1.2,-4.8,-4.8],[1.2,-1.2,4.8,-4.8],[-1.2,1.2,-4.8,4.8],[1.2,1.2,4.8,4.8]] as [number,number,number,number][]).map(([x1,y1,x2,y2], ai) => (
              <line key={ai} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#56d6ff" strokeWidth="0.9" opacity="0.85" />
            ))}
            {/* Spinning rotor rings */}
            {([[-4.8,-4.8],[4.8,-4.8],[-4.8,4.8],[4.8,4.8]] as [number,number][]).map(([cx, cy], ri) => (
              <g key={ri}>
                <circle cx={cx} cy={cy} r="2" fill="none" stroke="#56d6ff" strokeWidth="0.6" strokeDasharray="2 1.2" opacity="0.75">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="0.35s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r="0.5" fill="#56d6ff" opacity="0.6" />
              </g>
            ))}
            {/* Body: diamond */}
            <polygon points="0,-2.4 2.4,0 0,2.4 -2.4,0" fill="#56d6ff" opacity="0.95" />
            {/* Status light: green */}
            <circle cx="0" cy="0" r="0.85" fill="#6bff8f" />
            {/* Repair aura - pulsing green ring, visible during repair phase only */}
            <circle cx="0" cy="0" r="4" fill="none" stroke="#6bff8f" strokeWidth="1.2" className="repair-drone__aura" style={{ animationDelay: `${d.delayMs}ms` }} />
            {/* Repair sparks - spinning dashed ring */}
            <circle cx="0" cy="0" r="5.5" fill="none" stroke="#6bff8f" strokeWidth="0.6" strokeDasharray="1.5 2.5" className="repair-drone__sparks" style={{ animationDelay: `${d.delayMs}ms` }} />
          </svg>
        </div>
        );
      })}
    </div>
  );
}


"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { LASER_LINE_FADEOUT_MS, LASER_FLARE_FADEOUT_MS, LASER_FIRE_INTERVAL_MS } from "../../constants/animationTiming";

interface LaserShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
  facingRight: boolean;
}

type LaserLine = { id: number; endX: number; endY: number };
type LaserFlare = { id: number; x: number; y: number; size: number };

export const LaserShootingAnimation = React.memo(function LaserShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
  facingRight,
}: LaserShootingAnimationProps) {
  const [lines, setLines] = useState<LaserLine[]>([]);
  const [flares, setFlares] = useState<LaserFlare[]>([]);
  const lineIdRef = useRef(0);
  const flareIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };
      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;
      return {
        x: col * cellWidth + cellWidth / 2,
        y: row * cellHeight + cellHeight / 2,
      };
    },
    [gridContainerRef]
  );

  // Offset from cell center to the cannon port on the ship sprite.
  // Facing right: +5% cell width, -15% cell height
  // Facing left:  -5% cell width, no vertical change
  const getAttackerOrigin = useCallback(() => {
    const center = getCellCenter(attackerRow, attackerCol);
    if (!gridContainerRef.current) return center;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cw = rect.width / 17;
    const ch = rect.height / 11;
    return {
      x: center.x + (facingRight ? cw * 0.08 : -cw * 0.08),
      y: center.y + (facingRight ? -ch * 0.15 : 0),
    };
  }, [getCellCenter, attackerRow, attackerCol, gridContainerRef, facingRight]);

  const createLine = useCallback(() => {
    if (!gridContainerRef.current) return;

    const targetCenter = getCellCenter(targetRow, targetCol);
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    const endX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const endY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;
    const lineId = lineIdRef.current++;

    setLines((prev) => [...prev, { id: lineId, endX, endY }]);

    // Impact flare at hit point
    const flareId = flareIdRef.current++;
    const flareSize = 18 + Math.random() * 10;
    setFlares((prev) => [...prev, { id: flareId, x: endX, y: endY, size: flareSize }]);

    setTimeout(() => {
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    }, LASER_LINE_FADEOUT_MS);
    setTimeout(() => {
      setFlares((prev) => prev.filter((f) => f.id !== flareId));
    }, LASER_FLARE_FADEOUT_MS);
  }, [targetRow, targetCol, getCellCenter, gridContainerRef]);

  useEffect(() => {
    createLine();
    const interval = setInterval(createLine, LASER_FIRE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [createLine]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();
  const attackerCenter = getAttackerOrigin();

  return (
    <>
      <svg
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: gridRect.width, height: gridRect.height }}
        viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
        preserveAspectRatio="none"
      >
        {lines.map((line) => {
          const dx = line.endX - attackerCenter.x;
          const dy = line.endY - attackerCenter.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const tr = `rotate(${angle} ${attackerCenter.x} ${attackerCenter.y})`;
          return (
            <g key={line.id} className="animate-laser-fade">
              {/* outer glow */}
              <rect
                x={attackerCenter.x} y={attackerCenter.y - 5}
                width={length} height={10}
                fill="red" opacity={0.15}
                transform={tr}
              />
              {/* main beam */}
              <rect
                x={attackerCenter.x} y={attackerCenter.y - 1.5}
                width={length} height={3}
                fill="red"
                transform={tr}
              />
              {/* hot core */}
              <rect
                x={attackerCenter.x} y={attackerCenter.y - 0.5}
                width={length} height={1}
                fill="#ffaaaa"
                transform={tr}
              />
            </g>
          );
        })}
      </svg>
      {/* Impact flares */}
      <div
        className="absolute pointer-events-none z-20"
        style={{ left: 0, top: 0, width: gridRect.width, height: gridRect.height }}
      >
        {flares.map((f) => (
          <div
            key={f.id}
            className="laser-impact-flare"
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
});

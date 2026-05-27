"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GridCell = { row: number; col: number };

interface FlakExplosionAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  targetCells: GridCell[];
}

type Shard = {
  angle: number;
  distance: number;
  width: number;
  length: number;
};

type Burst = {
  id: number;
  left: number;
  top: number;
  fireballSize: number;
  flashSize: number;
  shards: Shard[];
};

export function FlakExplosionAnimation({
  gridContainerRef,
  targetCells,
}: FlakExplosionAnimationProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const cellOrderRef = useRef<GridCell[]>([]);
  const cellIndexRef = useRef(0);

  const uniqueCells = useMemo(() => {
    const seen = new Set<string>();
    const out: GridCell[] = [];
    for (const c of targetCells) {
      const key = `${c.row}:${c.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  }, [targetCells]);

  const shuffleCells = useCallback((cells: GridCell[]) => {
    const arr = [...cells];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const getCellRect = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return null;
      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;
      return {
        gridRect,
        cellLeft: col * cellWidth,
        cellTop: row * cellHeight,
        cellWidth,
        cellHeight,
      };
    },
    [gridContainerRef],
  );

  useEffect(() => {
    cellOrderRef.current = shuffleCells(uniqueCells);
    cellIndexRef.current = 0;
  }, [uniqueCells, shuffleCells]);

  const spawnBursts = useCallback(() => {
    if (!gridContainerRef.current) return;
    if (uniqueCells.length === 0) return;

    const next: Burst[] = [];

    // Fewer tiles per tick since each burst now spawns many elements
    const tilesPerTick = Math.min(
      uniqueCells.length,
      Math.max(1, Math.ceil(uniqueCells.length / 20)),
    );

    let order = cellOrderRef.current;
    if (order.length !== uniqueCells.length) {
      order = shuffleCells(uniqueCells);
      cellOrderRef.current = order;
      cellIndexRef.current = 0;
    }

    for (let i = 0; i < tilesPerTick; i++) {
      if (cellIndexRef.current >= order.length) {
        order = shuffleCells(uniqueCells);
        cellOrderRef.current = order;
        cellIndexRef.current = 0;
      }
      const cell = order[cellIndexRef.current++];
      const rect = getCellRect(cell!.row, cell!.col);
      if (!rect) continue;

      const burstCount = Math.random() < 0.35 ? 2 : 1;
      for (let p = 0; p < burstCount; p++) {
        const fireballSize = 14 + Math.floor(Math.random() * 10);
        const flashSize = Math.floor(fireballSize * 0.6);

        const jitterX = (Math.random() - 0.5) * rect.cellWidth * 0.55;
        const jitterY = (Math.random() - 0.5) * rect.cellHeight * 0.55;
        const left = rect.cellLeft + rect.cellWidth / 2 + jitterX;
        const top = rect.cellTop + rect.cellHeight / 2 + jitterY;

        const shardCount = 5 + Math.floor(Math.random() * 4);
        const baseAngle = Math.random() * 360;
        const shards: Shard[] = Array.from({ length: shardCount }, (_, si) => ({
          angle:
            (baseAngle +
              (360 / shardCount) * si +
              (Math.random() - 0.5) * 30) %
            360,
          distance: 10 + Math.floor(Math.random() * 16),
          width: Math.random() < 0.35 ? 2 : 1,
          length: 5 + Math.floor(Math.random() * 10),
        }));

        next.push({
          id: burstIdRef.current++,
          left,
          top,
          fireballSize,
          flashSize,
          shards,
        });
      }
    }

    if (next.length === 0) return;
    setBursts((prev) => [...prev, ...next]);

    const idsToRemove = next.map((b) => b.id);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !idsToRemove.includes(b.id)));
    }, 600);
  }, [getCellRect, gridContainerRef, uniqueCells, shuffleCells]);

  useEffect(() => {
    spawnBursts();
    const interval = setInterval(spawnBursts, 45);
    return () => clearInterval(interval);
  }, [spawnBursts]);

  if (!gridContainerRef.current) return null;
  if (uniqueCells.length === 0) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  return (
    <div
      className="absolute pointer-events-none z-60"
      style={{
        left: 0,
        top: 0,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
    >
      {bursts.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: `${b.left}px`,
            top: `${b.top}px`,
            width: 0,
            height: 0,
          }}
        >
          {/* Bright initial flash */}
          <div
            className="flak-flash"
            style={{
              left: -(b.flashSize / 2),
              top: -(b.flashSize / 2),
              width: b.flashSize,
              height: b.flashSize,
            }}
          />
          {/* Expanding fireball */}
          <div
            className="flak-fireball"
            style={{
              left: -(b.fireballSize / 2),
              top: -(b.fireballSize / 2),
              width: b.fireballSize,
              height: b.fireballSize,
            }}
          />
          {/* Trailing smoke puff */}
          <div
            className="flak-smoke"
            style={{
              left: -(b.fireballSize * 0.9),
              top: -(b.fireballSize * 0.9),
              width: b.fireballSize * 1.8,
              height: b.fireballSize * 1.8,
            }}
          />
          {/* Debris shards — each wrapper rotates to point the shard outward */}
          {b.shards.map((s, si) => (
            <div
              key={si}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                transform: `rotate(${s.angle}deg)`,
              }}
            >
              <div
                className="flak-shard"
                style={
                  {
                    position: "absolute",
                    left: 0,
                    top: -(s.width / 2),
                    width: s.length,
                    height: s.width,
                    "--sd": `${s.distance}px`,
                  } as React.CSSProperties
                }
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FLAK_BURST_CLEANUP_MS,
  FLAK_BURST_SPAWN_INTERVAL_MS,
  FLAK_BURST_SLOTS,
} from "../../constants/animationTiming";
import { pushManyCapped } from "./cappedList";
import { gridLayoutSize } from "./gridLayout";

type GridCell = { row: number; col: number };

interface FlakExplosionAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  targetCells: GridCell[];
}

type Burst = {
  id: number;
  left: number;
  top: number;
  size: number;
};

export const FlakExplosionAnimation = React.memo(function FlakExplosionAnimation({
  gridContainerRef,
  targetCells,
}: FlakExplosionAnimationProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const cellOrderRef = useRef<GridCell[]>([]);
  const cellIndexRef = useRef(0);
  const mountedRef = useRef(true);
  const spawnBurstsRef = useRef<() => void>(() => {});
  useEffect(() => () => { mountedRef.current = false; }, []);

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
    // Fisher–Yates shuffle
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
      const { cellWidth, cellHeight } = gridLayoutSize(gridContainerRef.current);
      return {
        cellLeft: col * cellWidth,
        cellTop: row * cellHeight,
        cellWidth,
        cellHeight,
      };
    },
    [gridContainerRef]
  );

  // Maintain a single “storm” order across all tiles, so the effect spreads across
  // the whole affected area rather than repeating per-tile.
  useEffect(() => {
    cellOrderRef.current = shuffleCells(uniqueCells);
    cellIndexRef.current = 0;
  }, [uniqueCells, shuffleCells]);

  const spawnBursts = useCallback(() => {
    if (!gridContainerRef.current) return;
    if (uniqueCells.length === 0) return;

    const next: Burst[] = [];

    // Spawn a “slice” of the affected tiles each tick. This makes it feel like
    // one distributed AoE effect rather than identical animations per square.
    const tilesPerTick = Math.min(
      uniqueCells.length,
      Math.max(6, Math.ceil(uniqueCells.length / 8))
    );

    let order = cellOrderRef.current;
    if (order.length !== uniqueCells.length) {
      order = shuffleCells(uniqueCells);
      cellOrderRef.current = order;
      cellIndexRef.current = 0;
    }

    for (let i = 0; i < tilesPerTick; i++) {
      if (cellIndexRef.current >= order.length) {
        // Start a new pass with a new shuffle to avoid visible repetition.
        order = shuffleCells(uniqueCells);
        cellOrderRef.current = order;
        cellIndexRef.current = 0;
      }
      const cell = order[cellIndexRef.current++];
      const rect = getCellRect(cell.row, cell.col);
      if (!rect) continue;

      // 1-2 pops on a subset of tiles per tick
      const pops = 1 + (Math.random() < 0.35 ? 1 : 0);
      for (let p = 0; p < pops; p++) {
        const size = 8 + Math.floor(Math.random() * 12); // 8-19px
        const jitterX = (Math.random() - 0.5) * rect.cellWidth * 0.5;
        const jitterY = (Math.random() - 0.5) * rect.cellHeight * 0.5;

        const left = rect.cellLeft + rect.cellWidth / 2 + jitterX - size / 2;
        const top = rect.cellTop + rect.cellHeight / 2 + jitterY - size / 2;

        next.push({
          id: burstIdRef.current++,
          left,
          top,
          size,
        });
      }
    }

    if (next.length === 0) return;
    setBursts((prev) => pushManyCapped(prev, next, FLAK_BURST_SLOTS));

    // Bursts are short-lived; recycle after animation completes.
    const idsToRemove = next.map((b) => b.id);
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      setBursts((prev) => prev.filter((b) => !idsToRemove.includes(b.id)));
    }, FLAK_BURST_CLEANUP_MS);
  }, [getCellRect, gridContainerRef, uniqueCells, shuffleCells]);

  spawnBurstsRef.current = spawnBursts;
  useEffect(() => {
    spawnBurstsRef.current();
    const interval = window.setInterval(
      () => spawnBurstsRef.current(),
      FLAK_BURST_SPAWN_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, []);

  if (!gridContainerRef.current) return null;
  if (uniqueCells.length === 0) return null;

  const { width: gridWidth, height: gridHeight } = gridLayoutSize(gridContainerRef.current);

  return (
    <div
      className="absolute pointer-events-none z-60"
      style={{
        left: 0,
        top: 0,
        width: `${gridWidth}px`,
        height: `${gridHeight}px`,
      }}
    >
      {bursts.map((b) => (
        <div
          key={b.id}
          className="flak-flash"
          style={{
            left: `${b.left}px`,
            top: `${b.top}px`,
            width: `${b.size}px`,
            height: `${b.size}px`,
          }}
        />
      ))}
    </div>
  );
});


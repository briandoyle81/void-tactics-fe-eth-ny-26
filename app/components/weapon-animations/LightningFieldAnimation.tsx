"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LIGHTNING_FIELD_LOOP_MS,
  LIGHTNING_FIELD_STRING_COUNT,
} from "../../constants/animationTiming";
import { GRID_DIMENSIONS } from "../../types/types";

type GridCell = { row: number; col: number };

interface LightningFieldAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  originRow: number;
  originCol: number;
  range: number;
}

type SparkString = {
  id: number;
  d: string;
};

function cellsInRange(originRow: number, originCol: number, range: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let r = originRow - range; r <= originRow + range; r++) {
    for (let c = originCol - range; c <= originCol + range; c++) {
      if (r < 0 || c < 0 || r >= GRID_DIMENSIONS.HEIGHT || c >= GRID_DIMENSIONS.WIDTH) {
        continue;
      }
      if (Math.abs(r - originRow) + Math.abs(c - originCol) <= range) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

function randomPointInCell(cell: GridCell, inset = 0.18): { x: number; y: number } {
  return {
    x: cell.col + inset + Math.random() * (1 - inset * 2),
    y: cell.row + inset + Math.random() * (1 - inset * 2),
  };
}

function jaggedPath(x1: number, y1: number, x2: number, y2: number, segs: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const wander = (Math.random() - 0.5) * len * 0.28;
    d += ` L ${x1 + dx * t + px * wander} ${y1 + dy * t + py * wander}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

function randomSparkPath(cells: GridCell[]): string {
  if (cells.length === 0) return "";
  const from = cells[Math.floor(Math.random() * cells.length)];
  const stayInCell = Math.random() < 0.15;
  const to = stayInCell ? from : cells[Math.floor(Math.random() * cells.length)];
  const a = randomPointInCell(from);
  const b = randomPointInCell(to, stayInCell ? 0.28 : 0.18);
  const segs = stayInCell ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 3);
  return jaggedPath(a.x, a.y, b.x, b.y, segs);
}

function makePool(cells: GridCell[]): SparkString[] {
  return Array.from({ length: LIGHTNING_FIELD_STRING_COUNT }, (_, id) => ({
    id,
    d: randomSparkPath(cells),
  }));
}

export const LightningFieldAnimation = React.memo(function LightningFieldAnimation({
  originRow,
  originCol,
  range,
}: LightningFieldAnimationProps) {
  const fieldCells = useMemo(
    () => cellsInRange(originRow, originCol, range),
    [originRow, originCol, range],
  );
  const fieldCellsRef = useRef(fieldCells);
  fieldCellsRef.current = fieldCells;

  const [strings, setStrings] = useState<SparkString[]>(() => makePool(fieldCells));

  useEffect(() => {
    if (fieldCells.length === 0) {
      setStrings([]);
      return;
    }

    setStrings(makePool(fieldCells));

    const staggerMs = LIGHTNING_FIELD_LOOP_MS / LIGHTNING_FIELD_STRING_COUNT;
    const cycleGen = Array.from({ length: LIGHTNING_FIELD_STRING_COUNT }, () => -1);
    const startedAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const cells = fieldCellsRef.current;
      if (cells.length === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - startedAt;
      let changed: SparkString[] | null = null;
      for (let i = 0; i < LIGHTNING_FIELD_STRING_COUNT; i++) {
        const local = elapsed - i * staggerMs;
        if (local < 0) continue;
        const gen = Math.floor(local / LIGHTNING_FIELD_LOOP_MS);
        if (gen === cycleGen[i]) continue;
        cycleGen[i] = gen;
        if (gen === 0) continue;
        if (!changed) changed = [];
        changed.push({ id: i, d: randomSparkPath(cells) });
      }

      if (changed) {
        setStrings((prev) => {
          if (prev.length !== LIGHTNING_FIELD_STRING_COUNT) return prev;
          const next = prev.slice();
          for (const spark of changed) next[spark.id] = spark;
          return next;
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fieldCells]);

  if (fieldCells.length === 0 || strings.length === 0) return null;

  const staggerMs = LIGHTNING_FIELD_LOOP_MS / LIGHTNING_FIELD_STRING_COUNT;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[90]"
      viewBox={`0 0 ${GRID_DIMENSIONS.WIDTH} ${GRID_DIMENSIONS.HEIGHT}`}
      preserveAspectRatio="none"
    >
      {strings.map((spark) => {
        const anim = {
          animationDuration: `${LIGHTNING_FIELD_LOOP_MS}ms`,
          animationDelay: `${spark.id * staggerMs}ms`,
        };
        return (
          <g key={spark.id}>
            <path
              d={spark.d}
              pathLength={1}
              fill="none"
              stroke="#3aa8ff"
              strokeWidth={0.085}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.35}
              className="lightning-field-bolt"
              style={anim}
            />
            <path
              d={spark.d}
              pathLength={1}
              fill="none"
              stroke="#ffe866"
              strokeWidth={0.058}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
              className="lightning-field-bolt"
              style={anim}
            />
            <path
              d={spark.d}
              pathLength={1}
              fill="none"
              stroke="#56d6ff"
              strokeWidth={0.042}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lightning-field-bolt"
              style={anim}
            />
            <path
              d={spark.d}
              pathLength={1}
              fill="none"
              stroke="#9b4dff"
              strokeWidth={0.055}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
              className="lightning-field-bolt lightning-field-bolt--core"
              style={anim}
            />
            <path
              d={spark.d}
              pathLength={1}
              fill="none"
              stroke="#ffe866"
              strokeWidth={0.018}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lightning-field-bolt lightning-field-bolt--core"
              style={anim}
            />
          </g>
        );
      })}
    </svg>
  );
});

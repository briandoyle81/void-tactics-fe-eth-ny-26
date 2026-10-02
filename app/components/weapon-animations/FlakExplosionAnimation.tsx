"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  FLAK_BURST_CLEANUP_MS,
  FLAK_BURST_SPAWN_INTERVAL_MS,
  FLAK_BURST_SLOTS,
} from "../../constants/animationTiming";
import { gridLayoutSize } from "./gridLayout";
import { createOverlaySizeSync, restartCssAnimation, startVisibilityAwareInterval } from "./overlayPaint";

type GridCell = { row: number; col: number };

interface FlakExplosionAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  targetCells: GridCell[];
}

function shuffleCells(cells: GridCell[]) {
  const arr = [...cells];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sameTargetCells(a: GridCell[], b: GridCell[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].row !== b[i].row || a[i].col !== b[i].col) return false;
  }
  return true;
}

export const FlakExplosionAnimation = React.memo(function FlakExplosionAnimation({
  gridContainerRef,
  targetCells,
}: FlakExplosionAnimationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const burstRefs = useRef<Array<HTMLDivElement | null>>([]);
  const burstSlotRef = useRef(0);
  const mountedRef = useRef(true);
  const timersRef = useRef<Set<number>>(new Set());
  const cellOrderRef = useRef<GridCell[]>([]);
  const cellIndexRef = useRef(0);
  const uniqueCellsRef = useRef<GridCell[]>([]);
  const cellSizeRef = useRef<{ cellWidth: number; cellHeight: number } | null>(null);

  const cellsKey = targetCells.map((c) => `${c.row},${c.col}`).join(";");
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
    // Callers often pass a freshly allocated targetCells array with the same
    // tiles (last-move replay). Key off contents so we do not reshuffle
    // the storm on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsKey]);
  uniqueCellsRef.current = uniqueCells;

  const syncOverlaySize = useMemo(
    () =>
      createOverlaySizeSync(
        () => gridContainerRef.current,
        (width, height) => {
          const root = rootRef.current;
          if (!root) return;
          root.style.width = `${width}px`;
          root.style.height = `${height}px`;
        },
      ),
    [gridContainerRef],
  );

  useEffect(() => {
    cellOrderRef.current = shuffleCells(uniqueCells);
    cellIndexRef.current = 0;
  }, [uniqueCells]);

  useEffect(() => {
    mountedRef.current = true;
    const grid = gridContainerRef.current;
    const ro = grid ? new ResizeObserver(() => {
      cellSizeRef.current = null;
      syncOverlaySize();
    }) : null;
    if (grid && ro) ro.observe(grid);
    syncOverlaySize();

    const slotHideTimers = Array<number>(FLAK_BURST_SLOTS).fill(0);

    const hideLater = (slot: number, el: HTMLDivElement | null, ms: number) => {
      const prev = slotHideTimers[slot];
      if (prev) {
        window.clearTimeout(prev);
        timersRef.current.delete(prev);
      }
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        slotHideTimers[slot] = 0;
        if (el) el.style.display = "none";
      }, ms);
      slotHideTimers[slot] = timer;
      timersRef.current.add(timer);
    };

    const spawnBursts = () => {
      if (!mountedRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const container = gridContainerRef.current;
      const cells = uniqueCellsRef.current;
      if (!container || cells.length === 0) return;
      let cellSize = cellSizeRef.current;
      if (!cellSize) {
        const { cellWidth, cellHeight } = gridLayoutSize(container);
        cellSize = { cellWidth, cellHeight };
        cellSizeRef.current = cellSize;
        syncOverlaySize();
      }
      const { cellWidth, cellHeight } = cellSize;
      const tilesPerTick = Math.min(
        cells.length,
        Math.max(6, Math.ceil(cells.length / 8)),
      );

      let order = cellOrderRef.current;
      if (order.length !== cells.length) {
        order = shuffleCells(cells);
        cellOrderRef.current = order;
        cellIndexRef.current = 0;
      }

      for (let i = 0; i < tilesPerTick; i++) {
        if (cellIndexRef.current >= order.length) {
          order = shuffleCells(cells);
          cellOrderRef.current = order;
          cellIndexRef.current = 0;
        }
        const cell = order[cellIndexRef.current++];
        const pops = 1 + (Math.random() < 0.35 ? 1 : 0);
        for (let p = 0; p < pops; p++) {
          const size = 8 + Math.floor(Math.random() * 12);
          const jitterX = (Math.random() - 0.5) * cellWidth * 0.5;
          const jitterY = (Math.random() - 0.5) * cellHeight * 0.5;
          const left = cell.col * cellWidth + cellWidth / 2 + jitterX - size / 2;
          const top = cell.row * cellHeight + cellHeight / 2 + jitterY - size / 2;

          const slot = burstSlotRef.current % FLAK_BURST_SLOTS;
          burstSlotRef.current += 1;
          const el = burstRefs.current[slot];
          if (!el) continue;
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          restartCssAnimation(el, "flak-flash");
          hideLater(slot, el, FLAK_BURST_CLEANUP_MS);
        }
      }
    };

    spawnBursts();
    const stopInterval = startVisibilityAwareInterval(
      spawnBursts,
      FLAK_BURST_SPAWN_INTERVAL_MS,
    );
    return () => {
      mountedRef.current = false;
      stopInterval();
      ro?.disconnect();
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current.clear();
    };
  }, [gridContainerRef, syncOverlaySize]);

  if (uniqueCells.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="absolute pointer-events-none z-60"
      style={{ left: 0, top: 0, width: 0, height: 0 }}
    >
      {Array.from({ length: FLAK_BURST_SLOTS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            burstRefs.current[i] = el;
          }}
          className="flak-flash"
          style={{ display: "none" }}
        />
      ))}
    </div>
  );
}, (prev, next) =>
  prev.gridContainerRef === next.gridContainerRef &&
  sameTargetCells(prev.targetCells, next.targetCells),
);

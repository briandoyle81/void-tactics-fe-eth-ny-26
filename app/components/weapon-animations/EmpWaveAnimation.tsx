"use client";

import React, { useLayoutEffect, useState } from "react";

interface EmpWaveAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

type Geom = {
  gridRect: { width: number; height: number };
  avgCell: number;
  a: { x: number; y: number };
  t: { x: number; y: number };
  endX: number;
  endY: number;
};

function buildGeom(
  el: HTMLElement,
  attackerRow: number,
  attackerCol: number,
  targetRow: number,
  targetCol: number,
): Geom | null {
  const gridRect = {width: el.clientWidth, height: el.clientHeight};
  // After refresh the grid often reports 0×0 until fonts/layout settle; skip
  // until we have real dimensions so paths and gradients are valid.
  if (gridRect.width < 2 || gridRect.height < 2) {
    return null;
  }

  const cellWidth = gridRect.width / 17;
  const cellHeight = gridRect.height / 11;
  const avgCell = (cellWidth + cellHeight) / 2;

  const cellCenter = (row: number, col: number) => ({
    x: col * cellWidth + cellWidth / 2,
    y: row * cellHeight + cellHeight / 2,
  });

  const a = cellCenter(attackerRow, attackerCol);
  const t = cellCenter(targetRow, targetCol);

  const dx = t.x - a.x;
  const dy = t.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const extend = avgCell * 0.08;
  const endX = t.x + ux * extend;
  const endY = t.y + uy * extend;

  return {
    gridRect,
    avgCell,
    a,
    t,
    endX,
    endY,
  };
}

export const EmpWaveAnimation = React.memo(function EmpWaveAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: EmpWaveAnimationProps) {
  const [geom, setGeom] = useState<Geom | null>(null);
  // Unique defs ids: two instances (e.g. selected-ship EMP + last-move replay) can
  // share the same row/col; duplicate id="..." breaks url(#...) stroke fills in SVG.
  const defsId = React.useId().replace(/:/g, "");

  // gridContainerRef can still be null on the first layout pass (e.g. full
  // refresh). Returning early left no ResizeObserver and no buildGeom retries,
  // so the wave never appeared. Wait for the ref, then observe + retry 0×0.
  useLayoutEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let rafAttachAttempts = 0;
    const maxAttachAttempts = 64;
    let geomRetryCount = 0;
    const maxGeomRetries = 48;

    const disconnectRo = () => {
      ro?.disconnect();
      ro = null;
    };

    const applyGeom = (el: HTMLElement) => {
      if (cancelled) return;
      const next = buildGeom(
        el,
        attackerRow,
        attackerCol,
        targetRow,
        targetCol,
      );
      if (next) {
        setGeom(next);
        return;
      }
      geomRetryCount += 1;
      if (geomRetryCount < maxGeomRetries) {
        requestAnimationFrame(() => applyGeom(el));
      }
    };

    const start = (el: HTMLElement) => {
      if (cancelled) return;
      geomRetryCount = 0;
      applyGeom(el);

      disconnectRo();
      ro = new ResizeObserver(() => {
        if (!cancelled) {
          geomRetryCount = 0;
          applyGeom(el);
        }
      });
      ro.observe(el);
    };

    const waitForRef = () => {
      if (cancelled) return;
      const el = gridContainerRef.current;
      if (el) {
        start(el);
        return;
      }
      rafAttachAttempts += 1;
      if (rafAttachAttempts < maxAttachAttempts) {
        requestAnimationFrame(waitForRef);
      } else {
        setGeom(null);
      }
    };

    waitForRef();

    return () => {
      cancelled = true;
      disconnectRo();
    };
  }, [gridContainerRef, attackerRow, attackerCol, targetRow, targetCol]);

  if (!geom) return null;

  const { gridRect, avgCell, a, t, endX, endY } = geom;
  const pathD = `M ${a.x} ${a.y} L ${endX} ${endY}`;

  const baseWidth = Math.max(4, avgCell * 0.18);
  const glowWidth = baseWidth * 1.6;
  const highlightWidth = Math.max(2, baseWidth * 0.45);

  const gradientId = `emp-wave-gradient-${defsId}`;
  const impactId = `emp-impact-gradient-${defsId}`;

  return (
    <svg
      className="absolute pointer-events-none z-[100]"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1={a.x}
          y1={a.y}
          x2={endX}
          y2={endY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffb84d" stopOpacity="0.95" />
          <stop offset="75%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#56d6ff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={impactId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb84d" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#56d6ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#56d6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        d={pathD}
        fill="none"
        stroke="#56d6ff"
        strokeOpacity="0.28"
        strokeWidth={glowWidth}
        strokeLinecap="round"
      />

      <path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={baseWidth}
        strokeLinecap="round"
        className="emp-wave emp-wave--a"
      />

      <path
        d={pathD}
        fill="none"
        stroke="#ffb84d"
        strokeOpacity="0.9"
        strokeWidth={highlightWidth}
        strokeLinecap="round"
        className="emp-wave emp-wave--b"
      />

      <g className="emp-impact">
        <circle
          cx={t.x}
          cy={t.y}
          r={avgCell * 0.15}
          fill={`url(#${impactId})`}
        />
        <circle
          cx={t.x}
          cy={t.y}
          r={avgCell * 0.06}
          fill="#ffb84d"
          opacity="0.85"
        />
      </g>
    </svg>
  );
});

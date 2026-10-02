"use client";

import React, { useLayoutEffect, useState } from "react";
import { cellCenterOnGrid, gridLayoutSize } from "./gridLayout";

interface WarpFieldCollapseAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  row: number;
  col: number;
}

type WarpLayout = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  centerX: number;
  centerY: number;
};

function readWarpLayout(
  el: HTMLElement,
  row: number,
  col: number,
): WarpLayout {
  const { width, height, cellWidth, cellHeight } = gridLayoutSize(el);
  const center = cellCenterOnGrid(el, row, col);
  return {
    width,
    height,
    cellWidth,
    cellHeight,
    centerX: center.x,
    centerY: center.y,
  };
}

function warpLayoutUnchanged(prev: WarpLayout, next: WarpLayout) {
  return (
    Math.abs(prev.width - next.width) < 0.5 &&
    Math.abs(prev.height - next.height) < 0.5 &&
    Math.abs(prev.cellWidth - next.cellWidth) < 0.5 &&
    Math.abs(prev.cellHeight - next.cellHeight) < 0.5 &&
    Math.abs(prev.centerX - next.centerX) < 0.5 &&
    Math.abs(prev.centerY - next.centerY) < 0.5
  );
}

/** Warp field collapsing at a grid position (e.g. retreat last move). Uses only position data. */
export const WarpFieldCollapseAnimation = React.memo(function WarpFieldCollapseAnimation({
  gridContainerRef,
  row,
  col,
}: WarpFieldCollapseAnimationProps) {
  const [layout, setLayout] = useState<WarpLayout | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = gridContainerRef.current;
      if (!el) return;
      const next = readWarpLayout(el, row, col);
      setLayout((prev) => (prev && warpLayoutUnchanged(prev, next) ? prev : next));
    };
    measure();
    const el = gridContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gridContainerRef, row, col]);

  if (!layout) return null;

  const { width, height, cellWidth, cellHeight, centerX, centerY } = layout;
  const size = Math.max(cellWidth, cellHeight) * 2;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{
        left: 0,
        top: 0,
        width,
        height,
        zIndex: 100,
      }}
    >
      {/* Collapsing warp field (animates from large to small over 2s) */}
      <div
        className="absolute"
        style={{
          left: centerX,
          top: centerY,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          transformOrigin: "center center",
          borderRadius: "50%",
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%,
              rgba(180, 220, 255, 0.95) 0%,
              rgba(120, 190, 255, 0.85) 30%,
              rgba(80, 160, 255, 0.6) 55%,
              transparent 75%
            )
          `,
          boxShadow:
            "inset 0 0 50px rgba(200, 230, 255, 0.7), 0 0 40px rgba(120, 180, 255, 0.5)",
          animation: "warp-collapse 2s ease-in-out forwards",
          willChange: "transform, opacity",
        }}
      />
      {/* Outer ring that collapses with the field */}
      <div
        className="absolute"
        style={{
          left: centerX,
          top: centerY,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          transformOrigin: "center center",
          borderRadius: "50%",
          border: "3px solid rgba(200, 235, 255, 0.9)",
          background: "transparent",
          animation: "warp-collapse 2s ease-in-out 0.08s forwards",
          willChange: "transform, opacity",
        }}
      />
      {/* Residue: wrapper fades in once; inner div loops pulse so it’s never static */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: centerX,
          top: centerY,
          width: Math.max(cellWidth, cellHeight) * 0.5,
          height: Math.max(cellWidth, cellHeight) * 0.5,
          marginLeft: -(Math.max(cellWidth, cellHeight) * 0.25),
          marginTop: -(Math.max(cellWidth, cellHeight) * 0.25),
          transformOrigin: "center center",
          animation: "warp-residue-fade-in 0.8s ease-out 1.2s forwards",
          opacity: 0,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(150, 210, 255, 0.5) 0%, rgba(100, 170, 255, 0.25) 50%, transparent 70%)",
            boxShadow: "0 0 20px rgba(120, 180, 255, 0.4)",
            animation: "warp-residue-pulse 2.5s ease-in-out 0s infinite",
          }}
        />
      </div>
    </div>
  );
});

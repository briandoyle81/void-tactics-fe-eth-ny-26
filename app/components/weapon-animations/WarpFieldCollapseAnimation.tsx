"use client";

import React, { useCallback } from "react";

interface WarpFieldCollapseAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  row: number;
  col: number;
}

/** Warp field collapsing at a grid position (e.g. retreat last move). Uses only position data. */
export const WarpFieldCollapseAnimation = React.memo(function WarpFieldCollapseAnimation({
  gridContainerRef,
  row,
  col,
}: WarpFieldCollapseAnimationProps) {
  const getCellCenter = useCallback(
    (r: number, c: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };
      const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;
      return {
        x: c * cellWidth + cellWidth / 2,
        y: r * cellHeight + cellHeight / 2,
      };
    },
    [gridContainerRef]
  );

  if (!gridContainerRef.current) return null;

  const gridRect = {width: gridContainerRef.current.clientWidth, height: gridContainerRef.current.clientHeight};
  const cellWidth = gridRect.width / 17;
  const cellHeight = gridRect.height / 11;
  const center = getCellCenter(row, col);
  const size = Math.max(cellWidth, cellHeight) * 2;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{
        left: 0,
        top: 0,
        width: gridRect.width,
        height: gridRect.height,
        zIndex: 100,
      }}
    >
      {/* Collapsing warp field (animates from large to small over 2s) */}
      <div
        className="absolute"
        style={{
          left: center.x,
          top: center.y,
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
          left: center.x,
          top: center.y,
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
          left: center.x,
          top: center.y,
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

"use client";

import React from "react";

interface GameBoardLayoutProps {
  isCurrentPlayerTurn: boolean;
  children: React.ReactNode;
  rightControls?: React.ReactNode;
  containerRef?: React.Ref<HTMLDivElement>;
  /** Fires on left-click directly on the board frame (e.g. padding), not on the grid or controls. */
  onBoardChromeMouseDown?: () => void;
  /** Drawn over the bottom-left of the board without blocking it (e.g. MissionDialogPanel). */
  overlay?: React.ReactNode;
}

export const GameBoardLayout: React.FC<GameBoardLayoutProps> = ({
  isCurrentPlayerTurn,
  children,
  rightControls,
  containerRef,
  onBoardChromeMouseDown,
  overlay,
}) => {
  return (
    <div
      ref={containerRef}
      className="relative w-full border border-solid p-0 lg:p-2"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if (e.target !== e.currentTarget) return;
        onBoardChromeMouseDown?.();
      }}
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
        outline: `2px solid ${
          isCurrentPlayerTurn
            ? "var(--color-cyan)"
            : "var(--color-warning-red)"
        }`,
        outlineOffset: 0,
      }}
    >
      {children}

      {overlay ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[70] flex lg:bottom-4 lg:left-4">
          {overlay}
        </div>
      ) : null}

      {rightControls ? (
        <div className="mt-4 flex justify-end text-sm">{rightControls}</div>
      ) : null}
    </div>
  );
};


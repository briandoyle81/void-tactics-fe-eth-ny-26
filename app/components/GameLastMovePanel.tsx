"use client";

import React from "react";
import { GameEvents, type GameEventsLastMove, type GameEventsShipInfo } from "./GameEvents";
import { STYLE_LABEL } from "../styles/fontStyles";

interface GameLastMovePanelProps {
  isMinimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  lastMove: GameEventsLastMove | undefined;
  shipMap: Map<string, GameEventsShipInfo>;
  address?: string;
  appendDestroyedText?: boolean;
  debugSuffix?: string;
}

// Shared bottom-right "Last Move" panel between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — minimize/expand chrome around <GameEvents>.
export const GameLastMovePanel: React.FC<GameLastMovePanelProps> = ({
  isMinimized,
  onMinimize,
  onExpand,
  lastMove,
  shipMap,
  address,
  appendDestroyedText,
  debugSuffix,
}) => (
  <div className="absolute bottom-0 right-0 z-[220] pointer-events-none">
    <div className="pointer-events-auto">
      {isMinimized ? (
        <button
          type="button"
          onClick={onExpand}
          className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
          style={{
            ...STYLE_LABEL,
            borderColor: "var(--color-purple)",
            color: "var(--color-purple)",
            backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
            borderRadius: 0,
          }}
        >
          Last Move
        </button>
      ) : (
        <div className="w-[min(30rem,70vw)] max-w-full">
          <div className="mb-1 flex items-center justify-between border border-solid px-2 py-1 bg-black/80">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ ...STYLE_LABEL, color: "var(--color-purple)" }}
            >
              Last Move
            </span>
            <button
              type="button"
              onClick={onMinimize}
              className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
              style={{
                ...STYLE_LABEL,
                borderColor: "var(--color-purple)",
                color: "var(--color-purple)",
                backgroundColor: "var(--color-near-black)",
                borderRadius: 0,
              }}
            >
              Minimize
            </button>
          </div>
          <GameEvents
            lastMove={lastMove}
            shipMap={shipMap}
            address={address}
            appendDestroyedText={appendDestroyedText}
            debugSuffix={debugSuffix}
          />
        </div>
      )}
    </div>
  </div>
);

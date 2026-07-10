"use client";

import { STYLE_MONO } from "../styles/fontStyles";
import type { GameFleetCardData } from "../types/gameDisplayData";

// Shared per-ship fleet-status card between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — number-native (see app/types/gameDisplayData.ts).
// The ship image itself stays caller-rendered (`shipImage` render prop) since
// `ShipImage` (web3, bigint Ship) and `ShipImageWeb2` (web2, number Web2Ship)
// are different, mode-specific components — same pattern as GameGridTooltip's
// `renderShipCard` prop.
interface GameFleetCardProps {
  card: GameFleetCardData;
  teamColor: string;
  shipImage: React.ReactNode;
  /** Mirror the ship horizontally — web3 flips fleet art depending on which side it's shown on. */
  flip?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function GameFleetCard({
  card,
  teamColor,
  shipImage,
  flip = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GameFleetCardProps) {
  const { name, hpPct, hasMoved, isSOS } = card;
  return (
    <div
      className="flex min-w-0 w-full flex-col gap-0.5 overflow-hidden cursor-pointer"
      style={{ opacity: hasMoved ? 0.45 : 1 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "1",
          backgroundColor: "var(--color-slate)",
          border: `1px solid ${teamColor}`,
          outline: isSelected ? `2px solid ${teamColor}` : isHovered ? `1px solid ${teamColor}` : undefined,
          outlineOffset: "2px",
        }}
      >
        <div className={flip ? "scale-x-[-1] w-full h-full" : "w-full h-full"}>{shipImage}</div>
        {isSOS && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100">
              <line x1="8" y1="8" x2="92" y2="92" stroke={teamColor} strokeWidth="2.5" opacity="0.75" />
              <line x1="92" y1="8" x2="8" y2="92" stroke={teamColor} strokeWidth="2.5" opacity="0.75" />
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-0.5 z-20 flex items-center justify-center pointer-events-none" title="Disabled (0 HP)">
              <div className="px-1 py-0.5 flex items-center justify-center bg-warning-red/60 border border-warning-red">
                <span className="text-xs leading-none font-mono text-white">[SOS]</span>
              </div>
            </div>
          </>
        )}
        {hasMoved && <div className="absolute inset-0 bg-steel/50 pointer-events-none" />}
      </div>
      <span className="truncate" style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-text-secondary)" }}>
        {name}
      </span>
      <div className="overflow-hidden" style={{ height: 3, backgroundColor: "var(--color-gunmetal)" }}>
        <div style={{ width: `${hpPct}%`, height: "100%", backgroundColor: teamColor, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

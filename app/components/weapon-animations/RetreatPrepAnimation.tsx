"use client";

import React, { useEffect, useRef, useState } from "react";
import { RETREAT_GLOW_BUILD_MS } from "../../constants/animationTiming";
import { Ship } from "../../types/types";
import { ShipImage } from "../ShipImage";

interface RetreatPrepAnimationProps {
  ship: Ship;
  /** True if ship belongs to creator, false if joiner. Retreat flip: creator = native (no flip), joiner = opposite of native (flip). */
  isCreator: boolean;
  /** Same outline as selected ship: ring-2 ring-blue-400 (current player) or ring-2 ring-purple-400 (opponent). */
  selectionOutlineClassName?: string;
}


/** Shown in-cell when player selects Retreat: ship flips to face starting side and engine glow powers up. */
export const RetreatPrepAnimation = React.memo(function RetreatPrepAnimation({
  ship,
  isCreator,
  selectionOutlineClassName = "ring-2 ring-blue-400",
}: RetreatPrepAnimationProps) {
  const [glowOpacity, setGlowOpacity] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - (startTimeRef.current ?? 0);
      const t = Math.min(1, elapsed / RETREAT_GLOW_BUILD_MS);
      setGlowOpacity(t * 0.95);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // In game: creator ships have scale-x-[-1], joiner have no flip. When retreating we want opposite of in-game.
  // Creator retreating = native NFT position = no flip. Joiner retreating = opposite of native = flip.
  const shipFlipForRetreat = isCreator ? "scaleX(1)" : "scaleX(-1)";
  const engineOnRightSide = isCreator; // creator flees left so engine glow on ship's right

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-sm ${selectionOutlineClassName}`}
    >
      {/* When ship faces left: glow left edge 10% from right edge. When ship faces right: glow right edge 10% from left. Wide so it extends into the cell behind. */}
      <div
        className="absolute pointer-events-none animate-thrust-pulse"
        style={{
          left: engineOnRightSide ? "90%" : "auto",
          right: engineOnRightSide ? "auto" : "90%",
          top: "55%",
          width: "55%",
          height: "25%",
          marginTop: "-12.5%",
          marginLeft: engineOnRightSide ? 0 : undefined,
          transformOrigin: engineOnRightSide ? "left center" : "right center",
          // Thrust shape: bright at nozzle (ship side), fading backward like exhaust
          background:
            engineOnRightSide
              ? "linear-gradient(90deg, rgba(180, 230, 255, 0.95) 0%, rgba(120, 200, 255, 0.7) 25%, rgba(80, 170, 255, 0.4) 50%, transparent 85%)"
              : "linear-gradient(270deg, rgba(180, 230, 255, 0.95) 0%, rgba(120, 200, 255, 0.7) 25%, rgba(80, 170, 255, 0.4) 50%, transparent 85%)",
          opacity: glowOpacity,
          filter: "blur(3px)",
          transition: "opacity 0.05s linear",
          clipPath: engineOnRightSide
            ? "ellipse(100% 50% at 0% 50%)"
            : "ellipse(100% 50% at 100% 50%)",
        }}
      />
      {/* Ship art - opposite of in-game: creator = native (no flip), joiner = flip */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transform: shipFlipForRetreat,
        }}
      >
        <ShipImage
          ship={ship}
          className="w-full h-full object-contain"
          showLoadingState={false}
        />
      </div>
    </div>
  );
});

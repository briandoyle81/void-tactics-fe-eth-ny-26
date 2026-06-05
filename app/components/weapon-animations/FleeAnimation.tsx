"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FLEE_GLOW_BUILD_MS, FLEE_ZOOM_DURATION_MS } from "../../constants/animationTiming";
import { Ship } from "../../types/types";
import { ShipImage } from "../ShipImage";

interface FleeAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  fromRow: number;
  fromCol: number;
  ship: Ship;
  /** True if ship belongs to creator, false if joiner. Retreat flip: creator = native (no flip), joiner = opposite (flip). */
  isCreator: boolean;
  /** When true, skip glow build and start zoom immediately (used after tx completes). */
  skipToZoom?: boolean;
}


export const FleeAnimation = React.memo(function FleeAnimation({
  gridContainerRef,
  fromRow,
  fromCol,
  ship,
  isCreator,
  skipToZoom = false,
}: FleeAnimationProps) {
  const [phase, setPhase] = useState<"glow" | "zoom" | "done">(
    skipToZoom ? "zoom" : "glow"
  );
  const [glowOpacity, setGlowOpacity] = useState(skipToZoom ? 1 : 0);
  const startTimeRef = useRef<number | null>(null);
  const glowFrameRef = useRef<number | null>(null);

  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };
      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;
      return {
        x: col * cellWidth + cellWidth / 2,
        y: row * cellHeight + cellHeight / 2,
      };
    },
    [gridContainerRef]
  );

  // Phase 1: build engine glow (skipped when skipToZoom)
  useEffect(() => {
    if (phase !== "glow" || skipToZoom) return;
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - (startTimeRef.current ?? 0);
      const t = Math.min(1, elapsed / FLEE_GLOW_BUILD_MS);
      setGlowOpacity(t * 0.95);
      if (t < 1) {
        glowFrameRef.current = requestAnimationFrame(tick);
      } else {
        setPhase("zoom");
      }
    };
    glowFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (glowFrameRef.current != null) cancelAnimationFrame(glowFrameRef.current);
    };
  }, [phase, skipToZoom]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();
  const cellWidth = gridRect.width / 17;
  const cellHeight = gridRect.height / 11;
  const center = getCellCenter(fromRow, fromCol);

  // In game: creator has scale-x-[-1], joiner has no flip. When retreating = opposite of in-game.
  const shipFlipForRetreat = isCreator ? "scaleX(1)" : "scaleX(-1)";
  const engineOnRightSide = isCreator; // creator flees left so trail/glow on ship's right
  const translateDirection = isCreator ? -1 : 1;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      style={{
        left: 0,
        top: 0,
        width: gridRect.width,
        height: gridRect.height,
      }}
    >
      <div
        className="absolute overflow-visible"
        style={{
          left: center.x,
          top: center.y,
          width: cellWidth * 1.2,
          height: cellHeight * 1.2,
          marginLeft: -(cellWidth * 0.6),
          marginTop: -(cellHeight * 0.6),
          transform: "translateX(0)",
          ...(phase === "zoom" && {
            animation: `flee-zoom-off ${FLEE_ZOOM_DURATION_MS}ms ease-out forwards`,
          }),
          ["--flee-direction" as string]: translateDirection,
          transformOrigin: "center center",
        }}
      >
        {/* Thick line of light behind ship (engine trail) - behind ship in DOM */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            left: engineOnRightSide ? "100%" : "auto",
            right: engineOnRightSide ? "auto" : "100%",
            top: "50%",
            width: cellWidth * 2.5,
            height: 4,
            marginTop: -2,
            marginLeft: engineOnRightSide ? 0 : -cellWidth * 2.5,
            background: `linear-gradient(${engineOnRightSide ? "90deg" : "270deg"}, transparent 0%, rgba(100, 200, 255, 0.3) 15%, rgba(150, 220, 255, 0.85) 45%, rgba(200, 240, 255, 0.95) 70%, rgba(255, 255, 255, 0.9) 100%)`,
            opacity: phase === "zoom" ? 1 : glowOpacity,
            filter: "blur(2px)",
            transition: phase === "glow" ? "opacity 0.05s linear" : "none",
          }}
        />
        {/* When ship faces left: glow left edge 10% from right edge. When ship faces right: glow right edge 10% from left. Wide so it extends into the cell behind. */}
        <div
          className={`absolute pointer-events-none ${phase === "glow" ? "animate-thrust-pulse" : ""}`}
          style={{
            left: engineOnRightSide ? "90%" : "auto",
            right: engineOnRightSide ? "auto" : "90%",
            top: "55%",
            width: "55%",
            height: "25%",
            marginTop: "-12.5%",
            marginLeft: engineOnRightSide ? 0 : undefined,
            transformOrigin: engineOnRightSide ? "left center" : "right center",
            background:
              engineOnRightSide
                ? "linear-gradient(90deg, rgba(180, 230, 255, 0.95) 0%, rgba(120, 200, 255, 0.7) 25%, rgba(80, 170, 255, 0.4) 50%, transparent 85%)"
                : "linear-gradient(270deg, rgba(180, 230, 255, 0.95) 0%, rgba(120, 200, 255, 0.7) 25%, rgba(80, 170, 255, 0.4) 50%, transparent 85%)",
            opacity: glowOpacity,
            filter: "blur(3px)",
            transition: phase === "glow" ? "opacity 0.05s linear" : "none",
            clipPath: engineOnRightSide
              ? "ellipse(100% 50% at 0% 50%)"
              : "ellipse(100% 50% at 100% 50%)",
          }}
        />
        {/* Ship art - opposite of in-game: creator = native (no flip), joiner = flip */}
        <div
          className="absolute inset-0 flex items-center justify-center"
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
    </div>
  );
});

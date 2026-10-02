"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FLEE_GLOW_BUILD_MS, FLEE_ZOOM_DURATION_MS } from "../../constants/animationTiming";
import { Ship } from "../../types/types";
import { ShipImage } from "../ShipImage";
import { cellCenterOnGrid, gridLayoutSize } from "./gridLayout";

type FleeLayout = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  centerX: number;
  centerY: number;
};

function readFleeLayout(el: HTMLElement, fromRow: number, fromCol: number): FleeLayout {
  const { width, height, cellWidth, cellHeight } = gridLayoutSize(el);
  const center = cellCenterOnGrid(el, fromRow, fromCol);
  return {
    width,
    height,
    cellWidth,
    cellHeight,
    centerX: center.x,
    centerY: center.y,
  };
}

function fleeLayoutUnchanged(prev: FleeLayout, next: FleeLayout) {
  return (
    Math.abs(prev.width - next.width) < 0.5 &&
    Math.abs(prev.height - next.height) < 0.5 &&
    Math.abs(prev.cellWidth - next.cellWidth) < 0.5 &&
    Math.abs(prev.cellHeight - next.cellHeight) < 0.5 &&
    Math.abs(prev.centerX - next.centerX) < 0.5 &&
    Math.abs(prev.centerY - next.centerY) < 0.5
  );
}

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
  // Glow ramps through the DOM, not React state: a per-frame setState
  // re-rendered this overlay (and its ShipImage) for the whole build-up.
  // The JSX opacity values below stay constant within a phase, so React
  // does not overwrite what the rAF loop writes.
  const initialGlowOpacity = skipToZoom ? 1 : 0;
  const trailRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<FleeLayout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const glowFrameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = gridContainerRef.current;
      if (!el) return;
      const next = readFleeLayout(el, fromRow, fromCol);
      setLayout((prev) => (prev && fleeLayoutUnchanged(prev, next) ? prev : next));
    };
    measure();
    const el = gridContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gridContainerRef, fromRow, fromCol]);

  // Phase 1: build engine glow (skipped when skipToZoom)
  useEffect(() => {
    if (phase !== "glow" || skipToZoom) return;
    startTimeRef.current = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - (startTimeRef.current ?? 0);
      const t = Math.min(1, elapsed / FLEE_GLOW_BUILD_MS);
      const opacity = String(t * 0.95);
      if (trailRef.current) trailRef.current.style.opacity = opacity;
      if (glowRef.current) glowRef.current.style.opacity = opacity;
      if (t < 1) {
        glowFrameRef.current = requestAnimationFrame(tick);
      } else {
        setPhase("zoom");
      }
    };
    glowFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (glowFrameRef.current != null) cancelAnimationFrame(glowFrameRef.current);
    };
  }, [phase, skipToZoom]);

  if (!layout) return null;

  const { width, height, cellWidth, cellHeight, centerX, centerY } = layout;

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
        width,
        height,
      }}
    >
      <div
        className="absolute overflow-visible"
        style={{
          left: centerX,
          top: centerY,
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
          ref={trailRef}
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
            opacity: phase === "zoom" ? 1 : initialGlowOpacity,
            filter: "blur(2px)",
            transition: phase === "glow" ? "opacity 0.05s linear" : "none",
          }}
        />
        {/* When ship faces left: glow left edge 10% from right edge. When ship faces right: glow right edge 10% from left. Wide so it extends into the cell behind. */}
        <div
          ref={glowRef}
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
            opacity: initialGlowOpacity,
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

"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Game chrome layout: side rail only (left rail + grid). Width is fitted so the
 * grid border stays fully visible in the viewport (no top/side mode switching).
 */
export type GameViewChromeLayout = "top" | "side";

export function horizontalWastePx(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return r.left + (window.innerWidth - r.right);
}

export const GAME_VIEW_EDGE_PAD_PX = 8;
export const GAME_VIEW_EDGE_PAD_MOBILE_PX = 0;

const GRID_BOTTOM_MARGIN = 8;
const GRID_BOTTOM_MARGIN_MOBILE = 0;

/** GameBoardLayout outline width; getBoundingClientRect omits outline, so we pad for it. */
const GRID_OUTLINE_WIDTH_PX = 2;

const MIN_GAME_ROOT_WIDTH_PX = 200;

/** Side breakout + flex; width is set by the hook so the grid fits vertically. */
export const GAME_VIEW_SIDE_ROOT_CLASS =
  "max-w-none min-w-0 box-border ml-[calc(50%-50vw)] lg:ml-[calc(50%-50vw+8px)]";

export function useGameViewChromeLayout(
  gameRootRef: RefObject<HTMLElement | null>,
  gridContainerRef: RefObject<HTMLElement | null>,
): GameViewChromeLayout {
  useLayoutEffect(() => {
    let cancelled = false;
    let attached = false;
    let rafOut = 0;
    let ro: ResizeObserver | null = null;
    let lastFitKey = "";
    let lastAppliedWidth = -1;

    const scheduleTick = () => {
      cancelAnimationFrame(rafOut);
      rafOut = requestAnimationFrame(tick);
    };

    const tick = () => {
      if (cancelled) return;

      const root = gameRootRef.current;
      const gridContainer = gridContainerRef.current;
      if (!root || !gridContainer) return;

      const vh = window.innerHeight;
      const layoutViewportW =
        document.documentElement?.clientWidth ?? window.innerWidth;
      const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;
      const edgePad = isMobileViewport
        ? GAME_VIEW_EDGE_PAD_MOBILE_PX
        : GAME_VIEW_EDGE_PAD_PX;
      const rightLimit =
        layoutViewportW -
        edgePad -
        (isMobileViewport ? 0 : GRID_OUTLINE_WIDTH_PX);
      const gridBottomMargin = isMobileViewport
        ? GRID_BOTTOM_MARGIN_MOBILE
        : GRID_BOTTOM_MARGIN;

      root.style.boxSizing = "border-box";

      const parentWidth =
        root.parentElement?.clientWidth ?? document.documentElement.clientWidth;
      if (parentWidth <= 0) return;

      const fitKey = `${parentWidth}|${vh}|${layoutViewportW}|${isMobileViewport ? 1 : 0}`;
      if (fitKey === lastFitKey && lastAppliedWidth > 0) return;
      lastFitKey = fitKey;

      const rootLeft = root.getBoundingClientRect().left;
      const maxWFromViewport = Math.max(
        MIN_GAME_ROOT_WIDTH_PX,
        Math.floor(rightLimit - rootLeft),
      );
      const maxW = Math.min(parentWidth, maxWFromViewport);

      const gridFitsViewport = () => {
        const gridRect = gridContainer.getBoundingClientRect();
        const verticalFits = gridRect.bottom <= vh - gridBottomMargin;
        const horizontalFits = gridRect.right <= rightLimit;
        return verticalFits && horizontalFits;
      };

      let low = Math.min(Math.max(820, Math.floor(parentWidth * 0.55)), maxW);
      let high = maxW;
      let best = low;

      if (low > high) {
        let w = maxW;
        root.style.width = `${w}px`;
        if (!gridFitsViewport()) {
          let lo = MIN_GAME_ROOT_WIDTH_PX;
          let hi = maxW;
          let bestFit = lo;
          for (let j = 0; j < 16; j++) {
            const mid = Math.floor((lo + hi) / 2);
            root.style.width = `${mid}px`;
            if (gridFitsViewport()) {
              bestFit = mid;
              lo = mid + 1;
            } else {
              hi = mid - 1;
            }
          }
          w = bestFit;
          root.style.width = `${w}px`;
        }
        lastAppliedWidth = w;
        return;
      }

      for (let i = 0; i < 12; i++) {
        const mid = Math.floor((low + high) / 2);
        root.style.width = `${mid}px`;
        const fits = gridFitsViewport();

        if (fits) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      let w = Math.min(best, maxW);
      root.style.width = `${w}px`;
      if (!gridFitsViewport()) {
        let lo = MIN_GAME_ROOT_WIDTH_PX;
        let hi = w;
        let bestFit = lo;
        for (let j = 0; j < 16; j++) {
          const mid = Math.floor((lo + hi) / 2);
          root.style.width = `${mid}px`;
          if (gridFitsViewport()) {
            bestFit = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        w = bestFit;
        root.style.width = `${w}px`;
      }
      lastAppliedWidth = w;
    };

    const tryAttach = () => {
      if (cancelled || attached) return;

      const root = gameRootRef.current;
      const gridContainer = gridContainerRef.current;
      if (!root || !gridContainer) {
        rafOut = requestAnimationFrame(tryAttach);
        return;
      }

      attached = true;

      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          scheduleTick();
        });
        // Observe parent + grid only. Watching `root` while tick() writes
        // `root.style.width` re-enters the observer and can loop.
        ro.observe(gridContainer);
        if (root.parentElement) ro.observe(root.parentElement);
      }

      window.addEventListener("resize", scheduleTick);
      scheduleTick();
    };

    tryAttach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafOut);
      window.removeEventListener("resize", scheduleTick);
      ro?.disconnect();
      ro = null;
      attached = false;

      const root = gameRootRef.current;
      if (root) {
        root.style.width = "";
        root.style.boxSizing = "";
      }
    };
  }, [gameRootRef, gridContainerRef]);

  return "side";
}

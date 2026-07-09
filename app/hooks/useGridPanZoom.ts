import { useCallback, useEffect, useRef, useState } from "react";

interface Zoom {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Wheel-to-zoom and right-click-drag-to-pan for the game grid. Extracted
 * verbatim from `GameGrid.tsx` — same math, same event wiring, no behavior
 * change. `gridContainerRef` is created here and returned so callers can
 * both apply pan/zoom to it and pass the same ref down to children that
 * need to measure grid cells (tooltips, weapon animations, etc).
 */
export function useGridPanZoom() {
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<Zoom>({ scale: 1, tx: 0, ty: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Right-click pan state
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const panDidMoveRef = useRef(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const outer = outerWrapperRef.current;
    const el = gridContainerRef.current;
    if (!outer || !el) return;

    // Use the outer wrapper's rect (no transform applied) + the element's untransformed
    // offsetLeft/offsetTop (= padding) to get the element's natural screen position.
    const outerRect = outer.getBoundingClientRect();
    const naturalLeft = outerRect.left + el.offsetLeft;
    const naturalTop = outerRect.top + el.offsetTop;

    // Cursor in natural (pre-transform) element coordinates
    const mx = e.clientX - naturalLeft;
    const my = e.clientY - naturalTop;

    const { scale, tx, ty } = zoomRef.current;

    const ZOOM_FACTOR = 1.15;
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

    const delta = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
    if (newScale === scale) return;

    // Keep the point under the cursor fixed:
    // contentPt = (cursor - translate) / scale  →  after zoom: translate' = cursor - contentPt * newScale
    const contentX = (mx - tx) / scale;
    const contentY = (my - ty) / scale;
    let newTx = mx - contentX * newScale;
    let newTy = my - contentY * newScale;

    // Clamp so you can't pan the grid fully off-screen
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxTx = 0;
    const minTx = w * (1 - newScale);
    const maxTy = 0;
    const minTy = h * (1 - newScale);
    newTx = Math.min(maxTx, Math.max(minTx, newTx));
    newTy = Math.min(maxTy, Math.max(minTy, newTy));

    // Reset translate when returning to scale 1
    if (newScale === MIN_SCALE) { newTx = 0; newTy = 0; }

    setZoom({ scale: newScale, tx: newTx, ty: newTy });
  }, []);

  useEffect(() => {
    const el = outerWrapperRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: zoomRef.current.tx, ty: zoomRef.current.ty };
      panDidMoveRef.current = false;
    };

    let rafId: number | null = null;
    const onMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (!panDidMoveRef.current && Math.hypot(dx, dy) < 4) return;
      panDidMoveRef.current = true;

      if (rafId !== null) return; // skip if a frame is already queued
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!panStartRef.current) return;
        const { scale } = zoomRef.current;
        const gridEl = gridContainerRef.current;
        const w = gridEl?.offsetWidth ?? el.offsetWidth;
        const h = gridEl?.offsetHeight ?? el.offsetHeight;
        const tdx = e.clientX - panStartRef.current.x;
        const tdy = e.clientY - panStartRef.current.y;
        const newTx = Math.min(0, Math.max(w * (1 - scale), panStartRef.current.tx + tdx));
        const newTy = Math.min(0, Math.max(h * (1 - scale), panStartRef.current.ty + tdy));
        setZoom((prev) => ({ ...prev, tx: newTx, ty: newTy }));
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panStartRef.current = null;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (panDidMoveRef.current) e.preventDefault();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("contextmenu", onContextMenu, { capture: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("contextmenu", onContextMenu, { capture: true });
    };
  }, [handleWheel]);

  return { outerWrapperRef, gridContainerRef, zoom };
}

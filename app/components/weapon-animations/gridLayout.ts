import { GRID_DIMENSIONS } from "../../types/types";

/**
 * Unzoomed live-game cells are about this many CSS pixels (17-wide grid
 * in an ~850px board). Pixel muzzle nudges are stored against this size
 * and scaled by `scaleCellPx` so zoom and cropped hero cells keep the
 * same seat on the sprite.
 */
const UNZOOMED_CELL_PX = 50;

/**
 * Layout size of the game grid in untransformed pixels.
 * Overlays live inside the pan/zoom CSS transform, so getBoundingClientRect
 * is already scaled and would double-apply zoom. offsetWidth/offsetHeight
 * are the pre-transform layout box.
 */
export function gridLayoutSize(el: HTMLElement) {
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  return {
    width,
    height,
    cellWidth: width / GRID_DIMENSIONS.WIDTH,
    cellHeight: height / GRID_DIMENSIONS.HEIGHT,
  };
}

/** Map a layout-px nudge (tuned at `UNZOOMED_CELL_PX`) onto the current cell. */
export function scaleCellPx(cellSize: number, pxAtUnzoomed: number) {
  return (pxAtUnzoomed / UNZOOMED_CELL_PX) * cellSize;
}

export function cellLayoutBox(
  container: HTMLElement,
  row: number,
  col: number,
): { x: number; y: number; width: number; height: number } {
  const cell = container.querySelector(
    `[data-grid-row="${row}"][data-grid-col="${col}"]`,
  ) as HTMLElement | null;
  if (cell) {
    const cr = cell.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    const sx = pr.width / Math.max(container.offsetWidth, 1);
    const sy = pr.height / Math.max(container.offsetHeight, 1);
    return {
      x: (cr.left - pr.left) / sx,
      y: (cr.top - pr.top) / sy,
      width: cr.width / sx,
      height: cr.height / sy,
    };
  }
  const { cellWidth, cellHeight } = gridLayoutSize(container);
  return {
    x: col * cellWidth,
    y: row * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
}

export function cellCenterOnGrid(
  el: HTMLElement,
  row: number,
  col: number,
): { x: number; y: number } {
  const { cellWidth, cellHeight } = gridLayoutSize(el);
  return {
    x: col * cellWidth + cellWidth / 2,
    y: row * cellHeight + cellHeight / 2,
  };
}

import { gridLayoutSize } from "./gridLayout";

export function setHidden(el: Element | null | undefined, hidden: boolean) {
  if (!el) return;
  (el as HTMLElement | SVGElement).style.display = hidden ? "none" : "";
}

export function setLine(
  el: SVGLineElement | null | undefined,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  if (!el) return;
  el.setAttribute("x1", String(x1));
  el.setAttribute("y1", String(y1));
  el.setAttribute("x2", String(x2));
  el.setAttribute("y2", String(y2));
}

export function setCircle(
  el: SVGCircleElement | null | undefined,
  cx: number,
  cy: number,
  r: number,
) {
  if (!el) return;
  el.setAttribute("cx", String(cx));
  el.setAttribute("cy", String(cy));
  el.setAttribute("r", String(Math.max(0, r)));
}

export function setPolyline(
  el: SVGPolylineElement | null | undefined,
  points: string,
) {
  if (!el) return;
  el.setAttribute("points", points);
}

export function createOverlaySizeSync(
  getGrid: () => HTMLElement | null,
  apply: (width: number, height: number) => void,
) {
  const last = { width: 0, height: 0 };
  return () => {
    const grid = getGrid();
    if (!grid) return;
    const { width, height } = gridLayoutSize(grid);
    if (width < 2 || height < 2) return;
    if (last.width === width && last.height === height) return;
    last.width = width;
    last.height = height;
    apply(width, height);
  };
}

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

/**
 * Replay a pooled slot's CSS animation without forcing layout.
 * A hidden slot restarts on its own when un-hidden. A slot reused while
 * still visible is rewound through the Web Animations API. Deferring the
 * class re-add to rAF does not work: rAF runs before style recalc, so the
 * removal is never observed and the slot paints one unanimated frame.
 */
export function restartCssAnimation(el: Element | null, className: string) {
  if (!el) return;
  const styled = el as HTMLElement | SVGElement;
  if (!el.classList.contains(className)) el.classList.add(className);
  if (styled.style.display === "none") {
    styled.style.display = "";
    return;
  }
  if (typeof el.getAnimations !== "function") return;
  for (const anim of el.getAnimations()) {
    anim.currentTime = 0;
    anim.play();
  }
}

/** One rAF loop that cannot reschedule after cleanup, even if a frame is in flight.
 *  Hidden tabs do not keep a 60fps chain; visibilitychange resumes it. */
export function startCancelledRaf(frame: FrameRequestCallback): () => void {
  let cancelled = false;
  let id = 0;
  const tick: FrameRequestCallback = (now) => {
    if (cancelled) return;
    id = 0;
    if (typeof document === "undefined" || !document.hidden) {
      frame(now);
    }
    if (cancelled) return;
    if (typeof document !== "undefined" && document.hidden) return;
    id = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (cancelled || id || (typeof document !== "undefined" && document.hidden)) return;
    id = requestAnimationFrame(tick);
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", resume);
  }
  id = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
    id = 0;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", resume);
    }
  };
}

/** Interval that does not keep firing while the tab is hidden. */
export function startVisibilityAwareInterval(
  tick: () => void,
  ms: number,
): () => void {
  let id = 0;
  const start = () => {
    if (id) return;
    id = window.setInterval(tick, ms);
  };
  const stop = () => {
    if (!id) return;
    window.clearInterval(id);
    id = 0;
  };
  const onVis = () => {
    if (typeof document !== "undefined" && document.hidden) {
      stop();
      return;
    }
    tick();
    start();
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVis);
    if (!document.hidden) start();
  } else {
    start();
  }
  return () => {
    stop();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVis);
    }
  };
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

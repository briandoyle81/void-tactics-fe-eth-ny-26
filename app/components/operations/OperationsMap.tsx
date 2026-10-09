"use client";

import { useEffect, type ReactNode } from "react";

// The Operations run map: the star chart fills the frame, the selected
// mission opens as a drawer from the right covering a third of the width
// (the chart re-centers in the rest), and the action bar runs along the
// bottom with the primary action at the right. On phones the drawer is a
// sheet over the bottom of the chart. Shared by RoguelikeGraph (web3) and
// RoguelikeGraphWeb2.

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

export function OperationsMap({
  toolbar,
  banner,
  canvas,
  drawer,
  drawerOpen,
  onDrawerOpenChange,
  actionBar,
}: {
  /** Controls at the top right (retreat, edit mode, ...). */
  toolbar: ReactNode;
  /** A notice under the toolbar, e.g. connect-mode instructions. */
  banner?: ReactNode;
  canvas: ReactNode;
  /** Drawer content; null when nothing is selected. */
  drawer: ReactNode | null;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  actionBar?: ReactNode;
}) {
  const isOpen = drawerOpen && drawer != null;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onDrawerOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onDrawerOpenChange]);

  const canvasPadClass = isOpen ? "md:pr-[33.4%]" : "";

  return (
    <div className="flex flex-col border-2 border-solid" style={{ borderColor: "var(--color-steel)" }}>
      <div
        className="flex flex-wrap items-center justify-end gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-near-black)" }}
      >
        {toolbar}
      </div>
      {banner}

      <div className="relative overflow-hidden">
        <div className={`transition-[padding] duration-200 ${canvasPadClass}`}>{canvas}</div>

        {drawer != null && isOpen && (
          <aside
            aria-label="Mission"
            className={`absolute inset-x-0 bottom-0 z-20 max-h-[75%] overflow-y-auto border-t-2 bg-near-black md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:overflow-visible md:w-[33.4%] md:border-l md:border-t-0`}
            style={{ borderColor: "var(--color-cyan)", boxShadow: "-1.2rem 0 2.4rem rgba(0,0,0,0.6)" }}
          >
            <button
              type="button"
              onClick={() => onDrawerOpenChange(false)}
              aria-label="Close mission panel"
              title="Close (Esc)"
              className="absolute right-2 top-2 z-10 text-xl leading-none text-text-muted hover:text-text-primary md:left-[-1.6rem] md:right-auto md:top-1/2 md:flex md:h-16 md:w-[1.6rem] md:-translate-y-1/2 md:items-center md:justify-center md:border md:border-r-0 md:bg-near-black md:text-cyan"
              style={{ borderColor: "var(--color-cyan)" }}
            >
              <span className="md:hidden">×</span>
              <span className="hidden md:inline">›</span>
            </button>
            <div className="h-full md:overflow-y-auto">{drawer}</div>
          </aside>
        )}

        {drawer != null && !isOpen && (
          <button
            type="button"
            onClick={() => onDrawerOpenChange(true)}
            className="absolute bottom-3 right-3 z-20 border border-solid px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-steel md:bottom-auto md:right-0 md:top-1/2 md:-translate-y-1/2 md:border-r-0"
            style={{ ...DISPLAY_FONT, borderColor: "var(--color-cyan)", backgroundColor: "var(--color-near-black)" }}
          >
            ‹ Mission
          </button>
        )}
      </div>

      {actionBar}
    </div>
  );
}

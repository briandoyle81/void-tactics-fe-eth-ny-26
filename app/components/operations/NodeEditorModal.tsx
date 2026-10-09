"use client";

import { useEffect, type ReactNode } from "react";

// Full-screen editor for a campaign map node (run map Edit Mode), shared by
// RoguelikeGraph and RoguelikeGraphWeb2. The player view keeps its mission
// drawer; editing gets the whole screen for the node form, fleet and dialog
// tools. Closes on ✕ or Esc, back to the map.

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

export function NodeEditorModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    // Keep the page behind from scrolling under the modal.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[420] flex flex-col bg-near-black"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
        style={{ borderColor: "var(--color-amber)" }}
      >
        <h2 className="truncate text-xl font-bold uppercase tracking-wider text-amber" style={DISPLAY_FONT}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 border border-gunmetal px-3 py-1 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-amber hover:text-amber"
          aria-label="Close node editor"
          title="Close (Esc)"
        >
          ✕ Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

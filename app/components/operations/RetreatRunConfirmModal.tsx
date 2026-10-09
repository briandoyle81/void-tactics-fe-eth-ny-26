"use client";

import { useEffect } from "react";

// Confirmation before retreating an Operations run (the run map's Retreat
// run button), shared by RoguelikeGraph and RoguelikeGraphWeb2. Stays open
// while the retreat is in progress.

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;
const MONO_FONT = { fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" } as const;

export function RetreatRunConfirmModal({
  isRetreating,
  onConfirm,
  onCancel,
}: {
  isRetreating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isRetreating) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRetreating, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/80 p-4"
      onClick={() => {
        if (!isRetreating) onCancel();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="retreat-run-title"
        className="w-full max-w-md border-2 border-solid bg-near-black p-6"
        style={{ borderColor: "var(--color-warning-red)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="retreat-run-title"
          className="text-2xl font-bold uppercase tracking-wider text-warning-red"
          style={DISPLAY_FONT}
        >
          Retreat this run?
        </h2>
        <ul className="mt-4 space-y-1.5 text-sm text-text-secondary" style={MONO_FONT}>
          <li>• The run ends here. Your progress through the map is lost.</li>
          <li>• Your ships return to the Fleet.</li>
          <li>• A battle still in progress is forfeited.</li>
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={isRetreating}
            className="border-2 border-solid border-gunmetal px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-steel hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            style={DISPLAY_FONT}
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRetreating}
            className="border-2 border-solid border-warning-red bg-warning-red/10 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-warning-red transition-colors hover:bg-warning-red/20 disabled:cursor-not-allowed disabled:opacity-60"
            style={DISPLAY_FONT}
          >
            {isRetreating ? "Retreating…" : "Retreat run"}
          </button>
        </div>
      </div>
    </div>
  );
}

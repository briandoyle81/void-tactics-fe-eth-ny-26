"use client";

import { MANAGE_NAVY_TUTORIAL_MONO } from "./ManageNavyTutorialPanels";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) —
// one-time-per-session notice that fleet presets are local-storage only,
// ported verbatim from ManageNavy.tsx.
interface FleetCompositionLocalNoticeModalProps {
  show: boolean;
  onCancel: () => void;
  onAcknowledge: () => void;
}

export function FleetCompositionLocalNoticeModal({
  show,
  onCancel,
  onAcknowledge,
}: FleetCompositionLocalNoticeModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4">
      <div
        className="max-w-md w-full border-2 bg-near-black p-5"
        style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fleet-composition-local-title"
      >
        <h3
          id="fleet-composition-local-title"
          className="text-lg font-bold uppercase tracking-wide text-primary mb-3"
          style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
        >
          Local fleet presets
        </h3>
        <p className="text-sm leading-relaxed text-primary mb-5" style={MANAGE_NAVY_TUTORIAL_MONO}>
          Fleet compositions are saved only in this browser (local storage).
          Clearing site data, another device, or another browser will not
          have these presets. Use export to back up JSON and import to
          restore them.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-steel text-secondary hover:bg-steel/50 font-mono text-sm"
            style={{ borderRadius: 0 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAcknowledge}
            className="px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm"
            style={{ borderRadius: 0 }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

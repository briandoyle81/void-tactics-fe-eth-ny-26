"use client";

interface CampaignEditModeToggleProps {
  isEditor: boolean;
  editMode: boolean;
  onToggle: () => void;
}

// Shared, dumb presentational toggle for the in-context campaign map editor
// (both CampaignGraph.tsx/Web2.tsx and RoguelikeGraph.tsx/Web2.tsx) —
// renders nothing for a non-editor, so it's safe to mount unconditionally
// in headerExtra and let the caller's own role check gate visibility.
export function CampaignEditModeToggle({ isEditor, editMode, onToggle }: CampaignEditModeToggleProps) {
  if (!isEditor) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="self-start border-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors font-mono"
      style={{
        borderRadius: 0,
        borderColor: editMode ? "var(--color-amber)" : "var(--color-cyan)",
        color: editMode ? "var(--color-amber)" : "var(--color-cyan)",
        backgroundColor: editMode ? "rgba(255, 184, 77, 0.1)" : "transparent",
      }}
    >
      {editMode ? "[EXIT EDIT MODE]" : "[EDIT MODE]"}
    </button>
  );
}

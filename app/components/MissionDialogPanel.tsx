"use client";

import React from "react";
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import { getDialogCharacter } from "../data/dialog/characters";
import type { DialogQueueItem } from "../utils/missionDialog";
import type { DialogLogEntry } from "../hooks/useMissionDialog";
import { DialogPortrait } from "./DialogPortrait";
import { HighlightedText } from "./HighlightedText";

interface MissionDialogPanelProps {
  /** The line being shown now, if any. */
  line: DialogQueueItem | null;
  /** Every message so far, oldest first, for the comms log. */
  log: readonly DialogLogEntry[];
  /** 1-based position among the lines waiting together. */
  position: number;
  total: number;
  onAdvance: () => void;
  onDismiss: () => void;
  /** Smaller portrait and text for the mobile landscape layout. */
  compact?: boolean;
  /** Extra classes for placement (e.g. to clear the tutorial task panel). */
  className?: string;
}

function speakerFor(item: DialogQueueItem) {
  const character = item.isError ? undefined : getDialogCharacter(item.characterId);
  return {
    character,
    name: item.isError ? "Missing dialog" : (character?.name ?? item.characterId),
    color: item.isError
      ? "var(--color-warning-red)"
      : (character?.textColor ?? "var(--color-text-primary)"),
  };
}


// Shared comms panel for in-mission dialog (useMissionDialog), rendered as
// GameBoardLayout's overlay in GameDisplay, GameDisplayWeb2 and
// SimulatedGameDisplay. Non-blocking: only the panel itself takes clicks.
// Shows the current line (if any) plus a COMMS LOG toggle listing every
// message so far.
export function MissionDialogPanel({
  line,
  log,
  position,
  total,
  onAdvance,
  onDismiss,
  compact = false,
  className = "",
}: MissionDialogPanelProps) {
  const [isLogOpen, setIsLogOpen] = React.useState(false);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  // Keep the newest message in view while the log is open.
  React.useEffect(() => {
    if (isLogOpen) logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [isLogOpen, log.length]);

  return (
    <div
      className={`pointer-events-auto flex max-w-[min(28rem,60%)] flex-col items-start gap-1 ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isLogOpen && (
        <div
          className={`w-full overflow-y-auto border border-solid bg-near-black/95 ${
            compact ? "max-h-28 p-2" : "max-h-56 p-3"
          }`}
          style={{ borderColor: "var(--color-gunmetal)", borderRadius: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {log.length === 0 ? (
            <p className="text-xs text-text-muted" style={STYLE_MONO}>
              No messages yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {log.map((entry) => {
                const speaker = speakerFor(entry);
                return (
                  <li key={entry.key} className="text-xs leading-snug" style={STYLE_MONO}>
                    <span className="mr-2 tabular-nums text-text-muted">R{entry.round}</span>
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{ ...STYLE_LABEL, color: speaker.color }}
                    >
                      {speaker.name}
                    </span>
                    <span className="block" style={{ color: speaker.color }}>
                      <HighlightedText text={entry.text} />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <div ref={logEndRef} />
        </div>
      )}

      {line && (
        <DialogLineCard
          line={line}
          position={position}
          total={total}
          onAdvance={onAdvance}
          onDismiss={onDismiss}
          compact={compact}
        />
      )}

      <button
        type="button"
        className="border border-solid bg-near-black/95 px-2 py-0.5 text-[10px] uppercase tracking-widest text-text-secondary hover:text-text-primary"
        style={{ ...STYLE_MONO, borderColor: "var(--color-gunmetal)", borderRadius: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsLogOpen((open) => !open);
        }}
        aria-expanded={isLogOpen}
      >
        [Comms log · {log.length}] {isLogOpen ? "▼" : "▲"}
      </button>
    </div>
  );
}

/**
 * One comms message with NEXT/OK. Used inside MissionDialogPanel on the
 * board, and on its own inside GameResultModal for victory/defeat debriefs.
 */
export function DialogLineCard({
  line,
  position,
  total,
  onAdvance,
  onDismiss,
  compact,
}: {
  line: DialogQueueItem;
  position: number;
  total: number;
  onAdvance: () => void;
  onDismiss: () => void;
  compact: boolean;
}) {
  const { character, name, color } = speakerFor(line);
  // Lines never auto-advance: each stays until the player presses NEXT/OK
  // (or clicks the card), so nothing is missed mid-turn.

  const portraitSize = compact ? "h-10 w-10" : "h-16 w-16";

  return (
    <div
      className={`flex w-full cursor-pointer items-start gap-3 border-2 border-solid bg-near-black/95 ${
        compact ? "p-2" : "p-3"
      }`}
      style={{ borderColor: color, borderRadius: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        onAdvance();
      }}
      role="status"
      aria-live="polite"
    >
      <DialogPortrait
        character={character}
        name={name}
        color={color}
        sizeClass={portraitSize}
        fallbackText={line.isError ? "!" : undefined}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`${compact ? "text-xs" : "text-sm"} font-bold uppercase tracking-widest`}
            style={{ ...STYLE_LABEL, color }}
          >
            {name}
          </span>
          <span className="flex items-center gap-2">
            {total > 1 && (
              <span className="text-[10px] tabular-nums text-text-muted" style={STYLE_MONO}>
                {position}/{total}
              </span>
            )}
            <button
              type="button"
              aria-label="Dismiss dialog"
              className="px-1 text-xs leading-none text-text-muted hover:text-text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              ×
            </button>
          </span>
        </div>
        <p
          className={`mt-1 ${compact ? "text-xs" : "text-sm"} leading-snug`}
          style={{ ...STYLE_MONO, color }}
        >
          {line.isError ? line.text : <HighlightedText text={line.text} />}
        </p>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className={`border border-solid px-2 py-0.5 ${
              compact ? "text-[10px]" : "text-xs"
            } font-bold uppercase tracking-widest transition-colors hover:bg-white/5`}
            style={{ ...STYLE_LABEL, borderColor: color, color, borderRadius: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
          >
            {position < total ? "Next ▸" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

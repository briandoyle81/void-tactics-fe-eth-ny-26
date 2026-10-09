"use client";

import React from "react";
import { STYLE_LABEL } from "../styles/fontStyles";

interface RoundStartModalProps {
  round: number | bigint;
  /** True when the local player acts first this round. */
  isMyTurnFirst: boolean;
  onClose: () => void;
  autoDismissMs?: number;
  /** Points each side gained during the round that just ended (not
   * cumulative totals) — omitted on the very first showing (game start),
   * where there's no prior round to diff against. */
  myRoundScore?: number;
  opponentRoundScore?: number;
  /** Cumulative totals as of right now (game start or after the round that
   * just ended), shown alongside the round deltas. */
  myScore?: number;
  opponentScore?: number;
  /** Cumulative target needed to win. */
  maxScore?: number;
}

// Shared between GameDisplay.tsx (live PvP/single-player) and
// SimulatedGameDisplay.tsx (tutorial) — announces a new round and who acts
// first, auto-dismissing after `autoDismissMs` or on click. Animates in and
// out (round-start-* classes in globals.css) so it doesn't pop over the
// board; the exit plays before onClose unmounts it. Styled to match
// GameResultModal.tsx's card/backdrop/typography conventions (same z-index,
// square corners, STYLE_LABEL heading) so the two read as one family of
// end-of-turn-sequence overlays.
/** Length of the exit animation (round-start-out in globals.css). */
const EXIT_MS = 200;

export function RoundStartModal({
  round,
  isMyTurnFirst,
  onClose,
  autoDismissMs = 5000,
  myRoundScore,
  opponentRoundScore,
  myScore,
  opponentScore,
  maxScore,
}: RoundStartModalProps) {
  const hasRoundScore = myRoundScore != null && opponentRoundScore != null;
  const hasCurrentScore = myScore != null && opponentScore != null;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play the exit, then close. Reduced motion skips the wait.
  const close = React.useCallback(() => {
    if (closeTimerRef.current) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onCloseRef.current();
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => onCloseRef.current(), EXIT_MS);
  }, []);

  React.useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  // Parent re-renders (game poll, 1s timer tick) used to pass a new onClose
  // every time and reset this timeout, so the overlay never auto-dismissed.
  React.useEffect(() => {
    const timer = setTimeout(close, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, close]);

  const accentColor = isMyTurnFirst
    ? "var(--color-cyan)"
    : "var(--color-warning-red)";

  return (
    <div
      className={`round-start-backdrop fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4 ${
        // Ignore input while fading out so the board is clickable right away.
        isClosing ? "round-start-closing pointer-events-none" : ""
      }`}
      onClick={close}
      role="presentation"
    >
      <div
        className="round-start-card relative w-full max-w-md overflow-hidden border-2 bg-near-black p-6 font-mono text-center"
        style={{ borderColor: accentColor, borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="round-start-sweep absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <div className="text-sm uppercase tracking-widest text-text-muted">
          Round {round.toString()}
        </div>
        <div
          className="mt-2 text-3xl font-bold uppercase tracking-widest"
          style={{ ...STYLE_LABEL, color: accentColor }}
        >
          {isMyTurnFirst ? "You go first" : "Opponent goes first"}
        </div>

        {hasRoundScore && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">
              Last Round
            </div>
            <div className="mt-1 flex items-center justify-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted">You</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: "var(--color-cyan)" }}
                >
                  +{myRoundScore}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted">Enemy</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: "var(--color-warning-red)" }}
                >
                  +{opponentRoundScore}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasCurrentScore && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">
              Score
            </div>
            <div className="mt-1 flex items-center justify-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted">You</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: "var(--color-cyan)" }}
                >
                  {myScore}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted">Enemy</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: "var(--color-warning-red)" }}
                >
                  {opponentScore}
                </span>
              </div>
              {maxScore != null && (
                <span className="text-sm text-text-muted">/ {maxScore} to win</span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={close}
          className="mt-6 w-full border-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-white/5"
          style={{ borderColor: accentColor, color: accentColor, borderRadius: 0 }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

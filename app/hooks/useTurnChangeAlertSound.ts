import { useEffect, useRef, type MutableRefObject } from "react";

/** Shared by every "it's your turn" cue — the transition-based hook below,
 * and GameDisplay.tsx/GameDisplayWeb2.tsx's own "still my turn after my
 * submitted move was confirmed" trigger (a same-turn multi-move sequence
 * never dips isMyTurn false->true, so that case can't rely on the hook's
 * transition detection and calls this directly instead). */
export function playTurnAlertSound() {
  const audio = new Audio("/sound/alert.mp3");
  audio.volume = 0.5;
  audio.play().catch((err) => {
    // Most commonly a browser autoplay-policy rejection — surfaced so
    // it's diagnosable instead of a silent, unexplained no-op.
    console.warn("[playTurnAlertSound] audio.play() failed:", err);
  });
}

/**
 * Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) —
 * plays an alert sound only when the turn changes from opponent to player,
 * not on initial mount (guarded by the previous-turn ref starting at null).
 *
 * `externalTurnRef` is optional: GameDisplay.tsx has a second effect (clearing
 * pending transaction state) that also needs to observe "was it not my turn
 * last render", and must read the exact same ref this hook mutates to
 * preserve their original execution-order coupling (this hook's effect runs
 * first and updates the ref before that second effect reads it). Pass a ref
 * in from the caller when another effect needs to share this state;
 * otherwise the hook manages its own internal ref.
 */
export function useTurnChangeAlertSound(
  isMyTurn: boolean,
  identity: string | null | undefined,
  readOnly: boolean,
  externalTurnRef?: MutableRefObject<boolean | null>,
) {
  const internalTurnRef = useRef<boolean | null>(null);
  const prevTurnRef = externalTurnRef ?? internalTurnRef;

  useEffect(() => {
    if (!readOnly && isMyTurn && identity && prevTurnRef.current === false) {
      playTurnAlertSound();
    }
    prevTurnRef.current = isMyTurn;
    // prevTurnRef is a stable ref (either internal or caller-provided); it
    // intentionally isn't a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, identity, readOnly]);
}

const TURN_TITLE_PREFIX = "● Your turn · ";

/**
 * Tab-title cue for a player who isn't looking: when it becomes their turn
 * while the tab is hidden or the window unfocused, prefix the title until
 * they come back (or the turn passes). Shared by GameDisplay and
 * GameDisplayWeb2.
 */
export function useTurnTitleCue(isMyTurn: boolean, enabled: boolean) {
  const prevTurnRef = useRef<boolean | null>(null);

  useEffect(() => {
    const wasMyTurn = prevTurnRef.current;
    prevTurnRef.current = isMyTurn;
    if (!enabled || !isMyTurn || wasMyTurn !== false) return;
    if (document.visibilityState !== "hidden" && document.hasFocus()) return;

    const clear = () => {
      if (document.title.startsWith(TURN_TITLE_PREFIX)) {
        document.title = document.title.slice(TURN_TITLE_PREFIX.length);
      }
    };
    const onReturn = () => {
      if (document.visibilityState !== "hidden" && document.hasFocus()) clear();
    };
    if (!document.title.startsWith(TURN_TITLE_PREFIX)) {
      document.title = TURN_TITLE_PREFIX + document.title;
    }
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      clear();
    };
  }, [isMyTurn, enabled]);
}

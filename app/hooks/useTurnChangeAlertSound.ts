import { useEffect, useRef, type MutableRefObject } from "react";

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
      const audio = new Audio("/sound/alert.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail - some browsers block autoplay
      });
    }
    prevTurnRef.current = isMyTurn;
    // prevTurnRef is a stable ref (either internal or caller-provided); it
    // intentionally isn't a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, identity, readOnly]);
}

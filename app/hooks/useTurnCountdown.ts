import { useEffect, useMemo, useState } from "react";

/**
 * Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) —
 * ticks down the remaining seconds in the current turn and derives the
 * percent-remaining for the turn timer bar.
 *
 * Canonical unit is milliseconds for `turnStartTimeMs` (matching `Date.now()`
 * and web2's native turn-start timestamp); web3 converts its bigint
 * turnStartTime (seconds) to ms at the call site.
 */
export function useTurnCountdown(turnTimeSec: number, turnStartTimeMs: number) {
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(0);

  useEffect(() => {
    const computeRemaining = (): number => {
      if (!turnTimeSec || !turnStartTimeMs) return 0;
      const elapsed = Math.max(0, Math.floor((Date.now() - turnStartTimeMs) / 1000));
      return Math.max(0, turnTimeSec - elapsed);
    };

    setTurnSecondsLeft(computeRemaining());
    const interval = setInterval(() => {
      setTurnSecondsLeft(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [turnTimeSec, turnStartTimeMs]);

  const turnPercentRemaining = useMemo(() => {
    if (!turnTimeSec || turnTimeSec <= 0) return 0;
    const pct = (turnSecondsLeft / turnTimeSec) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [turnSecondsLeft, turnTimeSec]);

  return { turnSecondsLeft, turnPercentRemaining };
}

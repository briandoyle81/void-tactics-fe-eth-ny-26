"use client";

import { useTurnCountdown } from "../hooks/useTurnCountdown";
import { useMemo, createContext, useContext, type ReactNode } from "react";

type TurnCountdownValue = {
  turnSecondsLeft: number;
  turnPercentRemaining: number;
};

const TurnCountdownContext = createContext<TurnCountdownValue | null>(null);

export function TurnCountdownProvider({
  turnTimeSec,
  turnStartTimeMs,
  children,
}: {
  turnTimeSec: number;
  turnStartTimeMs: number;
  children: ReactNode;
}) {
  const countdown = useTurnCountdown(turnTimeSec, turnStartTimeMs);
  const value = useMemo(
    () => countdown,
    [countdown.turnSecondsLeft, countdown.turnPercentRemaining],
  );
  return (
    <TurnCountdownContext.Provider value={value}>
      {children}
    </TurnCountdownContext.Provider>
  );
}

export function useTurnCountdownContext(): TurnCountdownValue {
  const value = useContext(TurnCountdownContext);
  if (!value) {
    throw new Error("useTurnCountdownContext requires TurnCountdownProvider");
  }
  return value;
}

export function formatTurnSeconds(total: number): string {
  const clamped = Math.max(0, total);
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function TurnCountdownText() {
  const { turnSecondsLeft } = useTurnCountdownContext();
  return <>{formatTurnSeconds(turnSecondsLeft)}</>;
}

export function TurnCountdownBar() {
  const { turnPercentRemaining } = useTurnCountdownContext();
  return (
    <div
      className="h-full transition-all duration-1000 ease-linear"
      style={{
        width: `${Math.max(0, Math.min(100, turnPercentRemaining))}%`,
        backgroundColor: "var(--color-warning-red)",
      }}
    />
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RoundStartInfo = {
  round: number;
  isMyTurnFirst: boolean;
  myRoundScore?: number;
  opponentRoundScore?: number;
  myScore: number;
  opponentScore: number;
  maxScore?: number;
};

function dismissedStorageKey(gameId: string, round: number): string {
  return `vt-round-start-dismissed-${gameId}-${round}`;
}

function readDismissed(gameId: string, round: number): boolean {
  try {
    return sessionStorage.getItem(dismissedStorageKey(gameId, round)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(gameId: string, round: number): void {
  try {
    sessionStorage.setItem(dismissedStorageKey(gameId, round), "1");
  } catch {
    // Private mode / blocked storage should not reopen the modal.
  }
}

/**
 * Announces who acts first at game start and on each new round.
 *
 * The previous inline effects re-opened the overlay on ship clicks because:
 * - they compared `currentRound` with `===` (bigint `2n` vs number `2` fails)
 * - they re-ran on turn/score/address changes, not only round changes
 * - dismissing only nulled React state, so a remount (or `gameData` falling
 *   back to a stale list snapshot) showed the same round again
 *
 * Dismiss is remembered per game+round in sessionStorage so the same
 * announcement cannot block the board again in this tab.
 */
export function useRoundStartAnnouncement(
  gameId: string | number | bigint,
  currentRound: number | bigint | undefined,
  isGameOver: boolean,
  buildInfo: (round: number) => Omit<RoundStartInfo, "round">,
): {
  roundStartInfo: RoundStartInfo | null;
  handleCloseRoundStart: () => void;
} {
  const [roundStartInfo, setRoundStartInfo] = useState<RoundStartInfo | null>(null);
  const prevRoundRef = useRef<number | undefined>(undefined);
  const buildInfoRef = useRef(buildInfo);
  buildInfoRef.current = buildInfo;

  const gameIdKey = String(gameId);
  const currentRoundNumber = Number(currentRound);

  const handleCloseRoundStart = useCallback(() => {
    setRoundStartInfo((info) => {
      if (info) writeDismissed(gameIdKey, Number(info.round));
      return null;
    });
  }, [gameIdKey]);

  useEffect(() => {
    if (isGameOver) return;
    const round = currentRoundNumber;
    if (!Number.isFinite(round) || round < 1) return;
    if (readDismissed(gameIdKey, round)) {
      prevRoundRef.current = round;
      return;
    }
    if (prevRoundRef.current === round) return;
    prevRoundRef.current = round;
    setRoundStartInfo({ round, ...buildInfoRef.current(round) });
  }, [currentRoundNumber, isGameOver, gameIdKey]);

  return { roundStartInfo, handleCloseRoundStart };
}

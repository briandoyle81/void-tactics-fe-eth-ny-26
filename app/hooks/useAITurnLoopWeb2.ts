"use client";

import { useEffect, useRef, useState } from "react";
import { apiMutate } from "../lib/apiMutate";

// Web2 counterpart to useAITurnLoop.ts (web3) — same pacing/cap/re-fire
// design, calling POST /api/games/[id]/ai-turn (wraps aiTurnWeb2.ts) instead
// of the SinglePlayerMatch.takeAITurn contract write.
const MAX_ITERATIONS = 10;
const MOVE_PACING_MS = 1800;

interface UseAITurnLoopWeb2Params {
  gameId: number;
  isAITurn: boolean;
  isGameOver: boolean;
  // Changes whenever fresh state lands for this game (e.g. a move
  // timestamp) — re-checks isAITurn after each ai-turn call without racing
  // ahead of confirmed data.
  lastMoveSignal: string;
  refetchGame: () => void;
}

export function useAITurnLoopWeb2({
  gameId,
  isAITurn,
  isGameOver,
  lastMoveSignal,
  refetchGame,
}: UseAITurnLoopWeb2Params) {
  const [moveCount, setMoveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingToAct, setIsWaitingToAct] = useState(false);
  const inFlightRef = useRef(false);
  const iterationRef = useRef(0);

  useEffect(() => {
    if (!isAITurn || isGameOver) {
      iterationRef.current = 0;
      setMoveCount(0);
      setError(null);
      setIsWaitingToAct(false);
      return;
    }
    if (inFlightRef.current || error) return;
    if (iterationRef.current >= MAX_ITERATIONS) {
      setError("AI turn did not resolve — please refresh.");
      return;
    }

    inFlightRef.current = true;
    setIsWaitingToAct(true);
    // See useAITurnLoop.ts (web3) for why this flag exists: without it, any
    // effect re-run before the pacing delay elapses (e.g. React Strict
    // Mode's dev-only double-invoke) cancels the pending call via
    // clearTimeout but leaves inFlightRef stuck true forever, silently
    // dead-ending the AI turn.
    let didFire = false;
    const pacingTimeout = setTimeout(() => {
      didFire = true;
      iterationRef.current += 1;
      apiMutate(`/api/games/${gameId}/ai-turn`, "POST")
        .then(() => {
          setMoveCount((c) => c + 1);
          refetchGame();
        })
        .catch((err) => {
          console.error("AI turn failed:", err);
          setError("AI turn failed — please refresh.");
        })
        .finally(() => {
          inFlightRef.current = false;
          setIsWaitingToAct(false);
        });
    }, MOVE_PACING_MS);

    return () => {
      clearTimeout(pacingTimeout);
      if (!didFire) {
        inFlightRef.current = false;
        setIsWaitingToAct(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn, isGameOver, gameId, lastMoveSignal]);

  return {
    isAIThinking: isAITurn && !isGameOver && !error,
    isWaitingToAct,
    moveCount,
    error,
  };
}

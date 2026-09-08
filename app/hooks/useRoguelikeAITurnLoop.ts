"use client";

import { useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import { useRoguelikeMatch } from "./useRoguelikeMatch";

// Parallel to useAITurnLoop.ts (SinglePlayerMatch), calling
// RoguelikeMatch.takeAITurn instead — kept as a separate hook rather than a
// shared one because useAITurnLoop.ts hardcodes useSinglePlayerMatch()
// internally with no injection point, mirroring the existing precedent of
// parallel infrastructure hooks (e.g. useShipRenderer/useShipRendererWeb2)
// where the orchestrating contract genuinely differs.
const MAX_ITERATIONS = 20;
const MOVE_PACING_MS = 1800;

interface UseRoguelikeAITurnLoopParams {
  gameId: bigint;
  isAITurn: boolean;
  isGameOver: boolean;
  lastMoveSignal: string;
  refetchGame: () => void;
}

export function useRoguelikeAITurnLoop({
  gameId,
  isAITurn,
  isGameOver,
  lastMoveSignal,
  refetchGame,
}: UseRoguelikeAITurnLoopParams) {
  const { takeAITurn } = useRoguelikeMatch();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
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
    let didFire = false;
    const pacingTimeout = setTimeout(() => {
      didFire = true;
      iterationRef.current += 1;
      takeAITurn(gameId)
        .then(async (hash) => {
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
          setMoveCount((c) => c + 1);
          refetchGame();
        })
        .catch((err) => {
          console.error("Roguelike takeAITurn failed:", err);
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

"use client";

import { useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import { useSinglePlayerMatch } from "./useSinglePlayerMatch";

// Defensive cap on consecutive takeAITurn calls for a single AI turn.
// `maxPlacementsPerMap` is a live, owner-tunable value (default raised from
// 8 to 14 — the hardest campaign nodes, e.g. bastion, now field 14 AI
// ships) — keep this comfortably above the live max, not hardcoded to the
// old default.
const MAX_ITERATIONS = 20;

// Deliberate pause before each takeAITurn call so the player has time to
// actually see the previous move (ship position, shot animation, etc.)
// before the board changes again — without this, moves can land back to
// back as fast as wallet signing + RPC allow, which reads as the board
// jumping around rather than a turn being played.
const MOVE_PACING_MS = 1800;

interface UseAITurnLoopParams {
  gameId: bigint;
  isAITurn: boolean;
  isGameOver: boolean;
  // Changes whenever fresh on-chain state lands for this game (e.g. a move
  // timestamp) — used to re-check `isAITurn` after each takeAITurn call
  // without racing ahead of confirmed chain data.
  lastMoveSignal: string;
  refetchGame: () => void;
}

/**
 * Auto-drives SinglePlayerMatch.takeAITurn while it's the AI's turn. Each
 * call moves exactly one AI ship; this re-fires (after a pacing delay) as
 * long as isAITurn stays true after fresh state lands, until the turn
 * returns to the human or the game ends.
 */
export function useAITurnLoop({
  gameId,
  isAITurn,
  isGameOver,
  lastMoveSignal,
  refetchGame,
}: UseAITurnLoopParams) {
  const { takeAITurn } = useSinglePlayerMatch();
  // takeAITurn only resolves once the wallet sends the tx, not once it's
  // confirmed — refetching right on send (the old behavior) reads stale
  // chain state, so lastMoveSignal never changes and this loop stalls after
  // one ship. Wait for the actual receipt before refetching/advancing.
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
    // Tracks whether the scheduled call below actually fired, so the
    // cleanup can tell "cancelled before it ever ran" (nothing in flight,
    // undo the flag) apart from "already sent, awaiting settlement"
    // (leave the flag alone — a real request is in progress). Without
    // this distinction, any effect re-run before the pacing delay elapses
    // — including React Strict Mode's dev-only double-invoke of effects,
    // which reliably reproduces this — cancels the pending timeout via
    // clearTimeout but leaves inFlightRef permanently stuck true, since
    // the call that would have reset it never happened. Every subsequent
    // run then bails on "already in flight" forever, silently dead-ending
    // the whole AI turn.
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
          console.error("takeAITurn failed:", err);
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
      // If didFire is true, takeAITurn is genuinely in flight — its own
      // .finally() above is what clears inFlightRef, not this cleanup.
    };
    // lastMoveSignal intentionally re-runs this effect once fresh chain
    // state confirms the previous AI move landed, so we don't fire the next
    // takeAITurn call against stale isAITurn/game data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn, isGameOver, gameId, lastMoveSignal]);

  return {
    isAIThinking: isAITurn && !isGameOver && !error,
    isWaitingToAct,
    moveCount,
    error,
  };
}

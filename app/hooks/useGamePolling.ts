import React from "react";
import { registerGameRefetch, unregisterGameRefetch } from "./useContractEvents";

const POLL_INTERVAL_FOCUSED_MS = 30 * 1000;
const POLL_INTERVAL_UNFOCUSED_MS = 5 * 60 * 1000;
const POLL_INTERVAL_HIDDEN_MS = 60 * 60 * 1000;
const TURN_POLL_DIVISOR = 10;
// Post-move polling normally scales with turnTime (poll faster the shorter
// the turn clock is) — that's the right heuristic for PvP, including 24h
// correspondence games where slow polling is intentional. vs-AI games also
// store a 24h turnTime (to represent "unlimited", since nothing on-chain
// enforces it there), but the AI actually responds in seconds, not hours —
// deriving its polling cadence from that stored value would leave the
// "AI is taking its turn" loop waiting hours between refetches. Use a fixed
// fast cadence for single-player games instead.
const AI_POST_MOVE_POLL_INTERVAL_MS = 2 * 1000;
const AI_POST_MOVE_WINDOW_MS = 60 * 1000;

interface UseGamePollingParams {
  gameId: number;
  turnTime: bigint | number | undefined;
  gameData: { turnState: { currentTurn: string; currentRound: number | bigint } } | undefined;
  refetchGame: () => void;
  onRefetch: () => void;
  isSinglePlayerGame?: boolean;
}

export function useGamePolling({
  gameId,
  turnTime,
  gameData,
  refetchGame,
  onRefetch,
  isSinglePlayerGame = false,
}: UseGamePollingParams) {
  const prevGameStateRef = React.useRef<{
    currentTurn: string;
    currentRound: number | bigint;
  } | null>(null);
  const expectingStateChangeRef = React.useRef(false);

  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = React.useRef(0);

  const isWindowFocusedRef = React.useRef(true);
  const wasHiddenRef = React.useRef(false);
  const [activityRevision, setActivityRevision] = React.useState(0);
  const wasInactiveRef = React.useRef(false);
  const lastRefetchOnFocusAtRef = React.useRef(0);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const playerMoveTimeRef = React.useRef<number | null>(null);
  const [playerMoveTimestamp, setPlayerMoveTimestamp] = React.useState<number | null>(null);
  const lastPollTimeRef = React.useRef<number>(Date.now());
  const currentPollIntervalRef = React.useRef<number>(POLL_INTERVAL_FOCUSED_MS);

  // Register this game's refetch function for the global event registry
  React.useEffect(() => {
    const refetchWithClear = () => {
      onRefetch();
      expectingStateChangeRef.current = true;
      refetchGame();
    };

    registerGameRefetch(gameId, refetchWithClear);

    return () => {
      unregisterGameRefetch(gameId);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [refetchGame, gameId, onRefetch]);

  // Track page visibility and window focus; refetch immediately on return from inactive
  React.useEffect(() => {
    const initialHidden = !!document.hidden;
    const initialFocused = document.hasFocus();
    wasHiddenRef.current = initialHidden;
    isWindowFocusedRef.current = initialFocused;
    wasInactiveRef.current = initialHidden || !initialFocused;
    setActivityRevision((r) => r + 1);

    const maybeRefetchOnActive = (wasInactive: boolean) => {
      const now = Date.now();
      if (!document.hasFocus() || document.hidden) return;
      if (now - lastRefetchOnFocusAtRef.current < 5000) return;
      if (wasInactive) {
        lastRefetchOnFocusAtRef.current = now;
        refetchGame();
      }
    };

    const syncActivityState = () => {
      const nowHidden = !!document.hidden;
      const nowFocused = document.hasFocus();
      const wasInactive = wasInactiveRef.current;
      wasHiddenRef.current = nowHidden;
      isWindowFocusedRef.current = nowFocused;
      wasInactiveRef.current = nowHidden || !nowFocused;
      setActivityRevision((r) => r + 1);
      maybeRefetchOnActive(wasInactive);
    };

    document.addEventListener("visibilitychange", syncActivityState);
    window.addEventListener("focus", syncActivityState);
    window.addEventListener("focusin", syncActivityState);
    window.addEventListener("blur", syncActivityState);
    window.addEventListener("focusout", syncActivityState);

    return () => {
      document.removeEventListener("visibilitychange", syncActivityState);
      window.removeEventListener("focus", syncActivityState);
      window.removeEventListener("focusin", syncActivityState);
      window.removeEventListener("blur", syncActivityState);
      window.removeEventListener("focusout", syncActivityState);
    };
  }, [refetchGame]);

  // Polling effect: adapts interval based on activity and post-move state
  React.useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    lastPollTimeRef.current = Date.now();
    const turnTimeMs = Number(turnTime || 0) * 1000;
    // How long to keep polling at the faster post-move cadence, and how
    // fast that cadence is — both derived from turnTime for PvP, but fixed
    // for single-player games (see AI_POST_MOVE_* constants above).
    const postMoveWindowMs = isSinglePlayerGame
      ? AI_POST_MOVE_WINDOW_MS
      : turnTimeMs;
    const pollIntervalAfterMove = isSinglePlayerGame
      ? AI_POST_MOVE_POLL_INTERVAL_MS
      : turnTimeMs / TURN_POLL_DIVISOR;

    if (playerMoveTimeRef.current) {
      const moveTime = playerMoveTimeRef.current;
      const now = Date.now();
      const timeSinceMove = now - moveTime;

      if (timeSinceMove >= postMoveWindowMs) {
        const timeUntilNextPoll =
          pollIntervalAfterMove - (timeSinceMove % pollIntervalAfterMove);
        pollingTimeoutRef.current = setTimeout(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          playerMoveTimeRef.current = null;
          setPlayerMoveTimestamp(null);
          const normalInterval = !wasHiddenRef.current
            ? isWindowFocusedRef.current
              ? POLL_INTERVAL_FOCUSED_MS
              : POLL_INTERVAL_UNFOCUSED_MS
            : POLL_INTERVAL_HIDDEN_MS;
          currentPollIntervalRef.current = normalInterval;
          pollingIntervalRef.current = setInterval(() => {
            lastPollTimeRef.current = Date.now();
            refetchGame();
          }, normalInterval);
        }, timeUntilNextPoll);
      } else {
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
        pollingIntervalRef.current = setInterval(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          const timeSince = Date.now() - (playerMoveTimeRef.current || 0);
          if (timeSince >= postMoveWindowMs) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            pollingTimeoutRef.current = setTimeout(() => {
              refetchGame();
              playerMoveTimeRef.current = null;
              setPlayerMoveTimestamp(null);
              const normalInterval = !wasHiddenRef.current
                ? isWindowFocusedRef.current
                  ? POLL_INTERVAL_FOCUSED_MS
                  : POLL_INTERVAL_UNFOCUSED_MS
                : POLL_INTERVAL_HIDDEN_MS;
              currentPollIntervalRef.current = normalInterval;
              lastPollTimeRef.current = Date.now();
              pollingIntervalRef.current = setInterval(() => {
                lastPollTimeRef.current = Date.now();
                refetchGame();
              }, normalInterval);
            }, pollIntervalAfterMove);
          }
        }, pollIntervalAfterMove);
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
      }
    } else {
      const normalInterval = !wasHiddenRef.current
        ? isWindowFocusedRef.current
          ? POLL_INTERVAL_FOCUSED_MS
          : POLL_INTERVAL_UNFOCUSED_MS
        : POLL_INTERVAL_HIDDEN_MS;
      currentPollIntervalRef.current = normalInterval;
      pollingIntervalRef.current = setInterval(() => {
        lastPollTimeRef.current = Date.now();
        refetchGame();
      }, normalInterval);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, [activityRevision, playerMoveTimestamp, refetchGame, turnTime, isSinglePlayerGame]);

  // Reset move time when it's no longer the player's turn
  React.useEffect(() => {
    if (gameData) {
      // currentTurn is compared externally; here we just clear after any turn change
      playerMoveTimeRef.current = null;
      setPlayerMoveTimestamp(null);
    }
  }, [gameData?.turnState.currentTurn]);

  // Exponential backoff retry when state hasn't changed after expected event
  React.useEffect(() => {
    if (!gameData) return;
    const currentState = {
      currentTurn: gameData.turnState.currentTurn,
      currentRound: gameData.turnState.currentRound,
    };

    if (prevGameStateRef.current && expectingStateChangeRef.current) {
      const prev = prevGameStateRef.current;
      const stateChanged =
        prev.currentTurn !== currentState.currentTurn ||
        prev.currentRound !== currentState.currentRound;

      if (!stateChanged) {
        const retryDelay = Math.pow(2, retryAttemptRef.current) * 1000;
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          retryAttemptRef.current++;
          expectingStateChangeRef.current = true;
          refetchGame();
        }, retryDelay);
      } else {
        retryAttemptRef.current = 0;
        expectingStateChangeRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }
    }

    prevGameStateRef.current = currentState;
  }, [gameData, gameId, refetchGame]);

  const recordPlayerMove = React.useCallback(() => {
    const moveTime = Date.now();
    playerMoveTimeRef.current = moveTime;
    setPlayerMoveTimestamp(moveTime);
  }, []);

  return { recordPlayerMove };
}

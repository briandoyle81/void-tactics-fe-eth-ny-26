"use client";

import React, { useState } from "react";
import posthog from "posthog-js";
import {
  GameDataView,
  ShipPosition,
  Attributes,
  getMainWeaponName,
  getSpecialName,
  ActionType,
  LastMove,
  GRID_DIMENSIONS,
} from "../types/types";
import { useGameShips } from "../hooks/useGameShips";
import ShipCard from "./ShipCard";
import { useGetAllPresetMaps } from "../hooks/useMapsContract";
import { useGetGame } from "../hooks/useGameContract";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiMutate } from "../lib/apiMutate";
import { apiFetch } from "../lib/apiFetch";
import { useGameStream } from "../hooks/useGameStream";
import {
  useContractEvents,
  registerGameRefetch,
  unregisterGameRefetch,
  globalGameRefetchFunctions,
} from "../hooks/useContractEvents";
import { useQueryClient } from "@tanstack/react-query";
// TransactionButton removed — actions go through REST API
import { toast } from "react-hot-toast";
import {
  GAME_VIEW_SIDE_ROOT_CLASS,
  useGameViewChromeLayout,
} from "../hooks/useGameViewChromeLayout";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { GameEvents } from "./GameEvents";
import { GameBoardLayout } from "./GameBoardLayout";
import { ShipImage } from "./ShipImage";
import { GameGrid } from "./GameGrid";
import {
  computeMovementRange,
  hasLineOfSight,
} from "../utils/gameGridRanges";
import { calculateDamage } from "../utils/calculateDamage";
import { useLandscapeMode } from "../hooks/useLandscapeMode";
import { useResetSelectionOnTurnChange } from "../hooks/useResetSelectionOnTurnChange";
import { useRetreatModeCancellation } from "../hooks/useRetreatModeCancellation";

const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const TIE_ADDR = "0x0000000000000000000000000000000000000001";

const POLL_INTERVAL_FOCUSED_MS = 30 * 1000;
const POLL_INTERVAL_UNFOCUSED_MS = 5 * 60 * 1000;
const POLL_INTERVAL_HIDDEN_MS = 60 * 60 * 1000;
const TURN_POLL_DIVISOR = 10;
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
interface GameDisplayProps {
  game: GameDataView;
  onBack: () => void;
  refetch?: () => void;
  readOnly?: boolean;
}

const GameDisplay: React.FC<GameDisplayProps> = ({
  game: initialGame,
  onBack,
  refetch,
  readOnly = false,
}) => {
  // Debug mode toggle
  const [showDebug, setShowDebug] = React.useState(false);
  // Tooltip disable toggle
  const [disableTooltips, setDisableTooltips] = React.useState(false);
  const { userId: address } = useCurrentUser();
  const queryClient = useQueryClient();
  const clearAllTransactions = () => {}; // no-op: useTransaction removed
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<number | null>(null);
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);
  const [isTimeoutSubmitting, setIsTimeoutSubmitting] = useState(false);
  // Explicit per-ship action override (e.g. Retreat/Flee)
  const [actionOverride, setActionOverride] = useState<ActionType | null>(null);
  /** Player clicked Retreat for this ship (healthy ships); not set for auto-retreat on 0 HP. */
  const [retreatExplicitByShipId, setRetreatExplicitByShipId] = useState<
    Record<string, true>
  >({});

  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special" | "ram"
  >("weapon");
  const [weaponPreferenceByShipId, setWeaponPreferenceByShipId] = useState<
    Record<string, "weapon" | "special" | "ram">
  >({});
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: number;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null>(null);

  // Drag and drop state
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState<{ row: number; col: number } | null>(null);
  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] =
    useState(true);
  const [isDebugPanelMinimized, setIsDebugPanelMinimized] = useState(true);
  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const chromeLayout = useGameViewChromeLayout(
    gameViewRootRef,
    gridContainerRef,
  );
  const chromeOnSide = chromeLayout === "side";
  const { isLandscapeMobile, requiresLandscapeMode } = useLandscapeMode();
  const [isMobileFleetModalOpen, setIsMobileFleetModalOpen] = React.useState(false);
  const [isMobileFleeOpen, setIsMobileFleeOpen] = React.useState(false);
  const [isMobileWeaponMenuOpen, setIsMobileWeaponMenuOpen] = React.useState(false);
  const [mobileLeftPanelTab, setMobileLeftPanelTab] = React.useState<
    "status" | "actions" | "events"
  >("status");
  const [mobileActivePanel, setMobileActivePanel] = React.useState<
    "status" | "actions" | "fleet" | "events" | "none"
  >("none");
  const useSideLayout = chromeOnSide && !isLandscapeMobile;

  useRetreatModeCancellation({
    actionOverride,
    targetShipId,
    previewPosition,
    selectedShipId,
    setActionOverride,
    setRetreatExplicitByShipId,
  });

  // Fetch the current game data to get real-time updates
  const {
    data: gameData,
    isLoading: gameLoading,
    error: gameError,
    refetch: refetchGame,
  } = useGetGame(Number(initialGame.metadata.gameId));

  // Use the fetched game data if available, otherwise fall back to initial game
  const game = gameData || initialGame;

  // ── Replay ──────────────────────────────────────────────────────────────────
  type ReplayTurn = {
    id: number;
    playerId: string;
    round: number;
    actions: unknown;
    snapshot: unknown;
    submittedAt: string;
  };
  const [replayStep, setReplayStep] = useState<number | null>(null); // null=live, -1=initial, 0+=turn index
  const [replayTurns, setReplayTurns] = useState<ReplayTurn[]>([]);
  const [replayInitialState, setReplayInitialState] = useState<GameDataView | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayAutoPlay, setReplayAutoPlay] = useState(false);
  const replayAutoPlayRef = React.useRef(false);
  const isReplaying = replayStep !== null;

  const replaySnapshotGame: GameDataView | null = React.useMemo(() => {
    if (!isReplaying) return null;
    if (replayStep < 0) return replayInitialState;
    const turn = replayTurns[replayStep];
    if (!turn?.snapshot) return null;
    return turn.snapshot as GameDataView;
  }, [isReplaying, replayStep, replayInitialState, replayTurns]);

  const displayGame: GameDataView = replaySnapshotGame ?? game;

  const fetchAndStartReplay = React.useCallback(async () => {
    if (replayLoading) return;
    setReplayLoading(true);
    try {
      const data = await apiFetch<{ initialState: GameDataView | null; turns: ReplayTurn[] }>(
        `/api/games/${game.metadata.gameId}/replay`,
      );
      setReplayInitialState(data.initialState);
      setReplayTurns(data.turns);
      setReplayStep(-1);
    } catch {
      // ignore fetch errors
    } finally {
      setReplayLoading(false);
    }
  }, [game.metadata.gameId, replayLoading]);

  const exitReplay = React.useCallback(() => {
    setReplayStep(null);
    setReplayAutoPlay(false);
    replayAutoPlayRef.current = false;
  }, []);

  React.useEffect(() => {
    replayAutoPlayRef.current = replayAutoPlay;
  }, [replayAutoPlay]);

  React.useEffect(() => {
    if (!replayAutoPlay || !isReplaying) return;
    const total = replayTurns.length;
    const id = setInterval(() => {
      if (!replayAutoPlayRef.current) {
        clearInterval(id);
        return;
      }
      setReplayStep((prev) => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next >= total) {
          setReplayAutoPlay(false);
          replayAutoPlayRef.current = false;
          clearInterval(id);
          return total - 1;
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [replayAutoPlay, isReplaying, replayTurns.length]);
  // ────────────────────────────────────────────────────────────────────────────

  const aliveShipPositions = React.useMemo(
    () => displayGame.shipPositions.filter((shipPosition) => (shipPosition.status ?? 0) === 0),
    [displayGame.shipPositions],
  );

  const [showFleetModal, setShowFleetModal] = useState(false);

  /** Matches fleet card grids `grid-cols-1 sm:grid-cols-2` (Tailwind sm = 640px). */
  const [shipCardGridTwoCols, setShipCardGridTwoCols] = React.useState(false);
  React.useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setShipCardGridTwoCols(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const gameShipGridsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [gameViewNameBlockMinHeights, setGameViewNameBlockMinHeights] =
    React.useState<Record<string, number>>({});

  const gameShipCardsLayoutKey = React.useMemo(
    () =>
      [
        game.creatorActiveShipIds.map((id) => id.toString()).join("\0"),
        game.joinerActiveShipIds.map((id) => id.toString()).join("\0"),
        shipCardGridTwoCols ? "2c" : "1c",
        readOnly ? "ro" : "rw",
      ].join("|"),
    [
      game.creatorActiveShipIds,
      game.joinerActiveShipIds,
      shipCardGridTwoCols,
      readOnly,
    ],
  );

  const measureGameViewShipNameHeights = React.useCallback(() => {
    const root = gameShipGridsContainerRef.current;
    if (!root) return;

    const cells = [
      ...root.querySelectorAll("[data-game-fleet-ship-cell]"),
    ] as HTMLElement[];
    const rowMap = new Map<number, { ids: string[]; heights: number[] }>();

    for (const el of cells) {
      const id = el.dataset.shipId;
      if (!id) continue;
      const rowAttr = el.dataset.rowIndex;
      if (rowAttr === undefined) continue;
      const row = parseInt(rowAttr, 10);
      if (Number.isNaN(row)) continue;
      const block = el.querySelector(
        "[data-ship-name-block]",
      ) as HTMLElement | null;
      if (!block) continue;
      const h = Math.round(block.getBoundingClientRect().height);
      if (!rowMap.has(row)) {
        rowMap.set(row, { ids: [], heights: [] });
      }
      const g = rowMap.get(row)!;
      g.ids.push(id);
      g.heights.push(h);
    }

    const singleLineBlockMaxPx = 52;
    const next: Record<string, number> = {};

    for (const { ids, heights } of rowMap.values()) {
      if (ids.length === 0) continue;
      const minH = Math.min(...heights);
      const maxH = Math.max(...heights);
      const rowHasMultilineOrMixed =
        maxH > singleLineBlockMaxPx || maxH > minH + 8;
      if (!rowHasMultilineOrMixed) continue;
      for (const sid of ids) {
        next[sid] = maxH;
      }
    }

    setGameViewNameBlockMinHeights((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const k of nextKeys) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  React.useLayoutEffect(() => {
    const hasShips =
      game.creatorActiveShipIds.length > 0 ||
      game.joinerActiveShipIds.length > 0;
    if (!hasShips) {
      setGameViewNameBlockMinHeights({});
      return;
    }
    setGameViewNameBlockMinHeights({});
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;
    raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      measureGameViewShipNameHeights();
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        measureGameViewShipNameHeights();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [
    gameShipCardsLayoutKey,
    measureGameViewShipNameHeights,
    game.creatorActiveShipIds.length,
    game.joinerActiveShipIds.length,
  ]);

  React.useEffect(() => {
    const hasShips =
      game.creatorActiveShipIds.length > 0 ||
      game.joinerActiveShipIds.length > 0;
    if (!hasShips) return;
    const root = gameShipGridsContainerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measureGameViewShipNameHeights());
    ro.observe(root);
    window.addEventListener("resize", measureGameViewShipNameHeights);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureGameViewShipNameHeights);
    };
  }, [
    gameShipCardsLayoutKey,
    measureGameViewShipNameHeights,
    game.creatorActiveShipIds.length,
    game.joinerActiveShipIds.length,
  ]);

  const gameViewShipRowIndex = React.useCallback(
    (listIndex: number) =>
      shipCardGridTwoCols ? Math.floor(listIndex / 2) : listIndex,
    [shipCardGridTwoCols],
  );

  // Optimistic last-move handling:
  // When a tx is confirmed, there can be a short delay before the
  // blockchain/refetch updates `game.lastMove`. During that gap we want
  // to keep the submitted move rendered as the "last move".
  const [optimisticLastMove, setOptimisticLastMove] = React.useState<
    LastMove | null
  >(null);
  const displayedLastMove: LastMove | undefined =
    optimisticLastMove ?? game.lastMove;

  // Subscribe to SSE for real-time opponent move updates
  useGameStream(Number(initialGame.metadata.gameId), !readOnly);
  // No-op: kept for the global refetch registry used by debug tools
  useContractEvents();

  // Track previous game state to detect if state changed after event
  const prevGameStateRef = React.useRef<{
    currentTurn: string;
    currentRound: number;
  } | null>(null);

  // Track if we're expecting a state change (got GameUpdate event)
  const expectingStateChangeRef = React.useRef<boolean>(false);

  // Track retry attempts with exponential backoff
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = React.useRef<number>(0);

  // Track page visibility and window focus for polling intervals
  const isWindowFocusedRef = React.useRef(true);
  const wasHiddenRef = React.useRef(false);
  // Single revision counter drives polling effect re-runs on focus/visibility changes,
  // replacing two mirrored state/ref pairs that caused double re-renders per event.
  const [activityRevision, setActivityRevision] = React.useState(0);
  const wasInactiveRef = React.useRef(false);
  const lastRefetchOnFocusAtRef = React.useRef(0);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const playerMoveTimeRef = React.useRef<number | null>(null);
  const [playerMoveTimestamp, setPlayerMoveTimestamp] = React.useState<
    number | null
  >(null);
  const lastPollTimeRef = React.useRef<number>(Date.now());
  const currentPollIntervalRef = React.useRef<number>(POLL_INTERVAL_FOCUSED_MS);

  // Register this game's refetch function for global event handling
  React.useEffect(() => {
    const gameId = Number(game.metadata.gameId);

    // Create a refetch function that also clears targeting state
    // and marks that we're expecting a state change
    const refetchWithClear = () => {
      setTargetShipId(null);
      expectingStateChangeRef.current = true;
      refetchGame();
    };

    registerGameRefetch(gameId, refetchWithClear);

    // Cleanup: unregister when component unmounts
    return () => {
      unregisterGameRefetch(gameId);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refetchGame, game.metadata.gameId, setTargetShipId]);

  // Track page visibility and window focus.
  // If the tab was inactive and then comes into focus, refetch immediately once.
  React.useEffect(() => {
    const initialHidden = !!document.hidden;
    const initialFocused = document.hasFocus();
    wasHiddenRef.current = initialHidden;
    isWindowFocusedRef.current = initialFocused;
    wasInactiveRef.current = initialHidden || !initialFocused;
    setActivityRevision((r) => r + 1);

    const maybeRefetchOnActive = (wasInactive: boolean) => {
      const now = Date.now();
      const pageVisible = !document.hidden;
      const hasFocus = document.hasFocus();
      if (!pageVisible || !hasFocus) return;

      // Prevent bursts from multiple focus-related events.
      if (now - lastRefetchOnFocusAtRef.current < 5000) return;

      // Only do the immediate refetch when transitioning inactive -> active.
      if (wasInactive) {
        lastRefetchOnFocusAtRef.current = now;
        refetchGame();
      }
    };

    const syncActivityState = () => {
      const nowHidden = !!document.hidden;
      const nowFocused = document.hasFocus();
      const wasInactive = wasInactiveRef.current;
      const nowInactive = nowHidden || !nowFocused;

      wasHiddenRef.current = nowHidden;
      isWindowFocusedRef.current = nowFocused;
      wasInactiveRef.current = nowInactive;

      setActivityRevision((r) => r + 1);
      maybeRefetchOnActive(wasInactive);
    };

    const handleVisibilityChange = () => {
      syncActivityState();
    };

    const handleFocus = () => {
      syncActivityState();
    };

    const handleBlur = () => {
      syncActivityState();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("focusin", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("focusin", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focusout", handleBlur);
    };
  }, [refetchGame]);

  // Set up polling based on page visibility and player moves
  React.useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // Set initial poll time
    lastPollTimeRef.current = Date.now();

    // Get turn time from game (in seconds, convert to milliseconds)
    const turnTimeMs = Number(game.turnState.turnTime || 0) * 1000;
    const pollIntervalAfterMove = turnTimeMs / TURN_POLL_DIVISOR;

    if (playerMoveTimeRef.current) {
      // Player just moved: poll every turnTime/10
      const moveTime = playerMoveTimeRef.current;
      const now = Date.now();
      const timeSinceMove = now - moveTime;

      // If turnTime has passed since move, do one more poll then switch to normal polling
      if (timeSinceMove >= turnTimeMs) {
        // Do one final poll, then switch to normal polling
        const timeUntilNextPoll =
          pollIntervalAfterMove - (timeSinceMove % pollIntervalAfterMove);
        pollingTimeoutRef.current = setTimeout(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          // Switch to normal polling
          playerMoveTimeRef.current = null;
          setPlayerMoveTimestamp(null);
          const normalPollInterval = !wasHiddenRef.current
            ? isWindowFocusedRef.current
              ? POLL_INTERVAL_FOCUSED_MS
              : POLL_INTERVAL_UNFOCUSED_MS
            : POLL_INTERVAL_HIDDEN_MS;
          currentPollIntervalRef.current = normalPollInterval;
          pollingIntervalRef.current = setInterval(() => {
            lastPollTimeRef.current = Date.now();
            refetchGame();
          }, normalPollInterval);
        }, timeUntilNextPoll);
      } else {
        // Still within turnTime: poll every turnTime/10
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
        pollingIntervalRef.current = setInterval(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          const now = Date.now();
          const timeSinceMove = now - (playerMoveTimeRef.current || 0);

          // If turnTime has passed, do one more poll then switch
          if (timeSinceMove >= turnTimeMs) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            // Do one final poll
            pollingTimeoutRef.current = setTimeout(() => {
              refetchGame();
              // Switch to normal polling
              playerMoveTimeRef.current = null;
              setPlayerMoveTimestamp(null);
              const normalPollInterval = !wasHiddenRef.current
                ? isWindowFocusedRef.current
                  ? POLL_INTERVAL_FOCUSED_MS
                  : POLL_INTERVAL_UNFOCUSED_MS
                : POLL_INTERVAL_HIDDEN_MS;
              currentPollIntervalRef.current = normalPollInterval;
              lastPollTimeRef.current = Date.now();
              pollingIntervalRef.current = setInterval(() => {
                lastPollTimeRef.current = Date.now();
                refetchGame();
              }, normalPollInterval);
            }, pollIntervalAfterMove);
          }
        }, pollIntervalAfterMove);
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
      }
    } else {
      // No recent move: poll at normal intervals
      const normalPollInterval = !wasHiddenRef.current
        ? isWindowFocusedRef.current
          ? POLL_INTERVAL_FOCUSED_MS
          : POLL_INTERVAL_UNFOCUSED_MS
        : POLL_INTERVAL_HIDDEN_MS;
      currentPollIntervalRef.current = normalPollInterval;
      pollingIntervalRef.current = setInterval(() => {
        lastPollTimeRef.current = Date.now();
        refetchGame();
      }, normalPollInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [
    activityRevision,
    playerMoveTimestamp,
    refetchGame,
    game.turnState.turnTime,
  ]);

  // Reset move time when turn changes (opponent moved)
  React.useEffect(() => {
    if (gameData) {
      const gameDataTyped = gameData;
      const isMyTurn = gameDataTyped.turnState.currentTurn === address;

      // If it's not my turn, clear the move time (opponent's turn now)
      if (!isMyTurn) {
        playerMoveTimeRef.current = null;
        setPlayerMoveTimestamp(null); // Trigger effect re-run
      }
    }
  }, [gameData, address]);

  const resetSelection = React.useCallback(() => {
    setSelectedShipId(null);
    setPreviewPosition(null);
    setTargetShipId(null);
    setActionOverride(null);
    setDraggedShipId(null);
    setDragOverCell(null);
    setHoveredCell(null);
    setRetreatExplicitByShipId({});
  }, []);
  useResetSelectionOnTurnChange(game.turnState.currentTurn, resetSelection);

  // Initialize previous state on mount
  React.useEffect(() => {
    if (gameData && !prevGameStateRef.current) {
      const gameDataTyped = gameData;
      prevGameStateRef.current = {
        currentTurn: gameDataTyped.turnState.currentTurn,
        currentRound: gameDataTyped.turnState.currentRound,
      };
    }
  }, [gameData]);

  // Detect if state changed after event, and implement exponential backoff retry
  React.useEffect(() => {
    if (!gameData) return;

    const gameDataTyped = gameData;
    const currentState = {
      currentTurn: gameDataTyped.turnState.currentTurn,
      currentRound: gameDataTyped.turnState.currentRound,
    };

    // If we have previous state and we're expecting a change
    if (prevGameStateRef.current && expectingStateChangeRef.current) {
      const prevState = prevGameStateRef.current;

      // Check if state actually changed
      const stateChanged =
        prevState.currentTurn !== currentState.currentTurn ||
        prevState.currentRound !== currentState.currentRound;

      if (!stateChanged) {
        const retryDelay = Math.pow(2, retryAttemptRef.current) * 1000;

        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        // Schedule retry with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          retryAttemptRef.current++;
          expectingStateChangeRef.current = true; // Keep expecting change on retry
          refetchGame();
        }, retryDelay);
      } else {
        // State changed - reset retry counter and clear expecting flag
        retryAttemptRef.current = 0;
        expectingStateChangeRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }
    }

    // Update previous state
    prevGameStateRef.current = currentState;
  }, [gameData, game.metadata.gameId, refetchGame]);

  // Countdown for remaining turn time (in seconds)
  const [turnSecondsLeft, setTurnSecondsLeft] = React.useState<number>(0);
  const turnTimeSec = React.useMemo(
    () => Number(game.turnState.turnTime || 0),
    [game.turnState.turnTime],
  );
  const turnPercentRemaining = React.useMemo(() => {
    if (!turnTimeSec || turnTimeSec <= 0) return 0;
    const pct = (turnSecondsLeft / turnTimeSec) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [turnSecondsLeft, turnTimeSec]);

  React.useEffect(() => {
    // Helper to compute remaining seconds
    const computeRemaining = (): number => {
      const turnTimeSec = Number(game.turnState.turnTime || 0);
      const turnStartMs = Number(game.turnState.turnStartTime || 0);
      if (!turnTimeSec || !turnStartMs) return 0;
      const elapsedSec = Math.max(0, (Date.now() - turnStartMs) / 1000);
      return Math.max(0, turnTimeSec - elapsedSec);
    };

    // Initialize immediately
    setTurnSecondsLeft(computeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTurnSecondsLeft(computeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [game.turnState.turnTime, game.turnState.turnStartTime]);

  const formatSeconds = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Clear targeting state when game data changes (after successful moves)
  React.useEffect(() => {
    if (gameData && gameData !== initialGame) {
      // Game data has been updated, clear targeting state
      setTargetShipId(null);
    }
  }, [gameData, initialGame]);

  // Look up the map for this game from the preset maps list
  const { data: allPresetMaps, isLoading: mapLoading } = useGetAllPresetMaps();
  const gamePresetMap = React.useMemo(
    () => allPresetMaps.find((m) => m.id === game.mapId) ?? null,
    [allPresetMaps, game.mapId],
  );

  // Create grids from the preset map
  const { blockedGrid, scoringGrid, onlyOnceGrid } = React.useMemo(() => {
    return buildMapGridsFromContractMap(
      gamePresetMap?.blockedPositions,
      gamePresetMap?.scoringPositions,
      GRID_WIDTH,
      GRID_HEIGHT,
    );
  }, [gamePresetMap]);

  // Fetch ship details for all ships in the game via the game-scoped endpoint
  // (returns both players' ships, not just the current user's)
  const { ships: gameShips, isLoading: shipsLoading } = useGameShips(
    game.metadata.gameId,
  );

  // Create a map of ship ID to ship object for quick lookup
  const shipMap = React.useMemo(() => {
    const map = new Map<number, (typeof gameShips)[0]>();
    gameShips.forEach((ship) => {
      map.set(ship.id, ship);
    });
    return map;
  }, [gameShips]);

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Get ship attributes by ship ID from game data (uses displayGame for replay support)
  const getShipAttributes = React.useCallback(
    (shipId: number): Attributes | null => {
      const shipIndex = displayGame.shipIds?.findIndex((id) => id === shipId);

      if (
        shipIndex === -1 ||
        !displayGame.shipAttributes ||
        !displayGame.shipAttributes[shipIndex]
      ) {
        return null;
      }

      return displayGame.shipAttributes[shipIndex];
    },
    [displayGame.shipAttributes, displayGame.shipIds],
  );

  const isEnemyDisabledShipId = React.useCallback(
    (shipId: number): boolean => {
      const ship = shipMap.get(shipId);
      if (!ship || !address) return false;
      if (ship.owner === address) return false;
      const attrs = getShipAttributes(shipId);
      if (!attrs) return false;
      return attrs.hullPoints === 0;
    },
    [shipMap, address, getShipAttributes],
  );

  const draggedShipForSpecialRange =
    draggedShipId != null ? shipMap.get(draggedShipId) : null;
  const draggedSpecialEquipmentType =
    draggedShipForSpecialRange?.equipment.special ?? 0;
  const { specialRange: draggedSpecialRange } = useSpecialRange(
    draggedShipId != null ? draggedSpecialEquipmentType : 0,
  );

  /** Drag overlays must use the dragged ship's prefs and on-chain special range, not the prior selection. */
  const dragWeaponPlan = React.useMemo(() => {
    if (!draggedShipId) {
      return {
        mode: "weapon" as const,
        specialEquipmentType: 0,
        specialRange: undefined as number | undefined,
      };
    }
    const ship = shipMap.get(draggedShipId);
    const attrs = getShipAttributes(draggedShipId);
    if (attrs && attrs.hullPoints === 0) {
      return {
        mode: "weapon" as const,
        specialEquipmentType: draggedSpecialEquipmentType,
        specialRange: draggedSpecialRange,
      };
    }
    const canSpecial = !!(ship && ship.equipment.special > 0);
    const saved =
      weaponPreferenceByShipId[draggedShipId.toString()] ?? "weapon";
    const mode =
      saved === "special" && canSpecial
        ? ("special" as const)
        : ("weapon" as const);
    return {
      mode,
      specialEquipmentType: draggedSpecialEquipmentType,
      specialRange: draggedSpecialRange,
    };
  }, [
    draggedShipId,
    shipMap,
    getShipAttributes,
    weaponPreferenceByShipId,
    draggedSpecialEquipmentType,
    draggedSpecialRange,
  ]);

  // Build a set of shipIds that have already moved this round (from game data)
  const movedShipIdsSet = React.useMemo(() => {
    const set = new Set<number>();
    // Add creator ships that have moved
    if (game.creatorMovedShipIds) {
      game.creatorMovedShipIds.forEach((id) => set.add(id));
    }
    // Add joiner ships that have moved
    if (game.joinerMovedShipIds) {
      game.joinerMovedShipIds.forEach((id) => set.add(id));
    }
    return set;
  }, [game.creatorMovedShipIds, game.joinerMovedShipIds]);


  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = React.useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid
    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;

      // Optimistic last move:
      // If we've confirmed a tx but the contract state hasn't been refetched
      // yet, render the ship at the submitted destination (or remove it for
      // retreat). This prevents the board from snapping back to the old
      // state between tx receipt and the next blockchain update.
      if (optimisticLastMove && shipPosition.shipId === optimisticLastMove.shipId) {
        if (optimisticLastMove.actionType === ActionType.Retreat) {
          // Ship left the board: don't render it at its old position.
          return;
        }

        if (
          optimisticLastMove.newRow >= 0 &&
          optimisticLastMove.newRow < GRID_HEIGHT &&
          optimisticLastMove.newCol >= 0 &&
          optimisticLastMove.newCol < GRID_WIDTH
        ) {
          // Only place if the target cell is empty in our grid snapshot.
          if (!newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol]) {
            newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol] = {
              ...shipPosition,
              position: {
                row: optimisticLastMove.newRow,
                col: optimisticLastMove.newCol,
              },
            };
          }
        }

        // Ghost at the previous square while selection + chain state lag behind the receipt
        // (same gap as last-move replay; without this the "from" cell is empty).
        const oR = optimisticLastMove.oldRow;
        const oC = optimisticLastMove.oldCol;
        const nR = optimisticLastMove.newRow;
        const nC = optimisticLastMove.newCol;
        if (
          (oR !== nR || oC !== nC) &&
          oR >= 0 &&
          oR < GRID_HEIGHT &&
          oC >= 0 &&
          oC < GRID_WIDTH &&
          !newGrid[oR][oC]
        ) {
          newGrid[oR][oC] = {
            ...shipPosition,
            position: { row: oR, col: oC },
            isPreview: true,
          };
        }

        // Skip the original placement (we rendered the optimistic position).
        return;
      }

      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        // Always place the original ship in its original position
        newGrid[position.row][position.col] = shipPosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipPosition.shipId && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...shipPosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true, // Mark as preview for styling
          };
        } else if (selectedShipId === shipPosition.shipId && hoverPreviewPosition) {
          newGrid[hoverPreviewPosition.row][hoverPreviewPosition.col] = {
            ...shipPosition,
            position: { row: hoverPreviewPosition.row, col: hoverPreviewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    // Also show last move preview if we're displaying it (and not showing a proposed move)
    // Check conditions directly to avoid dependency order issues
    const isMyTurnNow = game.turnState.currentTurn === address;
    const shouldShowLastMoveNow =
      game.metadata.winner === ZERO_ADDR &&
      displayedLastMove &&
      displayedLastMove.shipId !== 0 &&
      selectedShipId === null;

    const isShowingProposedMoveNow = (() => {
      if (selectedShipId === null || !isMyTurnNow || previewPosition === null) {
        return false;
      }
      const ship = shipMap.get(selectedShipId);
      return ship ? ship.owner === address : false;
    })();

    // Only show last move if not showing a proposed move
    const canShowLastMove = shouldShowLastMoveNow && !isShowingProposedMoveNow;

    if (canShowLastMove && displayedLastMove) {
      const lastMoveShipPosition = aliveShipPositions.find(
        (pos) => pos.shipId === displayedLastMove.shipId,
      );

      if (lastMoveShipPosition) {
        // The ship is currently at its new position
        // Show a preview copy at the old position (ghosted/flashing)
        const oldPos = {
          row: displayedLastMove.oldRow,
          col: displayedLastMove.oldCol,
        };
        const newPos = {
          row: displayedLastMove.newRow,
          col: displayedLastMove.newCol,
        };

        // If the ship moved (old position != new position), show preview at old position
        if (oldPos.row !== newPos.row || oldPos.col !== newPos.col) {
          if (
            oldPos.row >= 0 &&
            oldPos.row < GRID_HEIGHT &&
            oldPos.col >= 0 &&
            oldPos.col < GRID_WIDTH &&
            // Don't overwrite if there's already a ship there (shouldn't happen, but safety check)
            !newGrid[oldPos.row][oldPos.col]
          ) {
            // Place preview ship at old position (ghosted/flashing effect)
            newGrid[oldPos.row][oldPos.col] = {
              ...lastMoveShipPosition,
              position: oldPos,
              isPreview: true, // Mark as preview for styling (ghosted/flashing)
            };
          }
        }
        // The ship at new position will show pulse effect via lastMoveShipId prop in GameGrid
      }

      // For destroyed-target last-move UI, render the target ship at its
      // reported position with status=destroyed so GameGrid can replace normal
      // art with destroyed art in the regular ship rendering path.
      const isTargetingLastMove =
        displayedLastMove.actionType === ActionType.Shoot ||
        displayedLastMove.actionType === ActionType.Special;
      if (isTargetingLastMove && displayedLastMove.targetShipId !== 0) {
        const destroyedTargetShipPosition = game.shipPositions.find(
          (shipPosition) =>
            shipPosition.shipId === displayedLastMove.targetShipId &&
            shipPosition.status === 1,
        );
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (
            row >= 0 &&
            row < GRID_HEIGHT &&
            col >= 0 &&
            col < GRID_WIDTH &&
            !newGrid[row][col]
          ) {
            newGrid[row][col] = destroyedTargetShipPosition;
          }
        }
      }
    }

    return newGrid;
  }, [
    aliveShipPositions,
    selectedShipId,
    previewPosition,
    hoverPreviewPosition,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    game.metadata.winner,
    game.turnState.currentTurn,
    address,
    shipMap,
  ]);

  // Calculate movement range for selected ship (any ship, for viewing).
  // Logic is shared with the tutorial via computeMovementRange.
  const movementRange = React.useMemo(
    () =>
      computeMovementRange({
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        selectedShipId,
        hasShips: !!gameShips,
        shipMap,
        getShipAttributes,
        shipPositions: aliveShipPositions,
        previewPosition,
        canEnterOccupiedCell: (_row, _col, occupyingShipId) =>
          occupyingShipId !== selectedShipId &&
          isEnemyDisabledShipId(occupyingShipId),
      }),
    [
      selectedShipId,
      gameShips,
      shipMap,
      aliveShipPositions,
      getShipAttributes,
      previewPosition,
      isEnemyDisabledShipId,
    ],
  );

  const isRammingMovePreview = React.useMemo(() => {
    if (!selectedShipId || !previewPosition) return false;
    const occupyingShip = aliveShipPositions.find(
      (pos) =>
        pos.position.row === previewPosition.row &&
        pos.position.col === previewPosition.col &&
        pos.shipId !== selectedShipId,
    );
    if (!occupyingShip) return false;
    return isEnemyDisabledShipId(occupyingShip.shipId);
  }, [
    selectedShipId,
    previewPosition,
    aliveShipPositions,
    isEnemyDisabledShipId,
  ]);

  React.useEffect(() => {
    if (!isRammingMovePreview) return;
    if (targetShipId === null) return;
    setTargetShipId(null);
  }, [isRammingMovePreview, targetShipId]);

  const calculateDamageForShip = React.useCallback(
    (
      targetShipId: number,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
      shooterShipIdOverride?: number,
    ) =>
      calculateDamage({
        shooterId: shooterShipIdOverride ?? selectedShipId,
        targetShipId,
        getShipAttributes,
        selectedWeaponType: selectedWeaponType === "ram" ? "weapon" : selectedWeaponType,
        specialData: (specialData ?? null) as SpecialData | null,
        specialType,
        weaponType,
        showReducedDamage,
      }),
    [selectedShipId, getShipAttributes, selectedWeaponType, specialData, specialType],
  );

  // Valid targets: only ships in range from current position (or from preview position when move is set). Used for selection logic.
  const validTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];
    if (isRammingMovePreview) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) cannot shoot; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const targets: {
      shipId: number;
      position: { row: number; col: number };
    }[] = [];

    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId) return;
        } else if (specialType === 1) {
          if (ship.owner === address) return;
        } else {
          if (ship.owner !== address) return;
        }
      } else {
        if (ship.owner === address) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
      const canShoot = distance === 1 || distance <= shootingRange;
      // Repair drones can target the caster's own ship (distance 0)
      const isSelfRepair =
        selectedWeaponType === "special" && specialType === 2 && distance === 0;

      if ((canShoot && distance > 0) || isSelfRepair) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
          !shouldCheckLineOfSight ||
          hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
        ) {
          targets.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return targets;
  }, [
    selectedShipId,
    previewPosition,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    blockedGrid,
    game.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
    isRammingMovePreview,
  ]);

  // Targets for damage labels:
  // - When showing move + gun range (no preview), include any enemy ship that could be shot from
  //   the current position OR from any valid move position (full threat range).
  // - When showing only gun range (preview set), include only targets in range from the preview position.
  const labelTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];
    if (isRammingMovePreview) return [];

    const attributes = getShipAttributes(selectedShipId);
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRangeAttr = attributes?.movement || 1;
    const shootingRangeAttr =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );
    if (!currentPosition) return [];

    // Origins:
    // - With preview: single origin = previewPosition (only gun range)
    // - Without preview: current position + all valid move positions (threat range)
    const origins: { row: number; col: number }[] = [];
    if (previewPosition) {
      origins.push({ row: previewPosition.row, col: previewPosition.col });
    } else {
      origins.push({
        row: currentPosition.position.row,
        col: currentPosition.position.col,
      });
      for (
        let row = Math.max(
          0,
          currentPosition.position.row - movementRangeAttr,
        );
        row <=
        Math.min(
          GRID_HEIGHT - 1,
          currentPosition.position.row + movementRangeAttr,
        );
        row++
      ) {
        for (
          let col = Math.max(
            0,
            currentPosition.position.col - movementRangeAttr,
          );
          col <=
          Math.min(
            GRID_WIDTH - 1,
            currentPosition.position.col + movementRangeAttr,
          );
          col++
        ) {
          const dist =
            Math.abs(row - currentPosition.position.row) +
            Math.abs(col - currentPosition.position.col);
          if (dist <= movementRangeAttr && dist > 0) {
            const occupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );
            if (!occupied) origins.push({ row, col });
          }
        }
      }
    }

    const targetMap = new Map<
      number,
      { shipId: number; position: { row: number; col: number } }
    >();

    for (const { row: startRow, col: startCol } of origins) {
      game.shipPositions.forEach((shipPosition) => {
        const ship = shipMap.get(shipPosition.shipId);
        if (!ship) return;

        // Same ownership/weapon-type filtering as validTargets
        if (selectedWeaponType === "special") {
          if (specialType === 3) {
            if (shipPosition.shipId === selectedShipId) return;
          } else if (specialType === 1) {
            if (ship.owner === address) return;
          } else {
            if (ship.owner !== address) return;
          }
        } else {
          if (ship.owner === address) return;
        }

        const targetRow = shipPosition.position.row;
        const targetCol = shipPosition.position.col;
        const distance =
          Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
        const canShoot =
          distance === 1 || distance <= shootingRangeAttr;

        if (canShoot && distance > 0) {
          const shouldCheckLineOfSight =
            distance > 1 &&
            (selectedWeaponType !== "special" ||
              (specialType !== 1 &&
                specialType !== 2 &&
                specialType !== 3));

          if (
            !shouldCheckLineOfSight ||
            hasLineOfSight(
              startRow,
              startCol,
              targetRow,
              targetCol,
              blockedGrid,
            )
          ) {
            targetMap.set(shipPosition.shipId, {
              shipId: shipPosition.shipId,
              position: { row: targetRow, col: targetCol },
            });
          }
        }
      });
    }

    return Array.from(targetMap.values());
  }, [
    selectedShipId,
    previewPosition,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    blockedGrid,
    game.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
    isRammingMovePreview,
  ]);

  // Assist action removed from contract; keep empty arrays for API compatibility
  const assistableTargets = React.useMemo(() => [], []);
  const assistableTargetsFromStart = React.useMemo(() => [], []);

  // Calculate shooting range for selected ship (where it could shoot from any valid move position)
  const shootingRange = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];
    if (isRammingMovePreview) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) have no move or threat range; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRange = attributes?.movement || 1;
    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const validShootingPositions: { row: number; col: number }[] = [];

    // When a move is entered (preview set), show gun range from that single origin only (same as after moving to another square)
    if (previewPosition) {
      const startRow = previewPosition.row;
      const startCol = previewPosition.col;

      // First, add all positions that are exactly 1 square away from preview position
      // (ships can always shoot adjacent enemies, even in nebula)
      for (
        let row = Math.max(0, startRow - 1);
        row <= Math.min(GRID_HEIGHT - 1, startRow + 1);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - 1);
          col <= Math.min(GRID_WIDTH - 1, startCol + 1);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only add positions that are exactly 1 square away and not occupied
          if (distance === 1) {
            const isOccupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );

            if (!isOccupied) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }

      // Then check all positions within shooting range from preview position
      for (
        let row = Math.max(0, startRow - shootingRange);
        row <= Math.min(GRID_HEIGHT - 1, startRow + shootingRange);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - shootingRange);
          col <= Math.min(GRID_WIDTH - 1, startCol + shootingRange);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only check positions within shooting range, excluding adjacent ones (already added above)
          if (distance <= shootingRange && distance > 1) {
            // Check if position is not occupied by another ship
            const isOccupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );

            if (!isOccupied) {
              // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
              // OR special abilities ignore nebula squares
              // OR regular weapons need line of sight
              const shouldCheckLineOfSight =
                distance > 1 && // Not adjacent
                (selectedWeaponType !== "special" ||
                  (specialType !== 1 &&
                    specialType !== 2 &&
                    specialType !== 3)); // Not EMP, Repair, or Flak

              if (
                !shouldCheckLineOfSight ||
                hasLineOfSight(startRow, startCol, row, col, blockedGrid)
              ) {
                validShootingPositions.push({ row, col });
              }
            }
          }
        }
      }

      return validShootingPositions;
    }

    // Original logic for showing shooting range from all possible move positions
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // First, add all positions that are exactly 1 square away from any valid move position
    // (ships can always shoot adjacent enemies, even in nebula)
    for (
      let row = Math.max(0, startRow - movementRange - 1);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRange + 1);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRange - 1);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRange + 1);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Only check positions that are exactly 1 square away from any valid move position
        if (distance === movementRange + 1) {
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

          if (!isOccupied) {
            // Check if this position is exactly 1 square away from any valid move position
            let isAdjacentToMovePosition = false;

            // Check all possible move positions
            for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = game.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this position is exactly 1 square away from this move position
                    const adjacentDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);
                    if (adjacentDistance === 1) {
                      isAdjacentToMovePosition = true;
                      break;
                    }
                  }
                }
              }
              if (isAdjacentToMovePosition) break;
            }

            if (isAdjacentToMovePosition) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    // Then check all positions within movement + shooting range
    const totalRange = movementRange + shootingRange;
    for (
      let row = Math.max(0, startRow - totalRange);
      row <= Math.min(GRID_HEIGHT - 1, startRow + totalRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - totalRange);
        col <= Math.min(GRID_WIDTH - 1, startCol + totalRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Position must be within movement + shooting range, but not within just movement range
        // (movement range positions are already highlighted as movement tiles)
        // Also exclude positions that are exactly 1 square away (already added above)
        if (
          distance > movementRange &&
          distance <= totalRange &&
          distance !== 1
        ) {
          // Check if position is not occupied by another ship
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

          if (!isOccupied) {
            // Check if any valid move position can shoot to this target position
            // We need to check if there's a valid move position that has line of sight to this target
            let canShootFromSomewhere = false;

            // First check the current position itself — ships can always stay and shoot
            if (distance <= shootingRange) {
              const shouldCheckCurrentLOS =
                distance > 1 &&
                (selectedWeaponType !== "special" ||
                  (specialType !== 1 &&
                    specialType !== 2 &&
                    specialType !== 3));
              if (
                !shouldCheckCurrentLOS ||
                hasLineOfSight(startRow, startCol, row, col, blockedGrid)
              ) {
                canShootFromSomewhere = true;
              }
            }

            // Check all possible move positions (skipped if current position already covers this cell)
            if (!canShootFromSomewhere) for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = game.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this move position can shoot to the target
                    const shootDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);

                    // Ships can always shoot enemies that are exactly 1 square away
                    // OR within their normal shooting range
                    const canShoot =
                      shootDistance === 1 || shootDistance <= shootingRange;

                    if (canShoot) {
                      // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
                      // OR special abilities ignore nebula squares
                      // OR regular weapons need line of sight
                      const shouldCheckLineOfSight =
                        shootDistance > 1 && // Not adjacent
                        (selectedWeaponType !== "special" ||
                          (specialType !== 1 &&
                            specialType !== 2 &&
                            specialType !== 3)); // Not EMP, Repair, or Flak

                      if (
                        !shouldCheckLineOfSight ||
                        hasLineOfSight(moveRow, moveCol, row, col, blockedGrid)
                      ) {
                        canShootFromSomewhere = true;
                        break;
                      }
                    }
                  }
                }
              }
              if (canShootFromSomewhere) break;
            }

            if (canShootFromSomewhere) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }, [
    selectedShipId,
    gameShips,
    shipMap,
    game.shipPositions,
    getShipAttributes,
    blockedGrid,
    hasLineOfSight,
    previewPosition,
    selectedWeaponType,
    specialRange,
    specialType,
    isRammingMovePreview,
  ]);

  // Calculate valid targets from drag position (when dragging a ship)
  const dragValidTargets = React.useMemo(() => {
    if (!draggedShipId || !dragOverCell || !gameShips) return [];

    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    const shootingRange =
      dragWeaponPlan.mode === "special" &&
      dragWeaponPlan.specialRange !== undefined
        ? dragWeaponPlan.specialRange
        : attributes.range || 1;

    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;

    const targets: {
      shipId: number;
      position: { row: number; col: number };
    }[] = [];

    const spec = dragWeaponPlan.specialEquipmentType;

    // Check all ships within shooting range
    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      // Filter targets based on weapon type
      if (dragWeaponPlan.mode === "special") {
        // Flak targets ALL ships in range (friendly and enemy) except itself
        if (spec === 3) {
          // Flak hits everything except the ship using flak
          if (shipPosition.shipId === draggedShipId) return; // Don't target self
        } else if (spec === 1) {
          // EMP targets enemy ships
          if (ship.owner === address) return; // Don't target friendly ships
        } else {
          // Other special abilities target friendly ships (allies)
          if (ship.owner !== address) return;
        }
      } else {
        // Weapons target enemy ships
        if (ship.owner === address) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      // Ships can always shoot enemies that are exactly 1 square away
      // OR within their normal shooting range
      const canShoot = distance === 1 || distance <= shootingRange;

      if (canShoot && distance > 0) {
        // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
        // OR special abilities ignore nebula squares
        // OR regular weapons need line of sight
        const shouldCheckLineOfSight =
          distance > 1 && // Not adjacent
          (dragWeaponPlan.mode !== "special" ||
            (spec !== 1 && spec !== 2 && spec !== 3)); // Not EMP, Repair, or Flak

        if (
          !shouldCheckLineOfSight ||
          hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
        ) {
          targets.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return targets;
  }, [
    draggedShipId,
    dragOverCell,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    dragWeaponPlan,
    game.shipPositions,
    blockedGrid,
    hasLineOfSight,
  ]);

  // Calculate shooting range from drag position (when dragging a ship)
  const dragShootingRange = React.useMemo(() => {
    if (!draggedShipId || !dragOverCell || !gameShips) return [];

    const ship = shipMap.get(draggedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    const shootingRange =
      dragWeaponPlan.mode === "special" &&
      dragWeaponPlan.specialRange !== undefined
        ? dragWeaponPlan.specialRange
        : attributes.range || 1;

    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;
    const spec = dragWeaponPlan.specialEquipmentType;

    const validShootingPositions: { row: number; col: number }[] = [];

    // First, add all positions that are exactly 1 square away
    for (
      let row = Math.max(0, startRow - 1);
      row <= Math.min(GRID_HEIGHT - 1, startRow + 1);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - 1);
        col <= Math.min(GRID_WIDTH - 1, startCol + 1);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance === 1) {
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );
          if (!isOccupied) {
            validShootingPositions.push({ row, col });
          }
        }
      }
    }

    // Then check all positions within shooting range
    for (
      let row = Math.max(0, startRow - shootingRange);
      row <= Math.min(GRID_HEIGHT - 1, startRow + shootingRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - shootingRange);
        col <= Math.min(GRID_WIDTH - 1, startCol + shootingRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance <= shootingRange && distance > 1) {
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );
          if (!isOccupied) {
            const shouldCheckLineOfSight =
              distance > 1 &&
              (dragWeaponPlan.mode !== "special" ||
                (spec !== 1 && spec !== 2 && spec !== 3));

            if (
              !shouldCheckLineOfSight ||
              hasLineOfSight(startRow, startCol, row, col, blockedGrid)
            ) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }, [
    draggedShipId,
    dragOverCell,
    gameShips,
    shipMap,
    getShipAttributes,
    dragWeaponPlan,
    game.shipPositions,
    blockedGrid,
    hasLineOfSight,
  ]);

  // Valid targets from the hovered movement tile (mirrors dragValidTargets using selected ship + weapon).
  const hoverValidTargets = React.useMemo(() => {
    if (!selectedShipId || !hoverPreviewPosition || !gameShips) return [];
    const attributes = getShipAttributes(selectedShipId);
    if (!attributes) return [];
    const range = selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes.range || 1;
    const { row: startRow, col: startCol } = hoverPreviewPosition;
    const spec = specialType;
    const targets: { shipId: number; position: { row: number; col: number } }[] = [];
    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;
      if (selectedWeaponType === "special") {
        if (spec === 3) { if (shipPosition.shipId === selectedShipId) return; }
        else if (spec === 1) { if (ship.owner === address) return; }
        else { if (ship.owner !== address) return; }
      } else {
        if (ship.owner === address) return;
      }
      const { row: targetRow, col: targetCol } = shipPosition.position;
      const distance = Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
      const canShoot = distance === 1 || distance <= range;
      if (canShoot && distance > 0) {
        const shouldCheckLOS = distance > 1 && (selectedWeaponType !== "special" || (spec !== 1 && spec !== 2 && spec !== 3));
        if (!shouldCheckLOS || hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)) {
          targets.push({ shipId: shipPosition.shipId, position: { row: targetRow, col: targetCol } });
        }
      }
    });
    return targets;
  }, [selectedShipId, hoverPreviewPosition, gameShips, shipMap, address, getShipAttributes, selectedWeaponType, specialType, specialRange, game.shipPositions, blockedGrid, hasLineOfSight]);

  // Shooting range overlay from the hovered movement tile (mirrors dragShootingRange).
  const hoverShootingRange = React.useMemo(() => {
    if (!selectedShipId || !hoverPreviewPosition || !gameShips) return [];
    const attributes = getShipAttributes(selectedShipId);
    if (!attributes) return [];
    const range = selectedWeaponType === "special" && specialRange !== undefined
      ? specialRange
      : attributes.range || 1;
    const { row: startRow, col: startCol } = hoverPreviewPosition;
    const spec = specialType;
    const positions: { row: number; col: number }[] = [];
    for (let row = Math.max(0, startRow - range); row <= Math.min(GRID_HEIGHT - 1, startRow + range); row++) {
      for (let col = Math.max(0, startCol - range); col <= Math.min(GRID_WIDTH - 1, startCol + range); col++) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance > 0 && distance <= range) {
          const isOccupied = game.shipPositions.some(p => p.position.row === row && p.position.col === col);
          if (!isOccupied) {
            const shouldCheckLOS = distance > 1 && (selectedWeaponType !== "special" || (spec !== 1 && spec !== 2 && spec !== 3));
            if (!shouldCheckLOS || hasLineOfSight(startRow, startCol, row, col, blockedGrid)) {
              positions.push({ row, col });
            }
          }
        }
      }
    }
    return positions;
  }, [selectedShipId, hoverPreviewPosition, gameShips, getShipAttributes, selectedWeaponType, specialType, specialRange, game.shipPositions, blockedGrid, hasLineOfSight]);

  // Auto-set Flak to target all ships when Flak is first selected
  // Use a ref to track if we've already set it for this selection
  const flakAutoSetRef = React.useRef<{
    shipId: number | null;
    weaponType: string;
  }>({
    shipId: null,
    weaponType: "weapon",
  });

  React.useEffect(() => {
    if (
      selectedShipId &&
      selectedWeaponType === "special" &&
      specialType === 3
    ) {
      // Only auto-set if this is a new selection (ship changed or weapon type changed to special)
      const isNewSelection =
        flakAutoSetRef.current.shipId !== selectedShipId ||
        (flakAutoSetRef.current.weaponType !== "special" &&
          selectedWeaponType === "special");

      if (isNewSelection && targetShipId !== null) {
        // Automatically set target to 0n (all ships) for Flak
        setTargetShipId(0);
        flakAutoSetRef.current = {
          shipId: selectedShipId,
          weaponType: selectedWeaponType,
        };
      }
    } else {
      // Reset the ref when not Flak
      flakAutoSetRef.current = {
        shipId: selectedShipId,
        weaponType: selectedWeaponType,
      };
    }
  }, [selectedShipId, selectedWeaponType, specialType, targetShipId]);

  // Check if it's the current player's turn
  const isMyTurn = game.turnState.currentTurn === address;
  const [awaitingTurnSyncAfterSubmit, setAwaitingTurnSyncAfterSubmit] =
    React.useState(false);
  const isMyTurnEffective = isMyTurn && !awaitingTurnSyncAfterSubmit;
  const canActInGame = !readOnly && isMyTurnEffective;

  React.useEffect(() => {
    const isLow = !readOnly && isMyTurnEffective && turnSecondsLeft > 0 && turnSecondsLeft < 60;
    if (isLow) {
      document.documentElement.style.setProperty(
        "--game-bg-override",
        "color-mix(in srgb, var(--color-amber) 20%, var(--color-near-black))",
      );
    } else {
      document.documentElement.style.removeProperty("--game-bg-override");
    }
    return () => {
      document.documentElement.style.removeProperty("--game-bg-override");
    };
  }, [readOnly, isMyTurnEffective, turnSecondsLeft]);

  // Track if we're currently displaying the last move (to avoid infinite loops)
  const isDisplayingLastMoveRef = React.useRef(false);
  const lastDisplayedMoveRef = React.useRef<{
    shipId: number;
    newRow: number;
    newCol: number;
  } | null>(null);

  // Determine if we should show last move preview
  // Show to both players UNLESS:
  // - They have a ship selected, OR
  // - It's their turn AND they have proposed but not submitted a move
  const shouldShowLastMove = React.useMemo(() => {
    // Don't show if game is won
    if (game.metadata.winner !== ZERO_ADDR) {
      return false;
    }

    // Don't show if no last move exists
    if (!displayedLastMove || displayedLastMove.shipId === 0) {
      return false;
    }

    // Don't show if player has a ship selected
    if (selectedShipId !== null) {
      return false;
    }

    // For Retreat, the ship has left the board. Use only last move data (oldRow, oldCol); do not require ship in shipMap or shipPositions.
    if (
      (displayedLastMove.actionType as ActionType) === ActionType.Retreat
    ) {
      return true;
    }

    // For other actions, the last move ship must exist in cache
    const lastMoveShip = shipMap.get(displayedLastMove.shipId);
    if (!lastMoveShip) {
      return false;
    }

    // If we are optimistically displaying the last move, don't require the
    // contract state to have caught up yet (shipPositions will lag).
    if (optimisticLastMove) {
      return true;
    }

    // Verify the ship is actually at the new position in the current game state
    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === displayedLastMove.shipId,
    );
    if (
      currentPosition &&
      currentPosition.position.row === displayedLastMove.newRow &&
      currentPosition.position.col === displayedLastMove.newCol
    ) {
      return true;
    }

    return false;
  }, [
    game.metadata.winner,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    selectedShipId,
    shipMap,
  ]);

  // Last-move arrow, borders, and replay overlays: same visibility as ghost tiles.
  // Hide whenever any ship is selected so the grid focuses on the active selection.
  const shouldShowLastMoveOnGrid = React.useMemo(() => {
    if (game.metadata.winner !== ZERO_ADDR) {
      return false;
    }
    if (!displayedLastMove || displayedLastMove.shipId === 0) {
      return false;
    }
    if (selectedShipId !== null) {
      return false;
    }
    if ((displayedLastMove.actionType as ActionType) === ActionType.Retreat) {
      return true;
    }
    const lastMoveShip = shipMap.get(displayedLastMove.shipId);
    if (!lastMoveShip) {
      return false;
    }
    if (optimisticLastMove) {
      return true;
    }
    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === displayedLastMove.shipId,
    );
    if (
      currentPosition &&
      currentPosition.position.row === displayedLastMove.newRow &&
      currentPosition.position.col === displayedLastMove.newCol
    ) {
      return true;
    }
    return false;
  }, [
    game.metadata.winner,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    shipMap,
    selectedShipId,
  ]);

  // Check if a ship belongs to the current player
  const isShipOwnedByCurrentPlayer = React.useCallback(
    (shipId: number): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === address : false;
    },
    [shipMap, address],
  );

  // Track if we're showing a proposed move (not last move)
  const isShowingProposedMove = React.useMemo(() => {
    if (selectedShipId === null) return false;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;

    const waitingOnMoveTx = isMoveSubmitting || awaitingTurnSyncAfterSubmit;

    if (movedShipIdsSet.has(selectedShipId)) {
      // Disabled ships can still retreat even after being marked moved (they're never required to move)
      const attrs = getShipAttributes(selectedShipId);
      if (!(attrs && attrs.hullPoints === 0)) return false;
    }

    if (!canActInGame && !waitingOnMoveTx) return false;
    return true;
  }, [
    selectedShipId,
    canActInGame,
    awaitingTurnSyncAfterSubmit,
    isMoveSubmitting,
    isShipOwnedByCurrentPlayer,
    movedShipIdsSet,
    getShipAttributes,
  ]);

  React.useEffect(() => {
    if (!isLandscapeMobile) return;
    if (isShowingProposedMove && mobileActivePanel === "none") {
      setMobileActivePanel("actions");
    }
  }, [isLandscapeMobile, isShowingProposedMove, mobileActivePanel]);

  React.useEffect(() => {
    if (!isLandscapeMobile) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isLandscapeMobile]);

  const isSelectedShipDisabled = React.useMemo(() => {
    if (!selectedShipId) return false;
    const attrs = getShipAttributes(selectedShipId);
    return !!attrs && attrs.hullPoints === 0;
  }, [selectedShipId, getShipAttributes]);

  const holdPositionState = React.useMemo(() => {
    if (!selectedShipId) return { row: -1, col: -1, isActive: false };
    const pos = game.shipPositions.find((p) => p.shipId === selectedShipId);
    const row = pos?.position.row ?? -1;
    const col = pos?.position.col ?? -1;
    const isActive =
      previewPosition !== null &&
      previewPosition.row === row &&
      previewPosition.col === col &&
      !isRammingMovePreview;
    return { row, col, isActive };
  }, [selectedShipId, game.shipPositions, previewPosition, isRammingMovePreview]);

  // Disabled ships: pre-stage Retreat (player can submit or cancel and leave the ship on field).
  // Healthy ships: Retreat only if the player explicitly chose it for that ship.
  React.useEffect(() => {
    if (selectedShipId === null) return;
    const attrs = getShipAttributes(selectedShipId);
    if (attrs && attrs.hullPoints === 0) {
      setActionOverride(ActionType.Retreat);
      setTargetShipId(null);
      setPreviewPosition(null);
      return;
    }
    setActionOverride(
      retreatExplicitByShipId[selectedShipId.toString()]
        ? ActionType.Retreat
        : null,
    );
  }, [selectedShipId, getShipAttributes, retreatExplicitByShipId]);

  // When showing last move, set up the preview state to display it
  // This should NOT interfere with proposed moves
  React.useEffect(() => {
    // Don't show last move if user has selected a ship or is making a proposed move
    if (selectedShipId !== null || isShowingProposedMove) {
      if (isDisplayingLastMoveRef.current) {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        setPreviewPosition(null);
        setTargetShipId(null);
      }
      return;
    }

    // Check if last move has changed
    const lastMoveChanged =
      !lastDisplayedMoveRef.current ||
      !displayedLastMove ||
      lastDisplayedMoveRef.current.shipId !== displayedLastMove.shipId ||
      lastDisplayedMoveRef.current.newRow !== displayedLastMove.newRow ||
      lastDisplayedMoveRef.current.newCol !== displayedLastMove.newCol;

    // Only set up last move preview if conditions are met
    if (shouldShowLastMove && displayedLastMove && lastMoveChanged) {
      const lastMoveShip = shipMap.get(displayedLastMove.shipId);
      if (lastMoveShip) {
        // Mark that we're displaying the last move
        isDisplayingLastMoveRef.current = true;
        lastDisplayedMoveRef.current = {
          shipId: displayedLastMove.shipId,
          newRow: displayedLastMove.newRow,
          newCol: displayedLastMove.newCol,
        };

        // Set preview position for last move
        setPreviewPosition({
          row: displayedLastMove.newRow,
          col: displayedLastMove.newCol,
        });
        // Set target if there is one
        if (displayedLastMove.targetShipId !== 0) {
          setTargetShipId(displayedLastMove.targetShipId);
        } else {
          setTargetShipId(null);
        }
        // Set weapon type based on action
        if (displayedLastMove.actionType === ActionType.Shoot) {
          setSelectedWeaponType("weapon");
        } else if (displayedLastMove.actionType === ActionType.Special) {
          setSelectedWeaponType("special");
        }
      }
    } else if (!shouldShowLastMove && isDisplayingLastMoveRef.current) {
      // Clear preview when not showing last move
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
      setPreviewPosition(null);
      setTargetShipId(null);
    }
  }, [
    shouldShowLastMove,
    displayedLastMove,
    shipMap,
    selectedShipId,
  ]);

  const setWeaponTypeFromGrid = React.useCallback(
    (type: "weapon" | "special" | "ram") => {
      if (selectedShipId != null && type !== "ram") {
        // "ram" is positional/transient — not saved as a per-ship preference.
        const idKey = selectedShipId.toString();
        setWeaponPreferenceByShipId((prev) => ({ ...prev, [idKey]: type }));
      }
      setSelectedWeaponType(type);
    },
    [selectedShipId],
  );

  // Layout effect: apply per-ship weapon mode before paint so range highlights match the selected ship.
  React.useLayoutEffect(() => {
    if (selectedShipId === null) {
      if (!shouldShowLastMove) {
        setSelectedWeaponType("weapon");
      }
      return;
    }

    const idKey = selectedShipId.toString();
    const ship = shipMap.get(selectedShipId);
    const attrs = getShipAttributes(selectedShipId);
    if (attrs && attrs.hullPoints === 0) {
      setWeaponPreferenceByShipId((prev) => {
        if (prev[idKey] === "weapon") return prev;
        return { ...prev, [idKey]: "weapon" };
      });
      setSelectedWeaponType("weapon");
      return;
    }

    const canSpecial = !!(ship && ship.equipment.special > 0);
    const saved = weaponPreferenceByShipId[idKey] ?? "weapon";
    if (saved === "special" && !canSpecial) {
      setWeaponPreferenceByShipId((prev) => ({ ...prev, [idKey]: "weapon" }));
      setSelectedWeaponType("weapon");
      return;
    }

    // "ram" is never persisted as a saved preference; treat it like "weapon".
    setSelectedWeaponType(saved === "ram" ? "weapon" : saved);
  }, [
    selectedShipId,
    weaponPreferenceByShipId,
    shipMap,
    getShipAttributes,
    shouldShowLastMove,
  ]);

  // When a non-ram move is staged while in RAM mode, fall back to the primary weapon.
  React.useEffect(() => {
    if (selectedWeaponType === "ram" && previewPosition && !isRammingMovePreview) {
      setSelectedWeaponType("weapon");
    }
  }, [previewPosition, isRammingMovePreview, selectedWeaponType]);

  // Clear staged move when a ship is deselected.
  React.useEffect(() => {
    if (selectedShipId === null) {
      setPreviewPosition(null);
      setTargetShipId(null);
    }
  }, [selectedShipId]);

  // Auto-switch to RAM on ship selection when a rammable target is in range.
  // Intentionally keyed only on selectedShipId so manual weapon changes from the
  // pill selector don't trigger a re-run and override the user's choice.
  React.useEffect(() => {
    if (!selectedShipId) return;
    const selectedPos = aliveShipPositions.find(p => p.shipId === selectedShipId);
    const attrs = getShipAttributes(selectedShipId);
    if (!selectedPos || !attrs) return;
    const moveRange = attrs.movement || 1;
    const hasRamTarget = aliveShipPositions.some(pos => {
      if (pos.shipId === selectedShipId) return false;
      if (!isEnemyDisabledShipId(pos.shipId)) return false;
      const dist = Math.abs(pos.position.row - selectedPos.position.row) +
                   Math.abs(pos.position.col - selectedPos.position.col);
      return dist > 0 && dist <= moveRange;
    });
    if (hasRamTarget) setSelectedWeaponType("ram");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShipId]);

  // Clear optimistic last move once the contract state catches up.
  React.useEffect(() => {
    if (!optimisticLastMove) return;
    if (!game.lastMove) return;

    const matches =
      game.lastMove.shipId === optimisticLastMove.shipId &&
      game.lastMove.actionType === optimisticLastMove.actionType &&
      game.lastMove.targetShipId === optimisticLastMove.targetShipId &&
      game.lastMove.oldRow === optimisticLastMove.oldRow &&
      game.lastMove.oldCol === optimisticLastMove.oldCol &&
      game.lastMove.newRow === optimisticLastMove.newRow &&
      game.lastMove.newCol === optimisticLastMove.newCol;

    if (matches) {
      setOptimisticLastMove(null);
      setAwaitingTurnSyncAfterSubmit(false);
      // The blockchain state has caught up to the submitted preview.
      // Clear local proposal UI now (not immediately on submit) so the
      // previewed board state remains visible during the sync gap.
      setPreviewPosition(null);
      setSelectedShipId(null);
      setTargetShipId(null);
    }
  }, [
    optimisticLastMove,
    game.lastMove,
    optimisticLastMove?.shipId,
    optimisticLastMove?.actionType,
    optimisticLastMove?.targetShipId,
    optimisticLastMove?.oldRow,
    optimisticLastMove?.oldCol,
    optimisticLastMove?.newRow,
    optimisticLastMove?.newCol,
  ]);

  // If chain state already says it is no longer our turn, allow local UI to
  // resume normal turn derivation immediately.
  React.useEffect(() => {
    if (!awaitingTurnSyncAfterSubmit) return;
    if (!isMyTurn) {
      setAwaitingTurnSyncAfterSubmit(false);
      // Turn advanced onchain; clear any locally held proposal state.
      setPreviewPosition(null);
      setSelectedShipId(null);
      setTargetShipId(null);
    }
  }, [awaitingTurnSyncAfterSubmit, isMyTurn]);

  // For Retreat, newRow/newCol are -1 (fled); don't highlight a cell
  const highlightedMovePosition =
    shouldShowLastMove &&
    displayedLastMove &&
    !isShowingProposedMove &&
    (displayedLastMove.actionType as ActionType) !== ActionType.Retreat &&
    displayedLastMove.newRow >= 0 &&
    displayedLastMove.newCol >= 0
      ? { row: displayedLastMove.newRow, col: displayedLastMove.newCol }
      : null;

  // Last move props for GameGrid
  const lastMoveShipId =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? displayedLastMove.shipId
      : null;
  const lastMoveOldPosition =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? { row: displayedLastMove.oldRow, col: displayedLastMove.oldCol }
      : null;

  const lastMoveNewPosition =
    shouldShowLastMoveOnGrid &&
    displayedLastMove &&
    !isShowingProposedMove &&
    displayedLastMove.newRow >= 0 &&
    displayedLastMove.newCol >= 0
      ? { row: displayedLastMove.newRow, col: displayedLastMove.newCol }
      : null;

  const lastMoveActionType =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? displayedLastMove.actionType
      : null;

  const lastMoveTargetShipId =
    shouldShowLastMoveOnGrid &&
    displayedLastMove &&
    !isShowingProposedMove &&
    ((displayedLastMove.actionType as ActionType) === ActionType.Special ||
      (displayedLastMove.actionType as ActionType) === ActionType.Shoot) &&
    displayedLastMove.targetShipId !== 0
      ? displayedLastMove.targetShipId
      : null;

  // Who made the last move: use ship owner when ship is in map; otherwise derive from turn (after a move, turn switches to the other player)
  const lastMoveIsCurrentPlayer =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? (() => {
          const ship = shipMap.get(displayedLastMove!.shipId);
          if (ship) return ship.owner === address;
          return game.turnState.currentTurn !== address;
        })()
      : undefined;

  const appendDestroyedTextToLastMove = React.useMemo(() => {
    if (!displayedLastMove) return false;
    if (displayedLastMove.targetShipId === 0) return false;

    const isTargetingAction =
      displayedLastMove.actionType === ActionType.Shoot ||
      displayedLastMove.actionType === ActionType.Special;
    if (!isTargetingAction) return false;

    return !game.shipPositions.some(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );
  }, [displayedLastMove, game.shipPositions]);

  const lastMoveTargetPositionDebugSuffix = React.useMemo(() => {
    if (!displayedLastMove) return "";
    if (displayedLastMove.targetShipId === 0) return "";
    // Ram removes the target from shipPositions by design — not a missing-data error.
    if (displayedLastMove.actionType === ActionType.Ram) return "";

    const targetPos = game.shipPositions.find(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );

    if (!targetPos) {
      return "[target shipPositions row,col: missing]";
    }

    return `[target shipPositions row,col: ${targetPos.position.row},${targetPos.position.col}]`;
  }, [displayedLastMove, game.shipPositions]);

  React.useEffect(() => {
    if (!displayedLastMove) return;
    if (displayedLastMove.targetShipId === 0) return;
    if (displayedLastMove.actionType === ActionType.Ram) return;

    const targetExists = game.shipPositions.some(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );
    if (targetExists) return;

  }, [displayedLastMove, game.metadata.gameId, game.shipPositions]);

  const retreatPrepShipId =
    selectedShipId != null &&
    actionOverride === ActionType.Retreat &&
    isShipOwnedByCurrentPlayer(selectedShipId)
      ? selectedShipId
      : null;

  const retreatPrepIsCreator =
    retreatPrepShipId != null
      ? (() => {
          const ship = shipMap.get(retreatPrepShipId);
          return ship ? ship.owner === game.metadata.creator : null;
        })()
      : null;

  // Track previous turn state to detect turn changes
  const prevTurnRef = React.useRef<boolean | null>(null);

  // Play alert sound when it becomes the player's turn
  React.useEffect(() => {
    if (
      !readOnly &&
      isMyTurnEffective &&
      address &&
      prevTurnRef.current === false
    ) {
      // Only play sound when turn changes from opponent to player
      const audio = new Audio("/sound/alert.mp3");
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(() => {
        // Silently fail - some browsers block autoplay
      });
    }
    // Update the previous turn state
    prevTurnRef.current = isMyTurnEffective;
  }, [isMyTurnEffective, address, readOnly]);

  // Clear any pending transaction state when turn changes
  React.useEffect(() => {
    // Clear any stale transaction state when it becomes the player's turn
    if (!readOnly && isMyTurnEffective && address) {
      // Always clear transaction state when it's the player's turn
      // This ensures the submit button is enabled even if there was a pending transaction
      clearAllTransactions();

      // Reset move-related state to ensure clean slate (only when transitioning from opponent)
      if (prevTurnRef.current === false) {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        setPreviewPosition(null);
        setSelectedShipId(null);
        setTargetShipId(null);
        // Keep selectedWeaponType so it only changes when player uses the dropdown
      }
    }
  }, [isMyTurnEffective, address, clearAllTransactions, readOnly]);

  // Handle move submission

  // Clear last move display when user selects a ship or makes a proposed move
  React.useEffect(() => {
    if (selectedShipId !== null || isShowingProposedMove) {
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
    }
  }, [selectedShipId, isShowingProposedMove]);

  // Handle move cancellation
  const handleCancelMove = () => {
    isDisplayingLastMoveRef.current = false;
    lastDisplayedMoveRef.current = null;
    setPreviewPosition(null);
    setSelectedShipId(null);
    setTargetShipId(null);
    // Keep selectedWeaponType so it only changes when player uses the dropdown
  };

  /** Right-click on the map clears selection in GameGrid; sync last-move replay + retreat override here. */
  const handleGridRightClickDeselect = React.useCallback(() => {
    isDisplayingLastMoveRef.current = false;
    lastDisplayedMoveRef.current = null;
    setActionOverride(null);
  }, []);

  /** Tutorial parity: pulse is driven by tutorial steps in SimulatedGameDisplay; live game leaves it off. */
  const shouldPulseSubmitMoveButton = React.useMemo(() => false, []);

  const computedActionType = React.useMemo(() => {
    if (actionOverride != null) return actionOverride;
    if (isRammingMovePreview) return ActionType.Ram;
    if (targetShipId !== null && targetShipId !== 0) {
      return selectedWeaponType === "special" ? ActionType.Special : ActionType.Shoot;
    }
    if (targetShipId === 0 && selectedWeaponType === "special" && specialType === 3) {
      return ActionType.Special;
    }
    return ActionType.Pass;
  }, [actionOverride, isRammingMovePreview, targetShipId, selectedWeaponType, specialType]);

  const computedMoveCoords = React.useMemo(() => {
    const row = previewPosition
      ? previewPosition.row
      : (game.shipPositions.find((p) => p.shipId === selectedShipId)?.position.row ?? 0);
    const col = previewPosition
      ? previewPosition.col
      : (game.shipPositions.find((p) => p.shipId === selectedShipId)?.position.col ?? 0);
    return { row, col };
  }, [previewPosition, game.shipPositions, selectedShipId]);

  const handleSubmitAction = React.useCallback(async () => {
    if (!selectedShipId || isMoveSubmitting) return;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
      toast.error("You can only move your own ships");
      return;
    }
    const { row: computedRow, col: computedCol } = computedMoveCoords;
    if (computedActionType !== ActionType.Retreat) {
      if (movedShipIdsSet.has(selectedShipId)) {
        toast.error("This ship has already moved this round");
        return;
      }
      if (computedRow < 0 || computedRow >= GRID_HEIGHT || computedCol < 0 || computedCol >= GRID_WIDTH) {
        toast.error("Invalid position coordinates");
        return;
      }
    }
    setIsMoveSubmitting(true);
    setAwaitingTurnSyncAfterSubmit(true);
    try {
      const currentPosition = game.shipPositions.find((pos) => pos.shipId === selectedShipId);
      const oldRow = currentPosition ? currentPosition.position.row : computedRow;
      const oldCol = currentPosition ? currentPosition.position.col : computedCol;
      const submittedTargetShipId =
        computedActionType === ActionType.Pass
          ? 0
          : computedActionType === ActionType.Ram
            ? (aliveShipPositions.find(
                (pos) =>
                  pos.position.row === computedRow &&
                  pos.position.col === computedCol &&
                  pos.shipId !== selectedShipId,
              )?.shipId ?? 0)
            : (targetShipId || 0);

      const updatedState = await apiMutate<GameDataView>(
        `/api/games/${game.metadata.gameId}/action`,
        "POST",
        {
          shipId: selectedShipId,
          row: computedRow,
          col: computedCol,
          actionType: computedActionType,
          targetShipId: submittedTargetShipId,
          specialType,
        },
      );

      queryClient.setQueryData(["games", Number(game.metadata.gameId)], updatedState);

      if (String(updatedState.turnState.currentTurn) === address) {
        setAwaitingTurnSyncAfterSubmit(false);
      }

      posthog.capture("game_move_submitted", {
        game_id: String(game.metadata.gameId),
        ship_id: selectedShipId.toString(),
        move_type: ActionType[computedActionType] ?? String(computedActionType),
        ...(submittedTargetShipId !== 0 ? { target_ship_id: submittedTargetShipId.toString() } : {}),
      });

      setOptimisticLastMove({
        shipId: selectedShipId,
        oldRow,
        oldCol,
        newRow: computedActionType === ActionType.Retreat ? -1 : computedRow,
        newCol: computedActionType === ActionType.Retreat ? -1 : computedCol,
        actionType: computedActionType,
        targetShipId: submittedTargetShipId,
        timestamp: Number(Date.now()),
      });

      toast.success("Move submitted!");
      const moveTime = Date.now();
      playerMoveTimeRef.current = moveTime;
      setPlayerMoveTimestamp(moveTime);
      refetch?.();
    } catch (err) {
      setAwaitingTurnSyncAfterSubmit(false);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Not your turn")) {
        toast.error("It's not your turn to move");
      } else if (errorMessage.includes("already moved")) {
        toast.error("This ship has already moved this round");
      } else {
        toast.error(`Move failed: ${errorMessage}`);
      }
    } finally {
      setIsMoveSubmitting(false);
    }
  }, [
    selectedShipId, isMoveSubmitting, isShipOwnedByCurrentPlayer, computedActionType,
    computedMoveCoords, movedShipIdsSet, game.shipPositions, game.metadata.gameId,
    aliveShipPositions, targetShipId, specialType, address, queryClient,
    setOptimisticLastMove, refetch, setAwaitingTurnSyncAfterSubmit,
  ]);

  const showConfirmWidget = React.useMemo(() =>
    !readOnly &&
    isShowingProposedMove &&
    !isReplaying &&
    actionOverride !== ActionType.Retreat &&
    (
      previewPosition !== null || // move staged (to new cell or hold)
      targetShipId !== null       // target selected (with or without move)
    ),
  [readOnly, isShowingProposedMove, isReplaying, previewPosition, actionOverride, targetShipId]);

  /** Top of proposed-move panel: 2/3 submit + 1/3 cancel (side), or horizontal row (wide). */
  const renderProposedMoveSubmitCancelRow = (): React.ReactNode => {
    const isRail = useSideLayout;
    const isJoinerSide =
      !!address &&
      address.toLowerCase() === game.metadata.joiner.toLowerCase();
    return (
      <div
        className={
          isRail || isLandscapeMobile
            ? "flex w-full min-w-0 shrink-0 flex-row gap-2"
            : `flex w-full min-w-0 shrink-0 flex-row flex-wrap items-center gap-2 ${
                isJoinerSide ? "justify-end" : "justify-start"
              }`
        }
      >
        <>
          <button
            type="button"
            disabled={isMoveSubmitting}
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-phosphor-green)",
              borderTopColor: "var(--color-phosphor-green)",
              borderLeftColor: "var(--color-phosphor-green)",
              color: "var(--color-phosphor-green)",
              backgroundColor: "var(--color-steel)",
              borderWidth: "2px",
              borderStyle: "solid",
            }}
            className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 ${
              isRail || isLandscapeMobile ? "min-w-0 flex-[2] h-full w-full" : ""
            } order-2${
              shouldPulseSubmitMoveButton
                ? " animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                : ""
            }`}
            onClick={handleSubmitAction}
          >
            {isMoveSubmitting ? "[SUBMITTING...]" : isSelectedShipDisabled ? "Submit Retreat" : computedActionType === ActionType.Pass ? "Hold Fire" : "Submit"}
          </button>
          <button
            type="button"
            onClick={handleCancelMove}
            className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150${
              isRail || isLandscapeMobile ? " min-w-0 flex-[1]" : ""
            } ${isRail ? "order-1" : "order-1"}`}
            style={
              isRail || isLandscapeMobile
                ? {
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    borderTopColor: "var(--color-steel)",
                    borderLeftColor: "var(--color-steel)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-slate)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: 0,
                  }
                : {
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    borderTopColor: "var(--color-steel)",
                    borderLeftColor: "var(--color-steel)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-slate)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: 0,
                  }
            }
            onMouseEnter={
              isRail
                ? undefined
                : (e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-slate)";
                    e.currentTarget.style.borderColor = "var(--color-cyan)";
                    e.currentTarget.style.color = "var(--color-cyan)";
                  }
            }
            onMouseLeave={
              isRail
                ? undefined
                : (e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                    e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                    e.currentTarget.style.color =
                      "var(--color-text-secondary)";
                  }
            }
          >
            Cancel
          </button>
        </>
      </div>
    );
  };

  // Handle Escape key to deselect ship and reset preview position
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        // Keep selectedWeaponType so it only changes when player uses the dropdown
        setDraggedShipId(null);
        setDragOverCell(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (requiresLandscapeMode) {
    return (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center p-4"
        style={{ backgroundColor: "var(--color-near-black)" }}
      >
        <div
          className="border-2 bg-near-black/85 p-4 text-center sm:p-5"
          style={{ width: "min(90vw, 22rem)", borderColor: "var(--color-cyan)" }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="animate-phone-rotate"
              style={{
                width: "2rem",
                height: "3.4rem",
                border: "2px solid var(--color-cyan)",
                borderRadius: "4px",
                position: "relative",
                opacity: 0.8,
              }}
            >
              <div style={{
                position: "absolute",
                top: "4px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "0.6rem",
                height: "2px",
                backgroundColor: "var(--color-cyan)",
                borderRadius: "1px",
              }} />
            </div>
          </div>
          <h2
            className="text-lg font-bold uppercase tracking-wider text-cyan sm:text-xl"
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            Rotate to Landscape
          </h2>
          <p className="mt-2 text-sm text-text-secondary sm:mt-3">
            This battle view requires landscape mode on mobile. Rotate your
            device to continue.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 border border-steel px-4 py-2 text-sm font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-cyan hover:text-cyan sm:mt-5"
            style={{ borderRadius: 0 }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Show loading state if game data is being fetched
  if (gameLoading) {
    return (
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
              e.currentTarget.style.borderColor = "var(--color-cyan)";
              e.currentTarget.style.color = "var(--color-cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
              e.currentTarget.style.borderColor = "var(--color-gunmetal)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            ←
          </button>
        </div>
        <div className="text-center py-8">
          <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse">&gt;&gt; ACQUIRING GAME STATE...</div>
        </div>
      </div>
    );
  }

  // Show error state if game data failed to load
  if (gameError) {
    return (
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
              e.currentTarget.style.borderColor = "var(--color-cyan)";
              e.currentTarget.style.color = "var(--color-cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
              e.currentTarget.style.borderColor = "var(--color-gunmetal)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            ←
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-warning-red">
            [ERR] loading game data: {gameError.message}
          </p>
          <button
            onClick={() => refetchGame()}
            className="mt-4 px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-cyan)",
              color: "var(--color-cyan)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while ships and map data are being fetched
  if (shipsLoading || mapLoading) {
    return (
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                borderColor: "var(--color-gunmetal)",
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-steel)",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-slate)";
                e.currentTarget.style.borderColor = "var(--color-cyan)";
                e.currentTarget.style.color = "var(--color-cyan)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-steel)";
                e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              ←
            </button>
            <h1 className="text-2xl font-mono text-white flex items-center gap-3">
              <span>Game {game.metadata.gameId.toString()}</span>
              <div className="flex flex-col gap-0">
                <span className="text-text-muted text-base leading-tight">
                  Round {game.turnState.currentRound.toString()}
                </span>
                <span className="text-[10px] font-mono leading-tight" style={{ color: "var(--color-text-muted)" }}>
                  {movedShipIdsSet.size}/{displayGame.creatorActiveShipIds.length + displayGame.joinerActiveShipIds.length} ships moved
                </span>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse">&gt;&gt; STANDBY...</div>
            <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse mt-2">&gt;&gt; LOADING ASSET DATA...</div>
          </div>
        </div>
      </div>
    );
  }

  const renderProposedMoveActivePanel = (): React.ReactNode => (
    <>
      <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${isLandscapeMobile ? "gap-2 p-2" : "gap-4 p-4"}`}>
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${isLandscapeMobile ? "gap-2" : "gap-4"}`}>
          {useSideLayout && <div className="min-h-0 min-w-0 flex-1" aria-hidden />}
        </div>
      </div>
    </>
  );

  const myScore =
    game.metadata.creator === address
      ? game.creatorScore?.toString() || "0"
      : game.joinerScore?.toString() || "0";
  const opponentScore =
    game.metadata.creator === address
      ? game.joinerScore?.toString() || "0"
      : game.creatorScore?.toString() || "0";
  const maxScore = game.maxScore?.toString() || "0";
  const mobileTurnLabel =
    game.metadata.winner !== ZERO_ADDR
      ? game.metadata.winner === TIE_ADDR
        ? "Draw"
        : game.metadata.winner === address
          ? "Victory"
          : "Defeat"
      : isMyTurnEffective
        ? "Your turn"
        : "Opponent turn";
  const mobileTurnTime = formatSeconds(Math.max(0, turnSecondsLeft));
  const mobileTurnPct = Math.max(0, Math.min(100, turnPercentRemaining));
  const mobileSelectedShipAttributes =
    selectedShipId != null ? getShipAttributes(selectedShipId) : null;
  const mobileSelectedShipPosition =
    selectedShipId != null
      ? game.shipPositions.find((sp) => sp.shipId === selectedShipId) ?? null
      : null;
  const isMobileJoiner = address === game.metadata.joiner;
  const mobileCanUseSpecial = Boolean(
    selectedShip &&
      selectedShip.equipment.special > 0 &&
      (mobileSelectedShipAttributes?.hullPoints ?? 0) > 0,
  );
  const mobileReactorCriticalStatus: "none" | "warning" | "critical" =
    mobileSelectedShipAttributes &&
    mobileSelectedShipAttributes.reactorCriticalTimer > 0 &&
    mobileSelectedShipAttributes.hullPoints === 0
      ? "critical"
      : mobileSelectedShipAttributes &&
          mobileSelectedShipAttributes.reactorCriticalTimer > 0
        ? "warning"
        : "none";
  const mobileWeaponDisplayName =
    selectedWeaponType === "ram"
      ? "RAM"
      : selectedShip && selectedWeaponType === "weapon"
        ? getMainWeaponName(selectedShip.equipment.mainWeapon)
        : selectedShip && selectedWeaponType === "special"
          ? getSpecialName(selectedShip.equipment.special)
          : "Weapon";
  const tutorialDefaultLabel = isLandscapeMobile ? "Tap here" : "Click here";

  const renderFleetColumn = ({
      title,
      titleColor,
      ownerAddress,
      shipIds,
      isCurrentPlayerShip,
      flipShip,
    }: {
      title: string;
      titleColor: string;
      ownerAddress: string;
      shipIds: readonly number[];
      isCurrentPlayerShip: boolean;
      flipShip: boolean;
    }) => (
      <div>
        <h4
          className="mb-3 uppercase font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: titleColor,
            fontSize: "18px",
          }}
        >
          {title}
          <span
            className="ml-2"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: "var(--color-text-secondary)",
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            ({ownerAddress})
          </span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shipIds.map((shipId) => {
            const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
            const attributes = getShipAttributes(shipId);
            const ship = shipMap.get(shipId);
            if (!shipPosition || !attributes || !ship) return null;
            const reactorCriticalStatus =
              attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0
                ? "critical"
                : attributes.reactorCriticalTimer > 0
                  ? "warning"
                  : "none";
            return (
              <ShipCard
                key={shipId.toString()}
                ship={ship}
                isStarred={false}
                onToggleStar={() => {}}
                isSelected={false}
                onToggleSelection={() => {}}
                onRecycleClick={() => {}}
                showInGameProperties={true}
                inGameAttributes={attributes}
                attributesLoading={false}
                hideRecycle={true}
                hideCheckbox={true}
                isCurrentPlayerShip={isCurrentPlayerShip}
                flipShip={flipShip}
                reactorCriticalStatus={reactorCriticalStatus}
                hasMoved={movedShipIdsSet.has(shipId)}
                gameViewMode={true}
                layoutShipId={shipId.toString()}
                nameBlockMinHeightPx={gameViewNameBlockMinHeights[shipId.toString()]}
              />
            );
          })}
        </div>
      </div>
    );

  if (isLandscapeMobile) {
    return (
      <div className="mx-auto h-full w-full overflow-hidden" style={{ height: "100dvh" }}>
        <div className="flex h-full min-h-0 items-stretch gap-2 overflow-hidden">
          <div
            className={`flex h-full min-h-0 min-w-0 flex-1 items-center justify-center ${
              isMobileJoiner ? "order-2" : "order-1"
            }`}
          >
            <div className="relative flex h-[min(100%,39rem)] min-h-0 w-full max-w-[18rem] flex-col pl-1 pr-2 py-2">
            <div
              className="mb-2 border border-solid px-1.5 py-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onBack}
                  className="shrink-0 px-1.5 py-0.5 border border-solid text-[10px] uppercase font-semibold tracking-wider"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  Back
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] uppercase tracking-wider text-text-secondary">
                    Game {game.metadata.gameId.toString()} | Round{" "}
                    {game.turnState.currentRound.toString()}
                  </p>
                  <p
                    className="truncate text-[10px] uppercase tracking-wider"
                    style={{
                      color: isMyTurnEffective
                        ? "var(--color-cyan)"
                        : "var(--color-warning-red)",
                    }}
                  >
                    {mobileTurnLabel} | {mobileTurnTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    lastPollTimeRef.current = Date.now();
                    refetchGame();
                  }}
                  className="shrink-0 px-1.5 py-0.5 border border-solid text-[10px] uppercase font-semibold tracking-wider"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-near-black)",
                    borderRadius: 0,
                  }}
                >
                  Sync
                </button>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden" style={{ backgroundColor: "var(--color-gunmetal)" }}>
                <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${mobileTurnPct}%`, backgroundColor: "var(--color-warning-red)" }} />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-4 gap-1">
              {(["status", "actions", "events"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMobileLeftPanelTab(tab)}
                  className="px-1 py-2 text-xs min-h-[2.75rem] uppercase tracking-wider border border-solid"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor:
                      mobileLeftPanelTab === tab
                        ? "var(--color-cyan)"
                        : "var(--color-gunmetal)",
                    color:
                      mobileLeftPanelTab === tab
                        ? "var(--color-cyan)"
                        : "var(--color-text-secondary)",
                    backgroundColor:
                      mobileLeftPanelTab === tab
                        ? "color-mix(in srgb, var(--color-cyan) 12%, transparent)"
                        : "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsMobileFleetModalOpen(true)}
                className="px-1 py-2 text-xs min-h-[2.75rem] uppercase tracking-wider border border-solid"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-phosphor-green)",
                  color: "var(--color-phosphor-green)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
              >
                Fleets
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {mobileLeftPanelTab === "actions" ? (
                isShowingProposedMove ? (
                  renderProposedMoveActivePanel()
                ) : (
                  <div className="text-sm text-text-secondary">
                    Select a ship and choose a destination to open actions.
                  </div>
                )
              ) : null}
              {mobileLeftPanelTab === "status" ? (
                <div className="space-y-2">
                  <div className="flex items-stretch border border-solid overflow-hidden text-xs" style={{ borderColor: "var(--color-gunmetal)", borderTopColor: "var(--color-steel)", borderLeftColor: "var(--color-steel)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}>
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <span className="material-symbols-outlined leading-none" style={{ fontSize: 13, color: "var(--color-cyan)" }}>person</span>
                      <span className="font-mono" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{myScore}/{maxScore}</span>
                    </div>
                    <div style={{ width: 1, backgroundColor: "var(--color-gunmetal)", flexShrink: 0 }} />
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <span className="material-symbols-outlined leading-none" style={{ fontSize: 13, color: "var(--color-warning-red)" }}>person</span>
                      <span className="font-mono" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{opponentScore}/{maxScore}</span>
                    </div>
                  </div>
                  {game.metadata.winner !== ZERO_ADDR ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-text-primary">
                        Result: {game.metadata.winner === TIE_ADDR ? "Draw" : game.metadata.winner === address ? "Victory" : "Defeat"}
                      </span>
                    </div>
                  ) : null}
                  {!isReplaying ? (
                    <button
                      onClick={fetchAndStartReplay}
                      disabled={replayLoading}
                      className="px-2 py-0.5 text-[10px] uppercase tracking-wider border border-solid"
                      style={{
                        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                        borderColor: "var(--color-steel)",
                        color: "var(--color-text-secondary)",
                        backgroundColor: "var(--color-near-black)",
                        borderRadius: 0,
                      }}
                    >
                      {replayLoading ? "…" : "Replay"}
                    </button>
                  ) : null}
                  {isReplaying ? (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <button
                        onClick={() => setReplayStep((s) => (s === null ? null : Math.max(-1, s - 1)))}
                        disabled={replayStep <= -1}
                        className="px-1.5 py-0.5 text-[10px] uppercase border border-solid disabled:opacity-40"
                        style={{ borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
                      >◀</button>
                      <span className="text-[10px] font-mono text-text-muted">
                        {replayStep < 0 ? "Start" : `${replayStep + 1}/${replayTurns.length}`}
                      </span>
                      <button
                        onClick={() => setReplayStep((s) => (s === null ? null : Math.min(replayTurns.length - 1, s + 1)))}
                        disabled={replayStep >= replayTurns.length - 1}
                        className="px-1.5 py-0.5 text-[10px] uppercase border border-solid disabled:opacity-40"
                        style={{ borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
                      >▶</button>
                      <button
                        onClick={() => setReplayAutoPlay((p) => !p)}
                        disabled={replayStep >= replayTurns.length - 1}
                        className="px-1.5 py-0.5 text-[10px] uppercase border border-solid disabled:opacity-40"
                        style={{ borderColor: replayAutoPlay ? "var(--color-cyan)" : "var(--color-steel)", color: replayAutoPlay ? "var(--color-cyan)" : "var(--color-text-muted)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
                      >{replayAutoPlay ? "⏸" : "▶▶"}</button>
                      <button
                        onClick={exitReplay}
                        className="px-1.5 py-0.5 text-[10px] uppercase border border-solid"
                        style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
                      >✕</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {mobileLeftPanelTab === "events" ? (
                <GameEvents
                  lastMove={selectedShipId !== null ? undefined : displayedLastMove}
                  shipMap={shipMap}
                  address={address ?? undefined}
                  appendDestroyedText={appendDestroyedTextToLastMove}
                  debugSuffix={lastMoveTargetPositionDebugSuffix}
                />
              ) : null}
            </div>

            {selectedShip ? (
              <div
                className="absolute inset-0 z-[260] overflow-y-auto pl-0.5 pr-1.5 pt-1 pb-2"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-near-black) 97%, transparent)",
                }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileWeaponMenuOpen(false);
                      setSelectedShipId(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] uppercase border border-solid"
                    style={{
                      borderColor: "var(--color-gunmetal)",
                      color: "var(--color-text-secondary)",
                      backgroundColor: "var(--color-steel)",
                      borderRadius: 0,
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-1">
                  <ShipCard
                    ship={selectedShip}
                    isStarred={false}
                    onToggleStar={() => {}}
                    isSelected={true}
                    onToggleSelection={() => {}}
                    onRecycleClick={() => {}}
                    showInGameProperties={true}
                    inGameAttributes={mobileSelectedShipAttributes ?? undefined}
                    attributesLoading={false}
                    hideRecycle={true}
                    hideCheckbox={true}
                    isCurrentPlayerShip={isShipOwnedByCurrentPlayer(selectedShip.id)}
                    flipShip={Boolean(mobileSelectedShipPosition?.isCreator)}
                    reactorCriticalStatus={mobileReactorCriticalStatus}
                    hasMoved={movedShipIdsSet.has(selectedShip.id)}
                    gameViewMode={true}
                    hideRarityLabel={true}
                    hideRankLabel={true}
                    hideOuterFrame={true}
                    layoutShipId={selectedShip.id.toString()}
                    nameBlockMinHeightPx={gameViewNameBlockMinHeights[selectedShip.id.toString()]}
                  />
                </div>
              </div>
            ) : null}
            </div>
          </div>

          <div
            className={`relative h-full min-h-0 shrink-0 overflow-hidden ${
              isMobileJoiner ? "order-1" : "order-2"
            }`}
            style={{
              aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
              paddingRight: "2px",
              paddingTop: "2px",
            }}
          >
            <div
              className="h-full max-h-full"
              style={{
                height: "calc(100% - 2px)",
                width: "auto",
                aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
              }}
            >
              <GameBoardLayout
                isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
                containerRef={gridContainerRef}
                onBoardChromeMouseDown={handleCancelMove}
              >
                <div
                  className="relative h-full [contain:layout]"
                  style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
                >
                  <div className="absolute inset-0 min-h-0 overflow-hidden">
                    <GameGrid
                      grid={grid}
                      allShipPositions={displayGame.shipPositions}
                      shipMap={shipMap}
                      selectedShipId={selectedShipId}
                      previewPosition={previewPosition}
                      targetShipId={targetShipId}
                      selectedWeaponType={selectedWeaponType}
                      hoveredCell={hoveredCell}
                      draggedShipId={draggedShipId}
                      dragOverCell={dragOverCell}
                      movementRange={movementRange}
                      shootingRange={shootingRange}
                      validTargets={validTargets}
                      labelTargets={labelTargets}
                      assistableTargets={assistableTargets}
                      assistableTargetsFromStart={assistableTargetsFromStart}
                      dragShootingRange={dragShootingRange}
                      dragValidTargets={dragValidTargets}
                      isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
                      isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                      movedShipIdsSet={movedShipIdsSet}
                      specialType={specialType}
                      blockedGrid={blockedGrid}
                      scoringGrid={scoringGrid}
                      onlyOnceGrid={onlyOnceGrid}
                      calculateDamage={calculateDamageForShip}
                      getShipAttributes={getShipAttributes}
                      disableTooltips={true}
                      address={address ?? undefined}
                      currentTurn={game.turnState.currentTurn}
                      highlightedMovePosition={highlightedMovePosition}
                      lastMoveShipId={lastMoveShipId}
                      lastMoveOldPosition={lastMoveOldPosition}
                      lastMoveNewPosition={lastMoveNewPosition}
                      lastMoveActionType={lastMoveActionType}
                      lastMoveTargetShipId={lastMoveTargetShipId}
                      lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
                      rammingPreviewPosition={
                        isRammingMovePreview && previewPosition ? previewPosition : null
                      }
                      isRammingMovePreview={isRammingMovePreview}
                      retreatPrepShipId={retreatPrepShipId}
                      retreatPrepIsCreator={retreatPrepIsCreator}
                      tutorialDefaultLabel={tutorialDefaultLabel}
                      onGridRightClickDeselect={handleGridRightClickDeselect}
                      setSelectedShipId={setSelectedShipId}
                      setPreviewPosition={setPreviewPosition}
                      setTargetShipId={setTargetShipId}
                      setSelectedWeaponType={setWeaponTypeFromGrid}
                      setHoveredCell={setHoveredCell}
                      setDraggedShipId={setDraggedShipId}
                      setDragOverCell={setDragOverCell}
                      hoverShootingRange={hoverShootingRange}
                      hoverValidTargets={hoverValidTargets}
                      onMoveTileHover={setHoverPreviewPosition}
                      showConfirmWidget={showConfirmWidget}
                      confirmWidgetLabel={computedActionType === ActionType.Pass ? "HOLD FIRE" : "SUBMIT"}
                      onConfirmMove={handleSubmitAction}
                      onCancelMove={handleCancelMove}
                    />
                  </div>
                {game.metadata.winner === ZERO_ADDR ? (
                  <div
                    className={`pointer-events-none absolute top-1 z-[230] ${
                      isMobileJoiner ? "left-1" : "right-1"
                    }`}
                  >
                    <div className="pointer-events-auto relative">
                      <button
                        type="button"
                        onClick={() => setIsMobileFleeOpen((prev) => !prev)}
                        className="flex h-7 w-7 items-center justify-center border border-solid text-xs font-bold"
                        style={{
                          borderColor: "var(--color-warning-red)",
                          color: "var(--color-warning-red)",
                          backgroundColor: "color-mix(in srgb, var(--color-near-black) 92%, transparent)",
                          borderRadius: 0,
                        }}
                        title="Battle menu"
                        aria-label="Open battle menu"
                      >
                        ⚑
                      </button>
                      {isMobileFleeOpen ? (
                        <div
                          className="absolute right-0 top-[calc(100%+6px)] w-[13.25rem] border border-solid p-1"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-near-black) 98%, transparent)",
                            borderColor: "var(--color-warning-red)",
                            borderRadius: 0,
                          }}
                        >
                          <FleeSafetySwitch
                            gameId={game.metadata.gameId}
                            onFlee={() => {
                              toast.success("You have fled the battle!");
                              setIsMobileFleeOpen(false);
                              refetch?.();
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                </div>
              </GameBoardLayout>
            </div>
          </div>
        </div>

        {isMobileFleetModalOpen ? (
          <div className="fixed inset-0 z-[310] flex flex-col bg-near-black p-3">
            <div className="mb-3 flex items-center justify-between border border-solid px-3 py-2" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-near-black)" }}>
              <h3 className="text-sm uppercase tracking-wider text-cyan">[FLEET INTEL]</h3>
              <button
                type="button"
                onClick={() => setIsMobileFleetModalOpen(false)}
                className="px-2 py-1 text-xs uppercase border border-solid"
                style={{
                  borderColor: "var(--color-gunmetal)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto border border-solid p-3" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}>
              <div className="grid grid-cols-2 gap-4">
                {game.metadata.creator === address ? (
                  <>
                    {renderFleetColumn({
                      title: readOnly ? "Creator Fleet" : "[MY FLEET]",
                      titleColor: "var(--color-cyan)",
                      ownerAddress: game.metadata.creator,
                      shipIds: game.creatorActiveShipIds,
                      isCurrentPlayerShip: true,
                      flipShip: game.metadata.creator === address,
                    })}
                    {renderFleetColumn({
                      title: readOnly ? "Joiner Fleet" : "[HOSTILE FLEET]",
                      titleColor: "var(--color-warning-red)",
                      ownerAddress: game.metadata.joiner,
                      shipIds: game.joinerActiveShipIds,
                      isCurrentPlayerShip: false,
                      flipShip: false,
                    })}
                  </>
                ) : (
                  <>
                    {renderFleetColumn({
                      title: readOnly ? "Creator Fleet" : "[HOSTILE FLEET]",
                      titleColor: "var(--color-warning-red)",
                      ownerAddress: game.metadata.creator,
                      shipIds: game.creatorActiveShipIds,
                      isCurrentPlayerShip: false,
                      flipShip: true,
                    })}
                    {renderFleetColumn({
                      title: readOnly ? "Joiner Fleet" : "[MY FLEET]",
                      titleColor: "var(--color-cyan)",
                      ownerAddress: game.metadata.joiner,
                      shipIds: game.joinerActiveShipIds,
                      isCurrentPlayerShip: true,
                      flipShip: false,
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={gameViewRootRef}
      className={`flex flex-col ${
        isLandscapeMobile ? "gap-2 pb-12" : "gap-6 pt-2"
      } ${
        useSideLayout ? GAME_VIEW_SIDE_ROOT_CLASS : "mx-auto w-full"
      }`}
      style={
        isLandscapeMobile
          ? {
              width: "100%",
              maxWidth: "none",
              marginLeft: 0,
            }
          : useSideLayout
          ? {
              marginLeft: "8px",
            }
          : undefined
      }
    >
      {isLandscapeMobile && (
        <>
          <div
            className="sticky top-0 z-[260] border border-solid px-2 py-1.5"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onBack}
                className="px-2 py-1 border border-solid text-xs uppercase font-semibold tracking-wider"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-gunmetal)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
              >
                Back
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-[11px] uppercase tracking-wider text-text-secondary">
                  Game {game.metadata.gameId.toString()} | Round{" "}
                  {game.turnState.currentRound.toString()}{" "}
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {movedShipIdsSet.size}/{displayGame.creatorActiveShipIds.length + displayGame.joinerActiveShipIds.length}
                  </span>
                </p>
                <p
                  className="truncate text-[11px] uppercase tracking-wider"
                  style={{
                    color: isMyTurnEffective
                      ? "var(--color-cyan)"
                      : "var(--color-warning-red)",
                  }}
                >
                  {mobileTurnLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  lastPollTimeRef.current = Date.now();
                  refetchGame();
                }}
                className="px-2 py-1 border border-solid text-xs uppercase font-semibold tracking-wider"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-cyan)",
                  color: "var(--color-cyan)",
                  backgroundColor: "var(--color-near-black)",
                  borderRadius: 0,
                }}
              >
                Sync
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-stretch border border-solid overflow-hidden text-[11px]" style={{ borderColor: "var(--color-gunmetal)", borderTopColor: "var(--color-steel)", borderLeftColor: "var(--color-steel)", backgroundColor: "var(--color-slate)", borderRadius: 0 }}>
                <div className="flex items-center gap-1 px-1.5 py-0.5">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12, color: "var(--color-cyan)" }}>person</span>
                  <span className="font-mono" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{myScore}/{maxScore}</span>
                </div>
                <div style={{ width: 1, backgroundColor: "var(--color-gunmetal)", flexShrink: 0 }} />
                <div className="flex items-center gap-1 px-1.5 py-0.5">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12, color: "var(--color-warning-red)" }}>person</span>
                  <span className="font-mono" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{opponentScore}/{maxScore}</span>
                </div>
              </div>
              <div className="ml-auto text-[11px] font-mono" style={{ color: isMyTurnEffective ? "var(--color-cyan)" : "var(--color-warning-red)" }}>
                {mobileTurnTime}
              </div>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden" style={{ backgroundColor: "var(--color-gunmetal)" }}>
              <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${mobileTurnPct}%`, backgroundColor: "var(--color-warning-red)" }} />
            </div>
          </div>
        </>
      )}
      <div
        className={
          useSideLayout
            ? "flex min-h-0 min-w-0 flex-row items-stretch gap-4 pt-3"
            : "flex flex-col gap-6 pt-3"
        }
      >
      {/* Header chrome (top bar or left rail) */}
      <div
        className={
          isLandscapeMobile
            ? "hidden"
            : useSideLayout
            ? "flex min-h-0 self-stretch w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-hidden pl-2 pr-1"
            : "flex items-center justify-between"
        }
      >
        <div
          className={
            useSideLayout
              ? "flex shrink-0 flex-col items-stretch gap-3"
              : "flex items-center space-x-4"
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="flex w-full min-w-0 items-stretch gap-2">
              <div className="flex w-1/5 min-h-0 shrink-0 justify-start">
          <button
            onClick={onBack}
                  className="flex min-h-0 w-full items-center justify-center px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
              e.currentTarget.style.borderColor = "var(--color-cyan)";
              e.currentTarget.style.color = "var(--color-cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
              e.currentTarget.style.borderColor = "var(--color-gunmetal)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            ←
          </button>
              </div>
              <div className="flex min-h-0 w-4/5 min-w-0 flex-col justify-center">
                {game.metadata.winner ===
                  ZERO_ADDR && (
                  <FleeSafetySwitch
                    gameId={game.metadata.gameId}
                    onFlee={() => {
                      toast.success("You have fled the battle!");
                      refetch?.();
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="w-1/5 shrink-0" aria-hidden />
              <div className="w-4/5 min-w-0 text-right">
                <div className="text-sm text-text-muted">
                  {game.metadata.winner !==
                    ZERO_ADDR && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span
                        className="uppercase font-bold tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color:
                            game.metadata.winner === TIE_ADDR
                              ? "var(--color-purple)"
                              : game.metadata.winner === address
                                ? "var(--color-phosphor-green)"
                                : "var(--color-warning-red)",
                        }}
                      >
                        {game.metadata.winner === TIE_ADDR ? "DRAW" : game.metadata.winner === address ? "VICTORY" : "DEFEAT"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className={
              useSideLayout ? "flex flex-col gap-2" : "contents"
            }
          >
          <div className="flex flex-col gap-3">
            {/* Meta strip */}
            <div className="flex items-center gap-2 border-b border-solid pb-2" style={{ borderColor: "var(--color-gunmetal)", fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}>
              <span className="font-bold uppercase tracking-wider" style={{ fontSize: 17, color: "var(--color-text-primary)" }}>
                GAME {game.metadata.gameId.toString()}
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>·</span>
              <span className="uppercase tracking-wide" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                RND {game.turnState.currentRound.toString()}
              </span>
              <span className="ml-auto" style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", fontSize: 10, color: "var(--color-text-muted)" }}>
                {movedShipIdsSet.size}/{displayGame.creatorActiveShipIds.length + displayGame.joinerActiveShipIds.length} MOVED
              </span>
            </div>
            {/* Turn Indicator and Countdown / Seize Turn */}
            {game.metadata.winner ===
              ZERO_ADDR &&
              (() => {
                const isParticipant =
                  game.metadata.creator === address ||
                  game.metadata.joiner === address;
                const canSeizeTurn =
                  !readOnly &&
                  !isMyTurnEffective &&
                  isParticipant &&
                  turnSecondsLeft <= 0;
                const hasExceededTime =
                  !readOnly &&
                  isMyTurnEffective &&
                  isParticipant &&
                  turnSecondsLeft <= 0;

                if (hasExceededTime) {
                  return (
                    <div className="flex flex-col gap-0 pl-2" style={{ borderLeft: "2px solid var(--color-warning-red)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: "var(--color-cyan)" }}>
                          YOUR TURN
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm animate-timeout-soft" style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", color: "var(--color-warning-red)" }}>
                            00:00
                          </span>
                          <button onClick={() => { lastPollTimeRef.current = Date.now(); refetchGame(); }} className="p-1 text-text-muted hover:text-cyan transition-colors" title="Resync game state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-wider font-bold animate-victory-flash" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: "var(--color-warning-red)" }}>
                        ⚠ Opponent can claim victory
                      </p>
                      <div className="mt-2 h-px overflow-hidden animate-victory-flash" style={{ backgroundColor: "var(--color-warning-red)" }} />
                    </div>
                  );
                }

                if (canSeizeTurn) {
                  return (
                    <div className="flex flex-col gap-1.5 pl-2" style={{ borderLeft: "2px solid var(--color-amber)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: "var(--color-amber)" }}>
                          Opponent timed out
                        </span>
                        <button onClick={() => { lastPollTimeRef.current = Date.now(); refetchGame(); }} className="p-1 text-text-muted hover:text-cyan transition-colors" title="Resync game state">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={isTimeoutSubmitting}
                        className="w-full px-3 py-1 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 animate-timeout-soft"
                        style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", borderColor: "var(--color-amber)", color: "var(--color-amber)", backgroundColor: "var(--color-steel)", borderWidth: "2px", borderStyle: "solid", borderRadius: 0 }}
                        onClick={async () => {
                          if (isTimeoutSubmitting) return;
                          setIsTimeoutSubmitting(true);
                          try {
                            await apiMutate(`/api/games/${game.metadata.gameId}/timeout`, "POST");
                            toast.success("Game ended. Opponent forfeited by timeout.");
                            refetchGame();
                            refetch?.();
                          } catch (err) {
                            toast.error(`Timeout claim failed: ${err instanceof Error ? err.message : String(err)}`);
                          } finally {
                            setIsTimeoutSubmitting(false);
                          }
                        }}
                      >
                        {isTimeoutSubmitting ? "Claiming..." : "Claim win (timeout)"}
                      </button>
                      <div className="h-px overflow-hidden animate-timeout-bar" style={{ backgroundColor: "var(--color-warning-red)" }} />
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: isMyTurnEffective ? "var(--color-cyan)" : "var(--color-warning-red)" }}>
                        {isMyTurnEffective ? "YOUR TURN" : "OPPONENT'S TURN"}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm" style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", color: isMyTurnEffective ? "var(--color-cyan)" : "var(--color-warning-red)" }}>
                          {formatSeconds(turnSecondsLeft)}
                        </span>
                        <button
                          onClick={() => {
                            lastPollTimeRef.current = Date.now();
                            refetchGame();
                          }}
                          className="p-1 text-text-muted hover:text-cyan transition-colors"
                          title="Refresh game state"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-px overflow-hidden" style={{ backgroundColor: "var(--color-gunmetal)" }}>
                      <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${turnPercentRemaining}%`, backgroundColor: "var(--color-warning-red)" }} />
                    </div>
                  </div>
                );
              })()}
          </div>
          {/* Scores box aligned left, to the right of title */}
          <div
            className={useSideLayout ? "w-full shrink-0 border border-solid overflow-hidden" : "ml-6 w-48 border border-solid overflow-hidden"}
            style={{
              backgroundColor: "var(--color-slate)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            <div className="flex items-stretch" style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", fontSize: "22px" }}>
              <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                <span className="material-symbols-outlined leading-none" style={{ fontSize: 27, color: "var(--color-cyan)" }}>person</span>
                <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{myScore}/{maxScore}</span>
              </div>
              <div style={{ width: 1, backgroundColor: "var(--color-gunmetal)", flexShrink: 0 }} />
              <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                <span className="material-symbols-outlined leading-none" style={{ fontSize: 27, color: "var(--color-warning-red)" }}>person</span>
                <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{opponentScore}/{maxScore}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
        {/* Fleet status panel */}
        {useSideLayout && (() => {
            const isCreator = address === game.metadata.creator;
            const myIds = isCreator ? displayGame.creatorActiveShipIds : displayGame.joinerActiveShipIds;
            const enemyIds = isCreator ? displayGame.joinerActiveShipIds : displayGame.creatorActiveShipIds;

            const allShips: { shipId: number; teamColor: string; flip: boolean }[] = [
              ...myIds.map((id) => ({ shipId: id, teamColor: "var(--color-cyan)", flip: isCreator })),
              ...enemyIds.map((id) => ({ shipId: id, teamColor: "var(--color-warning-red)", flip: !isCreator })),
            ];

            return (
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border border-solid p-2" style={{ borderColor: "var(--color-gunmetal)", borderTopColor: "var(--color-steel)", borderLeftColor: "var(--color-steel)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wider font-bold" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", fontSize: 11, color: "var(--color-text-secondary)" }}>FLEET STATUS</span>
                    <button
                      type="button"
                      onClick={() => setShowFleetModal(true)}
                      className="border border-solid px-1.5 py-0.5 uppercase tracking-wider transition-colors"
                      style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", fontSize: 9, color: "var(--color-text-secondary)", borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
                    >
                      [DETAILS]
                    </button>
                  </div>
                  <span style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", fontSize: 10, color: "var(--color-text-muted)" }}>
                    <span style={{ color: "var(--color-cyan)" }}>{myIds.length}</span>
                    <span style={{ color: "var(--color-text-muted)" }}> vs </span>
                    <span style={{ color: "var(--color-warning-red)" }}>{enemyIds.length}</span>
                  </span>
                </div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {allShips.map(({ shipId, teamColor, flip }) => {
                    const ship = shipMap.get(shipId);
                    const attrs = getShipAttributes(shipId);
                    const hasMoved = movedShipIdsSet.has(shipId);
                    const isSOS = !!attrs && attrs.hullPoints === 0;
                    const hpPct = attrs && attrs.maxHullPoints > 0
                      ? Math.max(0, (attrs.hullPoints / attrs.maxHullPoints) * 100)
                      : 0;
                    const shipPos = displayGame.shipPositions.find((sp) => sp.shipId === shipId);
                    return (
                      <div
                        key={shipId}
                        className="flex min-w-0 w-full flex-col gap-0.5 overflow-hidden cursor-pointer"
                        style={{ opacity: hasMoved ? 0.45 : 1 }}
                        onClick={() => setSelectedShipId(shipId)}
                        onMouseEnter={() => shipPos && setHoveredCell({ shipId, row: shipPos.position.row, col: shipPos.position.col, mouseX: 0, mouseY: 0, isCreator: shipPos.isCreator })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1", backgroundColor: "var(--color-slate)", border: `1px solid ${isSOS ? "var(--color-warning-red)" : teamColor}` }}>
                          {ship && (
                            <ShipImage
                              ship={ship}
                              className={`w-full h-full${flip ? " scale-x-[-1]" : ""}`}
                              showLoadingState={false}
                              hideRankStars
                            />
                          )}
                          {isSOS && <div className="absolute inset-0 bg-warning-red/15 animate-pulse pointer-events-none" />}
                          {hasMoved && <div className="absolute inset-0 bg-steel/50 pointer-events-none" />}
                        </div>
                        <span className="truncate" style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", fontSize: 9, color: isSOS ? "var(--color-warning-red)" : "var(--color-text-secondary)" }}>
                          {ship?.name ?? `#${shipId}`}
                        </span>
                        <div className="overflow-hidden" style={{ height: 3, backgroundColor: "var(--color-gunmetal)" }}>
                          <div style={{ width: `${hpPct}%`, height: "100%", backgroundColor: isSOS ? "var(--color-warning-red)" : teamColor, transition: "width 0.3s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

                </div>

        {/* Move confirmation: stacked layout (wide chrome), matches SimulatedGameDisplay. */}
        {!useSideLayout && !isLandscapeMobile && isShowingProposedMove && (
                    <div
            className="min-h-0 flex-1 border border-solid p-3"
                      style={{
                        backgroundColor: "var(--color-near-black)",
                        borderColor: "var(--color-gunmetal)",
                        borderTopColor: "var(--color-steel)",
                        borderLeftColor: "var(--color-steel)",
                        borderRadius: 0,
                      }}
                    >
            {renderProposedMoveActivePanel()}
                  </div>
                )}

      {/* Game map: same stack as tutorial (GameBoardLayout + 17×11 aspect clip). */}
      <div
        className={
          useSideLayout
            ? "relative min-h-0 min-w-0 flex-1"
            : "relative w-full"
        }
      >
        <GameBoardLayout
          isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
          containerRef={gridContainerRef}
          onBoardChromeMouseDown={handleCancelMove}
        >
          <div
            className="relative w-full [contain:layout]"
            style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
          >
            <div className="absolute inset-0 min-h-0 overflow-hidden">
        <GameGrid
          grid={grid}
                allShipPositions={displayGame.shipPositions}
          shipMap={shipMap}
          selectedShipId={selectedShipId}
          previewPosition={previewPosition}
          targetShipId={targetShipId}
          selectedWeaponType={selectedWeaponType}
          hoveredCell={hoveredCell}
          draggedShipId={draggedShipId}
          dragOverCell={dragOverCell}
          movementRange={movementRange}
          shootingRange={shootingRange}
          validTargets={validTargets}
          labelTargets={labelTargets}
          assistableTargets={assistableTargets}
          assistableTargetsFromStart={assistableTargetsFromStart}
          dragShootingRange={dragShootingRange}
          dragValidTargets={dragValidTargets}
                isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
          isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
          movedShipIdsSet={movedShipIdsSet}
          specialType={specialType}
          blockedGrid={blockedGrid}
          scoringGrid={scoringGrid}
          onlyOnceGrid={onlyOnceGrid}
          calculateDamage={calculateDamageForShip}
          getShipAttributes={getShipAttributes}
          disableTooltips={disableTooltips}
          address={address ?? undefined}
          currentTurn={game.turnState.currentTurn}
          highlightedMovePosition={highlightedMovePosition}
          lastMoveShipId={lastMoveShipId}
          lastMoveOldPosition={lastMoveOldPosition}
                lastMoveNewPosition={lastMoveNewPosition}
          lastMoveActionType={lastMoveActionType}
          lastMoveTargetShipId={lastMoveTargetShipId}
          lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
          rammingPreviewPosition={
            isRammingMovePreview && previewPosition ? previewPosition : null
          }
          isRammingMovePreview={isRammingMovePreview}
          retreatPrepShipId={retreatPrepShipId}
          retreatPrepIsCreator={retreatPrepIsCreator}
          tutorialDefaultLabel={tutorialDefaultLabel}
          onGridRightClickDeselect={handleGridRightClickDeselect}
          setSelectedShipId={setSelectedShipId}
          setPreviewPosition={setPreviewPosition}
          setTargetShipId={setTargetShipId}
          setSelectedWeaponType={setWeaponTypeFromGrid}
          setHoveredCell={setHoveredCell}
          setDraggedShipId={setDraggedShipId}
          setDragOverCell={setDragOverCell}
          hoverShootingRange={hoverShootingRange}
          hoverValidTargets={hoverValidTargets}
          onMoveTileHover={setHoverPreviewPosition}
          showConfirmWidget={showConfirmWidget}
          confirmWidgetLabel={computedActionType === ActionType.Pass ? "HOLD FIRE" : "SUBMIT"}
          onConfirmMove={handleSubmitAction}
          onCancelMove={handleCancelMove}
        />
            </div>
          {isReplaying && (
            <div className="pointer-events-none absolute top-1 left-1 z-[230] px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
                backgroundColor: "color-mix(in srgb, var(--color-near-black) 85%, transparent)",
                border: "1px solid var(--color-steel)",
              }}
            >
              {replayStep < 0 ? "Replay · Start" : `Replay · Move ${replayStep + 1}/${replayTurns.length}`}
            </div>
          )}
          {/* Bottom-left of grid: debug button (dev-only) then replay button/controls */}
          <div className="absolute bottom-0 left-0 z-[220] pointer-events-none flex items-end">
            {game.metadata.winner ===
              ZERO_ADDR &&
              process.env.NODE_ENV === "development" && (
                <div className="pointer-events-auto">
                  {isDebugPanelMinimized ? (
                    <button
                      type="button"
                      onClick={() => setIsDebugPanelMinimized(false)}
                      className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        borderColor: "var(--color-cyan)",
                        color: "var(--color-cyan)",
                        backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                        borderRadius: 0,
                      }}
                    >
                      Debug
                    </button>
                  ) : (
                    <div className="w-[min(30rem,70vw)] max-w-full">
                      <div className="mb-1 flex items-center justify-between border border-solid px-2 py-1 bg-black/80">
                        <span
                          className="text-xs uppercase tracking-wider"
                          style={{
                            fontFamily:
                              "var(--font-rajdhani), 'Arial Black', sans-serif",
                            color: "var(--color-cyan)",
                          }}
                        >
                          Debug
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDebugPanelMinimized(true)}
                          className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
                          style={{
                            fontFamily:
                              "var(--font-rajdhani), 'Arial Black', sans-serif",
                            borderColor: "var(--color-cyan)",
                            color: "var(--color-cyan)",
                            backgroundColor: "var(--color-near-black)",
                            borderRadius: 0,
                          }}
                        >
                          Minimize
                        </button>
                      </div>
                      <div
                        className="border border-solid bg-black/40 p-3"
                        style={{ borderColor: "var(--color-cyan)" }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                          <label className="flex cursor-pointer items-center space-x-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={showDebug}
                              onChange={(e) =>
                                setShowDebug(e.target.checked)
                              }
                              className="h-4 w-4"
                  style={{
                    accentColor: "var(--color-cyan)",
                    borderColor: "var(--color-cyan)",
                    backgroundColor: "var(--color-near-black)",
                    borderRadius: 0,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    width: "16px",
                    height: "16px",
                    border: "2px solid",
                  }}
                />
                <span>Show Debug</span>
              </label>
                          <label className="flex cursor-pointer items-center space-x-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={disableTooltips}
                              onChange={(e) =>
                                setDisableTooltips(e.target.checked)
                              }
                              className="h-4 w-4"
                  style={{
                    accentColor: "var(--color-cyan)",
                    borderColor: "var(--color-cyan)",
                    backgroundColor: "var(--color-near-black)",
                    borderRadius: 0,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    width: "16px",
                    height: "16px",
                    border: "2px solid",
                  }}
                />
                <span>Disable Tooltips</span>
              </label>
              <button
                            type="button"
                onClick={() => {
                  refetchGame();
                }}
                            className="border-2 border-solid px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150"
                style={{
                              fontFamily:
                                "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-cyan)",
                  color: "var(--color-cyan)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--color-slate)";
                }}
                onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--color-steel)";
                }}
              >
                Test Refetch
              </button>
              <button
                            type="button"
                onClick={() => {
                              globalGameRefetchFunctions.forEach(
                                (refetchFn) => {
                    refetchFn();
                                },
                              );
                }}
                            className="border-2 border-solid px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150"
                style={{
                              fontFamily:
                                "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-phosphor-green)",
                  color: "var(--color-phosphor-green)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--color-slate)";
                }}
                onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--color-steel)";
                }}
              >
                Test Events
              </button>
                        </div>
                      </div>
            </div>
          )}
        </div>
              )}
            <div className="pointer-events-auto flex items-end gap-2">
              {!isReplaying && (
                <button
                  onClick={fetchAndStartReplay}
                  disabled={replayLoading}
                  className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-steel)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                    borderRadius: 0,
                  }}
                >
                  {replayLoading ? "Loading…" : "Replay"}
                </button>
              )}
              {isReplaying && (
                <div
                  className="flex items-center gap-2 flex-wrap border-2 border-solid px-2 py-1"
                  style={{
                    borderColor: "var(--color-steel)",
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                    borderRadius: 0,
                  }}
                >
                  <button
                    onClick={() => setReplayStep((s) => (s === null ? null : Math.max(-1, s - 1)))}
                    disabled={replayStep <= -1}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-steel)",
                      color: "var(--color-cyan)",
                      backgroundColor: "transparent",
                      borderRadius: 0,
                    }}
                  >
                    ◀ Prev
                  </button>
                  <span className="text-[11px] font-mono text-text-muted min-w-[5rem] text-center">
                    {replayStep < 0
                      ? "Start"
                      : `Move ${replayStep + 1}/${replayTurns.length} · Rd ${(replayTurns[replayStep] as ReplayTurn | undefined)?.round ?? ""}`}
                  </span>
                  <button
                    onClick={() => setReplayStep((s) => (s === null ? null : Math.min(replayTurns.length - 1, s + 1)))}
                    disabled={replayStep >= replayTurns.length - 1}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-steel)",
                      color: "var(--color-cyan)",
                      backgroundColor: "transparent",
                      borderRadius: 0,
                    }}
                  >
                    Next ▶
                  </button>
                  <button
                    onClick={() => setReplayAutoPlay((p) => !p)}
                    disabled={replayStep >= replayTurns.length - 1}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: replayAutoPlay ? "var(--color-cyan)" : "var(--color-steel)",
                      color: replayAutoPlay ? "var(--color-cyan)" : "var(--color-text-muted)",
                      backgroundColor: "transparent",
                      borderRadius: 0,
                    }}
                  >
                    {replayAutoPlay ? "⏸ Pause" : "▶▶ Play"}
                  </button>
                  <button
                    onClick={exitReplay}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
                    style={{
                      fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-warning-red)",
                      color: "var(--color-warning-red)",
                      backgroundColor: "transparent",
                      borderRadius: 0,
                    }}
                  >
                    ✕ Exit
                  </button>
                </div>
              )}
            </div>
          </div>
            <div className="absolute bottom-0 right-0 z-[220] pointer-events-none">
              <div className="pointer-events-auto">
                {isLastMovePanelMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsLastMovePanelMinimized(false)}
                    className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-purple)",
                      color: "var(--color-purple)",
                      backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                      borderRadius: 0,
                    }}
                  >
                    Last Move
                  </button>
                ) : (
                  <div className="w-[min(30rem,70vw)] max-w-full">
                    <div className="mb-1 flex items-center justify-between border border-solid px-2 py-1 bg-black/80">
                      <span
                        className="text-xs uppercase tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color: "var(--color-purple)",
                        }}
                      >
                        Last Move
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLastMovePanelMinimized(true)}
                        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          borderColor: "var(--color-purple)",
                          color: "var(--color-purple)",
                          backgroundColor: "var(--color-near-black)",
                          borderRadius: 0,
                        }}
                      >
                        Minimize
                      </button>
                    </div>
      <GameEvents
                      lastMove={
                        selectedShipId !== null ? undefined : displayedLastMove
                      }
        shipMap={shipMap}
        address={address ?? undefined}
                      appendDestroyedText={appendDestroyedTextToLastMove}
                      debugSuffix={lastMoveTargetPositionDebugSuffix}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </GameBoardLayout>
      </div>
      </div>

      {isLandscapeMobile && mobileActivePanel !== "none" && (
        <div
          className="fixed inset-x-0 bottom-11 z-[280] border-t border-solid p-2"
          style={{
            backgroundColor: "rgba(6, 10, 18, 0.98)",
            borderColor: "var(--color-gunmetal)",
            borderTopColor: "var(--color-cyan)",
            maxHeight: "46vh",
            overflowY: "auto",
            borderRadius: 0,
          }}
        >
          {mobileActivePanel === "actions" ? (
            isShowingProposedMove ? (
              renderProposedMoveActivePanel()
            ) : (
              <div className="text-sm text-text-secondary">
                Select a ship and choose a destination to open actions.
              </div>
            )
          ) : null}
          {mobileActivePanel === "status" ? (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-text-muted">
                Turn Timer
              </div>
              <div
                className="text-base uppercase font-semibold tracking-wider"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  color: isMyTurnEffective
                    ? "var(--color-cyan)"
                    : "var(--color-warning-red)",
                }}
              >
                {isMyTurnEffective ? "Your turn" : "Opponent turn"} |{" "}
                {formatSeconds(Math.max(0, turnSecondsLeft))}
              </div>
              {game.metadata.winner ===
              ZERO_ADDR ? (
                <FleeSafetySwitch
                  gameId={game.metadata.gameId}
                  onFlee={() => {
                    toast.success("You have fled the battle!");
                    refetch?.();
                  }}
                />
              ) : (
                <div className="text-sm text-text-primary">
                  Result: {game.metadata.winner === TIE_ADDR ? "Draw" : game.metadata.winner === address ? "Victory" : "Defeat"}
                </div>
              )}
            </div>
          ) : null}
          {mobileActivePanel === "events" ? (
            <GameEvents
              lastMove={selectedShipId !== null ? undefined : displayedLastMove}
              shipMap={shipMap}
              address={address ?? undefined}
              appendDestroyedText={appendDestroyedTextToLastMove}
              debugSuffix={lastMoveTargetPositionDebugSuffix}
            />
          ) : null}
        </div>
      )}

      {/* Fleet Details Modal */}
      {showFleetModal && (
        <div
          className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto p-4"
          style={{ backgroundColor: "rgba(12, 17, 23, 0.85)" }}
          onClick={() => setShowFleetModal(false)}
        >
          <div
            className="relative w-[90%] my-4 border border-solid p-4"
            style={{ backgroundColor: "var(--color-slate)", borderColor: "var(--color-gunmetal)", borderTopColor: "var(--color-steel)", borderLeftColor: "var(--color-steel)", borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFleetModal(false)}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center border border-solid"
              style={{ color: "var(--color-warning-red)", borderColor: "var(--color-warning-red)", backgroundColor: "var(--color-near-black)", borderRadius: 0, fontSize: 14, lineHeight: 1 }}
              aria-label="Close fleet details"
            >
              ✕
            </button>
            <div className="mb-4">
              <span className="uppercase tracking-wider font-bold" style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", fontSize: 14, color: "var(--color-text-secondary)" }}>FLEET DETAILS</span>
            </div>
        <div
          ref={gameShipGridsContainerRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Determine order based on player: creator has My Fleet left, joiner has Opponent's Fleet left */}
          {game.metadata.creator === address ? (
            <>
              {/* My Fleet - Left for creator */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-cyan)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Creator Fleet" : "[MY FLEET]"}
                  <span
                    className="ml-2"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                      fontWeight: 400,
                    }}
                  >
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId, index) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                          ? "warning" // Yellow outline for reactor critical
                          : "none";

                    return (
                      <div
                        key={shipId.toString()}
                        data-game-fleet-ship-cell=""
                        data-ship-id={shipId.toString()}
                        data-row-index={gameViewShipRowIndex(index)}
                      >
                        <ShipCard
                          ship={ship}
                          isStarred={false}
                          onToggleStar={() => {}}
                          isSelected={false}
                          onToggleSelection={() => {}}
                          onRecycleClick={() => {}}
                          showInGameProperties={true}
                          inGameAttributes={attributes}
                          attributesLoading={false}
                          hideRecycle={true}
                          hideCheckbox={true}
                          isCurrentPlayerShip={true}
                          flipShip={game.metadata.creator === address}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                          layoutShipId={shipId.toString()}
                          nameBlockMinHeightPx={
                            gameViewNameBlockMinHeights[shipId.toString()]
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Opponent's Fleet - Right for creator */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-warning-red)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Joiner Fleet" : "[HOSTILE FLEET]"}
                  <span
                    className="ml-2"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                      fontWeight: 400,
                    }}
                  >
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId, index) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                          ? "warning" // Yellow outline for reactor critical
                          : "none";

                    return (
                      <div
                        key={shipId.toString()}
                        data-game-fleet-ship-cell=""
                        data-ship-id={shipId.toString()}
                        data-row-index={gameViewShipRowIndex(index)}
                      >
                        <ShipCard
                          ship={ship}
                          isStarred={false}
                          onToggleStar={() => {}}
                          isSelected={false}
                          onToggleSelection={() => {}}
                          onRecycleClick={() => {}}
                          showInGameProperties={true}
                          inGameAttributes={attributes}
                          attributesLoading={false}
                          hideRecycle={true}
                          hideCheckbox={true}
                          isCurrentPlayerShip={false}
                          flipShip={false}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                          layoutShipId={shipId.toString()}
                          nameBlockMinHeightPx={
                            gameViewNameBlockMinHeights[shipId.toString()]
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Opponent's Fleet - Left for joiner */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-warning-red)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Creator Fleet" : "[HOSTILE FLEET]"}
                  <span
                    className="ml-2"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                      fontWeight: 400,
                    }}
                  >
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId, index) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                          ? "warning" // Yellow outline for reactor critical
                          : "none";

                    return (
                      <div
                        key={shipId.toString()}
                        data-game-fleet-ship-cell=""
                        data-ship-id={shipId.toString()}
                        data-row-index={gameViewShipRowIndex(index)}
                      >
                        <ShipCard
                          ship={ship}
                          isStarred={false}
                          onToggleStar={() => {}}
                          isSelected={false}
                          onToggleSelection={() => {}}
                          onRecycleClick={() => {}}
                          showInGameProperties={true}
                          inGameAttributes={attributes}
                          attributesLoading={false}
                          hideRecycle={true}
                          hideCheckbox={true}
                          isCurrentPlayerShip={false}
                          flipShip={true}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                          layoutShipId={shipId.toString()}
                          nameBlockMinHeightPx={
                            gameViewNameBlockMinHeights[shipId.toString()]
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* My Fleet - Right for joiner */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-cyan)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Joiner Fleet" : "[MY FLEET]"}
                  <span
                    className="ml-2"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                      fontWeight: 400,
                    }}
                  >
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId, index) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                          ? "warning" // Yellow outline for reactor critical
                          : "none";

                    return (
                      <div
                        key={shipId.toString()}
                        data-game-fleet-ship-cell=""
                        data-ship-id={shipId.toString()}
                        data-row-index={gameViewShipRowIndex(index)}
                      >
                        <ShipCard
                          ship={ship}
                          isStarred={false}
                          onToggleStar={() => {}}
                          isSelected={false}
                          onToggleSelection={() => {}}
                          onRecycleClick={() => {}}
                          showInGameProperties={true}
                          inGameAttributes={attributes}
                          attributesLoading={false}
                          hideRecycle={true}
                          hideCheckbox={true}
                          isCurrentPlayerShip={true}
                          flipShip={false}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                          layoutShipId={shipId.toString()}
                          nameBlockMinHeightPx={
                            gameViewNameBlockMinHeights[shipId.toString()]
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
          </div>
        </div>
      )}

      {isLandscapeMobile && (
        <div
          className="fixed inset-x-0 bottom-0 z-[290] grid grid-cols-5 gap-1 border-t border-solid p-1"
          style={{
            backgroundColor: "rgba(5, 8, 16, 0.97)",
            borderColor: "var(--color-gunmetal)",
          }}
        >
          {(
            [
              ["status", "Status"],
              ["actions", "Actions"],
              ["fleet", "Fleet"],
              ["events", "Events"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                id === "fleet"
                  ? setShowFleetModal(true)
                  : setMobileActivePanel((prev) => (prev === id ? "none" : id))
              }
              className="px-1 py-1 text-[10px] uppercase font-semibold tracking-wider border border-solid"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                borderColor:
                  mobileActivePanel === id
                    ? "var(--color-cyan)"
                    : "var(--color-gunmetal)",
                color:
                  mobileActivePanel === id
                    ? "var(--color-cyan)"
                    : "var(--color-text-secondary)",
                backgroundColor:
                  mobileActivePanel === id
                    ? "color-mix(in srgb, var(--color-cyan) 12%, transparent)"
                    : "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMobileActivePanel("none")}
            className="px-1 py-1 text-[10px] uppercase font-semibold tracking-wider border border-solid"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            Map
          </button>
        </div>
      )}
    </div>
  );
};

export default GameDisplay;

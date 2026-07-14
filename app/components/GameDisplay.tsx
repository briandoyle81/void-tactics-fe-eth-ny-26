"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import posthog from "posthog-js";
import {
  GameDataView,
  Attributes,
  getMainWeaponName,
  getSpecialName,
  ActionType,
  LastMove,
  GRID_DIMENSIONS,
} from "../types/types";
import { useShipsByIds } from "../hooks/useShipsByIds";
import ShipCard from "./ShipCard";
import { ShipImage } from "./ShipImage";
import { toShipCardData } from "../utils/toShipCardData";
import { GameFleetDetailsModal } from "./GameFleetDetailsModal";
import { GameTurnTimerPanel } from "./GameTurnTimerPanel";
import { useGetGameMapState } from "../hooks/useMapsContract";
import { useGameContract, useGetGame } from "../hooks/useGameContract";
import {
  useContractEvents,
  globalGameRefetchFunctions,
} from "../hooks/useContractEvents";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { useTransaction } from "../providers/TransactionContext";
import {
  GAME_VIEW_SIDE_ROOT_CLASS,
  useGameViewChromeLayout,
} from "../hooks/useGameViewChromeLayout";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
} from "../hooks/useShipAttributesContract";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { FleeConfirmButtonWeb3 } from "./FleeConfirmButtonWeb3";
import { GameScoreBox } from "./GameScoreBox";
import { GameFleetCard } from "./GameFleetCard";
import { GameFleetStatusPanel } from "./GameFleetStatusPanel";
import { toGameScoreData, toGameWinnerResult } from "../utils/toGameDisplayData";
import {
  GameEvents,
  type GameEventsLastMove,
  type GameEventsShipInfo,
} from "./GameEvents";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameGrid } from "./GameGrid";
import { GameGridTooltipHoveredCell } from "./GameGridTooltip";
import {
  toGridShipMap,
  toGridShipPositions,
  toGridIdSet,
  toGameplayShipMap,
  toGridLastMove,
  displayIdToBigint,
} from "../utils/toGridDisplay";
import { useGameplayInteraction } from "../hooks/useGameplayInteraction";
import { useDamageCalculation } from "../hooks/useDamageCalculation";
import { useGamePolling } from "../hooks/useGamePolling";
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import { useLandscapeMode } from "../hooks/useLandscapeMode";
import { type GameRecord, type TurnRecord } from "../types/types";
import { buildInitialRecord, appendTurn, finalizeRecord } from "../utils/serializeGameRecord";
import { saveGameRecord, loadGameRecord } from "../utils/gameRecordStorage";

const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";
import { useSelectedChainId } from "../hooks/useSelectedChainId";

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
  const { address } = useAccount();
  const appChainId = useSelectedChainId();
  const gameContract = useGameContract();

  // ── Game record (persisted to localStorage) ────────────────────────────────
  const gameRecordRef = React.useRef<GameRecord | null>(null);
  const [gameRecord, setGameRecord] = React.useState<GameRecord | null>(null);
  const lastMoveTimestampRef = React.useRef<bigint | undefined>(undefined);
  const archivedRef = React.useRef(false);

  // ── Replay ──────────────────────────────────────────────────────────────────
  const [replayStep, setReplayStep] = React.useState<number | null>(null);
  const [replayTurns, setReplayTurns] = React.useState<TurnRecord[]>([]);
  const [replayInitialState, setReplayInitialState] = React.useState<GameDataView | null>(null);
  const [replayNotFound, setReplayNotFound] = React.useState(false);
  const [replayAutoPlay, setReplayAutoPlay] = React.useState(false);
  const replayAutoPlayRef = React.useRef(false);
  const { clearAllTransactions, transactionState } = useTransaction();
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  // Drag and drop state — `selectedShipId`/`draggedShipId` stay here (not
  // owned by `useGameplayInteraction`) because resolving their equipped
  // special's range/data needs a real `useSpecialRange`/`useSpecialData`
  // contract-read hook call, which must happen at this component's top
  // level before the interaction hook runs — see that hook's params doc.
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
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

  const proposedMoveTargetListClass = useSideLayout
    ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
    : "flex flex-wrap gap-2 min-h-[5rem]";
  const proposedMoveTargetBtnClass = useSideLayout
    ? "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex w-full shrink-0 items-center justify-center"
    : "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex items-center shrink-0";

  // Fetch the current game data to get real-time updates
  const {
    data: gameData,
    isLoading: gameLoading,
    error: gameError,
    refetch: refetchGame,
  } = useGetGame(Number(initialGame.metadata.gameId));

  // Use the fetched game data if available, otherwise fall back to initial game
  const game = gameData || initialGame;

  // ── Replay overlay: replaySnapshotGame → displayGame ───────────────────────
  const replaySnapshotGame: GameDataView | null = React.useMemo(() => {
    if (replayStep === null) return null;
    if (replayStep < 0) return replayInitialState;
    return replayTurns[replayStep]?.snapshot ?? null;
  }, [replayStep, replayInitialState, replayTurns]);
  const displayGame: GameDataView = replaySnapshotGame ?? game;
  const isReplaying = replayStep !== null;

  const aliveShipPositions = React.useMemo(
    () => displayGame.shipPositions.filter((shipPosition) => (shipPosition.status ?? 0) === 0),
    [displayGame.shipPositions],
  );

  /** Matches fleet card grids `grid-cols-1 sm:grid-cols-2` (Tailwind sm = 640px). */
  const [showFleetModal, setShowFleetModal] = useState(false);
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
  const displayedLastMove: LastMove | undefined = isReplaying
    ? (replaySnapshotGame?.lastMove ?? undefined)
    : (optimisticLastMove ?? game.lastMove);

  // Enable real-time event listening for game updates
  useContractEvents();

  // Initialize game record once on mount
  React.useEffect(() => {
    if (!gameRecordRef.current && game.metadata.gameId) {
      const initial = buildInitialRecord(
        String(game.metadata.gameId),
        game.metadata.creator,
        game.metadata.joiner,
        game,
      );
      gameRecordRef.current = initial;
      setGameRecord(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // Save to localStorage after every confirmed move — ours OR opponent's.
  // game.lastMove.timestamp changes whenever game refetches with a new move.
  React.useEffect(() => {
    const newTs = game.lastMove?.timestamp;
    if (newTs === lastMoveTimestampRef.current) return; // no new move
    lastMoveTimestampRef.current = newTs;

    // Only participants record (not spectators)
    if (!address || !game.lastMove) return;
    const creatorAddr = game.metadata.creator.toLowerCase();
    const joinerAddr = game.metadata.joiner.toLowerCase();
    const myAddr = address.toLowerCase();
    if (myAddr !== creatorAddr && myAddr !== joinerAddr) return;

    // Who just moved: after a move, currentTurn switches to the other player
    const currentTurnAddr = game.turnState.currentTurn.toLowerCase();
    const whoJustMoved =
      currentTurnAddr === creatorAddr ? game.metadata.joiner : game.metadata.creator;

    const prev = gameRecordRef.current;
    const base = prev ?? buildInitialRecord(
      String(game.metadata.gameId),
      game.metadata.creator,
      game.metadata.joiner,
      game,
    );
    const updated = appendTurn(base, game, whoJustMoved, game.lastMove);
    gameRecordRef.current = updated;
    setGameRecord(updated);
    saveGameRecord(String(game.metadata.gameId), updated);
  }, [game, address]);

  // Finalize the record once when the game ends
  React.useEffect(() => {
    const winner = game.metadata.winner;
    if (!winner || winner === ZERO_ADDR || archivedRef.current) return;
    const record = gameRecordRef.current;
    if (!record) return;
    archivedRef.current = true;
    const final = finalizeRecord(record, winner);
    gameRecordRef.current = final;
    setGameRecord(final);
    saveGameRecord(String(game.metadata.gameId), final);
  }, [game.metadata.winner, game.metadata.gameId]);

  // ── Replay callbacks ────────────────────────────────────────────────────────

  const fetchAndStartReplay = React.useCallback(() => {
    const gameId = String(game.metadata.gameId);
    const record = loadGameRecord<GameRecord>(gameId);
    if (!record || record.turns.length === 0) {
      setReplayNotFound(true);
      return;
    }
    setReplayNotFound(false);
    setReplayInitialState(record.initialState);
    setReplayTurns(record.turns);
    setReplayStep(-1);
  }, [game.metadata.gameId]);

  const exitReplay = React.useCallback(() => {
    setReplayStep(null);
    setReplayAutoPlay(false);
    replayAutoPlayRef.current = false;
    setReplayNotFound(false);
  }, []);

  React.useEffect(() => {
    replayAutoPlayRef.current = replayAutoPlay;
  }, [replayAutoPlay]);

  React.useEffect(() => {
    if (!replayAutoPlay || !isReplaying) return;
    const total = replayTurns.length;
    const timer = setInterval(() => {
      if (!replayAutoPlayRef.current) { clearInterval(timer); return; }
      setReplayStep((prev) => {
        if (prev === null || prev >= total - 1) {
          setReplayAutoPlay(false);
          replayAutoPlayRef.current = false;
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [replayAutoPlay, isReplaying, replayTurns.length]);

  // Countdown for remaining turn time (in seconds)
  const [turnSecondsLeft, setTurnSecondsLeft] = React.useState<number>(0);
  const turnTimeSec = React.useMemo(
    () => Number(game.turnState.turnTime || 0n),
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
      const turnTimeSec = Number(game.turnState.turnTime || 0n);
      const turnStartSec = Number(game.turnState.turnStartTime || 0n);
      if (!turnTimeSec || !turnStartSec) return 0;
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSec - turnStartSec);
      return Math.max(0, turnTimeSec - elapsed);
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

  // Get game map state directly from the Maps contract
  const { data: gameMapState, isLoading: mapLoading } = useGetGameMapState(
    Number(game.metadata.gameId),
  );

  // Create grids from contract map (same format as tutorial map grids)
  const { blockedGrid, scoringGrid, onlyOnceGrid } = React.useMemo(() => {
    const gameMapData = gameMapState as
      | [
          Array<{ row: number; col: number }>,
          Array<{
            row: number;
            col: number;
            points: number;
            onlyOnce: boolean;
          }>,
        ]
      | undefined;
    return buildMapGridsFromContractMap(
      gameMapData?.[0],
      gameMapData?.[1],
      GRID_WIDTH,
      GRID_HEIGHT,
    );
  }, [gameMapState]);

  // Get all ship IDs that may need rendering in this view.
  // Include active IDs plus any IDs present in shipPositions (destroyed/fled can
  // now be present there and still need metadata for tooltip/render path).
  const allShipIds = React.useMemo(() => {
    const ids = new Set<bigint>();
    game.creatorActiveShipIds.forEach((id) => ids.add(id));
    game.joinerActiveShipIds.forEach((id) => ids.add(id));
    game.shipPositions.forEach((shipPosition) => ids.add(shipPosition.shipId));
    return Array.from(ids);
  }, [game.creatorActiveShipIds, game.joinerActiveShipIds, game.shipPositions]);

  // Fetch ship details for all ships in the game
  const { ships: gameShips, isLoading: shipsLoading } =
    useShipsByIds(allShipIds);

  // Create a map of ship ID to ship object for quick lookup
  const shipMap = React.useMemo(() => {
    const map = new Map<bigint, (typeof gameShips)[0]>();
    gameShips.forEach((ship) => {
      map.set(ship.id, ship);
    });
    return map;
  }, [gameShips]);

  // GameEvents.tsx is number/string-native (shared with web2) — build a
  // string-keyed view of shipMap for it here rather than changing the
  // bigint-keyed shipMap used everywhere else.
  const gameEventsShipMap = React.useMemo(() => {
    const map = new Map<string, GameEventsShipInfo>();
    shipMap.forEach((ship, id) => {
      map.set(id.toString(), {
        name: ship.name,
        owner: ship.owner,
        equipment: { special: ship.equipment.special },
      });
    });
    return map;
  }, [shipMap]);

  const toGameEventsLastMove = React.useCallback(
    (lm: LastMove | undefined): GameEventsLastMove | undefined =>
      lm
        ? {
            shipId: lm.shipId.toString(),
            targetShipId: lm.targetShipId.toString(),
            oldRow: lm.oldRow,
            oldCol: lm.oldCol,
            newRow: lm.newRow,
            newCol: lm.newCol,
            actionType: lm.actionType,
          }
        : undefined,
    [],
  );

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Get ship attributes by ship ID from game data
  const getShipAttributes = React.useCallback(
    (shipId: bigint): Attributes | null => {
      // Find the ship ID in the shipIds array to get the correct index
      const shipIndex = game.shipIds?.findIndex((id) => id === shipId);

      if (
        shipIndex === -1 ||
        !game.shipAttributes ||
        !game.shipAttributes[shipIndex]
      ) {
        return null;
      }

      const attributes = game.shipAttributes[shipIndex];

      return attributes;
    },
    [game.shipAttributes, game.shipIds],
  );

  // Dragged ship's equipped-special range — a real contract read, must live
  // here (top level, before useGameplayInteraction) since hooks can't be
  // called from inside a callback with a dynamic id. See that hook's params
  // doc (selectedShipSpecialRange/draggedShipSpecialRange) for why.
  const draggedShipForSpecialRange =
    draggedShipId != null ? shipMap.get(draggedShipId) : null;
  const draggedShipSpecialType = draggedShipForSpecialRange?.equipment.special ?? 0;
  const { specialRange: draggedShipSpecialRange } = useSpecialRange(
    draggedShipId != null ? draggedShipSpecialType : 0,
  );

  // Build a set of shipIds that have already moved this round (from game data)
  const movedShipIdsSet = React.useMemo(() => {
    const set = new Set<bigint>();
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


  // Check if it's the current player's turn
  const isMyTurn = game.turnState.currentTurn === address;
  const [awaitingTurnSyncAfterSubmit, setAwaitingTurnSyncAfterSubmit] =
    React.useState(false);
  const isMyTurnEffective = isMyTurn && !awaitingTurnSyncAfterSubmit;
  const canActInGame = !readOnly && isMyTurnEffective;
  const gameWinnerResult = toGameWinnerResult(game.metadata.winner, address);
  const isGameOver = gameWinnerResult !== null;
  const moveShipTxId = `move-ship-${selectedShipId}-${game.metadata.gameId}`;
  const isSubmittingMove =
    (transactionState.isPending &&
      transactionState.activeTransactionId === moveShipTxId) ||
    awaitingTurnSyncAfterSubmit;

  const { recordPlayerMove } = useGamePolling({
    gameId: Number(game.metadata.gameId),
    turnTime: game.turnState.turnTime,
    gameData,
    refetchGame,
    onRefetch: () => interaction.setTargetShipId(null),
  });

  // ── GameGrid interaction boundary adapter ─────────────────────────────
  // `useGameplayInteraction` (shared with GameDisplayWeb2.tsx) works on
  // plain numbers, matching the `GridShip` display-layer convention (see
  // app/types/gridDisplay.ts). Convert bigint state down at the boundary
  // via app/utils/toGridDisplay.ts, and convert the few number-native id
  // outputs the rest of this file still needs back up to bigint.
  const gameplayShipMap = React.useMemo(
    () => toGameplayShipMap(shipMap),
    [shipMap],
  );
  const aliveShipPositionsForInteraction = React.useMemo(
    () => toGridShipPositions(aliveShipPositions) ?? [],
    [aliveShipPositions],
  );
  const allShipPositionsForInteraction = React.useMemo(
    () => toGridShipPositions(game.shipPositions) ?? [],
    [game.shipPositions],
  );
  const movedShipIdsSetForInteraction = React.useMemo(
    () => toGridIdSet(movedShipIdsSet),
    [movedShipIdsSet],
  );
  const getShipAttributesForInteraction = React.useCallback(
    (shipId: number) => getShipAttributes(BigInt(shipId)),
    [getShipAttributes],
  );
  const lastMoveForInteraction = React.useMemo(
    () => toGridLastMove(displayedLastMove),
    [displayedLastMove],
  );
  const setSelectedShipIdForInteraction = React.useCallback(
    (id: number | null) => setSelectedShipId(displayIdToBigint(id)),
    [],
  );
  const setDraggedShipIdForInteraction = React.useCallback(
    (id: number | null) => setDraggedShipId(displayIdToBigint(id)),
    [],
  );

  const interaction = useGameplayInteraction({
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    shipMap: gameplayShipMap,
    getShipAttributes: getShipAttributesForInteraction,
    allShipPositions: allShipPositionsForInteraction,
    aliveShipPositions: aliveShipPositionsForInteraction,
    movedShipIdsSet: movedShipIdsSetForInteraction,
    playerAddress: address ?? null,
    currentTurn: game.turnState.currentTurn,
    isGameOver,
    isCurrentPlayerTurn: canActInGame,
    isSubmitting: isSubmittingMove,
    blockedGrid,
    lastMove: lastMoveForInteraction,
    selectedShipId: selectedShipId != null ? Number(selectedShipId) : null,
    setSelectedShipId: setSelectedShipIdForInteraction,
    draggedShipId: draggedShipId != null ? Number(draggedShipId) : null,
    setDraggedShipId: setDraggedShipIdForInteraction,
    selectedShipSpecialRange: specialRange,
    selectedShipSpecialData: (specialData ?? null) as { strength: number } | null,
    draggedShipSpecialRange,
  });

  const {
    previewPosition,
    selectedWeaponType,
    dragOverCell,
    movementRange,
    shootingRange,
    dragShootingRange,
    hoverShootingRange,
    isRammingMovePreview,
    isShowingProposedMove,
    showConfirmWidget,
    confirmWidgetLabel,
    computedActionType,
    computedMoveCoords,
    handleCancelMove: interactionHandleCancelMove,
    handleGridRightClickDeselect: interactionHandleGridRightClickDeselect,
    retreatPrepIsCreator,
    setSelectedWeaponType: setWeaponTypeFromGrid,
    onMoveTileHover,
  } = interaction;

  const toBigTargets = React.useCallback(
    (targets: { shipId: number; position: { row: number; col: number } }[]) =>
      targets.map((t) => ({ shipId: BigInt(t.shipId), position: t.position })),
    [],
  );
  const validTargets = React.useMemo(
    () => toBigTargets(interaction.validTargets),
    [interaction.validTargets, toBigTargets],
  );
  const targetShipId =
    interaction.targetShipId != null ? BigInt(interaction.targetShipId) : null;
  const setTargetShipId = React.useCallback(
    (id: bigint | number | null) =>
      interaction.setTargetShipId(
        id == null ? null : typeof id === "bigint" ? Number(id) : id,
      ),
    // interaction is a fresh object every render; depend on the stable setter only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interaction.setTargetShipId],
  );

  // Clear targeting state when game data changes (after successful moves)
  React.useEffect(() => {
    if (gameData && gameData !== initialGame) {
      // Game data has been updated, clear targeting state
      setTargetShipId(null);
    }
  }, [gameData, initialGame, setTargetShipId]);

  const hoveredCell = interaction.hoveredCell
    ? { ...interaction.hoveredCell, shipId: BigInt(interaction.hoveredCell.shipId) }
    : null;
  const setHoveredCell = React.useCallback(
    (
      cell:
        | {
            shipId: bigint;
            row: number;
            col: number;
            isCreator: boolean;
            fromFleet?: boolean;
          }
        | null,
    ) =>
      interaction.setHoveredCell(
        cell ? { ...cell, shipId: Number(cell.shipId) } : null,
      ),
    // interaction is a fresh object every render; depend on the stable setter only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interaction.setHoveredCell],
  );

  const calculateDamageForShip = useDamageCalculation({
    selectedShipId,
    getShipAttributes,
    selectedWeaponType,
    specialData,
    specialType,
  });


  // Track if we're currently displaying the last move (to avoid infinite loops)
  const isDisplayingLastMoveRef = React.useRef(false);
  const lastDisplayedMoveRef = React.useRef<{
    shipId: bigint;
    newRow: number;
    newCol: number;
  } | null>(null);

  // Wrap the shared hook's handlers to also clear the last-move-display
  // tracking refs above (web3-only concern, not known to the shared hook).
  const handleCancelMove = React.useCallback(() => {
    isDisplayingLastMoveRef.current = false;
    lastDisplayedMoveRef.current = null;
    interactionHandleCancelMove();
  }, [interactionHandleCancelMove]);

  const handleGridRightClickDeselect = React.useCallback(() => {
    isDisplayingLastMoveRef.current = false;
    lastDisplayedMoveRef.current = null;
    interactionHandleGridRightClickDeselect();
  }, [interactionHandleGridRightClickDeselect]);

  /** Tutorial parity: pulse is driven by tutorial steps in SimulatedGameDisplay; live game leaves it off. */
  const shouldPulseSubmitMoveButton = React.useMemo(() => false, []);

  // Determine if we should show last move preview
  // Show to both players UNLESS:
  // - They have a ship selected, OR
  // - It's their turn AND they have proposed but not submitted a move
  const shouldShowLastMove = React.useMemo(() => {
    // Don't show if game is won
    if (game.metadata.winner !== "0x0000000000000000000000000000000000000000") {
      return false;
    }

    // Don't show if no last move exists
    if (!displayedLastMove || displayedLastMove.shipId === 0n) {
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
    if (game.metadata.winner !== "0x0000000000000000000000000000000000000000") {
      return false;
    }
    if (!displayedLastMove || displayedLastMove.shipId === 0n) {
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
    (shipId: bigint): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === address : false;
    },
    [shipMap, address],
  );

  // Track if we're showing a proposed move (not last move)
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

  // When showing last move, set up the preview state to display it (weapon
  // icon / range highlight on GameGrid). This should NOT interfere with
  // proposed moves. Web3-only nicety, deliberately not ported into the
  // shared hook (ties into replay/localStorage machinery) — writes through
  // to the hook's own setters/wrapper instead of local state.
  React.useEffect(() => {
    if (selectedShipId !== null || isShowingProposedMove) {
      if (isDisplayingLastMoveRef.current) {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        if (!isShowingProposedMove) {
          interaction.setPreviewPosition(null);
          setTargetShipId(null);
        }
      }
      return;
    }

    const lastMoveChanged =
      !lastDisplayedMoveRef.current ||
      !displayedLastMove ||
      lastDisplayedMoveRef.current.shipId !== displayedLastMove.shipId ||
      lastDisplayedMoveRef.current.newRow !== displayedLastMove.newRow ||
      lastDisplayedMoveRef.current.newCol !== displayedLastMove.newCol;

    if (shouldShowLastMove && displayedLastMove && lastMoveChanged) {
      const lastMoveShip = shipMap.get(displayedLastMove.shipId);
      if (lastMoveShip) {
        isDisplayingLastMoveRef.current = true;
        lastDisplayedMoveRef.current = {
          shipId: displayedLastMove.shipId,
          newRow: displayedLastMove.newRow,
          newCol: displayedLastMove.newCol,
        };

        interaction.setPreviewPosition({
          row: displayedLastMove.newRow,
          col: displayedLastMove.newCol,
        });
        if (displayedLastMove.targetShipId !== 0n) {
          setTargetShipId(displayedLastMove.targetShipId);
        } else {
          setTargetShipId(null);
        }
        if (displayedLastMove.actionType === ActionType.Shoot) {
          setWeaponTypeFromGrid("weapon");
        } else if (displayedLastMove.actionType === ActionType.Special) {
          setWeaponTypeFromGrid("special");
        }
      }
    } else if (!shouldShowLastMove && isDisplayingLastMoveRef.current) {
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
      interaction.setPreviewPosition(null);
      setTargetShipId(null);
    }
    // interaction is a fresh object every render; depend on the stable setter only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shouldShowLastMove,
    displayedLastMove,
    isShowingProposedMove,
    shipMap,
    selectedShipId,
    interaction.setPreviewPosition,
    setTargetShipId,
    setWeaponTypeFromGrid,
  ]);

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
      interaction.handleCancelMove();
    }
    // interaction is a fresh object every render; depend on the stable handler only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    interaction.handleCancelMove,
  ]);

  // If chain state already says it is no longer our turn, allow local UI to
  // resume normal turn derivation immediately.
  React.useEffect(() => {
    if (!awaitingTurnSyncAfterSubmit) return;
    if (!isMyTurn) {
      setAwaitingTurnSyncAfterSubmit(false);
      // Turn advanced onchain; clear any locally held proposal state.
      interaction.handleCancelMove();
    }
    // interaction is a fresh object every render; depend on the stable handler only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingTurnSyncAfterSubmit, isMyTurn, interaction.handleCancelMove]);

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
    displayedLastMove.targetShipId !== 0n
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
    if (displayedLastMove.targetShipId === 0n) return false;

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
    if (displayedLastMove.targetShipId === 0n) return "";

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
    if (displayedLastMove.targetShipId === 0n) return;

    const targetExists = game.shipPositions.some(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );
    if (targetExists) return;

  }, [displayedLastMove, game.metadata.gameId, game.shipPositions]);

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
        interaction.handleCancelMove();
        // Keep selectedWeaponType so it only changes when player uses the dropdown
      }
    }
    // interaction is a fresh object every render; depend on the stable handler only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurnEffective, address, clearAllTransactions, readOnly, interaction.handleCancelMove]);

  // Clear last move display when user selects a ship or makes a proposed move
  React.useEffect(() => {
    if (selectedShipId !== null || isShowingProposedMove) {
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
    }
  }, [selectedShipId, isShowingProposedMove]);

  // ── GameGrid display adapter ────────────────────────────────────────────
  // GameGrid and its subtree render on plain `number` ids (GridShip /
  // GridShipPosition) — `useGameplayInteraction` already outputs these
  // number-native, so most props pass straight through; only the pieces
  // still computed from this file's own bigint state need converting here.
  const gridForDisplay = interaction.displayGrid;
  const allShipPositionsForDisplay = allShipPositionsForInteraction;
  const shipMapForDisplay = React.useMemo(() => toGridShipMap(shipMap), [shipMap]);
  const selectedShipIdForDisplay = selectedShipId != null ? Number(selectedShipId) : null;
  const targetShipIdForDisplay = interaction.targetShipId;
  const draggedShipIdForDisplay = draggedShipId != null ? Number(draggedShipId) : null;
  const hoveredCellForDisplay: GameGridTooltipHoveredCell | null = interaction.hoveredCell;
  const validTargetsForDisplay = interaction.validTargets;
  const labelTargetsForDisplay = interaction.labelTargets;
  const assistableTargetsForDisplay = interaction.assistableTargets;
  const assistableTargetsFromStartForDisplay = interaction.assistableTargetsFromStart;
  const dragValidTargetsForDisplay = interaction.dragValidTargets;
  const hoverValidTargetsForDisplay = interaction.hoverValidTargets;
  const movedShipIdsSetForDisplay = movedShipIdsSetForInteraction;
  const lastMoveShipIdForDisplay = lastMoveShipId != null ? Number(lastMoveShipId) : null;
  const lastMoveTargetShipIdForDisplay =
    lastMoveTargetShipId != null ? Number(lastMoveTargetShipId) : null;
  const retreatPrepShipIdForDisplay = interaction.retreatPrepShipId;

  const isShipOwnedByCurrentPlayerForDisplay = React.useCallback(
    (shipId: number) => isShipOwnedByCurrentPlayer(BigInt(shipId)),
    [isShipOwnedByCurrentPlayer],
  );
  const getShipAttributesForDisplay = React.useCallback(
    (shipId: number) => getShipAttributes(BigInt(shipId)),
    [getShipAttributes],
  );
  const calculateDamageForDisplay = React.useCallback(
    (
      targetShipId: number,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
      shooterShipIdOverride?: number,
    ) =>
      calculateDamageForShip(
        BigInt(targetShipId),
        weaponType,
        showReducedDamage,
        shooterShipIdOverride != null ? BigInt(shooterShipIdOverride) : undefined,
      ),
    [calculateDamageForShip],
  );

  const setSelectedShipIdForDisplay = interaction.setSelectedShipId;
  const setTargetShipIdForDisplay = interaction.setTargetShipId;
  const setHoveredCellForDisplay = interaction.setHoveredCell;
  const setDraggedShipIdForDisplay = interaction.setDraggedShipId;

  const renderShipCard = React.useCallback(
    (cell: GameGridTooltipHoveredCell): React.ReactNode | null => {
      const ship = shipMap.get(BigInt(cell.shipId));
      if (!ship) return null;
      const attributes = getShipAttributes(BigInt(cell.shipId));
      return (
        <ShipCard
          ship={toShipCardData(ship)}
          shipImage={<ShipImage ship={ship} className="h-full w-full" />}
          isStarred={false}
          onToggleStar={() => {}}
          isSelected={false}
          onToggleSelection={() => {}}
          onRecycleClick={() => {}}
          showInGameProperties={true}
          inGameAttributes={attributes || undefined}
          attributesLoading={!attributes}
          hideRecycle={true}
          hideCheckbox={true}
          tooltipMode={true}
          isCurrentPlayerShip={isShipOwnedByCurrentPlayer(BigInt(cell.shipId))}
          flipShip={cell.isCreator}
          hasMoved={movedShipIdsSet.has(BigInt(cell.shipId))}
          gameViewMode={true}
          tooltipGridPosition={{ row: cell.row, col: cell.col }}
        />
      );
    },
    [shipMap, getShipAttributes, isShipOwnedByCurrentPlayer, movedShipIdsSet],
  );

  /** Top of proposed-move panel: 2/3 submit + 1/3 cancel (side), or horizontal row (wide). */
  const renderProposedMoveSubmitCancelRow = (): React.ReactNode => {
    const isRail = useSideLayout;
    const isJoinerSide =
      !!address &&
      address.toLowerCase() === game.metadata.joiner.toLowerCase();
    return (
      <div
        className={
          isRail
            ? "flex w-full min-w-0 shrink-0 flex-row gap-2"
            : `flex w-full min-w-0 shrink-0 flex-row flex-wrap items-center gap-2 ${
                isJoinerSide ? "justify-end" : "justify-start"
              }`
        }
      >
        <>
          {(() => {
            const computedRow = computedMoveCoords.row;
            const computedCol = computedMoveCoords.col;

            const submitMoveButtonStyle: React.CSSProperties = {
              ...STYLE_LABEL,
              borderColor: "var(--color-phosphor-green)",
              borderTopColor: "var(--color-phosphor-green)",
              borderLeftColor: "var(--color-phosphor-green)",
              color: "var(--color-phosphor-green)",
              backgroundColor: "var(--color-steel)",
              borderWidth: "2px",
              borderStyle: "solid",
            };

            return (
                <TransactionButton
                  transactionId={`move-ship-${selectedShipId}-${game.metadata.gameId}`}
                  contractAddress={gameContract.address}
                  abi={gameContract.abi}
                  functionName="moveShip"
                  args={[
                    game.metadata.gameId,
                    selectedShipId,
                    computedRow,
                    computedCol,
                    computedActionType,
                    computedActionType === ActionType.Pass
                      ? 0n
                      : targetShipId || 0n,
                  ]}
                  style={submitMoveButtonStyle}
                  className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 ${
                    isRail ? "min-w-0 flex-[2] h-full w-full" : ""
                  } ${isRail ? "order-2" : "order-2"}${
                    shouldPulseSubmitMoveButton
                      ? " animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                      : ""
                  }`}
                  loadingText="[SUBMITTING...]"
                  errorText="[ERR]"
                  onTransactionSent={(hash) => {
                    setAwaitingTurnSyncAfterSubmit(true);
                    if (selectedShipId == null) return;
                    const moveTypeLabel =
                      ActionType[computedActionType] ??
                      String(computedActionType);
                    let targetShipIdForAnalytics: string | undefined;
                    if (computedActionType !== ActionType.Pass) {
                      const tid = targetShipId ?? 0n;
                      if (tid !== 0n) {
                        targetShipIdForAnalytics = tid.toString();
                      }
                    }
                    posthog.capture("game_move_submitted", {
                      game_id: String(game.metadata.gameId),
                      ship_id: selectedShipId.toString(),
                      move_type: moveTypeLabel,
                      ...(targetShipIdForAnalytics != null
                        ? { target_ship_id: targetShipIdForAnalytics }
                        : {}),
                      tx_hash: hash,
                      chain_id: appChainId,
                    });
                  }}
                  onSuccess={() => {
                    const currentPosition = game.shipPositions.find(
                      (pos) => pos.shipId === selectedShipId,
                    );
                    const oldRow = currentPosition
                      ? currentPosition.position.row
                      : computedRow;
                    const oldCol = currentPosition
                      ? currentPosition.position.col
                      : computedCol;

                    const submittedTargetShipId = targetShipId ?? 0n;
                    const optimisticNewRow =
                      computedActionType === ActionType.Retreat ? -1 : computedRow;
                    const optimisticNewCol =
                      computedActionType === ActionType.Retreat ? -1 : computedCol;

                    setOptimisticLastMove({
                      shipId: selectedShipId!,
                      oldRow,
                      oldCol,
                      newRow: optimisticNewRow,
                      newCol: optimisticNewCol,
                      actionType: computedActionType,
                      targetShipId: submittedTargetShipId,
                      timestamp: BigInt(Date.now()),
                    });
                    interaction.recordOptimisticMove({
                      shipId: Number(selectedShipId),
                      oldRow,
                      oldCol,
                      newRow: optimisticNewRow,
                      newCol: optimisticNewCol,
                      actionType: computedActionType,
                      targetShipId: Number(submittedTargetShipId),
                      timestamp: Date.now(),
                    });

                    toast.success("Move submitted successfully!");
                    recordPlayerMove();
                    refetchGame();
                    refetch?.();
                  }}
                  onError={(error) => {
                    setAwaitingTurnSyncAfterSubmit(false);
                    const errorMessage =
                      (error as Error)?.message ||
                      String(error) ||
                      "Unknown error";

                    if (
                      errorMessage.includes("User rejected") ||
                      errorMessage.includes("User denied")
                    ) {
                      toast.error("Transaction declined by user");
                    } else if (errorMessage.includes("insufficient funds")) {
                      toast.error("Insufficient funds for transaction");
                    } else if (errorMessage.includes("gas")) {
                      toast.error(
                        "Transaction failed due to gas estimation error",
                      );
                    } else if (errorMessage.includes("execution reverted")) {
                      toast.error(
                        "Transaction reverted - check if it's your turn and ship is valid",
                      );
                    } else if (errorMessage.includes("NotYourTurn")) {
                      toast.error("It's not your turn to move");
                    } else if (errorMessage.includes("ShipNotFound")) {
                      toast.error("Ship not found in this game");
                    } else if (errorMessage.includes("InvalidMove")) {
                      toast.error(
                        "Invalid move - check ship position and movement range",
                      );
                    } else if (errorMessage.includes("PositionOccupied")) {
                      toast.error("Target position is already occupied");
                    } else {
                      toast.error(`Transaction failed: ${errorMessage}`);
                    }
                  }}
                  validateBeforeTransaction={() => {
                    if (!selectedShipId) {
                      return "No ship selected";
                    }
                    if (
                      !game.metadata.gameId ||
                      game.metadata.gameId === 0n
                    ) {
                      return "Invalid game ID";
                    }
                    if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
                      return "You can only move your own ships";
                    }
                    if (
                      (computedActionType as ActionType) !==
                      ActionType.Retreat
                    ) {
                      if (movedShipIdsSet.has(selectedShipId)) {
                        return "This ship has already moved this round";
                      }
                      if (
                        computedRow < 0 ||
                        computedRow >= GRID_HEIGHT ||
                        computedCol < 0 ||
                        computedCol >= GRID_WIDTH
                      ) {
                        return "Invalid position coordinates";
                      }
                    }
                    return true;
                  }}
                >
                  {isSelectedShipDisabled ? "RETREAT" : confirmWidgetLabel}
                </TransactionButton>
            );
          })()}
          <button
            type="button"
            onClick={handleCancelMove}
            className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150${
              isRail ? " min-w-0 flex-[1]" : ""
            } ${isRail ? "order-1" : "order-1"}`}
            style={
              isRail
                ? {
                    ...STYLE_LABEL,
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
                    ...STYLE_LABEL,
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
        // Keep selectedWeaponType so it only changes when player uses the dropdown
        handleCancelMove();
        interaction.setDraggedShipId(null);
        interaction.setDragOverCell(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // interaction is a fresh object every render; depend on the stable setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCancelMove, interaction.setDraggedShipId, interaction.setDragOverCell]);

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
            style={STYLE_LABEL}
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
              ...STYLE_LABEL,
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
              ...STYLE_LABEL,
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
              ...STYLE_LABEL,
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
                ...STYLE_LABEL,
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
              <span className="text-text-muted text-base">
                Round {game.turnState.currentRound.toString()}
              </span>
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
      <div
        className={
          useSideLayout
            ? "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4"
            : "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4"
        }
      >
        {renderProposedMoveSubmitCancelRow()}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div
            className={
              useSideLayout
                ? "flex min-h-0 min-w-0 flex-1 flex-col gap-4"
                : "flex min-h-0 min-w-0 flex-1 flex-row items-stretch gap-6"
            }
          >
        <div className="flex min-w-0 flex-shrink-0 flex-col gap-1">
          {(() => {
            const ship = selectedShipId
              ? shipMap.get(selectedShipId)
              : undefined;
            const name =
              ship?.name ||
              (selectedShipId
                ? `Ship #${selectedShipId.toString()}`
                : "Unknown Ship");
            const currentPos = game.shipPositions.find(
              (pos) => pos.shipId === selectedShipId,
            );
            const fromRow = currentPos?.position.row ?? 0;
            const fromCol = currentPos?.position.col ?? 0;
            const toRow = previewPosition ? previewPosition.row : fromRow;
            const toCol = previewPosition ? previewPosition.col : fromCol;
  return (
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-sm font-semibold text-white">{name}</div>
                <div className="text-sm font-mono text-text-secondary">
                  ({fromRow}, {fromCol}) → ({toRow}, {toCol})
                </div>
              </div>
            );
          })()}
          {(() => {
            if (isSelectedShipDisabled) return null;
            if (!selectedShipId) return null;
            const ship = shipMap.get(selectedShipId);
            if (!ship || ship.equipment.special <= 0) return null;
            return (
              <div className="mt-1 w-full">
                <select
                  value={selectedWeaponType}
                  onChange={(e) => {
                    const newWeaponType = e.target.value as
                      | "weapon"
                      | "special";
                    setWeaponTypeFromGrid(newWeaponType);
                    if (newWeaponType === "special" && specialType === 3) {
                      setTargetShipId(0n);
                    } else {
                      setTargetShipId(null);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm uppercase font-semibold tracking-wider"
                  style={{
                    ...STYLE_MONO,
                    borderRadius: 0,
                    backgroundColor: "var(--color-slate)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="weapon">
                    {getMainWeaponName(ship.equipment.mainWeapon)}
                  </option>
                  <option value="special">
                    {getSpecialName(ship.equipment.special)}
                  </option>
                </select>
              </div>
            );
          })()}
        </div>

        {!isSelectedShipDisabled && validTargets.length > 0 && (
          <div
            className={
              useSideLayout
                ? "flex min-h-0 min-w-0 flex-1 flex-col"
                : "min-h-0 flex-1"
            }
          >
            <div
              className={
                useSideLayout
                  ? "flex min-h-0 min-w-0 flex-1 flex-col border border-solid p-3"
                  : "min-h-[7.5rem] border border-solid p-3"
              }
              style={{
                backgroundColor: "var(--color-near-black)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div
                className="shrink-0 text-xs mb-2 uppercase tracking-wide"
                style={{
                  ...STYLE_MONO,
                  color: "var(--color-text-secondary)",
                }}
              >
                Select Target (Optional)
              </div>
              <div className={proposedMoveTargetListClass}>
                {validTargets.map((target) => {
                  const targetShip = shipMap.get(target.shipId);
                  const isSelectedTarget =
                    targetShipId !== null && targetShipId === target.shipId;
                  const isRepair =
                    selectedWeaponType === "special" && specialType === 2;
                  const accentColor = isRepair
                    ? "var(--color-cyan)"
                    : "var(--color-warning-red)";
                  return (
                    <button
                      key={target.shipId.toString()}
                      type="button"
                      onClick={() => setTargetShipId(target.shipId)}
                      className={proposedMoveTargetBtnClass}
                      style={{
                        ...STYLE_LABEL,
                        borderColor: isSelectedTarget
                          ? accentColor
                          : "var(--color-gunmetal)",
                        borderTopColor: isSelectedTarget
                          ? accentColor
                          : "var(--color-steel)",
                        borderLeftColor: isSelectedTarget
                          ? accentColor
                          : "var(--color-steel)",
                        color: accentColor,
                        backgroundColor: isSelectedTarget
                          ? "var(--color-steel)"
                          : "var(--color-slate)",
                        borderWidth: "2px",
                        borderStyle: "solid",
                        borderRadius: 0,
                      }}
                    >
                      {`[>] `}
                      {targetShip?.name ||
                        `#${target.shipId.toString()}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {useSideLayout &&
          (validTargets.length === 0 || isSelectedShipDisabled) && (
            <div className="min-h-0 min-w-0 flex-1" aria-hidden />
          )}
          </div>
          <button
            type="button"
            onClick={() => interaction.handleRetreatClick()}
            className="w-full shrink-0 px-3 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              ...STYLE_LABEL,
              borderColor:
                computedActionType === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-gunmetal)",
              borderTopColor:
                computedActionType === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              borderLeftColor:
                computedActionType === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              color:
                computedActionType === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-text-secondary)",
              backgroundColor:
                computedActionType === ActionType.Retreat
                  ? "color-mix(in srgb, var(--color-warning-red) 15%, transparent)"
                  : "var(--color-slate)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              if (computedActionType !== ActionType.Retreat) {
                e.currentTarget.style.borderColor = "var(--color-warning-red)";
                e.currentTarget.style.color = "var(--color-warning-red)";
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--color-warning-red) 12%, transparent)";
              }
            }}
            onMouseLeave={(e) => {
              if (computedActionType !== ActionType.Retreat) {
                e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
                e.currentTarget.style.backgroundColor = "var(--color-slate)";
              }
            }}
          >
            Retreat
          </button>
        </div>
      </div>
    </>
  );

  const gameScoreData = toGameScoreData(game, address);
  const { myScore, opponentScore, maxScore } = gameScoreData;
  const mobileTurnLabel =
    game.metadata.winner !== "0x0000000000000000000000000000000000000000"
      ? game.metadata.winner === address
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
    selectedShip && selectedWeaponType === "weapon"
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
      shipIds: readonly bigint[];
      isCurrentPlayerShip: boolean;
      flipShip: boolean;
    }) => (
      <div>
        <h4
          className="mb-3 uppercase font-bold tracking-wider"
          style={{
            ...STYLE_LABEL,
            color: titleColor,
            fontSize: "18px",
          }}
        >
          {title}
          <span
            className="ml-2"
            style={{
              ...STYLE_MONO,
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
                ship={toShipCardData(ship)}
                shipImage={<ShipImage ship={ship} className="h-full w-full" />}
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
                    ...STYLE_LABEL,
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
                    refetchGame();
                  }}
                  className="shrink-0 px-1.5 py-0.5 border border-solid text-[10px] uppercase font-semibold tracking-wider"
                  style={{
                    ...STYLE_LABEL,
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
                    ...STYLE_LABEL,
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
                  ...STYLE_LABEL,
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
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="border border-solid px-1.5 py-1 text-xs" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-near-black)" }}>
                      <span className="text-text-muted">Me </span>
                      <span className="font-mono text-white">{myScore}/{maxScore}</span>
                    </div>
                    <div className="border border-solid px-1.5 py-1 text-xs" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-near-black)" }}>
                      <span className="text-text-muted">Opp </span>
                      <span className="font-mono text-white">{opponentScore}/{maxScore}</span>
                    </div>
                  </div>
                  {game.metadata.winner !== "0x0000000000000000000000000000000000000000" ? (
                    <div className="text-sm text-text-primary">
                      Result: {game.metadata.winner === address ? "Victory" : "Defeat"}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {mobileLeftPanelTab === "events" ? (
                <GameEvents
                  lastMove={toGameEventsLastMove(selectedShipId !== null ? undefined : displayedLastMove)}
                  shipMap={gameEventsShipMap}
                  address={address}
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
                  <div className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => setIsMobileWeaponMenuOpen((prev) => !prev)}
                      disabled={!selectedShip || !(selectedShip.equipment.special > 0)}
                      className="flex min-w-[7.5rem] max-w-[10.5rem] items-center justify-between gap-2 border border-solid bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan disabled:opacity-50 disabled:cursor-default"
                      style={{
                        borderColor: "var(--color-gunmetal)",
                        borderRadius: 0,
                      }}
                    >
                      <span className="truncate">{mobileWeaponDisplayName}</span>
                      {selectedShip && selectedShip.equipment.special > 0 && (
                        <span>{isMobileWeaponMenuOpen ? "▲" : "▼"}</span>
                      )}
                    </button>
                    {isMobileWeaponMenuOpen ? (
                      <div
                        className="absolute left-0 bottom-[calc(100%+4px)] z-[270] w-full border border-solid bg-[var(--color-near-black)]"
                        style={{
                          borderColor: "var(--color-gunmetal)",
                          borderRadius: 0,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setWeaponTypeFromGrid("weapon");
                            setIsMobileWeaponMenuOpen(false);
                          }}
                          className="flex w-full items-center justify-between border-b border-solid px-2 py-1 text-left text-[10px] uppercase tracking-wider"
                          style={{
                            borderColor: "var(--color-gunmetal)",
                            color:
                              selectedWeaponType === "weapon"
                                ? "var(--color-cyan)"
                                : "var(--color-text-secondary)",
                            backgroundColor:
                              selectedWeaponType === "weapon"
                                ? "color-mix(in srgb, var(--color-cyan) 12%, transparent)"
                                : "transparent",
                          }}
                        >
                          <span className="truncate">
                            {selectedShip
                              ? getMainWeaponName(selectedShip.equipment.mainWeapon)
                              : "Weapon"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={!mobileCanUseSpecial}
                          onClick={() => {
                            if (!mobileCanUseSpecial) return;
                            setWeaponTypeFromGrid("special");
                            setIsMobileWeaponMenuOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-2 py-1 text-left text-[10px] uppercase tracking-wider disabled:opacity-40"
                          style={{
                            color:
                              selectedWeaponType === "special"
                                ? "var(--color-cyan)"
                                : "var(--color-text-secondary)",
                            backgroundColor:
                              selectedWeaponType === "special"
                                ? "color-mix(in srgb, var(--color-cyan) 12%, transparent)"
                                : "transparent",
                          }}
                        >
                          <span className="truncate">
                            {selectedShip
                              ? getSpecialName(selectedShip.equipment.special)
                              : "Special"}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
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
                    ship={toShipCardData(selectedShip)}
                    shipImage={<ShipImage ship={selectedShip} className="h-full w-full" />}
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
                  {isShowingProposedMove ? (
                    <div className="pt-1">{renderProposedMoveSubmitCancelRow()}</div>
                  ) : null}
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
                      grid={gridForDisplay}
                      allShipPositions={allShipPositionsForDisplay}
                      shipMap={shipMapForDisplay}
                      selectedShipId={selectedShipIdForDisplay}
                      previewPosition={previewPosition}
                      targetShipId={targetShipIdForDisplay}
                      selectedWeaponType={selectedWeaponType}
                      hoveredCell={hoveredCellForDisplay}
                      draggedShipId={draggedShipIdForDisplay}
                      dragOverCell={dragOverCell}
                      movementRange={movementRange}
                      shootingRange={shootingRange}
                      validTargets={validTargetsForDisplay}
                      labelTargets={labelTargetsForDisplay}
                      assistableTargets={assistableTargetsForDisplay}
                      assistableTargetsFromStart={assistableTargetsFromStartForDisplay}
                      dragShootingRange={dragShootingRange}
                      dragValidTargets={dragValidTargetsForDisplay}
                      hoverShootingRange={hoverShootingRange}
                      hoverValidTargets={hoverValidTargetsForDisplay}
                      onMoveTileHover={onMoveTileHover}
                      isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
                      isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayerForDisplay}
                      movedShipIdsSet={movedShipIdsSetForDisplay}
                      specialType={specialType}
                      blockedGrid={blockedGrid}
                      scoringGrid={scoringGrid}
                      onlyOnceGrid={onlyOnceGrid}
                      calculateDamage={calculateDamageForDisplay}
                      getShipAttributes={getShipAttributesForDisplay}
                      disableTooltips={true}
                      address={address}
                      currentTurn={game.turnState.currentTurn}
                      highlightedMovePosition={highlightedMovePosition}
                      lastMoveShipId={lastMoveShipIdForDisplay}
                      lastMoveOldPosition={lastMoveOldPosition}
                      lastMoveNewPosition={lastMoveNewPosition}
                      lastMoveActionType={lastMoveActionType}
                      lastMoveTargetShipId={lastMoveTargetShipIdForDisplay}
                      lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
                      rammingPreviewPosition={
                        isRammingMovePreview && previewPosition ? previewPosition : null
                      }
                      isRammingMovePreview={isRammingMovePreview}
                      retreatPrepShipId={retreatPrepShipIdForDisplay}
                      retreatPrepIsCreator={retreatPrepIsCreator}
                      tutorialDefaultLabel={tutorialDefaultLabel}
                      onGridRightClickDeselect={handleGridRightClickDeselect}
                      setSelectedShipId={setSelectedShipIdForDisplay}
                      setPreviewPosition={interaction.setPreviewPosition}
                      setTargetShipId={setTargetShipIdForDisplay}
                      setSelectedWeaponType={setWeaponTypeFromGrid}
                      setHoveredCell={setHoveredCellForDisplay}
                      setDraggedShipId={setDraggedShipIdForDisplay}
                      setDragOverCell={interaction.setDragOverCell}
                      renderShipCard={renderShipCard}
                    />
                  </div>
                {game.metadata.winner === "0x0000000000000000000000000000000000000000" ? (
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
                            onFlee={() => {
                              toast.success("You have fled the battle!");
                              setIsMobileFleeOpen(false);
                              refetch?.();
                            }}
                            renderConfirmButton={(onSuccess) => (
                              <FleeConfirmButtonWeb3
                                gameId={game.metadata.gameId}
                                onSuccess={onSuccess}
                              />
                            )}
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
                  ...STYLE_LABEL,
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
                  {game.turnState.currentRound.toString()}
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
                  refetchGame();
                }}
                className="px-2 py-1 border border-solid text-xs uppercase font-semibold tracking-wider"
                style={{
                  ...STYLE_LABEL,
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
              <div className="border border-solid px-1.5 py-0.5 text-[11px]" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}>
                <span className="text-text-muted">Me </span>
                <span className="font-mono text-white">{myScore}/{maxScore}</span>
              </div>
              <div className="border border-solid px-1.5 py-0.5 text-[11px]" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}>
                <span className="text-text-muted">Opp </span>
                <span className="font-mono text-white">{opponentScore}/{maxScore}</span>
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
        style={useSideLayout ? {
          maxHeight: "calc((100vw - min(18rem, 34vw) - 2.625rem) * 11 / 17 + 1rem)"
        } : undefined}
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
              ...STYLE_LABEL,
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
                {gameWinnerResult === null && (
                  <FleeSafetySwitch
                    onFlee={() => {
                      toast.success("You have fled the battle!");
                      refetch?.();
                    }}
                    renderConfirmButton={(onSuccess) => (
                      <FleeConfirmButtonWeb3
                        gameId={game.metadata.gameId}
                        onSuccess={onSuccess}
                      />
                    )}
                  />
                )}
              </div>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="w-1/5 shrink-0" aria-hidden />
              <div className="w-4/5 min-w-0 text-right">
                <div className="text-sm text-text-muted">
                  {gameWinnerResult !== null && (
                    <span
                      className="uppercase font-bold tracking-wider"
                      style={{
                        ...STYLE_LABEL,
                        color:
                          gameWinnerResult === "me"
                            ? "var(--color-phosphor-green)"
                            : "var(--color-warning-red)",
                      }}
                    >
                      {gameWinnerResult === "me" ? "VICTORY" : "DEFEAT"}
                    </span>
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
          <div className="flex flex-col">
            <h1 className="text-2xl font-mono text-white flex items-center gap-3">
              <span>Game {game.metadata.gameId.toString()}</span>
              <span className="text-text-muted text-base">
                Round {game.turnState.currentRound.toString()}
              </span>
            </h1>
            {/* Turn Indicator and Countdown / Seize Turn */}
            {game.metadata.winner ===
              "0x0000000000000000000000000000000000000000" &&
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

                return (
                  <GameTurnTimerPanel
                    hasExceededTime={hasExceededTime}
                    canSeizeTurn={canSeizeTurn}
                    isMyTurn={isMyTurnEffective}
                    secondsLeft={turnSecondsLeft}
                    turnPercentRemaining={turnPercentRemaining}
                    onResync={() => refetchGame()}
                    claimTimeoutButton={
                      <TransactionButton
                        transactionId={`timeout-${game.metadata.gameId.toString()}`}
                        contractAddress={gameContract.address}
                        abi={gameContract.abi}
                        functionName="endGameOnTimeout"
                        args={[game.metadata.gameId]}
                        className="px-3 py-1 uppercase font-semibold tracking-wider transition-colors duration-150 w-full h-full animate-timeout-soft"
                        loadingText="Claiming..."
                        errorText="Failed"
                        onSuccess={() => {
                          toast.success(
                            "Game ended. Opponent forfeited by timeout.",
                          );
                          refetchGame();
                          refetch?.();
                        }}
                      >
                        Claim win (timeout)
                      </TransactionButton>
                    }
                  />
                );
              })()}
          </div>
          {/* Scores box aligned left, to the right of title */}
          {useSideLayout ? (
            <GameScoreBox score={gameScoreData} />
          ) : (
            <div
              className="ml-6 w-48 border border-solid overflow-hidden"
              style={{
                backgroundColor: "var(--color-slate)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div className="flex items-stretch" style={{ ...STYLE_MONO, fontSize: "22px" }}>
                <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                  <span style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-cyan)" }}>[YOU]</span>
                  <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{myScore}/{maxScore}</span>
                </div>
                <div style={{ width: 1, backgroundColor: "var(--color-gunmetal)", flexShrink: 0 }} />
                <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                  <span style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-warning-red)" }}>[OPP]</span>
                  <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{opponentScore}/{maxScore}</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Fleet status panel */}
        {useSideLayout && (() => {
            const isCreator = address === game.metadata.creator;
            const myIds = isCreator ? game.creatorActiveShipIds : game.joinerActiveShipIds;
            const enemyIds = isCreator ? game.joinerActiveShipIds : game.creatorActiveShipIds;

            const renderCard = (shipId: bigint, teamColor: string, flip: boolean) => {
              const ship = shipMap.get(shipId);
              const attrs = getShipAttributes(shipId);
              const hasMoved = movedShipIdsSet.has(shipId);
              const isSOS = !!attrs && attrs.hullPoints === 0;
              const hpPct = attrs && attrs.maxHullPoints > 0
                ? Math.max(0, (attrs.hullPoints / attrs.maxHullPoints) * 100)
                : 0;
              const shipPos = game.shipPositions.find((sp) => sp.shipId === shipId);
              return (
                <GameFleetCard
                  key={shipId.toString()}
                  card={{ shipId: Number(shipId), name: ship?.name ?? `#${shipId}`, hpPct, hasMoved, isSOS }}
                  teamColor={teamColor}
                  flip={flip}
                  isSelected={selectedShipId === shipId}
                  isHovered={hoveredCell?.shipId === shipId}
                  shipImage={ship && <ShipImage ship={ship} className="w-full h-full" showLoadingState={false} hideRankStars />}
                  onClick={() => setSelectedShipId(shipId)}
                  onMouseEnter={() =>
                    shipPos &&
                    setHoveredCell({ shipId, row: shipPos.position.row, col: shipPos.position.col, isCreator: shipPos.isCreator, fromFleet: true })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            };

            return (
              <GameFleetStatusPanel
                myCount={myIds.length}
                enemyCount={enemyIds.length}
                onShowDetails={() => setShowFleetModal(true)}
                myCards={myIds.map((id) => renderCard(id, "var(--color-cyan)", isCreator))}
                enemyCards={enemyIds.map((id) => renderCard(id, "var(--color-warning-red)", !isCreator))}
              />
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
          grid={gridForDisplay}
                allShipPositions={allShipPositionsForDisplay}
          shipMap={shipMapForDisplay}
          selectedShipId={selectedShipIdForDisplay}
          previewPosition={previewPosition}
          targetShipId={targetShipIdForDisplay}
          selectedWeaponType={selectedWeaponType}
          hoveredCell={hoveredCellForDisplay}
          draggedShipId={draggedShipIdForDisplay}
          dragOverCell={dragOverCell}
          movementRange={movementRange}
          shootingRange={shootingRange}
          validTargets={validTargetsForDisplay}
          labelTargets={labelTargetsForDisplay}
          assistableTargets={assistableTargetsForDisplay}
          assistableTargetsFromStart={assistableTargetsFromStartForDisplay}
          dragShootingRange={dragShootingRange}
          dragValidTargets={dragValidTargetsForDisplay}
          hoverShootingRange={hoverShootingRange}
          hoverValidTargets={hoverValidTargetsForDisplay}
          onMoveTileHover={onMoveTileHover}
                isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
          isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayerForDisplay}
          movedShipIdsSet={movedShipIdsSetForDisplay}
          specialType={specialType}
          blockedGrid={blockedGrid}
          scoringGrid={scoringGrid}
          onlyOnceGrid={onlyOnceGrid}
          calculateDamage={calculateDamageForDisplay}
          getShipAttributes={getShipAttributesForDisplay}
          disableTooltips={disableTooltips}
          address={address}
          currentTurn={game.turnState.currentTurn}
          highlightedMovePosition={highlightedMovePosition}
          lastMoveShipId={lastMoveShipIdForDisplay}
          lastMoveOldPosition={lastMoveOldPosition}
                lastMoveNewPosition={lastMoveNewPosition}
          lastMoveActionType={lastMoveActionType}
          lastMoveTargetShipId={lastMoveTargetShipIdForDisplay}
          lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
          rammingPreviewPosition={
            isRammingMovePreview && previewPosition ? previewPosition : null
          }
          isRammingMovePreview={isRammingMovePreview}
          retreatPrepShipId={retreatPrepShipIdForDisplay}
          retreatPrepIsCreator={retreatPrepIsCreator}
          tutorialDefaultLabel={tutorialDefaultLabel}
          onGridRightClickDeselect={handleGridRightClickDeselect}
          setSelectedShipId={setSelectedShipIdForDisplay}
          setPreviewPosition={interaction.setPreviewPosition}
          setTargetShipId={setTargetShipIdForDisplay}
          setSelectedWeaponType={setWeaponTypeFromGrid}
          setHoveredCell={setHoveredCellForDisplay}
          setDraggedShipId={setDraggedShipIdForDisplay}
          setDragOverCell={interaction.setDragOverCell}
          renderShipCard={renderShipCard}
          showConfirmWidget={showConfirmWidget}
          confirmWidgetLabel={confirmWidgetLabel}
          onCancelMove={handleCancelMove}
          confirmButton={showConfirmWidget ? (() => {
            const computedRow = computedMoveCoords.row;
            const computedCol = computedMoveCoords.col;
            return (
              <TransactionButton
                transactionId={`move-ship-${selectedShipId}-${game.metadata.gameId}`}
                contractAddress={gameContract.address}
                abi={gameContract.abi}
                functionName="moveShip"
                args={[
                  game.metadata.gameId,
                  selectedShipId,
                  computedRow,
                  computedCol,
                  computedActionType,
                  computedActionType === ActionType.Pass ? 0n : targetShipId || 0n,
                ]}
                className="flex-[2] px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors duration-100"
                style={{
                  ...STYLE_LABEL,
                  color: "var(--color-phosphor-green)",
                  backgroundColor: "color-mix(in srgb, var(--color-phosphor-green) 10%, transparent)",
                  borderRight: "1px solid var(--color-gunmetal)",
                  borderRadius: 0,
                  letterSpacing: "0.14em",
                }}
                loadingText="[...]"
                errorText="[ERR]"
                onTransactionSent={() => setAwaitingTurnSyncAfterSubmit(true)}
                onSuccess={() => {
                  const currentPosition = game.shipPositions.find(p => p.shipId === selectedShipId);
                  const submittedTargetShipId = targetShipId ?? 0n;
                  const oldRow = currentPosition?.position.row ?? computedRow;
                  const oldCol = currentPosition?.position.col ?? computedCol;
                  const optimisticNewRow = computedActionType === ActionType.Retreat ? -1 : computedRow;
                  const optimisticNewCol = computedActionType === ActionType.Retreat ? -1 : computedCol;
                  setOptimisticLastMove({
                    shipId: selectedShipId!,
                    oldRow,
                    oldCol,
                    newRow: optimisticNewRow,
                    newCol: optimisticNewCol,
                    actionType: computedActionType,
                    targetShipId: submittedTargetShipId,
                    timestamp: BigInt(Date.now()),
                  });
                  interaction.recordOptimisticMove({
                    shipId: Number(selectedShipId),
                    oldRow,
                    oldCol,
                    newRow: optimisticNewRow,
                    newCol: optimisticNewCol,
                    actionType: computedActionType,
                    targetShipId: Number(submittedTargetShipId),
                    timestamp: Date.now(),
                  });
                  toast.success("Move submitted successfully!");
                  recordPlayerMove();
                  refetchGame();
                  refetch?.();
                }}
                onError={() => setAwaitingTurnSyncAfterSubmit(false)}
              >
                {confirmWidgetLabel}
              </TransactionButton>
            );
          })() : undefined}
        />
            </div>
          {/* Replay banner */}
          {isReplaying && (
            <div
              className="pointer-events-none absolute top-1 left-1 z-[230] px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold"
              style={{
                ...STYLE_LABEL,
                color: "var(--color-cyan)",
                backgroundColor: "color-mix(in srgb, var(--color-near-black) 85%, transparent)",
                border: "1px solid var(--color-steel)",
              }}
            >
              {replayStep < 0 ? "Replay · Start" : `Replay · Move ${replayStep + 1}/${replayTurns.length}`}
            </div>
          )}
          {/* Replay controls (bottom-left) */}
          <div className="absolute bottom-0 left-0 z-[225] pointer-events-none flex items-end">
            <div className="pointer-events-auto flex items-end gap-2 pb-1 pl-1">
              {!isReplaying && !replayNotFound && (
                <button
                  onClick={fetchAndStartReplay}
                  className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                  style={{
                    ...STYLE_LABEL,
                    borderColor: "var(--color-steel)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                    borderRadius: 0,
                  }}
                >
                  Replay
                </button>
              )}
              {!isReplaying && replayNotFound && (
                <div
                  className="flex items-center gap-2 border-2 border-solid px-2 py-1 text-[11px]"
                  style={{
                    ...STYLE_LABEL,
                    borderColor: "var(--color-warning-red)",
                    color: "var(--color-warning-red)",
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
                    borderRadius: 0,
                  }}
                >
                  <span>Replay not available — not recorded on this device</span>
                  <button
                    onClick={() => setReplayNotFound(false)}
                    className="px-1.5 py-0.5 border border-solid"
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    ✕
                  </button>
                </div>
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
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    ◀ Prev
                  </button>
                  <span className="text-[11px] font-mono text-text-muted min-w-[5rem] text-center">
                    {replayStep < 0
                      ? "Start"
                      : `Move ${replayStep + 1}/${replayTurns.length} · Rd ${replayTurns[replayStep]?.round ?? ""}`}
                  </span>
                  <button
                    onClick={() => setReplayStep((s) => (s === null ? null : Math.min(replayTurns.length - 1, s + 1)))}
                    disabled={replayStep >= replayTurns.length - 1}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    Next ▶
                  </button>
                  <button
                    onClick={() => setReplayAutoPlay((p) => !p)}
                    disabled={replayStep >= replayTurns.length - 1}
                    className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
                    style={{
                      ...STYLE_LABEL,
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
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    ✕ Exit
                  </button>
                </div>
              )}
            </div>
          </div>
          {game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" &&
            process.env.NODE_ENV === "development" && (
              <div className="absolute bottom-0 left-0 z-[220] pointer-events-none">
                <div className="pointer-events-auto">
                  {isDebugPanelMinimized ? (
                    <button
                      type="button"
                      onClick={() => setIsDebugPanelMinimized(false)}
                      className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                      style={{
                        ...STYLE_LABEL,
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
                            ...STYLE_LABEL,
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
                            ...STYLE_LABEL,
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
                              ...STYLE_LABEL,
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
                              ...STYLE_LABEL,
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
      </div>
            )}
            <div className="absolute bottom-0 right-0 z-[220] pointer-events-none">
              <div className="pointer-events-auto">
                {isLastMovePanelMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsLastMovePanelMinimized(false)}
                    className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                    style={{
                      ...STYLE_LABEL,
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
                          ...STYLE_LABEL,
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
                          ...STYLE_LABEL,
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
                        toGameEventsLastMove(selectedShipId !== null ? undefined : displayedLastMove)
                      }
        shipMap={gameEventsShipMap}
        address={address}
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
                  ...STYLE_LABEL,
                  color: isMyTurnEffective
                    ? "var(--color-cyan)"
                    : "var(--color-warning-red)",
                }}
              >
                {isMyTurnEffective ? "Your turn" : "Opponent turn"} |{" "}
                {formatSeconds(Math.max(0, turnSecondsLeft))}
              </div>
              {game.metadata.winner ===
              "0x0000000000000000000000000000000000000000" ? (
                <FleeSafetySwitch
                  onFlee={() => {
                    toast.success("You have fled the battle!");
                    refetch?.();
                  }}
                  renderConfirmButton={(onSuccess) => (
                    <FleeConfirmButtonWeb3
                      gameId={game.metadata.gameId}
                      onSuccess={onSuccess}
                    />
                  )}
                />
              ) : (
                <div className="text-sm text-text-primary">
                  Result: {game.metadata.winner === address ? "Victory" : "Defeat"}
                </div>
              )}
            </div>
          ) : null}
          {mobileActivePanel === "events" ? (
            <GameEvents
              lastMove={toGameEventsLastMove(selectedShipId !== null ? undefined : displayedLastMove)}
              shipMap={gameEventsShipMap}
              address={address}
              appendDestroyedText={appendDestroyedTextToLastMove}
              debugSuffix={lastMoveTargetPositionDebugSuffix}
            />
          ) : null}
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
                ...STYLE_LABEL,
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
              ...STYLE_LABEL,
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
      {/* Fleet Details Modal */}
      {showFleetModal && (() => {
        const buildFleetDetailCards = (
          shipIds: readonly bigint[],
          isCurrentPlayerShip: boolean,
          flipShip: boolean,
        ) =>
          shipIds.map((shipId, index) => {
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
              <div
                key={shipId.toString()}
                data-game-fleet-ship-cell=""
                data-ship-id={shipId.toString()}
                data-row-index={gameViewShipRowIndex(index)}
              >
                <ShipCard
                  ship={toShipCardData(ship)}
                  shipImage={<ShipImage ship={ship} className="h-full w-full" />}
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
              </div>
            );
          });

        const isCreatorView = game.metadata.creator === address;
        return (
          <GameFleetDetailsModal
            show={true}
            onClose={() => setShowFleetModal(false)}
            containerRef={gameShipGridsContainerRef}
            myFleetLabel={
              isCreatorView
                ? readOnly ? "Creator Fleet" : "[MY FLEET]"
                : readOnly ? "Joiner Fleet" : "[MY FLEET]"
            }
            enemyFleetLabel={
              isCreatorView
                ? readOnly ? "Joiner Fleet" : "[HOSTILE FLEET]"
                : readOnly ? "Creator Fleet" : "[HOSTILE FLEET]"
            }
            myFleetCards={
              isCreatorView
                ? buildFleetDetailCards(game.creatorActiveShipIds, true, true)
                : buildFleetDetailCards(game.joinerActiveShipIds, true, false)
            }
            enemyFleetCards={
              isCreatorView
                ? buildFleetDetailCards(game.joinerActiveShipIds, false, false)
                : buildFleetDetailCards(game.creatorActiveShipIds, false, true)
            }
          />
        );
      })()}
    </div>
  );
};

export default GameDisplay;

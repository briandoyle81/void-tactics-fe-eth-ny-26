"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
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
import { useShipsByIds } from "../hooks/useShipsByIds";
import ShipCard from "./ShipCard";
import { ShipImage } from "./ShipImage";
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
import { GameEvents } from "./GameEvents";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameGrid } from "./GameGrid";
import {
  computeMovementRange,
  computeShootingRange,
  computeLabelTargets,
  computeHoverValidTargets,
  computeHoverShootingRange,
  hasLineOfSight,
} from "../utils/gameGridRanges";
import { useDamageCalculation } from "../hooks/useDamageCalculation";
import { useGamePolling } from "../hooks/useGamePolling";
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import { useLandscapeMode } from "../hooks/useLandscapeMode";
import { useResetSelectionOnTurnChange } from "../hooks/useResetSelectionOnTurnChange";
import { useRetreatModeCancellation } from "../hooks/useRetreatModeCancellation";

const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;

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
  const { clearAllTransactions, transactionState } = useTransaction();
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
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
    Record<string, "weapon" | "special">
  >({});
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: bigint;
    row: number;
    col: number;
    isCreator: boolean;
    fromFleet?: boolean;
  } | null>(null);

  // Drag and drop state
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
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
  const aliveShipPositions = React.useMemo(
    () => game.shipPositions.filter((shipPosition) => (shipPosition.status ?? 0) === 0),
    [game.shipPositions],
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
  const displayedLastMove: LastMove | undefined =
    optimisticLastMove ?? game.lastMove;

  // Enable real-time event listening for game updates
  useContractEvents();

  const { recordPlayerMove } = useGamePolling({
    gameId: Number(game.metadata.gameId),
    turnTime: game.turnState.turnTime,
    gameData,
    refetchGame,
    onRefetch: () => setTargetShipId(null),
  });

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

  // Clear targeting state when game data changes (after successful moves)
  React.useEffect(() => {
    if (gameData && gameData !== initialGame) {
      // Game data has been updated, clear targeting state
      setTargetShipId(null);
    }
  }, [gameData, initialGame]);

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

  const isEnemyDisabledShipId = React.useCallback(
    (shipId: bigint): boolean => {
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
        }
      }
    });

    // Also show last move preview if we're displaying it (and not showing a proposed move)
    // Check conditions directly to avoid dependency order issues
    const isMyTurnNow = game.turnState.currentTurn === address;
    const shouldShowLastMoveNow =
      game.metadata.winner === "0x0000000000000000000000000000000000000000" &&
      displayedLastMove &&
      displayedLastMove.shipId !== 0n &&
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
      if (isTargetingLastMove && displayedLastMove.targetShipId !== 0n) {
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

  const calculateDamageForShip = useDamageCalculation({
    selectedShipId,
    getShipAttributes,
    selectedWeaponType,
    specialData,
    specialType,
  });

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
      shipId: bigint;
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
  const labelTargets = React.useMemo(
    () =>
      computeLabelTargets({
        selectedShipId,
        previewPosition,
        isRammingMovePreview,
        shipPositions: game.shipPositions,
        shipMap,
        playerAddress: address ?? null,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
      }),
    [
      selectedShipId,
      previewPosition,
      isRammingMovePreview,
      gameShips,
      shipMap,
      address,
      getShipAttributes,
      blockedGrid,
      game.shipPositions,
      selectedWeaponType,
      specialRange,
      specialType,
    ],
  );

  // Assist action removed from contract; keep empty arrays for API compatibility
  const assistableTargets = React.useMemo(() => [], []);
  const assistableTargetsFromStart = React.useMemo(() => [], []);

  // Calculate shooting range for selected ship (where it could shoot from any valid move position)
  const shootingRange = React.useMemo(
    () =>
      isRammingMovePreview
        ? []
        : computeShootingRange({
            gridWidth: GRID_WIDTH,
            gridHeight: GRID_HEIGHT,
            selectedShipId,
            hasShips: !!gameShips,
            shipMap,
            getShipAttributes,
            shipPositions: game.shipPositions,
            previewPosition,
            selectedWeaponType,
            specialRange,
            specialType,
            blockedGrid,
          }),
    [
      selectedShipId,
      gameShips,
      isRammingMovePreview,
      shipMap,
      getShipAttributes,
      game.shipPositions,
      previewPosition,
      selectedWeaponType,
      specialRange,
      specialType,
      blockedGrid,
    ],
  );

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
      shipId: bigint;
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

  const hoverValidTargets = React.useMemo(
    () =>
      computeHoverValidTargets({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: !!gameShips,
        shipPositions: game.shipPositions,
        shipMap,
        playerAddress: address ?? null,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
      }),
    [selectedShipId, hoverPreviewPosition, gameShips, shipMap, address,
     getShipAttributes, selectedWeaponType, specialType, specialRange,
     game.shipPositions, blockedGrid],
  );

  const hoverShootingRange = React.useMemo(
    () =>
      computeHoverShootingRange({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: !!gameShips,
        shipPositions: game.shipPositions,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
      }),
    [selectedShipId, hoverPreviewPosition, gameShips, getShipAttributes,
     selectedWeaponType, specialType, specialRange, game.shipPositions, blockedGrid],
  );

  // Auto-set Flak to target all ships when Flak is first selected
  // Use a ref to track if we've already set it for this selection
  const flakAutoSetRef = React.useRef<{
    shipId: bigint | null;
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
        setTargetShipId(0n);
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

  // Track if we're currently displaying the last move (to avoid infinite loops)
  const isDisplayingLastMoveRef = React.useRef(false);
  const lastDisplayedMoveRef = React.useRef<{
    shipId: bigint;
    newRow: number;
    newCol: number;
  } | null>(null);

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
  const isShowingProposedMove = React.useMemo(() => {
    // Show move submission UI whenever it's your turn and you have one of your
    // ships selected that hasn't moved yet, OR a disabled (0 HP) ship selected
    // that can only Retreat.
    if (selectedShipId === null) {
      return false;
    }
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;

    const moveShipTxId = `move-ship-${selectedShipId}-${game.metadata.gameId}`;
    const waitingOnMoveTx =
      (transactionState.isPending &&
        transactionState.activeTransactionId === moveShipTxId) ||
      awaitingTurnSyncAfterSubmit;

    if (movedShipIdsSet.has(selectedShipId)) {
      const attrs = getShipAttributes(selectedShipId);
      const isDisabled = attrs && attrs.hullPoints === 0;
      if (!isDisabled) return false;
    }

    if (!canActInGame && !waitingOnMoveTx) {
      return false;
    }
    return true;
  }, [
    selectedShipId,
    canActInGame,
    awaitingTurnSyncAfterSubmit,
    transactionState.isPending,
    transactionState.activeTransactionId,
    game.metadata.gameId,
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

  // Disabled ships: always Retreat. Healthy ships: Retreat only if the player chose it for that ship.
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
        // Only clear preview if we're not showing a proposed move
        if (!isShowingProposedMove) {
          setPreviewPosition(null);
          setTargetShipId(null);
        }
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
        if (displayedLastMove.targetShipId !== 0n) {
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
    isShowingProposedMove,
    shipMap,
    selectedShipId,
  ]);

  const setWeaponTypeFromGrid = React.useCallback(
    (type: "weapon" | "special" | "ram") => {
      if (selectedShipId != null && type !== "ram") {
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
    setSelectedWeaponType(saved);
  }, [
    selectedShipId,
    weaponPreferenceByShipId,
    shipMap,
    getShipAttributes,
    shouldShowLastMove,
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

  // Handle move submission - now handled by TransactionButton

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

  const computedActionType = React.useMemo(() =>
    actionOverride != null
      ? actionOverride
      : isRammingMovePreview
        ? ActionType.Pass
      : targetShipId !== null && targetShipId !== 0n
        ? selectedWeaponType === "special" ? ActionType.Special : ActionType.Shoot
        : targetShipId === 0n && selectedWeaponType === "special" && specialType === 3
          ? ActionType.Special
          : ActionType.Pass,
  [actionOverride, isRammingMovePreview, targetShipId, selectedWeaponType, specialType]);

  const computedMoveCoords = React.useMemo(() => {
    if (previewPosition) return previewPosition;
    const cur = game.shipPositions.find(p => p.shipId === selectedShipId);
    return cur ? cur.position : { row: 0, col: 0 };
  }, [previewPosition, selectedShipId, game.shipPositions]);

  const showConfirmWidget = React.useMemo(() =>
    !readOnly &&
    isShowingProposedMove &&
    actionOverride !== ActionType.Retreat &&
    (previewPosition !== null || targetShipId !== null),
  [readOnly, isShowingProposedMove, previewPosition, actionOverride, targetShipId]);

  const confirmWidgetLabel = React.useMemo(() =>
    computedActionType === ActionType.Pass ? "HOLD FIRE"
      : computedActionType === ActionType.Ram ? "RAM"
      : (selectedWeaponType === "special" && specialType === 2 && targetShipId != null) ? "REPAIR"
      : (targetShipId != null && targetShipId !== 0n) ? "FIRE"
      : "SUBMIT",
  [computedActionType, selectedWeaponType, specialType, targetShipId]);

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
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
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

                    setOptimisticLastMove({
                      shipId: selectedShipId!,
                      oldRow,
                      oldCol,
                      newRow:
                        computedActionType === ActionType.Retreat
                          ? -1
                          : computedRow,
                      newCol:
                        computedActionType === ActionType.Retreat
                          ? -1
                          : computedCol,
                      actionType: computedActionType,
                      targetShipId: submittedTargetShipId,
                      timestamp: BigInt(Date.now()),
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
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
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
            onClick={() => {
              if (selectedShipId != null) {
                setRetreatExplicitByShipId((prev) => ({
                  ...prev,
                  [selectedShipId.toString()]: true,
                }));
              }
              setTargetShipId(null);
              setPreviewPosition(null);
            }}
            className="w-full shrink-0 px-3 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-gunmetal)",
              borderTopColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              borderLeftColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              color:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-text-secondary)",
              backgroundColor:
                actionOverride === ActionType.Retreat
                  ? "color-mix(in srgb, var(--color-warning-red) 15%, transparent)"
                  : "var(--color-slate)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              if (actionOverride !== ActionType.Retreat) {
                e.currentTarget.style.borderColor = "var(--color-warning-red)";
                e.currentTarget.style.color = "var(--color-warning-red)";
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--color-warning-red) 12%, transparent)";
              }
            }}
            onMouseLeave={(e) => {
              if (actionOverride !== ActionType.Retreat) {
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
                  lastMove={selectedShipId !== null ? undefined : displayedLastMove}
                  shipMap={shipMap}
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
                      grid={grid}
                      allShipPositions={game.shipPositions}
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
                      hoverShootingRange={hoverShootingRange}
                      hoverValidTargets={hoverValidTargets}
                      onMoveTileHover={setHoverPreviewPosition}
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
                      address={address}
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
                {game.metadata.winner ===
                  "0x0000000000000000000000000000000000000000" && (
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
                    "0x0000000000000000000000000000000000000000" && (
                    <span
                      className="uppercase font-bold tracking-wider"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        color:
                          game.metadata.winner === address
                            ? "var(--color-phosphor-green)"
                            : "var(--color-warning-red)",
                      }}
                    >
                      {game.metadata.winner === address ? "VICTORY" : "DEFEAT"}
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

                if (hasExceededTime) {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="flex items-center justify-between gap-2"
                        style={STYLE_LABEL}
                      >
                        <span
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{ color: "var(--color-cyan)" }}
                        >
                          YOUR TURN
                        </span>
                        <span
                          className="font-mono text-sm animate-timeout-soft"
                          style={{
                            ...STYLE_MONO,
                            color: "var(--color-warning-red)",
                          }}
                        >
                          00:00
                        </span>
                      </div>
                      <div
                        className="text-sm font-bold uppercase tracking-wider animate-victory-flash"
                        style={{ color: "var(--color-warning-red)", ...STYLE_LABEL }}
                      >
                        Opponent can now claim victory
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 overflow-hidden"
                          style={{
                            backgroundColor: "var(--color-gunmetal)",
                            borderRadius: 0,
                          }}
                        >
                          <div
                            className="h-full animate-victory-flash"
                            style={{
                              width: `100%`,
                              backgroundColor: "var(--color-warning-red)",
                              borderRadius: 0,
                            }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            refetchGame();
                          }}
                          className="p-1 text-text-muted hover:text-cyan transition-colors"
                          title="Resync game state"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (canSeizeTurn) {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-amber)", ...STYLE_LABEL }}>
                        Opponent&apos;s timer expired
                      </p>
                      <div className="text-sm">
                        <div
                          className="inline-block"
                          style={{
                            fontFamily:
                              "var(--font-rajdhani), 'Arial Black', sans-serif",
                            borderColor: "var(--color-amber)",
                            color: "var(--color-amber)",
                            backgroundColor: "var(--color-steel)",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderRadius: 0,
                          }}
                        >
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 overflow-hidden"
                          style={{
                            backgroundColor: "var(--color-gunmetal)",
                            borderRadius: 0,
                          }}
                        >
                          <div
                            className="h-full animate-timeout-bar"
                            style={{
                              width: `100%`,
                              backgroundColor: "var(--color-warning-red)",
                              borderRadius: 0,
                            }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            refetchGame();
                          }}
                          className="p-1 text-text-muted hover:text-cyan transition-colors"
                          title="Resync game state"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-1.5">
                    <div
                      className="text-sm flex items-center gap-2 uppercase font-semibold tracking-wider"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <span
                        style={{
                          color: isMyTurnEffective
                            ? "var(--color-cyan)"
                            : "var(--color-warning-red)",
                        }}
                      >
                        {isMyTurnEffective ? "YOUR TURN" : "OPPONENT'S TURN"}
                      </span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        •
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: isMyTurnEffective
                            ? "var(--color-cyan)"
                            : "var(--color-warning-red)",
                        }}
                      >
                        {formatSeconds(turnSecondsLeft)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-1.5 overflow-hidden"
                        style={{
                          backgroundColor: "var(--color-gunmetal)",
                          borderRadius: 0,
                        }}
                      >
                        <div
                          className="h-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${turnPercentRemaining}%`,
                            backgroundColor: "var(--color-warning-red)",
                            borderRadius: 0,
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          refetchGame();
                        }}
                        className="p-1 text-text-muted hover:text-cyan transition-colors"
                        title="Refresh game state"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--color-text-muted) 70%, transparent)", fontFamily: "var(--font-rajdhani), sans-serif" }}>
                      {isMyTurnEffective
                        ? "Opponent may claim victory if timer expires"
                        : "You may claim victory if their timer expires"}
                    </p>
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
              const isHoveredFromGrid = hoveredCell?.shipId === shipId;
              const isSelectedInGrid = selectedShipId === shipId;
              return (
                <div
                  key={shipId.toString()}
                  className="flex min-w-0 w-full flex-col gap-0.5 overflow-hidden cursor-pointer"
                  style={{ opacity: hasMoved ? 0.45 : 1 }}
                  onClick={() => setSelectedShipId(shipId)}
                  onMouseEnter={() => shipPos && setHoveredCell({ shipId, row: shipPos.position.row, col: shipPos.position.col, isCreator: shipPos.isCreator, fromFleet: true })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1", backgroundColor: "var(--color-slate)", border: `1px solid ${teamColor}`, outline: isSelectedInGrid ? `2px solid ${teamColor}` : isHoveredFromGrid ? `1px solid ${teamColor}` : undefined, outlineOffset: "2px" }}>
                    {ship && (
                      <ShipImage
                        ship={ship}
                        className={`w-full h-full${flip ? " scale-x-[-1]" : ""}`}
                        showLoadingState={false}
                        hideRankStars
                      />
                    )}
                    {isSOS && (
                      <>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100">
                          <line x1="8" y1="8" x2="92" y2="92" stroke={teamColor} strokeWidth="2.5" opacity="0.75" />
                          <line x1="92" y1="8" x2="8" y2="92" stroke={teamColor} strokeWidth="2.5" opacity="0.75" />
                        </svg>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-0.5 z-20 flex items-center justify-center pointer-events-none" title="Disabled (0 HP)">
                          <div className="px-1 py-0.5 flex items-center justify-center bg-warning-red/60 border border-warning-red">
                            <span className="text-xs leading-none font-mono text-white">[SOS]</span>
                          </div>
                        </div>
                      </>
                    )}
                    {hasMoved && <div className="absolute inset-0 bg-steel/50 pointer-events-none" />}
                  </div>
                  <span className="truncate" style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-text-secondary)" }}>
                    {ship?.name ?? `#${shipId}`}
                  </span>
                  <div className="overflow-hidden" style={{ height: 3, backgroundColor: "var(--color-gunmetal)" }}>
                    <div style={{ width: `${hpPct}%`, height: "100%", backgroundColor: teamColor, transition: "width 0.3s ease" }} />
                  </div>
                </div>
              );
            };

            return (
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border border-solid p-2" style={{ borderColor: "var(--color-gunmetal)", borderTopColor: "var(--color-steel)", borderLeftColor: "var(--color-steel)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-text-secondary)" }}>FLEET STATUS</span>
                    <button
                      type="button"
                      onClick={() => setShowFleetModal(true)}
                      className="border border-solid px-1.5 py-0.5 uppercase tracking-wider transition-colors"
                      style={{ ...STYLE_LABEL, fontSize: 9, color: "var(--color-text-secondary)", borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
                    >
                      [DETAILS]
                    </button>
                  </div>
                  <span style={{ ...STYLE_MONO, fontSize: 10, color: "var(--color-text-muted)" }}>
                    <span style={{ color: "var(--color-cyan)" }}>{myIds.length}</span>
                    <span style={{ color: "var(--color-text-muted)" }}> vs </span>
                    <span style={{ color: "var(--color-warning-red)" }}>{enemyIds.length}</span>
                  </span>
                </div>

                {/* My Fleet */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 10, color: "var(--color-cyan)" }}>MY FLEET</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-cyan)", opacity: 0.25 }} />
                    <span style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-cyan)" }}>{myIds.length}</span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {myIds.map((id) => renderCard(id, "var(--color-cyan)", isCreator))}
                  </div>
                </div>

                <div style={{ height: 1, backgroundColor: "var(--color-gunmetal)" }} />

                {/* Opponent Fleet */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 10, color: "var(--color-warning-red)" }}>OPPONENT</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-warning-red)", opacity: 0.25 }} />
                    <span style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-warning-red)" }}>{enemyIds.length}</span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {enemyIds.map((id) => renderCard(id, "var(--color-warning-red)", !isCreator))}
                  </div>
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
                allShipPositions={game.shipPositions}
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
          hoverShootingRange={hoverShootingRange}
          hoverValidTargets={hoverValidTargets}
          onMoveTileHover={setHoverPreviewPosition}
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
          address={address}
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
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
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
                  setOptimisticLastMove({
                    shipId: selectedShipId!,
                    oldRow: currentPosition?.position.row ?? computedRow,
                    oldCol: currentPosition?.position.col ?? computedCol,
                    newRow: computedActionType === ActionType.Retreat ? -1 : computedRow,
                    newCol: computedActionType === ActionType.Retreat ? -1 : computedCol,
                    actionType: computedActionType,
                    targetShipId: targetShipId ?? 0n,
                    timestamp: BigInt(Date.now()),
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
                  gameId={game.metadata.gameId}
                  onFlee={() => {
                    toast.success("You have fled the battle!");
                    refetch?.();
                  }}
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
              lastMove={selectedShipId !== null ? undefined : displayedLastMove}
              shipMap={shipMap}
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
              <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 14, color: "var(--color-text-secondary)" }}>FLEET DETAILS</span>
            </div>
            <div
              ref={gameShipGridsContainerRef}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {game.metadata.creator === address ? (
                <>
                  <div>
                    <h4 className="mb-3 uppercase font-bold tracking-wider" style={{ ...STYLE_LABEL, color: "var(--color-cyan)", fontSize: "18px" }}>
                      {readOnly ? "Creator Fleet" : "[MY FLEET]"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {game.creatorActiveShipIds.map((shipId, index) => {
                        const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
                        const attributes = getShipAttributes(shipId);
                        const ship = shipMap.get(shipId);
                        if (!shipPosition || !attributes || !ship) return null;
                        const reactorCriticalStatus =
                          attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0 ? "critical"
                          : attributes.reactorCriticalTimer > 0 ? "warning" : "none";
                        return (
                          <div key={shipId.toString()} data-game-fleet-ship-cell="" data-ship-id={shipId.toString()} data-row-index={gameViewShipRowIndex(index)}>
                            <ShipCard ship={ship} isStarred={false} onToggleStar={() => {}} isSelected={false} onToggleSelection={() => {}} onRecycleClick={() => {}} showInGameProperties={true} inGameAttributes={attributes} attributesLoading={false} hideRecycle={true} hideCheckbox={true} isCurrentPlayerShip={true} flipShip={true} reactorCriticalStatus={reactorCriticalStatus} hasMoved={movedShipIdsSet.has(shipId)} gameViewMode={true} layoutShipId={shipId.toString()} nameBlockMinHeightPx={gameViewNameBlockMinHeights[shipId.toString()]} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 uppercase font-bold tracking-wider" style={{ ...STYLE_LABEL, color: "var(--color-warning-red)", fontSize: "18px" }}>
                      {readOnly ? "Joiner Fleet" : "[HOSTILE FLEET]"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {game.joinerActiveShipIds.map((shipId, index) => {
                        const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
                        const attributes = getShipAttributes(shipId);
                        const ship = shipMap.get(shipId);
                        if (!shipPosition || !attributes || !ship) return null;
                        const reactorCriticalStatus =
                          attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0 ? "critical"
                          : attributes.reactorCriticalTimer > 0 ? "warning" : "none";
                        return (
                          <div key={shipId.toString()} data-game-fleet-ship-cell="" data-ship-id={shipId.toString()} data-row-index={gameViewShipRowIndex(index)}>
                            <ShipCard ship={ship} isStarred={false} onToggleStar={() => {}} isSelected={false} onToggleSelection={() => {}} onRecycleClick={() => {}} showInGameProperties={true} inGameAttributes={attributes} attributesLoading={false} hideRecycle={true} hideCheckbox={true} isCurrentPlayerShip={false} flipShip={false} reactorCriticalStatus={reactorCriticalStatus} hasMoved={movedShipIdsSet.has(shipId)} gameViewMode={true} layoutShipId={shipId.toString()} nameBlockMinHeightPx={gameViewNameBlockMinHeights[shipId.toString()]} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="mb-3 uppercase font-bold tracking-wider" style={{ ...STYLE_LABEL, color: "var(--color-warning-red)", fontSize: "18px" }}>
                      {readOnly ? "Creator Fleet" : "[HOSTILE FLEET]"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {game.creatorActiveShipIds.map((shipId, index) => {
                        const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
                        const attributes = getShipAttributes(shipId);
                        const ship = shipMap.get(shipId);
                        if (!shipPosition || !attributes || !ship) return null;
                        const reactorCriticalStatus =
                          attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0 ? "critical"
                          : attributes.reactorCriticalTimer > 0 ? "warning" : "none";
                        return (
                          <div key={shipId.toString()} data-game-fleet-ship-cell="" data-ship-id={shipId.toString()} data-row-index={gameViewShipRowIndex(index)}>
                            <ShipCard ship={ship} isStarred={false} onToggleStar={() => {}} isSelected={false} onToggleSelection={() => {}} onRecycleClick={() => {}} showInGameProperties={true} inGameAttributes={attributes} attributesLoading={false} hideRecycle={true} hideCheckbox={true} isCurrentPlayerShip={false} flipShip={true} reactorCriticalStatus={reactorCriticalStatus} hasMoved={movedShipIdsSet.has(shipId)} gameViewMode={true} layoutShipId={shipId.toString()} nameBlockMinHeightPx={gameViewNameBlockMinHeights[shipId.toString()]} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 uppercase font-bold tracking-wider" style={{ ...STYLE_LABEL, color: "var(--color-cyan)", fontSize: "18px" }}>
                      {readOnly ? "Joiner Fleet" : "[MY FLEET]"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {game.joinerActiveShipIds.map((shipId, index) => {
                        const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
                        const attributes = getShipAttributes(shipId);
                        const ship = shipMap.get(shipId);
                        if (!shipPosition || !attributes || !ship) return null;
                        const reactorCriticalStatus =
                          attributes.reactorCriticalTimer > 0 && attributes.hullPoints === 0 ? "critical"
                          : attributes.reactorCriticalTimer > 0 ? "warning" : "none";
                        return (
                          <div key={shipId.toString()} data-game-fleet-ship-cell="" data-ship-id={shipId.toString()} data-row-index={gameViewShipRowIndex(index)}>
                            <ShipCard ship={ship} isStarred={false} onToggleStar={() => {}} isSelected={false} onToggleSelection={() => {}} onRecycleClick={() => {}} showInGameProperties={true} inGameAttributes={attributes} attributesLoading={false} hideRecycle={true} hideCheckbox={true} isCurrentPlayerShip={true} flipShip={false} reactorCriticalStatus={reactorCriticalStatus} hasMoved={movedShipIdsSet.has(shipId)} gameViewMode={true} layoutShipId={shipId.toString()} nameBlockMinHeightPx={gameViewNameBlockMinHeights[shipId.toString()]} />
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
    </div>
  );
};

export default GameDisplay;

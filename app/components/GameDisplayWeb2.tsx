"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import posthog from "posthog-js";
import {
  ActionType,
  Attributes,
  GRID_DIMENSIONS,
} from "../types/types";
import type { Web2GameDataView, Web2LastMove } from "../types/web2Game";
import { Web2Ship } from "../types/web2Ship";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useGetGame } from "../hooks/useGamesWeb2";
import { useGameShipsWeb2 } from "../hooks/useGameShipsWeb2";
import { useGameStreamWeb2 } from "../hooks/useGameStreamWeb2";
import { useGamePollingWeb2 } from "../hooks/useGamePollingWeb2";
import { useMapWeb2 } from "../hooks/useMapWeb2";
import { useDamageCalculationWeb2 } from "../hooks/useDamageCalculationWeb2";
import {
  useGameViewChromeLayout,
  GAME_VIEW_SIDE_ROOT_CLASS,
} from "../hooks/useGameViewChromeLayout";
import {
  useGameplayInteraction,
  type GameplayShip,
} from "../hooks/useGameplayInteraction";
import { apiMutate } from "../lib/apiMutate";
import { SPECIAL_CONFIG } from "../utils/specialConfigWeb2";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameGrid } from "./GameGrid";
import { GameGridTooltipHoveredCell } from "./GameGridTooltip";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { GameScoreBox } from "./GameScoreBox";
import { GameTurnTimerPanel } from "./GameTurnTimerPanel";
import { GameFleetCard } from "./GameFleetCard";
import { GameFleetStatusPanel } from "./GameFleetStatusPanel";
import { GameFleetDetailsModal } from "./GameFleetDetailsModal";
import {
  GameEvents,
  type GameEventsLastMove,
  type GameEventsShipInfo,
} from "./GameEvents";
import { toGameScoreDataWeb2, toGameWinnerResultWeb2 } from "../utils/gameDisplayDataWeb2";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { FleeConfirmButtonWeb2 } from "./FleeConfirmButtonWeb2";
import { STYLE_LABEL } from "../styles/fontStyles";

// Web2-mode counterpart to `GameDisplay.tsx`. Genuinely playable (grid
// interaction via the shared <GameGrid> and useGameplayInteraction hook,
// move/shoot/special/retreat/ram, turn/score/timer, fleet status, weapon
// selection, confirm, win banner, replay) — but a deliberately simpler
// first slice, not full pixel parity with the ~3900-line web3 file (no
// mobile action-sheet layout, no debug panel, no full replay/localStorage
// game-record machinery). See docs/merge-explore-traditional-plan.md.
//
// Unlike GameDisplay/SimulatedGameDisplay, no bigint boundary-adapter block
// is needed here — Web2GameDataView/Web2Ship are already number-native, so
// state hands straight to <GameGrid>.

const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;

interface GameDisplayWeb2Props {
  game: Web2GameDataView;
  onBack: () => void;
  refetch?: () => void;
  readOnly?: boolean;
}

export default function GameDisplayWeb2({
  game: initialGame,
  onBack,
  refetch,
  readOnly = false,
}: GameDisplayWeb2Props) {
  const { userId } = useCurrentUser();

  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);

  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  useGameViewChromeLayout(gameViewRootRef, gridContainerRef);

  const gameId = Number(initialGame.metadata.gameId);

  const { data: gameData, refetch: refetchGame } = useGetGame(gameId);
  const game = gameData || initialGame;

  useGameStreamWeb2(gameId, !readOnly);

  const { ships: gameShips } = useGameShipsWeb2(gameId);

  const shipMap = useMemo(() => {
    const map = new Map<number, Web2Ship>();
    gameShips.forEach((s) => map.set(s.id, s));
    return map;
  }, [gameShips]);

  // GameEvents.tsx is number/string-native — build a string-keyed view of
  // shipMap for it here rather than changing shipMap's own number keys.
  const gameEventsShipMap = useMemo(() => {
    const map = new Map<string, GameEventsShipInfo>();
    shipMap.forEach((ship, id) => {
      map.set(String(id), {
        name: ship.name,
        owner: ship.owner,
        equipment: { special: ship.equipment.special },
      });
    });
    return map;
  }, [shipMap]);

  // Adapter for `useGameplayInteraction`'s ownership-aware ship shape (see
  // that hook's doc) — cheap here since web2's Web2Ship is already number-id.
  const gameplayShipMap = useMemo(() => {
    const map = new Map<number, GameplayShip>();
    shipMap.forEach((ship, id) =>
      map.set(id, { id: ship.id, owner: ship.owner, equipment: ship.equipment }),
    );
    return map;
  }, [shipMap]);

  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMapWeb2(
    game.mapId,
    game.gridDimensions.gridWidth,
    game.gridDimensions.gridHeight,
  );

  const getShipAttributes = useCallback(
    (shipId: number): Attributes | null => {
      const idx = game.shipIds.findIndex((id) => id === shipId);
      if (idx === -1 || !game.shipAttributes[idx]) return null;
      return game.shipAttributes[idx];
    },
    [game.shipIds, game.shipAttributes],
  );

  const movedShipIdsSet = useMemo(() => {
    const set = new Set<number>();
    game.creatorMovedShipIds.forEach((id) => set.add(id));
    game.joinerMovedShipIds.forEach((id) => set.add(id));
    return set;
  }, [game.creatorMovedShipIds, game.joinerMovedShipIds]);

  const aliveShipPositions = useMemo(
    () => game.shipPositions.filter((p) => (p.status ?? 0) === 0),
    [game.shipPositions],
  );

  const isCurrentPlayerTurn = !readOnly && game.turnState.currentTurn === userId;
  const gameWinnerResult = toGameWinnerResultWeb2(game.metadata.winner, userId);
  const isGameOver = gameWinnerResult !== null;

  // Play alert sound when it becomes the player's turn (turn changes from
  // opponent to player only).
  const prevTurnRef = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!readOnly && isCurrentPlayerTurn && userId && prevTurnRef.current === false) {
      const audio = new Audio("/sound/alert.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail - some browsers block autoplay
      });
    }
    prevTurnRef.current = isCurrentPlayerTurn;
  }, [isCurrentPlayerTurn, userId, readOnly]);

  // Pre-resolved special range/data for the selected/dragged ship's equipped
  // special — a plain object lookup for web2 (no real contract-read hook
  // needed, unlike web3's useSpecialRange/useSpecialData), but still computed
  // before the shared hook call per its params contract.
  const selectedShipSpecialType =
    selectedShipId != null ? (shipMap.get(selectedShipId)?.equipment.special ?? 0) : 0;
  const selectedShipSpecialRange = SPECIAL_CONFIG[selectedShipSpecialType]?.range;
  const selectedShipSpecialData = useMemo(
    () => ({ strength: SPECIAL_CONFIG[selectedShipSpecialType]?.strength ?? 0 }),
    [selectedShipSpecialType],
  );
  const draggedShipSpecialType =
    draggedShipId != null ? (shipMap.get(draggedShipId)?.equipment.special ?? 0) : 0;
  const draggedShipSpecialRange = SPECIAL_CONFIG[draggedShipSpecialType]?.range;

  const interaction = useGameplayInteraction({
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    shipMap: gameplayShipMap,
    getShipAttributes,
    allShipPositions: game.shipPositions,
    aliveShipPositions,
    movedShipIdsSet,
    playerAddress: userId,
    currentTurn: game.turnState.currentTurn,
    isGameOver,
    isCurrentPlayerTurn,
    isSubmitting,
    blockedGrid,
    lastMove: game.lastMove ?? null,
    selectedShipId,
    setSelectedShipId,
    draggedShipId,
    setDraggedShipId,
    selectedShipSpecialRange,
    selectedShipSpecialData,
    draggedShipSpecialRange,
  });

  const {
    previewPosition,
    targetShipId,
    selectedWeaponType,
    hoveredCell,
    dragOverCell,
    displayGrid,
    movementRange,
    shootingRange,
    validTargets,
    labelTargets,
    assistableTargets,
    assistableTargetsFromStart,
    dragValidTargets,
    dragShootingRange,
    hoverValidTargets,
    hoverShootingRange,
    isRammingMovePreview,
    isShipOwnedByCurrentPlayer,
    computedActionType,
    confirmWidgetLabel,
    showConfirmWidget,
    retreatPrepShipId,
    retreatPrepIsCreator,
    specialType,
    specialData,
    handleCancelMove,
    handleGridRightClickDeselect,
    handleRetreatClick,
    buildActionPayload,
    recordOptimisticMove,
    setPreviewPosition,
    setTargetShipId,
    setSelectedWeaponType,
    setHoveredCell,
    setDragOverCell,
    onMoveTileHover,
  } = interaction;

  const calculateDamageForShip = useDamageCalculationWeb2({
    selectedShipId,
    getShipAttributes,
    selectedWeaponType,
    specialData,
    specialType,
  });

  const recordPlayerMoveRef = React.useRef<(() => void) | null>(null);
  const { recordPlayerMove } = useGamePollingWeb2({
    gameId,
    turnTime: game.turnState.turnTime,
    gameData: game,
    refetchGame,
    onRefetch: useCallback(() => setTargetShipId(null), [setTargetShipId]),
  });
  recordPlayerMoveRef.current = recordPlayerMove;

  const handleSubmitMove = useCallback(async () => {
    const payload = buildActionPayload();
    if (!payload) return;
    setIsSubmitting(true);
    try {
      let finalActionType = payload.actionType;
      let finalTargetShipId = payload.targetShipId;
      // The server engine requires an explicit Ram action (with the occupying
      // ship as target) — the shared hook returns Pass for rams to match
      // web3's contract-inferred behavior (see useGameplayInteraction.ts's
      // buildActionPayload doc), so override here at web2's own submit step.
      if (isRammingMovePreview && previewPosition) {
        const occupying = aliveShipPositions.find(
          (p) =>
            p.position.row === previewPosition.row &&
            p.position.col === previewPosition.col &&
            p.shipId !== payload.shipId,
        );
        finalActionType = ActionType.Ram;
        finalTargetShipId = occupying?.shipId ?? 0;
      }
      await apiMutate(`/api/games/${gameId}/action`, "POST", {
        shipId: payload.shipId,
        row: payload.row,
        col: payload.col,
        actionType: finalActionType,
        targetShipId: finalTargetShipId,
        specialType: payload.specialType,
      });
      posthog.capture("game_move_submitted", {
        game_id: String(gameId),
        ship_id: String(payload.shipId),
        move_type: ActionType[finalActionType] ?? String(finalActionType),
        ...(finalTargetShipId ? { target_ship_id: String(finalTargetShipId) } : {}),
      });
      const currentPosition = aliveShipPositions.find((p) => p.shipId === payload.shipId);
      const optimisticMove: Web2LastMove = {
        shipId: payload.shipId,
        oldRow: currentPosition?.position.row ?? payload.row,
        oldCol: currentPosition?.position.col ?? payload.col,
        newRow: finalActionType === ActionType.Retreat ? -1 : payload.row,
        newCol: finalActionType === ActionType.Retreat ? -1 : payload.col,
        actionType: finalActionType,
        targetShipId: finalTargetShipId,
        timestamp: Date.now(),
      };
      recordOptimisticMove(optimisticMove);
      setOptimisticLastMoveWeb2(optimisticMove);
      recordPlayerMoveRef.current?.();
      toast.success("Move submitted!");
      handleCancelMove();
      refetchGame();
      refetch?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    buildActionPayload,
    isRammingMovePreview,
    previewPosition,
    aliveShipPositions,
    gameId,
    recordOptimisticMove,
    handleCancelMove,
    refetchGame,
    refetch,
  ]);

  // Optimistic last-move: mirrors GameDisplay.tsx's own local
  // `optimisticLastMove` state (separate from useGameplayInteraction's
  // `recordOptimisticMove`, which already covers the grid's ghost-preview
  // position) — keeps the "Last Move" text panel + grid highlight showing
  // the just-submitted move during the gap before the next poll/SSE tick
  // updates `game.lastMove`.
  const [optimisticLastMoveWeb2, setOptimisticLastMoveWeb2] = useState<Web2LastMove | null>(null);
  React.useEffect(() => {
    if (!optimisticLastMoveWeb2 || !game.lastMove) return;
    const matches =
      game.lastMove.shipId === optimisticLastMoveWeb2.shipId &&
      game.lastMove.actionType === optimisticLastMoveWeb2.actionType &&
      game.lastMove.targetShipId === optimisticLastMoveWeb2.targetShipId &&
      game.lastMove.oldRow === optimisticLastMoveWeb2.oldRow &&
      game.lastMove.oldCol === optimisticLastMoveWeb2.oldCol &&
      game.lastMove.newRow === optimisticLastMoveWeb2.newRow &&
      game.lastMove.newCol === optimisticLastMoveWeb2.newCol;
    if (matches) setOptimisticLastMoveWeb2(null);
  }, [optimisticLastMoveWeb2, game.lastMove]);

  const lastMove = optimisticLastMoveWeb2 ?? game.lastMove;
  const lastMoveShipId = lastMove?.shipId ?? null;
  const lastMoveOldPosition = lastMove ? { row: lastMove.oldRow, col: lastMove.oldCol } : null;
  const lastMoveNewPosition = lastMove ? { row: lastMove.newRow, col: lastMove.newCol } : null;
  const lastMoveActionType = lastMove?.actionType ?? null;
  const lastMoveTargetShipId = lastMove?.targetShipId ?? null;
  const lastMoveIsCurrentPlayer = lastMove ? shipMap.get(lastMove.shipId)?.owner === userId : undefined;

  const gameEventsLastMove: GameEventsLastMove | undefined = lastMove
    ? {
        shipId: String(lastMove.shipId),
        targetShipId: String(lastMove.targetShipId),
        oldRow: lastMove.oldRow,
        oldCol: lastMove.oldCol,
        newRow: lastMove.newRow,
        newCol: lastMove.newCol,
        actionType: lastMove.actionType,
      }
    : undefined;

  const appendDestroyedTextToLastMove = useMemo(() => {
    if (!lastMove) return false;
    if (lastMove.targetShipId === 0) return false;
    const isTargetingAction =
      lastMove.actionType === ActionType.Shoot || lastMove.actionType === ActionType.Special;
    if (!isTargetingAction) return false;
    return !game.shipPositions.some((sp) => sp.shipId === lastMove.targetShipId);
  }, [lastMove, game.shipPositions]);

  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] = useState(false);

  const gameScoreData = toGameScoreDataWeb2(game, userId);

  const [turnSecondsLeft, setTurnSecondsLeft] = useState(0);
  React.useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - game.turnState.turnStartTime) / 1000);
      setTurnSecondsLeft(Math.max(0, game.turnState.turnTime - elapsed));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [game.turnState.turnStartTime, game.turnState.turnTime]);

  const turnPercentRemaining = useMemo(() => {
    const turnTimeSec = game.turnState.turnTime;
    if (!turnTimeSec || turnTimeSec <= 0) return 0;
    const pct = (turnSecondsLeft / turnTimeSec) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [turnSecondsLeft, game.turnState.turnTime]);

  const [isClaimingTimeout, setIsClaimingTimeout] = useState(false);
  const handleClaimTimeout = useCallback(async () => {
    setIsClaimingTimeout(true);
    try {
      await apiMutate(`/api/games/${gameId}/timeout`, "POST");
      toast.success("Claimed win by timeout!");
      refetchGame();
      refetch?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setIsClaimingTimeout(false);
    }
  }, [gameId, refetchGame, refetch]);

  const renderShipCard = useCallback(
    (cell: GameGridTooltipHoveredCell) => {
      const ship = shipMap.get(cell.shipId);
      if (!ship) return null;
      const attrs = getShipAttributes(cell.shipId);
      return (
        <ShipCard
          ship={toShipCardDataWeb2(ship)}
          shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
          isStarred={false}
          onToggleStar={() => {}}
          isSelected={false}
          onToggleSelection={() => {}}
          onRecycleClick={() => {}}
          showInGameProperties={true}
          inGameAttributes={attrs || undefined}
          attributesLoading={!attrs}
          hideRecycle={true}
          hideCheckbox={true}
          tooltipMode={true}
          isCurrentPlayerShip={isShipOwnedByCurrentPlayer(cell.shipId)}
          flipShip={cell.isCreator}
          hasMoved={movedShipIdsSet.has(cell.shipId)}
          gameViewMode={true}
          tooltipGridPosition={{ row: cell.row, col: cell.col }}
        />
      );
    },
    [shipMap, getShipAttributes, isShipOwnedByCurrentPlayer, movedShipIdsSet],
  );

  const renderFleetCard = (shipId: number, teamColor: string, flip: boolean) => {
    const ship = shipMap.get(shipId);
    const attrs = getShipAttributes(shipId);
    const hasMoved = movedShipIdsSet.has(shipId);
    const isSOS = !!attrs && attrs.hullPoints === 0;
    const hpPct = attrs && attrs.maxHullPoints > 0 ? Math.max(0, (attrs.hullPoints / attrs.maxHullPoints) * 100) : 0;
    const shipPos = game.shipPositions.find((sp) => sp.shipId === shipId);
    return (
      <GameFleetCard
        key={shipId}
        card={{ shipId, name: ship?.name ?? `#${shipId}`, hpPct, hasMoved, isSOS }}
        teamColor={teamColor}
        flip={flip}
        isSelected={selectedShipId === shipId}
        isHovered={hoveredCell?.shipId === shipId}
        shipImage={ship && <ShipImageWeb2 ship={ship} className="w-full h-full" showLoadingState={false} hideRankStars />}
        onClick={() => setSelectedShipId(shipId)}
        onMouseEnter={() =>
          shipPos &&
          setHoveredCell({ shipId, row: shipPos.position.row, col: shipPos.position.col, isCreator: shipPos.isCreator, fromFleet: true })
        }
        onMouseLeave={() => setHoveredCell(null)}
      />
    );
  };

  const isCreatorMe = game.metadata.creator === userId;
  const myIds = isCreatorMe ? game.creatorActiveShipIds : game.joinerActiveShipIds;
  const enemyIds = isCreatorMe ? game.joinerActiveShipIds : game.creatorActiveShipIds;

  return (
    <div
      ref={gameViewRootRef}
      className={`flex flex-col gap-6 ${GAME_VIEW_SIDE_ROOT_CLASS}`}
      style={{ marginLeft: "8px" }}
    >
      <div className="flex min-h-0 min-w-0 flex-row items-stretch gap-4 pt-3">
        {/* Header rail */}
        <div className="flex min-h-0 self-stretch w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-hidden pl-2 pr-1">
          <div className="flex shrink-0 flex-col items-stretch gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-0 items-center justify-center px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
              style={{ ...STYLE_LABEL, borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
            >
              ← Back
            </button>
            <h1 className="text-2xl font-mono text-white flex items-center gap-3">
              <span>Game {game.metadata.gameId}</span>
              <span className="text-text-muted text-base">Round {game.turnState.currentRound}</span>
            </h1>
            {!isGameOver && (() => {
              const isParticipant = !readOnly && (isCreatorMe || game.metadata.joiner === userId);
              const canSeizeTurn = !isCurrentPlayerTurn && isParticipant && turnSecondsLeft <= 0;
              const hasExceededTime = isCurrentPlayerTurn && isParticipant && turnSecondsLeft <= 0;
              return (
                <GameTurnTimerPanel
                  hasExceededTime={hasExceededTime}
                  canSeizeTurn={canSeizeTurn}
                  isMyTurn={isCurrentPlayerTurn}
                  secondsLeft={turnSecondsLeft}
                  turnPercentRemaining={turnPercentRemaining}
                  onResync={() => refetchGame()}
                  claimTimeoutButton={
                    <button
                      type="button"
                      onClick={handleClaimTimeout}
                      disabled={isClaimingTimeout}
                      className="px-3 py-1 uppercase font-semibold tracking-wider transition-colors duration-150 w-full h-full animate-timeout-soft"
                    >
                      {isClaimingTimeout ? "Claiming..." : "Claim win (timeout)"}
                    </button>
                  }
                />
              );
            })()}
            <GameScoreBox score={gameScoreData} />
            {gameWinnerResult ? (
              <div
                className="border-2 border-solid px-3 py-2 text-center uppercase font-bold tracking-wider"
                style={{
                  ...STYLE_LABEL,
                  borderColor: gameWinnerResult === "me" ? "var(--color-phosphor-green)" : "var(--color-warning-red)",
                  color: gameWinnerResult === "me" ? "var(--color-phosphor-green)" : "var(--color-warning-red)",
                  borderRadius: 0,
                }}
              >
                {gameWinnerResult === "tie" ? "TIE" : gameWinnerResult === "me" ? "VICTORY" : "DEFEAT"}
              </div>
            ) : (
              !readOnly && (
                <FleeSafetySwitch
                  onFlee={() => { refetchGame(); refetch?.(); }}
                  renderConfirmButton={(onSuccess) => (
                    <FleeConfirmButtonWeb2 gameId={gameId} onSuccess={onSuccess} />
                  )}
                />
              )
            )}
            <button
              type="button"
              onClick={() => setShowReplay((v) => !v)}
              className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
              style={{ ...STYLE_LABEL, borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-slate)", borderRadius: 0 }}
            >
              {showReplay ? "Hide Replay" : "View Replay"}
            </button>
          </div>

          {/* Fleet status panel */}
          <GameFleetStatusPanel
            myCount={myIds.length}
            enemyCount={enemyIds.length}
            onShowDetails={() => setShowFleetModal(true)}
            myCards={myIds.map((id) => renderFleetCard(id, "var(--color-cyan)", isCreatorMe))}
            enemyCards={enemyIds.map((id) => renderFleetCard(id, "var(--color-warning-red)", !isCreatorMe))}
            footer={
              <>
                {selectedShipId != null && isShipOwnedByCurrentPlayer(selectedShipId) && computedActionType !== ActionType.Retreat && (
                  <button
                    type="button"
                    onClick={handleRetreatClick}
                    className="mt-2 px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    Retreat
                  </button>
                )}
                {computedActionType === ActionType.Retreat && selectedShipId != null && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmitMove}
                      disabled={isSubmitting}
                      className="flex-1 px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
                      style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "color-mix(in srgb, var(--color-warning-red) 10%, transparent)", borderRadius: 0 }}
                    >
                      Confirm Retreat
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelMove}
                      className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
                      style={{ ...STYLE_LABEL, borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)", borderRadius: 0 }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            }
          />
        </div>

        {/* Game grid */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <GameBoardLayout isCurrentPlayerTurn={isCurrentPlayerTurn} containerRef={gridContainerRef} onBoardChromeMouseDown={handleCancelMove}>
            <div className="relative w-full [contain:layout]" style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}>
              <div className="absolute inset-0 min-h-0 overflow-hidden">
                <GameGrid
                  grid={displayGrid}
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
                  onMoveTileHover={onMoveTileHover}
                  isCurrentPlayerTurn={isCurrentPlayerTurn}
                  isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                  movedShipIdsSet={movedShipIdsSet}
                  specialType={specialType}
                  blockedGrid={blockedGrid}
                  scoringGrid={scoringGrid}
                  onlyOnceGrid={onlyOnceGrid}
                  calculateDamage={calculateDamageForShip}
                  getShipAttributes={getShipAttributes}
                  disableTooltips={false}
                  address={userId ?? undefined}
                  currentTurn={game.turnState.currentTurn}
                  lastMoveShipId={lastMoveShipId}
                  lastMoveOldPosition={lastMoveOldPosition}
                  lastMoveNewPosition={lastMoveNewPosition}
                  lastMoveActionType={lastMoveActionType}
                  lastMoveTargetShipId={lastMoveTargetShipId}
                  lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
                  isRammingMovePreview={isRammingMovePreview}
                  retreatPrepShipId={retreatPrepShipId}
                  retreatPrepIsCreator={retreatPrepIsCreator}
                  onGridRightClickDeselect={handleGridRightClickDeselect}
                  setSelectedShipId={setSelectedShipId}
                  setPreviewPosition={setPreviewPosition}
                  setTargetShipId={setTargetShipId}
                  setSelectedWeaponType={setSelectedWeaponType}
                  setHoveredCell={setHoveredCell}
                  setDraggedShipId={setDraggedShipId}
                  setDragOverCell={setDragOverCell}
                  showConfirmWidget={showConfirmWidget}
                  confirmWidgetLabel={confirmWidgetLabel}
                  onConfirmMove={handleSubmitMove}
                  onCancelMove={handleCancelMove}
                  renderShipCard={renderShipCard}
                />
              </div>
            </div>
          </GameBoardLayout>
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
                      style={{ ...STYLE_LABEL, color: "var(--color-purple)" }}
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
                    lastMove={selectedShipId !== null ? undefined : gameEventsLastMove}
                    shipMap={gameEventsShipMap}
                    address={userId ?? undefined}
                    appendDestroyedText={appendDestroyedTextToLastMove}
                  />
                </div>
              )}
            </div>
          </div>
          {showReplay && (
            <div className="absolute bottom-0 left-0 z-[225] pointer-events-none flex items-end">
              <div className="pointer-events-auto flex items-end gap-2 pb-1 pl-1">
                <GameReplayViewerWeb2 gameId={gameId} onClose={() => setShowReplay(false)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showFleetModal && (() => {
        const buildFleetDetailCards = (
          shipIds: readonly number[],
          isCurrentPlayerShip: boolean,
          flipShip: boolean,
        ) =>
          shipIds.map((shipId) => {
            const shipPosition = game.shipPositions.find((sp) => sp.shipId === shipId);
            const attrs = getShipAttributes(shipId);
            const ship = shipMap.get(shipId);
            if (!shipPosition || !attrs || !ship) return null;
            const reactorCriticalStatus =
              attrs.reactorCriticalTimer > 0 && attrs.hullPoints === 0
                ? "critical"
                : attrs.reactorCriticalTimer > 0
                  ? "warning"
                  : "none";
            return (
              <ShipCard
                key={shipId}
                ship={toShipCardDataWeb2(ship)}
                shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
                isStarred={false}
                onToggleStar={() => {}}
                isSelected={false}
                onToggleSelection={() => {}}
                onRecycleClick={() => {}}
                showInGameProperties={true}
                inGameAttributes={attrs}
                attributesLoading={false}
                hideRecycle={true}
                hideCheckbox={true}
                isCurrentPlayerShip={isCurrentPlayerShip}
                flipShip={flipShip}
                reactorCriticalStatus={reactorCriticalStatus}
                hasMoved={movedShipIdsSet.has(shipId)}
                gameViewMode={true}
              />
            );
          });

        return (
          <GameFleetDetailsModal
            show={true}
            onClose={() => setShowFleetModal(false)}
            myFleetLabel={
              isCreatorMe
                ? readOnly ? "Creator Fleet" : "[MY FLEET]"
                : readOnly ? "Joiner Fleet" : "[MY FLEET]"
            }
            enemyFleetLabel={
              isCreatorMe
                ? readOnly ? "Joiner Fleet" : "[HOSTILE FLEET]"
                : readOnly ? "Creator Fleet" : "[HOSTILE FLEET]"
            }
            myFleetCards={buildFleetDetailCards(myIds, true, isCreatorMe)}
            enemyFleetCards={buildFleetDetailCards(enemyIds, false, !isCreatorMe)}
          />
        );
      })()}
    </div>
  );
}

/**
 * Replay viewer — fetches server-persisted turns and steps through
 * snapshots. Chrome (buttons/labels/auto-play) matches GameDisplay.tsx's
 * in-grid replay controls; the data source is genuinely different (web3:
 * client-only localStorage bigint snapshots; web2: server-authoritative
 * Prisma GameTurn history via this API route) so this stays its own
 * component rather than a shared one — see the Phase 6 plan's replay note.
 */
function GameReplayViewerWeb2({ gameId, onClose }: { gameId: number; onClose: () => void }) {
  const [step, setStep] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = React.useRef(false);
  const [data, setData] = useState<{
    initialState: Web2GameDataView | null;
    turns: Array<{ id: number; round: number; snapshot: Web2GameDataView | null }>;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import("../lib/apiFetch").then(({ apiFetch }) => {
      apiFetch<typeof data>(`/api/games/${gameId}/replay`).then((res) => {
        if (!cancelled) setData(res);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  React.useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !data) return;
    const timer = setInterval(() => {
      if (!autoPlayRef.current) {
        clearInterval(timer);
        return;
      }
      setStep((s) => {
        if (s >= data.turns.length - 1) {
          autoPlayRef.current = false;
          setAutoPlay(false);
          return s;
        }
        return s + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [autoPlay, data]);

  if (!data) {
    return (
      <div
        className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs"
        style={{
          ...STYLE_LABEL,
          borderColor: "var(--color-steel)",
          color: "var(--color-text-secondary)",
          backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
          borderRadius: 0,
        }}
      >
        Loading replay…
      </div>
    );
  }

  if (data.turns.length === 0) {
    return (
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
        <span>No moves recorded yet.</span>
        <button
          type="button"
          onClick={onClose}
          className="px-1.5 py-0.5 border border-solid"
          style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
        >
          ✕
        </button>
      </div>
    );
  }

  const currentSnapshot = step < 0 ? data.initialState : data.turns[step]?.snapshot;

  return (
    <div
      className="flex items-center gap-2 flex-wrap border-2 border-solid px-2 py-1"
      style={{
        borderColor: "var(--color-steel)",
        backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
        borderRadius: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setStep((s) => Math.max(-1, s - 1))}
        disabled={step <= -1}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        ◀ Prev
      </button>
      <span className="text-[11px] font-mono text-text-muted min-w-[8rem] text-center">
        {step < 0
          ? "Start"
          : `Move ${step + 1}/${data.turns.length} · Rd ${data.turns[step]?.round ?? ""}`}
      </span>
      <button
        type="button"
        onClick={() => setStep((s) => Math.min(data.turns.length - 1, s + 1))}
        disabled={step >= data.turns.length - 1}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        Next ▶
      </button>
      <button
        type="button"
        onClick={() => setAutoPlay((p) => !p)}
        disabled={step >= data.turns.length - 1}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{
          ...STYLE_LABEL,
          borderColor: autoPlay ? "var(--color-cyan)" : "var(--color-steel)",
          color: autoPlay ? "var(--color-cyan)" : "var(--color-text-muted)",
          backgroundColor: "transparent",
          borderRadius: 0,
        }}
      >
        {autoPlay ? "⏸ Pause" : "▶▶ Play"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        ✕ Exit
      </button>
      {currentSnapshot && (
        <div className="w-full font-mono text-xs text-text-muted">
          Score: {currentSnapshot.creatorScore} — {currentSnapshot.joinerScore} · Round {currentSnapshot.turnState.currentRound}
        </div>
      )}
    </div>
  );
}

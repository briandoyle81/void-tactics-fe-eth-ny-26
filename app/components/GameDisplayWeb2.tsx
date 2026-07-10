"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  ActionType,
  Attributes,
  getMainWeaponName,
  getSpecialName,
  GRID_DIMENSIONS,
} from "../types/types";
import type { Web2GameDataView } from "../types/web2Game";
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
import { GameScoreBox } from "./GameScoreBox";
import { GameTurnLabel } from "./GameTurnLabel";
import { GameFleetCard } from "./GameFleetCard";
import { GameFleetStatusPanel } from "./GameFleetStatusPanel";
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
      const currentPosition = aliveShipPositions.find((p) => p.shipId === payload.shipId);
      recordOptimisticMove({
        shipId: payload.shipId,
        oldRow: currentPosition?.position.row ?? payload.row,
        oldCol: currentPosition?.position.col ?? payload.col,
        newRow: finalActionType === ActionType.Retreat ? -1 : payload.row,
        newCol: finalActionType === ActionType.Retreat ? -1 : payload.col,
        actionType: finalActionType,
        targetShipId: finalTargetShipId,
        timestamp: Date.now(),
      });
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

  const lastMove = game.lastMove;
  const lastMoveShipId = lastMove?.shipId ?? null;
  const lastMoveOldPosition = lastMove ? { row: lastMove.oldRow, col: lastMove.oldCol } : null;
  const lastMoveNewPosition = lastMove ? { row: lastMove.newRow, col: lastMove.newCol } : null;
  const lastMoveActionType = lastMove?.actionType ?? null;
  const lastMoveTargetShipId = lastMove?.targetShipId ?? null;
  const lastMoveIsCurrentPlayer = lastMove ? shipMap.get(lastMove.shipId)?.owner === userId : undefined;

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

  const handleClaimTimeout = useCallback(async () => {
    try {
      await apiMutate(`/api/games/${gameId}/timeout`, "POST");
      toast.success("Claimed win by timeout!");
      refetchGame();
      refetch?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    }
  }, [gameId, refetchGame, refetch]);

  const renderShipCard = useCallback(
    (cell: GameGridTooltipHoveredCell) => {
      const ship = shipMap.get(cell.shipId);
      if (!ship) return null;
      const attrs = getShipAttributes(cell.shipId);
      return (
        <div
          className="border-2 border-solid p-3 flex flex-col gap-2"
          style={{ borderColor: "var(--color-cyan)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0">
              <ShipImageWeb2 ship={ship} className="w-full h-full" showLoadingState={false} hideRankStars />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-mono text-sm font-bold text-text-primary truncate">{ship.name || `Ship #${ship.id}`}</span>
              {attrs && (
                <span className="font-mono text-xs text-text-secondary">
                  HP {attrs.hullPoints}/{attrs.maxHullPoints}
                </span>
              )}
              <span className="font-mono text-xs text-text-muted">{getMainWeaponName(ship.equipment.mainWeapon)}</span>
              {ship.equipment.special > 0 && (
                <span className="font-mono text-xs text-text-muted">{getSpecialName(ship.equipment.special)}</span>
              )}
            </div>
          </div>
        </div>
      );
    },
    [shipMap, getShipAttributes],
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
            <div className="flex flex-col gap-1.5">
              <GameTurnLabel isMyTurn={isCurrentPlayerTurn} secondsLeft={turnSecondsLeft} />
              {!isCurrentPlayerTurn && turnSecondsLeft === 0 && !isGameOver && (
                <button
                  type="button"
                  onClick={handleClaimTimeout}
                  className="px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
                  style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                >
                  Claim Win (Timeout)
                </button>
              )}
            </div>
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
        </div>
      </div>

      {showReplay && <GameReplayViewerWeb2 gameId={gameId} onClose={() => setShowReplay(false)} />}
    </div>
  );
}

/** Minimal replay viewer — fetches server-persisted turns and steps through snapshots. */
function GameReplayViewerWeb2({ gameId, onClose }: { gameId: number; onClose: () => void }) {
  const [step, setStep] = useState(-1);
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

  if (!data) {
    return (
      <div className="p-3 border border-solid" style={{ borderColor: "var(--color-gunmetal)" }}>
        <span className="font-mono text-sm text-text-muted">Loading replay…</span>
      </div>
    );
  }

  if (data.turns.length === 0) {
    return (
      <div className="p-3 border border-solid flex items-center justify-between" style={{ borderColor: "var(--color-gunmetal)" }}>
        <span className="font-mono text-sm text-text-muted">No moves recorded yet.</span>
        <button type="button" onClick={onClose} className="text-xs uppercase text-text-secondary">Close</button>
      </div>
    );
  }

  const currentSnapshot = step < 0 ? data.initialState : data.turns[step]?.snapshot;

  return (
    <div className="p-3 border border-solid flex flex-col gap-2" style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-text-primary">
          Replay — {step < 0 ? "Initial state" : `Turn ${step + 1} / ${data.turns.length} (Round ${data.turns[step]?.round})`}
        </span>
        <button type="button" onClick={onClose} className="text-xs uppercase text-text-secondary">Close</button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(-1, s - 1))}
          disabled={step <= -1}
          className="px-3 py-1 text-xs uppercase border border-solid"
          style={{ borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)" }}
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(data.turns.length - 1, s + 1))}
          disabled={step >= data.turns.length - 1}
          className="px-3 py-1 text-xs uppercase border border-solid"
          style={{ borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)" }}
        >
          Next →
        </button>
      </div>
      {currentSnapshot && (
        <div className="font-mono text-xs text-text-muted">
          Score: {currentSnapshot.creatorScore} — {currentSnapshot.joinerScore} · Round {currentSnapshot.turnState.currentRound}
        </div>
      )}
    </div>
  );
}

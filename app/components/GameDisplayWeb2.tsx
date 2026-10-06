"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { gameStateSyncKey } from "../utils/normalizeGameDataView";
import { useDamageCalculationWeb2 } from "../hooks/useDamageCalculationWeb2";
import { useTurnChangeAlertSound, playTurnAlertSound } from "../hooks/useTurnChangeAlertSound";
import { RoundStartModal } from "./RoundStartModal";
import { useRoundStartAnnouncement } from "../hooks/useRoundStartAnnouncement";
import { GameResultModal, type MissionLossReason } from "./GameResultModal";
import { resolveNodeContent, useNodeContentWeb2 } from "../hooks/useNodeContent";
import { inferVictoryReason } from "../utils/victoryReason";
import {
  useGameViewChromeLayout,
  GAME_VIEW_SIDE_ROOT_CLASS,
} from "../hooks/useGameViewChromeLayout";
import { useLandscapeMode } from "../hooks/useLandscapeMode";
import {
  useGameplayInteraction,
  type GameplayShip,
} from "../hooks/useGameplayInteraction";
import { apiMutate } from "../lib/apiMutate";
import { apiFetch } from "../lib/apiFetch";
import { getSpecialConfigWeb2 } from "../utils/specialConfigWeb2";
import { wouldDestroy, wouldEnterSos } from "../utils/calculateDamage";
import { requireShipValue } from "../utils/requireShipValue";
import { getFactionAbilityConfigWeb2 } from "../utils/factionAbilityConfigWeb2";
import { AI_USER_ID } from "../config/aiUser";
import { useAITurnLoopWeb2 } from "../hooks/useAITurnLoopWeb2";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameGrid } from "./GameGrid";
import { GameGridTooltipHoveredCell } from "./GameGridTooltip";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { GameScoreBox } from "./GameScoreBox";
import { GameTurnTimerPanel } from "./GameTurnTimerPanel";
import {
  TurnCountdownProvider,
  TurnCountdownText,
  TurnCountdownBar,
} from "./TurnCountdown";
import { GridHoverProvider } from "./GridHover";
import { GameFleetStatusCard } from "./GameFleetStatusCard";
import { GameFleetStatusPanel } from "./GameFleetStatusPanel";
import { GameFleetDetailsModal } from "./GameFleetDetailsModal";
import { GameFleetDetailShipCard } from "./GameFleetDetailShipCard";
import { GameTooltipShipCard } from "./GameTooltipShipCard";
import { gameFleetPanelLabel } from "../utils/gameFleetPanelLabel";
import {
  GameEvents,
  type GameEventsLastMove,
  type GameEventsShipInfo,
} from "./GameEvents";
import { GameLastMovePanel } from "./GameLastMovePanel";
import { GameReplayControls, GameReplayBanner } from "./GameReplayControls";
import { toGameScoreDataWeb2, toGameWinnerResultWeb2 } from "../utils/gameDisplayDataWeb2";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { FleeConfirmButtonWeb2 } from "./FleeConfirmButtonWeb2";
import { STYLE_LABEL } from "../styles/fontStyles";
import { useMissionDialog } from "../hooks/useMissionDialog";
import { resetRoguelikeRunQueriesWeb2, useRoguelikeRunWeb2 } from "../hooks/useRoguelikeWeb2";
import { DialogLineCard, MissionDialogPanel } from "./MissionDialogPanel";
import { buildDialogSnapshot } from "../utils/missionDialog";
import type { DialogMission } from "../types/dialog";

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

function GameDisplayWeb2({
  game: initialGame,
  onBack,
  refetch,
  readOnly = false,
}: GameDisplayWeb2Props) {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();

  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);

  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const chromeLayout = useGameViewChromeLayout(gameViewRootRef, gridContainerRef);
  const chromeOnSide = chromeLayout === "side";
  const { isLandscapeMobile, requiresLandscapeMode } = useLandscapeMode();
  const useSideLayout = chromeOnSide && !isLandscapeMobile;
  const [isMobileFleeOpen, setIsMobileFleeOpen] = useState(false);
  // Mirrors GameDisplay.tsx's mobileLeftPanelTab — landscape-mobile's narrow
  // left column switches between these instead of showing everything at
  // once (there's no room). No "actions" tab: unlike web3, web2's move/
  // weapon-selection/confirm flow lives entirely inline on <GameGrid> itself
  // (see showConfirmWidget/onConfirmMove below), so there's no separate
  // action panel to switch to.
  const [mobileLeftPanelTab, setMobileLeftPanelTab] = useState<"status" | "events">("status");

  const gameId = Number(initialGame.metadata.gameId);

  const { data: gameData, refetch: refetchGame } = useGetGame(gameId);
  const latestGameDataRef = React.useRef(initialGame);
  const gameSyncKeyRef = React.useRef(gameStateSyncKey(initialGame));
  const incomingGame = gameData ?? latestGameDataRef.current;
  const incomingSyncKey = gameStateSyncKey(incomingGame);
  if (incomingSyncKey !== gameSyncKeyRef.current) {
    gameSyncKeyRef.current = incomingSyncKey;
    latestGameDataRef.current = incomingGame;
  }
  const game = latestGameDataRef.current;

  // ── Replay ──────────────────────────────────────────────────────────────
  // Server-authoritative Prisma GameTurn history (vs. GameDisplay.tsx's
  // client-only localStorage GameRecord) — the one genuinely different data
  // source, per GameReplayControls.tsx's doc comment. Step/autoplay state
  // and the replaySnapshotGame -> displayGame -> aliveShipPositions swap
  // below all mirror GameDisplay.tsx's own replayStep/replaySnapshotGame/
  // displayGame exactly, so replayed ship positions actually show on the
  // grid instead of only a text summary.
  const [replayData, setReplayData] = useState<{
    initialState: Web2GameDataView;
    turns: Array<{ id: number; round: number; snapshot: Web2GameDataView | null }>;
  } | null>(null);
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [replayAutoPlay, setReplayAutoPlay] = useState(false);
  const replayAutoPlayRef = React.useRef(false);

  React.useEffect(() => {
    if (!showReplay) {
      setReplayData(null);
      setReplayStep(null);
      setReplayAutoPlay(false);
      return;
    }
    let cancelled = false;
    apiFetch<typeof replayData>(`/api/games/${gameId}/replay`).then((res) => {
      if (cancelled) return;
      setReplayData(res);
      if (res && res.turns.length > 0) setReplayStep(-1);
    });
    return () => {
      cancelled = true;
    };
  }, [showReplay, gameId]);

  React.useEffect(() => {
    replayAutoPlayRef.current = replayAutoPlay;
  }, [replayAutoPlay]);
  React.useEffect(() => {
    if (!replayAutoPlay || !replayData) return;
    const total = replayData.turns.length;
    if (total === 0) return;
    const timer = setInterval(() => {
      if (!replayAutoPlayRef.current) {
        clearInterval(timer);
        return;
      }
      setReplayStep((s) => {
        if (s === null) return s;
        if (s >= total - 1) {
          replayAutoPlayRef.current = false;
          setReplayAutoPlay(false);
          return s;
        }
        return s + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [replayAutoPlay, replayData?.turns.length]);

  const isReplaying = replayStep !== null && !!replayData && replayData.turns.length > 0;
  const replaySnapshotGame: Web2GameDataView | null = isReplaying
    ? replayStep! < 0
      ? replayData!.initialState
      : (replayData!.turns[replayStep!]?.snapshot ?? null)
    : null;
  const displayGame = replaySnapshotGame ?? game;

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
      map.set(id, {
        id: ship.id,
        owner: ship.owner,
        equipment: ship.equipment,
        traits: { variant: Number(ship.traits.variant) },
      }),
    );
    return map;
  }, [shipMap]);

  const { blockedGrid, scoringGrid, onlyOnceGrid, impassableGrid } = useMapWeb2(
    game.mapId,
    game.gridDimensions.gridWidth,
    game.gridDimensions.gridHeight,
  );

  const shipIdsRef = React.useRef(game.shipIds);
  const shipAttributesRef = React.useRef(game.shipAttributes);
  shipIdsRef.current = game.shipIds;
  shipAttributesRef.current = game.shipAttributes;
  const getShipAttributes = useCallback(
    (shipId: number): Attributes | null => {
      const idx = shipIdsRef.current.findIndex((id) => id === shipId);
      if (idx === -1 || !shipAttributesRef.current[idx]) return null;
      return shipAttributesRef.current[idx];
    },
    [],
  );

  const movedShipIdsSet = useMemo(() => {
    const set = new Set<number>();
    game.creatorMovedShipIds.forEach((id) => set.add(id));
    game.joinerMovedShipIds.forEach((id) => set.add(id));
    return set;
  }, [game.creatorMovedShipIds, game.joinerMovedShipIds]);

  const aliveShipPositions = useMemo(
    () => displayGame.shipPositions.filter((p) => (p.status ?? 0) === 0),
    [displayGame.shipPositions],
  );

  const isCurrentPlayerTurn = !readOnly && game.turnState.currentTurn === userId;
  // Mirrors GameDisplay.tsx: once the flee request succeeds the game is a
  // loss, so the result screen shows straight away instead of the board.
  const [didFlee, setDidFlee] = useState(false);
  const serverWinnerResult = toGameWinnerResultWeb2(game.metadata.winner, userId);
  const gameWinnerResult = serverWinnerResult ?? (didFlee ? "opponent" : null);
  const isGameOver = gameWinnerResult !== null;

  // Vs-AI games are regular Game rows where the joiner is the AI sentinel
  // user — same read shape as PvP, just a different currentTurn id to watch
  // for. Mirrors GameDisplay.tsx's isVsAIGame/isAITurn. A Campaign mission or
  // Roguelike combat node is a *subset* of this (see isSinglePlayerGame/
  // isRoguelikeGame below) — a plain vs-AI skirmish lobby is neither.
  const isVsAIGame = game.metadata.joiner === AI_USER_ID;
  const isAITurn = isVsAIGame && game.turnState.currentTurn === AI_USER_ID;
  // Mirrors GameDisplay.tsx's isSinglePlayerGame/isRoguelikeGame split (there
  // driven by which orchestrator contract owns the match; here driven by
  // which Lobby field the game's originating lobby was tagged with) — only
  // used to route GameResultModal's "Return to X" CTA and mission copy.
  const isSinglePlayerGame = isVsAIGame && game.metadata.campaignNodeId != null;
  const isRoguelikeGame = isVsAIGame && game.metadata.roguelikeRunId != null;
  // Mirrors GameDisplay.tsx: PvP and roguelike can flee (a roguelike flee
  // ends the whole run); the campaign has no flee.
  const canFlee = !isVsAIGame || isRoguelikeGame;
  const fleeConsequence = isRoguelikeGame
    ? (
        <>
          This action is irreversible. The engagement will be recorded as a loss and{" "}
          <span className="text-warning-red">your run will end</span>.
        </>
      )
    : undefined;

  const aiTurnLoop = useAITurnLoopWeb2({
    gameId,
    isAITurn,
    isGameOver,
    lastMoveSignal: game.lastMove ? `${game.lastMove.shipId}-${game.lastMove.timestamp}` : "",
    refetchGame: () => refetchGame(),
  });

  // "AI is taking its turn..." as a toast rather than a sticky banner over
  // the grid — mirrors GameDisplay.tsx. Fixed id so successive updates
  // (move count ticking up) replace the same toast instead of stacking.
  const aiTurnToastId = `ai-turn-${gameId}`;
  React.useEffect(() => {
    if (!isVsAIGame) return;
    if (aiTurnLoop.error) {
      toast.error(aiTurnLoop.error, { id: aiTurnToastId });
      return;
    }
    if (aiTurnLoop.isAIThinking) {
      toast.loading(
        `AI is taking its turn${
          aiTurnLoop.moveCount > 0 ? ` (move ${aiTurnLoop.moveCount})` : ""
        }...`,
        { id: aiTurnToastId },
      );
    } else {
      toast.dismiss(aiTurnToastId);
    }
  }, [
    isVsAIGame,
    aiTurnLoop.isAIThinking,
    aiTurnLoop.moveCount,
    aiTurnLoop.error,
    aiTurnToastId,
  ]);

  // Don't leave the loading toast stuck on screen after leaving this game.
  React.useEffect(() => {
    return () => {
      toast.dismiss(aiTurnToastId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous turn state — passed into useTurnChangeAlertSound below as
  // an external ref so the optimistic-move-confirmed effect further down can
  // stamp it directly (see that effect's "still my turn" comment for why).
  const prevTurnRef = React.useRef<boolean | null>(null);

  // Play alert sound when it becomes the player's turn (turn changes from
  // opponent to player only).
  useTurnChangeAlertSound(isCurrentPlayerTurn, userId, readOnly, prevTurnRef);

  // Round-start announcement — mirrors GameDisplay.tsx's roundStartInfo:
  // fires on the very first render (game start) and again whenever
  // currentRound changes (new round). Gated on !isGameOver so the last
  // round's end doesn't pop this alongside the result screen. Also captures
  // each side's round-only score gain by diffing against a snapshot taken
  // the last time a round started — undefined on the very first showing.
  const prevRoundScoreRef = React.useRef<{ myScore: number; opponentScore: number } | undefined>(
    undefined,
  );
  const { roundStartInfo, handleCloseRoundStart } = useRoundStartAnnouncement(
    gameId,
    game.turnState.currentRound,
    isGameOver,
    () => {
      const isCreatorNow = game.metadata.creator === userId;
      const myScoreNow = isCreatorNow ? game.creatorScore : game.joinerScore;
      const opponentScoreNow = isCreatorNow ? game.joinerScore : game.creatorScore;
      const prevScores = prevRoundScoreRef.current;
      prevRoundScoreRef.current = { myScore: myScoreNow, opponentScore: opponentScoreNow };
      return {
        isMyTurnFirst: game.turnState.currentTurn === userId,
        myRoundScore: prevScores ? myScoreNow - prevScores.myScore : undefined,
        opponentRoundScore: prevScores ? opponentScoreNow - prevScores.opponentScore : undefined,
        myScore: myScoreNow,
        opponentScore: opponentScoreNow,
        maxScore: game.maxScore,
      };
    },
  );

  const [isGameResultDismissed, setIsGameResultDismissed] = useState(false);

  // In-mission dialog — mirrors GameDisplay.tsx. Campaign missions come from
  // the game's lobby tag; roguelike combat uses the run's current node, read
  // only for roguelike games.
  const { run: roguelikeRunForDialog } = useRoguelikeRunWeb2(isRoguelikeGame);
  const roguelikeDialogNodeId =
    isRoguelikeGame && roguelikeRunForDialog ? roguelikeRunForDialog.currentNodeId : 0;
  const campaignDialogNodeId = isSinglePlayerGame ? (game.metadata.campaignNodeId ?? 0) : 0;
  const dialogMission: DialogMission | null = useMemo(() => {
    if (campaignDialogNodeId > 0) return { kind: "campaign", nodeId: campaignDialogNodeId };
    if (roguelikeDialogNodeId > 0) return { kind: "roguelike", nodeId: roguelikeDialogNodeId };
    return null;
  }, [campaignDialogNodeId, roguelikeDialogNodeId]);
  const dialogSnapshot = useMemo(() => {
    const isCreatorNow = game.metadata.creator === userId;
    return buildDialogSnapshot({
      round: game.turnState.currentRound,
      myScore: isCreatorNow ? game.creatorScore : game.joinerScore,
      enemyScore: isCreatorNow ? game.joinerScore : game.creatorScore,
      ships: game.shipPositions.map((p) => {
        const index = game.shipIds?.findIndex((id) => id === p.shipId) ?? -1;
        return {
          isMine: p.isCreator === isCreatorNow,
          status: p.status,
          hullPoints: index >= 0 ? (game.shipAttributes?.[index]?.hullPoints ?? null) : null,
        };
      }),
      // Victory/defeat triggers; a draw is neither.
      outcome:
        gameWinnerResult === "me" ? "victory" : gameWinnerResult === "opponent" ? "defeat" : null,
    });
  }, [
    game.metadata.creator,
    userId,
    game.turnState.currentRound,
    game.creatorScore,
    game.joinerScore,
    game.shipPositions,
    game.shipIds,
    game.shipAttributes,
    gameWinnerResult,
  ]);
  const missionDialog = useMissionDialog({
    gameId: String(gameId),
    mission: dialogMission,
    snapshot: dialogSnapshot,
    // Stays on after the game ends so victory/defeat lines can play.
    enabled: !readOnly && !isReplaying,
    paused: roundStartInfo != null && !isGameOver,
  });
  // On the board while the game runs (and after the result screen is
  // dismissed); while the result screen is up, lines play inside it instead
  // (missionDebriefNode) since it covers the board.
  const missionDialogOverlay =
    (!isGameOver || isGameResultDismissed) &&
    (missionDialog.current || missionDialog.log.length > 0) ? (
      <MissionDialogPanel
        line={missionDialog.current}
        log={missionDialog.log}
        position={missionDialog.position}
        total={missionDialog.total}
        onAdvance={missionDialog.advance}
        onDismiss={missionDialog.dismissAll}
        compact={isLandscapeMobile}
      />
    ) : null;
  const missionDebriefNode = missionDialog.current ? (
    <DialogLineCard
      line={missionDialog.current}
      position={missionDialog.position}
      total={missionDialog.total}
      onAdvance={missionDialog.advance}
      onDismiss={missionDialog.dismissAll}
      compact={false}
    />
  ) : null;

  // Pre-resolved special range/data for the selected/dragged ship's equipped
  // special — a plain object lookup for web2 (no real contract-read hook
  // needed, unlike web3's useSpecialRangeAt/useSpecialStrengthAt), but still
  // computed before the shared hook call per its params contract. A
  // special's slot number is per-faction (see specialConfigWeb2.ts), so the
  // ship's own variant must come along with its equipped special.
  const selectedShip = selectedShipId != null ? shipMap.get(selectedShipId) : undefined;
  const selectedShipVariant = selectedShip
    ? requireShipValue("variant", selectedShip.traits.variant)
    : undefined;
  const selectedShipSpecialType = selectedShip
    ? Number(selectedShip.equipment.special)
    : 0;
  const selectedShipSpecialConfig =
    selectedShipVariant != null
      ? getSpecialConfigWeb2(selectedShipVariant, selectedShipSpecialType)
      : undefined;
  const selectedShipSpecialRange = selectedShipSpecialConfig?.range;
  const selectedShipSpecialData = useMemo(
    () =>
      selectedShipSpecialConfig != null
        ? { strength: selectedShipSpecialConfig.strength }
        : null,
    [selectedShipSpecialConfig],
  );
  const draggedShip = draggedShipId != null ? shipMap.get(draggedShipId) : undefined;
  const draggedShipVariant = draggedShip
    ? requireShipValue("variant", draggedShip.traits.variant)
    : undefined;
  const draggedShipSpecialType = draggedShip
    ? Number(draggedShip.equipment.special)
    : 0;
  const draggedShipSpecialRange =
    draggedShipVariant != null
      ? getSpecialConfigWeb2(draggedShipVariant, draggedShipSpecialType)?.range
      : undefined;

  // Every ship's innate faction ability (Ram/variant 1, Repair/variant 2) —
  // web2's own engine, so (unlike web3, which is chain-gated) this is
  // always supported.
  const selectedShipFactionAbility =
    selectedShipVariant != null
      ? getFactionAbilityConfigWeb2(selectedShipVariant)
      : undefined;

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
    impassableGrid,
    lastMove: game.lastMove ?? null,
    selectedShipId,
    setSelectedShipId,
    draggedShipId,
    setDraggedShipId,
    selectedShipSpecialRange,
    selectedShipSpecialData,
    draggedShipSpecialRange,
    selectedShipFactionAbilityRange: selectedShipFactionAbility?.range,
    selectedShipFactionAbilityIsHeal: selectedShipFactionAbility?.isHeal === true,
    isFactionAbilitySupported: true,
  });

  const {
    previewPosition,
    targetShipId,
    selectedWeaponType,
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
    isRammingMovePreview,
    isShipOwnedByCurrentPlayer,
    computedActionType,
    confirmWidgetLabel,
    showConfirmWidget,
    retreatPrepShipId,
    retreatPrepIsCreator,
    specialType,
    specialRange,
    specialData,
    handleCancelMove,
    handleGridRightClickDeselect,
    handleRetreatClick,
    buildActionPayload,
    recordOptimisticMove,
    recordOptimisticSos,
    clearOptimisticSos,
    optimisticSosShipIds,
    recordOptimisticDestroy,
    clearOptimisticDestroy,
    optimisticDestroyShipIds,
    setPreviewPosition,
    setTargetShipId,
    setSelectedWeaponType,
    setDragOverCell,
    getHoverPreview,
  } = interaction;

  // Escape deselects/cancels the current move — mirrors GameDisplay.tsx's
  // window keydown handler (mouse/tap deselect via handleGridRightClickDeselect
  // is shared, but the keyboard path itself needs its own listener per file).
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelMove();
        setDraggedShipId(null);
        setDragOverCell(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancelMove, setDragOverCell]);

  const calculateDamageForShip = useDamageCalculationWeb2({
    selectedShipId,
    getShipAttributes,
    selectedWeaponType,
    specialData,
    specialType,
    shipVariant: selectedShipVariant,
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
    if (
      payload.targetShipId > 0 &&
      (payload.actionType === ActionType.Shoot ||
        payload.actionType === ActionType.Special)
    ) {
      const dmg = calculateDamageForShip(
        payload.targetShipId,
        payload.actionType === ActionType.Special ? "special" : "weapon",
        payload.specialType === 3 ? true : undefined,
      );
      const targetAttrs = getShipAttributes(payload.targetShipId);
      if (wouldDestroy(dmg, targetAttrs)) {
        recordOptimisticDestroy([payload.targetShipId]);
      } else if (wouldEnterSos(dmg, targetAttrs)) {
        recordOptimisticSos([payload.targetShipId]);
      }
    }
    setIsSubmitting(true);
    try {
      // buildActionPayload already returns ActionType.FactionAbility (with
      // the real target) for a ram/repair move — web2's engine implements
      // that action directly (see gameEngineWeb2.ts), no override needed
      // (isFactionAbilitySupported is always true for web2, so
      // isRammingMovePreview's legacy auto-ram path never applies here).
      const finalActionType = payload.actionType;
      const finalTargetShipId = payload.targetShipId;
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
      // Ram relocates the acting ship onto the victim's (now-vacated) tile
      // as an effect — its final position is NOT the submitted
      // row/col (only a legal staging tile within range of the target; see
      // RamResolver.sol / gameEngineWeb2.ts's FactionAbility case). Repair
      // never relocates anyone.
      const isRamRelocate =
        finalActionType === ActionType.FactionAbility &&
        selectedShipFactionAbility?.isHeal === false;
      const ramTargetPosition = isRamRelocate
        ? aliveShipPositions.find((p) => p.shipId === finalTargetShipId)?.position
        : undefined;
      const optimisticMove: Web2LastMove = {
        shipId: payload.shipId,
        oldRow: currentPosition?.position.row ?? payload.row,
        oldCol: currentPosition?.position.col ?? payload.col,
        newRow: finalActionType === ActionType.Retreat ? -1 : (ramTargetPosition?.row ?? payload.row),
        newCol: finalActionType === ActionType.Retreat ? -1 : (ramTargetPosition?.col ?? payload.col),
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
      // Clear the selection first so the confirm widget vanishes cleanly
      // instead of briefly re-rendering in its normal "ready to submit"
      // state before disappearing — matches GameDisplay.tsx's ordering.
      handleCancelMove();
      clearOptimisticSos();
      clearOptimisticDestroy();
      toast.error(e instanceof Error ? e.message : "Move failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    buildActionPayload,
    aliveShipPositions,
    selectedShipFactionAbility,
    gameId,
    recordOptimisticMove,
    recordOptimisticSos,
    clearOptimisticSos,
    recordOptimisticDestroy,
    clearOptimisticDestroy,
    calculateDamageForShip,
    getShipAttributes,
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
    if (matches) {
      setOptimisticLastMoveWeb2(null);
      // Still my turn after my own move was confirmed (a same-turn
      // multi-move sequence) — web2's isCurrentPlayerTurn has no artificial
      // "awaiting sync" dip like web3's isMyTurnEffective, so it never
      // transitions false->true for this case and useTurnChangeAlertSound's
      // own detection can't catch it; play the cue directly. Stamping the
      // ref marks this as handled so the hook doesn't also treat a later,
      // unrelated transition as a double cue.
      if (!readOnly && game.turnState.currentTurn === userId) {
        playTurnAlertSound();
        prevTurnRef.current = true;
      }
    }
  }, [optimisticLastMoveWeb2, game.lastMove, game.turnState.currentTurn, userId, readOnly]);

  const lastMove = isReplaying ? (replaySnapshotGame?.lastMove ?? undefined) : (optimisticLastMoveWeb2 ?? game.lastMove);
  const lastMoveShipId = lastMove?.shipId ?? null;
  const lastMoveOldPosition = useMemo(
    () => (lastMove ? { row: lastMove.oldRow, col: lastMove.oldCol } : null),
    [lastMove],
  );
  const lastMoveNewPosition = useMemo(
    () => (lastMove ? { row: lastMove.newRow, col: lastMove.newCol } : null),
    [lastMove],
  );
  const lastMoveResolvedTo = useMemo(
    () =>
      lastMove && lastMove.newRow >= 0 && lastMove.newCol >= 0
        ? { shipId: lastMove.shipId, row: lastMove.newRow, col: lastMove.newCol }
        : null,
    [lastMove],
  );
  const lastMoveActionType = lastMove?.actionType ?? null;
  const lastMoveTargetShipId = lastMove?.targetShipId ?? null;
  const lastMoveIsCurrentPlayer = lastMove ? shipMap.get(lastMove.shipId)?.owner === userId : undefined;

  const gameEventsLastMove = useMemo<GameEventsLastMove | undefined>(
    () =>
      lastMove
        ? {
            shipId: String(lastMove.shipId),
            targetShipId: String(lastMove.targetShipId),
            oldRow: lastMove.oldRow,
            oldCol: lastMove.oldCol,
            newRow: lastMove.newRow,
            newCol: lastMove.newCol,
            actionType: lastMove.actionType,
          }
        : undefined,
    [lastMove],
  );

  const appendDestroyedTextToLastMove = useMemo(() => {
    if (!lastMove) return false;
    if (lastMove.targetShipId === 0) return false;
    const isTargetingAction =
      lastMove.actionType === ActionType.Shoot || lastMove.actionType === ActionType.Special;
    if (!isTargetingAction) return false;
    return !game.shipPositions.some((sp) => sp.shipId === lastMove.targetShipId);
  }, [lastMove, game.shipPositions]);

  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] = useState(false);
  const expandLastMovePanel = useCallback(
    () => setIsLastMovePanelMinimized(false),
    [],
  );
  const minimizeLastMovePanel = useCallback(
    () => setIsLastMovePanelMinimized(true),
    [],
  );

  const gameScoreData = useMemo(
    () => toGameScoreDataWeb2(game, userId),
    [
      game.creatorScore,
      game.joinerScore,
      game.maxScore,
      game.metadata.creator,
      userId,
    ],
  );
  const { myScore, opponentScore, maxScore } = gameScoreData;

  // End-of-game result screen (GameResultModal) — mirrors GameDisplay.tsx's
  // own isGameResultDismissed/missionLossReason/nodeId routing (isSinglePlayerGame/
  // isRoguelikeGame above). Also covers web2's tie outcome (WEB2_TIE_SENTINEL),
  // which web3's Game.sol can't produce at all.
  const { contentById: missionContentById, isLoading: missionContentLoading } =
    useNodeContentWeb2("CAMPAIGN");
  const missionLossReason: MissionLossReason | undefined =
    isVsAIGame && gameWinnerResult === "opponent"
      ? didFlee
        ? "fled"
        : opponentScore >= maxScore
        ? "enemyScore"
        : "fleetDestroyed"
      : undefined;
  const iAmCreatorForResult = game.metadata.creator === userId;
  const victoryReason =
    gameWinnerResult === "me"
      ? inferVictoryReason({
          myScore,
          maxScore,
          enemyShips: game.shipPositions
            .filter((p) => p.isCreator !== iAmCreatorForResult)
            .map((p) => ({
              status: p.status,
              hullPoints: getShipAttributes(p.shipId)?.hullPoints ?? null,
            })),
        })
      : undefined;
  const nodeIdForGame = game.metadata.campaignNodeId;
  const missionNodeContent =
    nodeIdForGame != null && nodeIdForGame > 0
      ? resolveNodeContent(missionContentById, nodeIdForGame, missionContentLoading)
      : undefined;
  const { contentById: roguelikeContentById, isLoading: roguelikeContentLoading } =
    useNodeContentWeb2("ROGUELIKE", roguelikeDialogNodeId > 0);
  // Campaign and roguelike missions show their title instead of the game
  // number — mirrors GameDisplay.tsx's gameTitleLabel.
  const gameTitleLabel = missionNodeContent
    ? missionNodeContent.title
    : roguelikeDialogNodeId > 0
      ? resolveNodeContent(roguelikeContentById, roguelikeDialogNodeId, roguelikeContentLoading).title
      : `Game ${game.metadata.gameId}`;
  const gameResultModalNode = isGameOver && !isGameResultDismissed && (
    <GameResultModal
      isVictory={gameWinnerResult === "me"}
      isTie={gameWinnerResult === "tie"}
      myScore={myScore}
      opponentScore={opponentScore}
      maxScore={maxScore}
      missionLossReason={missionLossReason}
      victoryReason={victoryReason}
      nodeId={
        isSinglePlayerGame && nodeIdForGame != null && nodeIdForGame > 0
          ? BigInt(nodeIdForGame)
          : undefined
      }
      nodeContent={missionNodeContent}
      comms={missionDebriefNode}
      onClose={() => setIsGameResultDismissed(true)}
      primaryActionLabel={
        isRoguelikeGame
          ? gameWinnerResult === "me"
            ? "Return to Run"
            : "Quit"
          : isSinglePlayerGame
            ? "Return to Campaign"
            : "Back to Games"
      }
      onPrimaryAction={() => {
        if (isRoguelikeGame) {
          // Any loss already ended the run; drop the cached run so the
          // Mission tab opens on the start-a-run screen.
          if (gameWinnerResult !== "me") resetRoguelikeRunQueriesWeb2(queryClient);
          else void queryClient.invalidateQueries({ queryKey: ["ships", "owned", "web2"] });
          window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-roguelike"));
          document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-roguelike"));
        } else if (isSinglePlayerGame) {
          window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-campaign"));
          document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-campaign"));
        }
        onBack();
      }}
    />
  );

  const roundStartModalNode = roundStartInfo && !isGameOver && (
    <RoundStartModal
      key={roundStartInfo.round.toString()}
      round={roundStartInfo.round}
      isMyTurnFirst={roundStartInfo.isMyTurnFirst}
      myRoundScore={roundStartInfo.myRoundScore}
      opponentRoundScore={roundStartInfo.opponentRoundScore}
      myScore={roundStartInfo.myScore}
      opponentScore={roundStartInfo.opponentScore}
      maxScore={roundStartInfo.maxScore}
      onClose={handleCloseRoundStart}
    />
  );

  const turnTimeSec = game.turnState.turnTime;
  const turnStartTimeMs = game.turnState.turnStartTime;

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
        <GameTooltipShipCard
          ship={toShipCardDataWeb2(ship)}
          shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
          attributes={attrs || undefined}
          isCurrentPlayerShip={isShipOwnedByCurrentPlayer(cell.shipId)}
          flipShip={cell.isCreator}
          hasMoved={movedShipIdsSet.has(cell.shipId)}
          gridPosition={{ row: cell.row, col: cell.col }}
        />
      );
    },
    [shipMap, getShipAttributes, isShipOwnedByCurrentPlayer, movedShipIdsSet],
  );

  const renderFleetCard = (shipId: number, teamColor: string, flip: boolean) => {
    const ship = shipMap.get(shipId);
    const attrs = getShipAttributes(shipId);
    const shipPos = game.shipPositions.find((sp) => sp.shipId === shipId);
    return (
      <GameFleetStatusCard
        key={shipId}
        shipId={shipId}
        shipName={ship?.name ?? `#${shipId}`}
        attributes={attrs}
        hasMoved={movedShipIdsSet.has(shipId)}
        teamColor={teamColor}
        flip={flip}
        isSelected={selectedShipId === shipId}
        optimisticSos={optimisticSosShipIds.has(shipId)}
        shipImage={ship && <ShipImageWeb2 ship={ship} className="w-full h-full" showLoadingState={false} hideRankStars />}
        onClick={() => setSelectedShipId(shipId)}
        fleetHoverAnchor={
          shipPos
            ? {
                row: shipPos.position.row,
                col: shipPos.position.col,
                isCreator: shipPos.isCreator,
              }
            : null
        }
      />
    );
  };

  // Shared between the desktop/portrait render and the landscape-mobile
  // early return below — same grid, same props, only the surrounding layout
  // (side rail vs. narrow tabbed column) differs.
  const gameGridNode = (
    <GameGrid
      grid={displayGrid}
      allShipPositions={game.shipPositions}
      shipMap={shipMap}
      selectedShipId={selectedShipId}
      previewPosition={previewPosition}
      targetShipId={targetShipId}
      selectedWeaponType={selectedWeaponType}
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
      getHoverPreview={getHoverPreview}
      isCurrentPlayerTurn={isCurrentPlayerTurn}
      isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
      movedShipIdsSet={movedShipIdsSet}
      specialType={specialType}
      specialRange={specialRange}
      blockedGrid={blockedGrid}
      impassableGrid={impassableGrid}
      scoringGrid={scoringGrid}
      onlyOnceGrid={onlyOnceGrid}
      calculateDamage={calculateDamageForShip}
      getShipAttributes={getShipAttributes}
      optimisticSosShipIds={optimisticSosShipIds}
      optimisticDestroyShipIds={optimisticDestroyShipIds}
      isSubmitting={isSubmitting}
      disableTooltips={false}
      address={userId ?? undefined}
      currentTurn={game.turnState.currentTurn}
      lastMoveShipId={lastMoveShipId}
      lastMoveOldPosition={lastMoveOldPosition}
      lastMoveNewPosition={lastMoveNewPosition}
      lastMoveResolvedTo={lastMoveResolvedTo}
      lastMoveActionType={lastMoveActionType}
      lastMoveTargetShipId={lastMoveTargetShipId}
      lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
      isRammingMovePreview={isRammingMovePreview}
      isFactionAbilitySupported
      factionAbilityRange={selectedShipFactionAbility?.range}
      factionAbilityIsHeal={selectedShipFactionAbility?.isHeal === true}
      factionAbilityStrength={selectedShipFactionAbility?.strength}
      retreatPrepShipId={retreatPrepShipId}
      retreatPrepIsCreator={retreatPrepIsCreator}
      onGridRightClickDeselect={handleGridRightClickDeselect}
      setSelectedShipId={setSelectedShipId}
      setPreviewPosition={setPreviewPosition}
      setTargetShipId={setTargetShipId}
      setSelectedWeaponType={setSelectedWeaponType}
      setDraggedShipId={setDraggedShipId}
      setDragOverCell={setDragOverCell}
      showConfirmWidget={showConfirmWidget}
      confirmWidgetLabel={confirmWidgetLabel}
      onConfirmMove={handleSubmitMove}
      onCancelMove={handleCancelMove}
      renderShipCard={renderShipCard}
    />
  );

  // Battle-menu flee button overlaid on the grid corner — shown on its own
  // in landscape-mobile (no side header rail there to hold the flee switch)
  // and only when stacked/portrait in the main render (desktop side layout
  // already has FleeSafetySwitch in the header rail instead).
  const fleeMenuNode = !readOnly && !gameWinnerResult && canFlee && (
    <div className="pointer-events-none absolute right-1 top-1 z-[230]">
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
        {isMobileFleeOpen && (
          <div
            className="absolute right-0 top-[calc(100%+6px)] w-[13.25rem] border border-solid p-1"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-near-black) 98%, transparent)",
              borderColor: "var(--color-warning-red)",
              borderRadius: 0,
            }}
          >
            <FleeSafetySwitch
              consequence={fleeConsequence}
              onFlee={async () => {
                setDidFlee(true);
                setIsMobileFleeOpen(false);
                // Background sync only — the result screen is already showing.
                void Promise.resolve(refetchGame());
                void Promise.resolve(refetch?.());
              }}
              renderConfirmButton={(onSuccess) => (
                <FleeConfirmButtonWeb2 gameId={gameId} onSuccess={onSuccess} />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );

  const isCreatorMe = game.metadata.creator === userId;
  const myIds = isCreatorMe ? game.creatorActiveShipIds : game.joinerActiveShipIds;
  const enemyIds = isCreatorMe ? game.joinerActiveShipIds : game.creatorActiveShipIds;

  const fleetDetailsModalNode = showFleetModal && (() => {
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
        return (
          <GameFleetDetailShipCard
            key={shipId}
            shipId={String(shipId)}
            ship={toShipCardDataWeb2(ship)}
            shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
            attributes={attrs}
            isCurrentPlayerShip={isCurrentPlayerShip}
            flipShip={flipShip}
            hasMoved={movedShipIdsSet.has(shipId)}
          />
        );
      });

    return (
      <GameFleetDetailsModal
        show={true}
        onClose={() => setShowFleetModal(false)}
        myFleetLabel={gameFleetPanelLabel({
          isMine: true,
          sideIsCreator: isCreatorMe,
          readOnly,
        })}
        enemyFleetLabel={gameFleetPanelLabel({
          isMine: false,
          sideIsCreator: !isCreatorMe,
          readOnly,
        })}
        myFleetCards={buildFleetDetailCards(myIds, true, isCreatorMe)}
        enemyFleetCards={buildFleetDetailCards(enemyIds, false, !isCreatorMe)}
      />
    );
  })();

  // Mirrors GameDisplay.tsx's rotate-to-landscape gate — this battle view
  // needs landscape space on a phone-sized viewport to be usable at all.
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
              <div
                style={{
                  position: "absolute",
                  top: "4px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0.6rem",
                  height: "2px",
                  backgroundColor: "var(--color-cyan)",
                  borderRadius: "1px",
                }}
              />
            </div>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-cyan sm:text-xl" style={STYLE_LABEL}>
            Rotate to Landscape
          </h2>
          <p className="mt-2 text-sm text-text-secondary sm:mt-3">
            This battle view requires landscape mode on mobile. Rotate your device to continue.
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

  const mobileTurnLabel = gameWinnerResult
    ? gameWinnerResult === "tie"
      ? "Tie"
      : gameWinnerResult === "me"
        ? "Victory"
        : "Defeat"
    : isCurrentPlayerTurn
      ? "Your turn"
      : "Opponent turn";

  // Mirrors GameDisplay.tsx's own isLandscapeMobile early return: a narrow
  // scrollable left column (compact header + status/events tabs + Fleets
  // button) next to the grid, rather than the sticky-full-header layout the
  // unified render below uses for wider/portrait viewports. Landscape phones
  // don't have room for both a tall header rail and the grid at once.
  if (isLandscapeMobile) {
    return (
      <TurnCountdownProvider turnTimeSec={turnTimeSec} turnStartTimeMs={turnStartTimeMs}>
      <GridHoverProvider>
      <div className="mx-auto h-full w-full overflow-hidden" style={{ height: "100dvh" }}>
        <div className="flex h-full min-h-0 items-stretch gap-2 overflow-hidden">
          <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center">
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
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-gunmetal)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
                  >
                    Back
                  </button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className="truncate text-[10px] uppercase tracking-wider text-text-secondary">
                      {gameTitleLabel} | Round {game.turnState.currentRound}
                    </p>
                    <p
                      className="truncate text-[10px] uppercase tracking-wider"
                      style={{ color: isCurrentPlayerTurn ? "var(--color-cyan)" : "var(--color-warning-red)" }}
                    >
                      {mobileTurnLabel} | <TurnCountdownText />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchGame()}
                    className="shrink-0 px-1.5 py-0.5 border border-solid text-[10px] uppercase font-semibold tracking-wider"
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-cyan)", color: "var(--color-cyan)", backgroundColor: "var(--color-near-black)", borderRadius: 0 }}
                  >
                    Sync
                  </button>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden" style={{ backgroundColor: "var(--color-gunmetal)" }}>
                  <TurnCountdownBar />
                </div>
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1">
                {(["status", "events"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMobileLeftPanelTab(tab)}
                    className="px-1 py-2 text-xs min-h-[2.75rem] uppercase tracking-wider border border-solid"
                    style={{
                      ...STYLE_LABEL,
                      borderColor: mobileLeftPanelTab === tab ? "var(--color-cyan)" : "var(--color-gunmetal)",
                      color: mobileLeftPanelTab === tab ? "var(--color-cyan)" : "var(--color-text-secondary)",
                      backgroundColor: mobileLeftPanelTab === tab ? "color-mix(in srgb, var(--color-cyan) 12%, transparent)" : "var(--color-steel)",
                      borderRadius: 0,
                    }}
                  >
                    {tab}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowFleetModal(true)}
                  className="px-1 py-2 text-xs min-h-[2.75rem] uppercase tracking-wider border border-solid"
                  style={{ ...STYLE_LABEL, borderColor: "var(--color-phosphor-green)", color: "var(--color-phosphor-green)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
                >
                  Fleets
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
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
                    {selectedShipId != null && isShipOwnedByCurrentPlayer(selectedShipId) && computedActionType !== ActionType.Retreat && (
                      <button
                        type="button"
                        onClick={handleRetreatClick}
                        className="w-full px-3 py-1.5 text-xs uppercase font-bold tracking-wider border-2 border-solid"
                        style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                      >
                        Retreat
                      </button>
                    )}
                    {computedActionType === ActionType.Retreat && selectedShipId != null && (
                      <div className="flex gap-2">
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
                  </div>
                ) : null}
                {mobileLeftPanelTab === "events" ? (
                  <GameEvents
                    lastMove={selectedShipId !== null ? undefined : gameEventsLastMove}
                    shipMap={gameEventsShipMap}
                    address={userId ?? undefined}
                    appendDestroyedText={appendDestroyedTextToLastMove}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="relative h-full min-h-0 shrink-0 overflow-hidden"
            style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`, paddingRight: "2px", paddingTop: "2px" }}
          >
            <div className="h-full max-h-full" style={{ height: "calc(100% - 2px)", width: "auto", aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}>
              <GameBoardLayout isCurrentPlayerTurn={isCurrentPlayerTurn} containerRef={gridContainerRef} onBoardChromeMouseDown={handleCancelMove} overlay={missionDialogOverlay}>
                <div className="relative h-full [contain:layout]" style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}>
                  <div className="absolute inset-0 min-h-0 overflow-hidden">
                    {gameGridNode}
                  </div>
                  {fleeMenuNode}
                </div>
              </GameBoardLayout>
            </div>
          </div>
        </div>

        {fleetDetailsModalNode}
        {roundStartModalNode}
        {gameResultModalNode}
      </div>
      </GridHoverProvider>
      </TurnCountdownProvider>
    );
  }

  return (
    <TurnCountdownProvider turnTimeSec={turnTimeSec} turnStartTimeMs={turnStartTimeMs}>
    <GridHoverProvider>
    <div
      ref={gameViewRootRef}
      className={`flex flex-col gap-6 ${useSideLayout ? GAME_VIEW_SIDE_ROOT_CLASS : "mx-auto w-full"}`}
      style={useSideLayout ? { marginLeft: "8px" } : undefined}
    >
      <div
        className={
          useSideLayout
            ? "flex min-h-0 min-w-0 flex-row items-stretch gap-4 pt-3"
            : "flex flex-col gap-4 pt-3"
        }
      >
        {/* Header rail (side layout) / header block (stacked mobile layout) — landscape-mobile never reaches here, see the early return above. */}
        <div
          className={
            useSideLayout
              ? "flex min-h-0 self-stretch w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-hidden pl-2 pr-1"
              : "flex flex-col gap-3 px-2"
          }
        >
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
              <span>{gameTitleLabel}</span>
              <span className="text-text-muted text-base">Round {game.turnState.currentRound}</span>
            </h1>
            {!isGameOver && (() => {
              const isParticipant = !readOnly && (isCreatorMe || game.metadata.joiner === userId);
              // No timeout-claim vs AI: the AI turn loop is still actively
              // driving moves server-side even if it runs long, and racing a
              // forfeit-claim against an in-flight ai-turn call isn't worth
              // the complexity (mirrors GameDisplay.tsx's isVsAIGame
              // exclusion).
              // Mirrors GameDisplay.tsx: vs-AI turns are unlimited, so don't
              // show the "opponent can claim victory" warning for them.
              const timeoutEnabled = isParticipant && !isVsAIGame;
              return (
                <GameTurnTimerPanel
                  timeoutEnabled={timeoutEnabled}
                  isMyTurn={isCurrentPlayerTurn}
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
              !readOnly &&
              canFlee && (
                <FleeSafetySwitch
                  consequence={fleeConsequence}
                  onFlee={async () => {
                    setDidFlee(true);
                    // Background sync only — the result screen is already showing.
                    void Promise.resolve(refetchGame());
                    void Promise.resolve(refetch?.());
                  }}
                  renderConfirmButton={(onSuccess) => (
                    <FleeConfirmButtonWeb2 gameId={gameId} onSuccess={onSuccess} />
                  )}
                />
              )
            )}
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

          {/* Fuller "Last Move" description — GameDisplay.tsx only surfaces
              this on mobile (a desktop-side-rail user has GameLastMovePanel's
              compact overlay instead); mirrored here the same way, gated on
              the stacked mobile layout. */}
          {!useSideLayout && (
            <GameEvents
              lastMove={selectedShipId !== null ? undefined : gameEventsLastMove}
              shipMap={gameEventsShipMap}
              address={userId ?? undefined}
              appendDestroyedText={appendDestroyedTextToLastMove}
            />
          )}
        </div>

        {/* Game grid */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <GameBoardLayout isCurrentPlayerTurn={isCurrentPlayerTurn} containerRef={gridContainerRef} onBoardChromeMouseDown={handleCancelMove} overlay={missionDialogOverlay}>
            <div className="relative w-full [contain:layout]" style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}>
              <div className="absolute inset-0 min-h-0 overflow-hidden">
                {gameGridNode}
              </div>
              {!useSideLayout && fleeMenuNode}
            </div>
          </GameBoardLayout>
          <GameLastMovePanel
            isMinimized={isLastMovePanelMinimized}
            onExpand={expandLastMovePanel}
            onMinimize={minimizeLastMovePanel}
            lastMove={selectedShipId !== null ? undefined : gameEventsLastMove}
            shipMap={gameEventsShipMap}
            address={userId ?? undefined}
            appendDestroyedText={appendDestroyedTextToLastMove}
          />
          {isReplaying && (
            <GameReplayBanner
              label={replayStep! < 0 ? "Replay · Start" : `Replay · Move ${replayStep! + 1}/${replayData!.turns.length}`}
            />
          )}
          {/* Replay controls (top-left, below the replay banner while it's
              showing). Same placement as GameDisplay.tsx; the bottom-left
              corner belongs to the comms panel. */}
          <div
            className={`absolute left-0 z-[225] pointer-events-none flex items-start ${
              showReplay ? "top-7" : "top-0"
            }`}
          >
            <div className="pointer-events-auto flex items-start gap-2 pt-1 pl-1">
              {!showReplay && (
                <button
                  type="button"
                  onClick={() => setShowReplay(true)}
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
              {showReplay && !replayData && (
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
              )}
              {showReplay && replayData && replayData.turns.length === 0 && (
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
                    onClick={() => setShowReplay(false)}
                    className="px-1.5 py-0.5 border border-solid"
                    style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
                  >
                    ✕
                  </button>
                </div>
              )}
              {showReplay && replayData && replayData.turns.length > 0 && (
                <GameReplayControls
                  stepLabel={
                    replayStep! < 0
                      ? "Start"
                      : `Move ${replayStep! + 1}/${replayData.turns.length} · Rd ${replayData.turns[replayStep!]?.round ?? ""}`
                  }
                  onPrev={() => setReplayStep((s) => (s === null ? null : Math.max(-1, s - 1)))}
                  canPrev={(replayStep ?? -1) > -1}
                  onNext={() => setReplayStep((s) => (s === null ? null : Math.min(replayData.turns.length - 1, s + 1)))}
                  canNext={(replayStep ?? -1) < replayData.turns.length - 1}
                  isPlaying={replayAutoPlay}
                  onTogglePlay={() => setReplayAutoPlay((p) => !p)}
                  onExit={() => setShowReplay(false)}
                  extraInfo={
                    replaySnapshotGame && (
                      <div className="w-full font-mono text-xs text-text-muted">
                        Score: {replaySnapshotGame.creatorScore} - {replaySnapshotGame.joinerScore} · Round{" "}
                        {replaySnapshotGame.turnState.currentRound}
                      </div>
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {fleetDetailsModalNode}
      {roundStartModalNode}
      {gameResultModalNode}
    </div>
    </GridHoverProvider>
    </TurnCountdownProvider>
  );
}

export default React.memo(GameDisplayWeb2);

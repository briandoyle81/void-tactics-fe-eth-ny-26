"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import defaultMap from "../../public/default_map.json";
import {
  TutorialContextValue,
  TutorialShipId,
  TutorialAction,
} from "../types/onboarding";
import {
  ALL_TUTORIAL_SHIPS,
  TUTORIAL_PLAYER_ADDRESS,
} from "../data/tutorialShips";
import {
  buildMapGridsFromDefaultMap,
  type DefaultMapShape,
} from "../utils/mapGridUtils";
import { toast } from "react-hot-toast";
import {
  ActionType,
  ShipPosition,
  Attributes,
  Ship,
  LastMove,
  getMainWeaponName,
  getSpecialName,
  GRID_DIMENSIONS,
} from "../types/types";
import { GameGrid } from "./GameGrid";
import { TutorialGridTaskPanel } from "./TutorialGridTaskPanel";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameEvents } from "./GameEvents";
import { getScriptedStateForTutorialStepId } from "../data/tutorialScriptedStates";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import ShipCard from "./ShipCard";
import { ShipImage } from "./ShipImage";
import {
  GAME_VIEW_SIDE_ROOT_CLASS,
  useGameViewChromeLayout,
} from "../hooks/useGameViewChromeLayout";
import { useSpecialRange } from "../hooks/useSpecialRange";
import { useSpecialData } from "../hooks/useShipAttributesContract";
import {
  computeMovementRange,
  computeShootingRange,
  computeLabelTargets,
  computeHoverValidTargets,
  computeHoverShootingRange,
  hasLineOfSight,
} from "../utils/gameGridRanges";
import { useDamageCalculation } from "../hooks/useDamageCalculation";
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import { useLandscapeMode } from "../hooks/useLandscapeMode";
import { useResetSelectionOnTurnChange } from "../hooks/useResetSelectionOnTurnChange";
import { useRetreatModeCancellation } from "../hooks/useRetreatModeCancellation";
import { useAccount } from "../hooks/useAccount";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import posthog from "posthog-js";
import {
  getTutorialGridPanelConfig,
  TUTORIAL_COMPLETION_SNIPER_PRIMARY_CTA_SUPPORTING,
  TUTORIAL_COMPLETION_RETREAT_PRIMARY_CTA_SUPPORTING,
  type TutorialGridPanelConfig,
} from "./TutorialGridPanelConfigs";

interface SimulatedGameDisplayProps {
  tutorialContext: TutorialContextValue;
  /** Called when user clicks back; exits tutorial and returns to Info tab. */
  onBack?: () => void;
}

function toMobileTouchCopy(text: string): string {
  return text
    .replace(/\bHover\b/g, "Tap")
    .replace(/\bhover\b/g, "tap")
    .replace(/\bClick\b/g, "Tap")
    .replace(/\bclick\b/g, "tap");
}

function mapNodeToMobileTouchCopy(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    return toMobileTouchCopy(node);
  }
  if (Array.isArray(node)) {
    return node.map((child, idx) => {
      const key =
        React.isValidElement(child) && child.key != null
          ? String(child.key)
          : String(idx);
      return (
        <React.Fragment key={key}>{mapNodeToMobileTouchCopy(child)}</React.Fragment>
      );
    });
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (props.children === undefined) return node;
    return React.cloneElement(
      node as React.ReactElement,
      undefined,
      mapNodeToMobileTouchCopy(props.children),
    );
  }
  return node;
}

const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;

/** Once true per chain+wallet, tutorial claim never reverts; cache indefinitely. */
const TUTORIAL_CLAIM_COMPLETED_CACHE_KEY =
  "void-tactics-tutorial-claim-completed";

function isTutorialClaimCompletedCached(
  chainId: number,
  walletAddress: string,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(TUTORIAL_CLAIM_COMPLETED_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[`${chainId}:${walletAddress.toLowerCase()}`] === true;
  } catch {
    return false;
  }
}

function persistTutorialClaimCompleted(
  chainId: number,
  walletAddress: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(TUTORIAL_CLAIM_COMPLETED_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[`${chainId}:${walletAddress.toLowerCase()}`] = true;
    window.localStorage.setItem(
      TUTORIAL_CLAIM_COMPLETED_CACHE_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}

/** Dev: clear local "already claimed" cache when tutorial reward contract or rewards change. */
function clearTutorialClaimCompletedCacheEntry(
  chainId: number,
  walletAddress: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(TUTORIAL_CLAIM_COMPLETED_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    const key = `${chainId}:${walletAddress.toLowerCase()}`;
    delete parsed[key];
    if (Object.keys(parsed).length === 0) {
      window.localStorage.removeItem(TUTORIAL_CLAIM_COMPLETED_CACHE_KEY);
    } else {
      window.localStorage.setItem(
        TUTORIAL_CLAIM_COMPLETED_CACHE_KEY,
        JSON.stringify(parsed),
      );
    }
  } catch {
    // Corrupt or disabled storage
  }
}

/**
 * Player ships whose cells get the **tutorial highlight** on step 3 (select-ship)
 * until the player selects a ship.
 */
const TUTORIAL_SELECT_SHIP_HIGHLIGHT_SHIP_IDS: readonly number[] = [
  1001,
  1002,
  1003,
];

/** Enemy ships for tutorial highlight on step 4 (view-enemy) until one is selected. */
const TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS: readonly number[] = [
  2001,
  2002,
  2003,
];

/** Sentinel (step 5 move-ship) until any ship is selected. */
const TUTORIAL_MOVE_SHIP_HIGHLIGHT_SHIP_IDS: readonly number[] = [1003];

/** Resolute (step 7 score-points) until selected; allowed-move cells use step config. */
const TUTORIAL_SCORE_POINTS_HIGHLIGHT_SHIP_IDS: readonly number[] = [1001];

/** Vigilant (step 8 shoot) until a ship is selected. */
const TUTORIAL_SHOOT_HIGHLIGHT_SHIP_IDS: readonly number[] = [1002];

/** Hammer (step 8 shoot) after Vigilant's move is staged, until a shot target is chosen. */
const TUTORIAL_SHOOT_HIGHLIGHT_ENEMY_SHIP_IDS: readonly number[] = [2001];

/** Resolute (step 10 special-emp) until a ship is selected. */
const TUTORIAL_SPECIAL_EMP_HIGHLIGHT_SHIP_IDS: readonly number[] = [1001];

/** Anvil (step 10): pulse while arming with weapon first, or after Special if target cleared. */
const TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS: readonly number[] = [
  2002,
];

/** Resolute + Vigilant (step 12 rescue): both cells pulse for the whole step. */
const TUTORIAL_RESCUE_CHOICE_HIGHLIGHT_SHIP_IDS: readonly number[] = [
  1001,
  1002,
];

/** Hammer (step 12 rescue): pulse while Vigilant is selected and no shot target yet. */
const TUTORIAL_RESCUE_SNIPER_TARGET_HIGHLIGHT_SHIP_IDS: readonly number[] = [
  2001,
];

/** Step 13 (rescue-outcome-sniper): Sentinel until selected; Hammer after center move is staged, optional shot. */
const TUTORIAL_RESCUE_OUTCOME_SNIPER_FIGHTER_HIGHLIGHT_SHIP_IDS: readonly number[] =
  [1003];
const TUTORIAL_RESCUE_OUTCOME_SNIPER_ENEMY_HIGHLIGHT_SHIP_IDS: readonly number[] =
  [2001];

function isTutorialEnemyFleetShipId(shipId: number): boolean {
  return TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS.some((id) => id === shipId);
}


export function SimulatedGameDisplay({
  tutorialContext,
  onBack,
}: SimulatedGameDisplayProps) {
  useAccount();
  const { userId: address } = useCurrentUser();
  const activeChainId = 0; // chain selection removed in REST architecture
  const queryClient = useQueryClient();
  const [pendingTutorialClaimPath, setPendingTutorialClaimPath] = useState<
    "win" | "loss" | null
  >(null);

  const {
    gameState,
    currentStep,
    currentStepIndex,
    displayStepNumber,
    displayTotalSteps,
    isVisibleLastStep,
    isStepComplete,
    validateAction,
    executeAction,
    isStepHydrated,
    nextStep,
    previousStep,
    resetTutorial,
  } = tutorialContext;

  // Fetch server-side completion status; fall back to localStorage cache if not logged in
  const { data: tutorialStatus } = useQuery({
    queryKey: ["tutorial-status"],
    queryFn: async () => {
      const res = await fetch("/api/tutorial");
      if (!res.ok) return null;
      return res.json() as Promise<{ completed: boolean; path: string | null }>;
    },
    enabled: !!address,
    staleTime: 60_000,
  });

  const isTutorialRewardAlreadyClaimed =
    tutorialStatus?.completed ??
    (address ? isTutorialClaimCompletedCached(activeChainId, address) : false);
  const isTutorialClaimPending = pendingTutorialClaimPath !== null;
  const isTutorialClaimConfirming = false;

  const isTutorialCompletionStep =
    currentStep?.id === "completion-retreat" ||
    currentStep?.id === "completion-sniper";

  const handleClearTutorialRewardCache = useCallback(() => {
    if (!address) {
      toast.error("Log in to clear the reward cache");
      return;
    }
    clearTutorialClaimCompletedCacheEntry(activeChainId, address);
    void queryClient.invalidateQueries({ queryKey: ["tutorial-status"] });
    toast.success("Cleared local tutorial reward cache for this account");
  }, [activeChainId, address, queryClient]);

  const runTutorialClaimTx = useCallback(
    async (path: "win" | "loss") => {
      if (isTutorialClaimPending || isTutorialClaimConfirming) return;
      if (!address) {
        toast.error("Log in to claim your reward ships");
        return;
      }
      setPendingTutorialClaimPath(path);
      posthog.capture("tutorial_reward_claim_submitted", {
        claim_path: path,
        reward_path: path === "win" ? "two_ships_win" : "three_ships_loss",
        completion_step_id: currentStep?.id,
        chain_id: activeChainId,
      });
      try {
        const res = await fetch("/api/tutorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        if (res.ok) {
          const data = (await res.json()) as { shipCount: number };
          persistTutorialClaimCompleted(activeChainId, address);
          await queryClient.invalidateQueries({ queryKey: ["tutorial-status"] });
          await queryClient.invalidateQueries({ queryKey: ["ships"] });
          toast.success(`Tutorial complete! ${data.shipCount} reward ships added to your fleet.`);
        } else if (res.status === 409) {
          // Already completed — still navigate away
          toast.success("Tutorial already completed. Your reward ships are in your fleet.");
        } else {
          toast.error("Failed to record tutorial completion. Please try again.");
          setPendingTutorialClaimPath(null);
          return;
        }
      } catch {
        toast.error("Network error. Please try again.");
        setPendingTutorialClaimPath(null);
        return;
      }
      setPendingTutorialClaimPath(null);
      onBack?.();
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-manage-navy")),
      );
    },
    [
      address,
      activeChainId,
      currentStep?.id,
      isTutorialClaimPending,
      isTutorialClaimConfirming,
      queryClient,
      onBack,
    ],
  );

  // For display we follow the main game and keep the selected ship ID as number
  // (so GameGrid behavior and animations are identical). When we need to talk
  // to tutorial state, we convert to/from TutorialShipId (string) at the edges.
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<number | null>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special" | "ram"
  >("weapon");
  const [weaponPreferenceByShipId, setWeaponPreferenceByShipId] = useState<
    Record<string, "weapon" | "special" | "ram">
  >({});
  const [actionOverride, setActionOverride] = useState<ActionType | null>(null);
  const [retreatExplicitByShipId, setRetreatExplicitByShipId] = useState<
    Record<string, true>
  >({});

  // Deselect all ships when moving between steps. Use layout effect so that
  // selection and previews are cleared before the new step is painted, which
  // avoids a single-frame flicker of the previous step's selection state.
  useLayoutEffect(() => {
    setSelectedShipId(null);
    setPreviewPosition(null);
    setTargetShipId(null);
    setWeaponPreferenceByShipId({});
    setRetreatExplicitByShipId({});
    setActionOverride(null);
  }, [currentStepIndex]);
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: number;
    row: number;
    col: number;
    isCreator: boolean;
    fromFleet?: boolean;
  } | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState<{ row: number; col: number } | null>(null);
  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] =
    useState(true);
  const [mobileLeftPanelTab, setMobileLeftPanelTab] = useState<
    "tutorial" | "status" | "actions" | "events"
  >("tutorial");
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isMobileFleetModalOpen, setIsMobileFleetModalOpen] = useState(false);
  const [isMobileWeaponMenuOpen, setIsMobileWeaponMenuOpen] = useState(false);
  const [isMobileFleeOpen, setIsMobileFleeOpen] = useState(false);
  const mobileTutorialScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileTutorialContentRef = useRef<HTMLDivElement | null>(null);
  const [mobileTutorialMoreBelow, setMobileTutorialMoreBelow] = useState(false);
  useEffect(() => {
    // Keep mobile tutorial chrome aligned with desktop: each step starts on the
    // tutorial briefing tab to avoid stale tab-specific highlights/copy.
    setMobileLeftPanelTab("tutorial");
    setIsMobileWeaponMenuOpen(false);
  }, [currentStepIndex]);

  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const chromeLayout = useGameViewChromeLayout(
    gameViewRootRef,
    gridContainerRef,
  );
  const chromeOnSide = chromeLayout === "side";
  const { isLandscapeMobile, requiresLandscapeMode } = useLandscapeMode();

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

  const useSideLayout = chromeOnSide && !isLandscapeMobile;
  useRetreatModeCancellation({
    actionOverride,
    targetShipId,
    previewPosition,
    selectedShipId,
    setActionOverride,
    setRetreatExplicitByShipId,
  });

  // Mirror live game: whose turn it is comes from simulated state (e.g. after
  // end of round, opponent may go first).
  const isMyTurn =
    gameState.turnState.currentTurn.toLowerCase() ===
    TUTORIAL_PLAYER_ADDRESS.toLowerCase();

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
  useResetSelectionOnTurnChange(gameState.turnState.currentTurn, resetSelection);

  // Map of onchain ship ID (number) to ship object. Tutorial IDs are strings;
  // when we need a ship we convert TutorialShipId -> number for this map only.
  // Fingerprint `tutorialShips.ts` content so HMR updates ship objects; `useMemo([])`
  // previously froze the first snapshot and hid equipment changes in ShipImage.
  const tutorialShipsFingerprint = JSON.stringify(ALL_TUTORIAL_SHIPS);
  /* eslint-disable react-hooks/exhaustive-deps -- fingerprint busts stale map when `tutorialShips.ts` HMRs */
  const shipMap = useMemo(() => {
    return new Map<number, Ship>(
      ALL_TUTORIAL_SHIPS.map((ship) => [ship.id, ship]),
    );
  }, [tutorialShipsFingerprint]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Create grids from default map (same format as real game map grids)
  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMemo(
    () =>
      buildMapGridsFromDefaultMap(
        defaultMap as DefaultMapShape,
        GRID_WIDTH,
        GRID_HEIGHT,
      ),
    [],
  );

  // Get ship attributes by ship ID from game state (tutorial IDs are strings)
  const getShipAttributes = useCallback(
    (shipId: TutorialShipId | number): Attributes | null => {
      const idString = String(shipId);
      const shipIndex = gameState.shipIds?.findIndex((id) => id === idString);
      if (
        shipIndex === -1 ||
        !gameState.shipAttributes ||
        !gameState.shipAttributes[shipIndex]
      ) {
        return null;
      }
      return gameState.shipAttributes[shipIndex];
    },
    [gameState.shipAttributes, gameState.shipIds],
  );

  const allShipPositionsForGrid = useMemo(
    () =>
      gameState.shipPositions.map((shipPosition) => ({
        shipId: Number(shipPosition.shipId),
        position: shipPosition.position,
        isCreator: shipPosition.isCreator,
        isPreview: shipPosition.isPreview,
        status: shipPosition.status,
      })),
    [gameState.shipPositions],
  );

  const aliveShipPositions = useMemo(
    () =>
      gameState.shipPositions.filter(
        (shipPosition) => (shipPosition.status ?? 0) === 0,
      ),
    [gameState.shipPositions],
  );

  // Canonical lastMove when the live gameState might not match the scripted step.
  // destroy-disabled: a bad persisted snapshot can omit lastMove; fall back.
  const tutorialDisplayLastMove = useMemo(() => {
    if (currentStep?.id === "ship-destruction") {
      return (
        getScriptedStateForTutorialStepId("ship-destruction")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "rescue") {
      return (
        getScriptedStateForTutorialStepId("rescue")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "destroy-disabled" && !gameState.lastMove) {
      return (
        getScriptedStateForTutorialStepId("destroy-disabled")?.lastMove ??
        gameState.lastMove
      );
    }
    return gameState.lastMove;
  }, [currentStep?.id, gameState.lastMove]);

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Check if a ship belongs to the tutorial player. GameGrid passes number IDs,
  // so this matches the main game's signature and uses the number-based map.
  const isShipOwnedByCurrentPlayer = useCallback(
    (shipId: number): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : false;
    },
    [shipMap],
  );

  // Build a set of shipIds that have already moved this round (string IDs)
  const movedShipIdsSet = useMemo(() => {
    const set = new Set<TutorialShipId>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(id));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(id));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  // Track when we should show the proposed move / top action UI, mirroring the
  // main game's behavior: it appears as soon as you select one of your ships
  // that can act this round, even before choosing a destination.
  const isShowingProposedMove = useMemo(() => {
    if (selectedShipId === null) return false;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;
    if (!isMyTurn) return false;

    const idString = selectedShipId.toString() as TutorialShipId;
    if (movedShipIdsSet.has(idString)) {
      // Disabled ships can still retreat even after being marked moved
      const attrs = getShipAttributes(idString);
      if (!(attrs && attrs.hullPoints === 0)) return false;
    }
    return true;
  }, [
    selectedShipId,
    isMyTurn,
    isShipOwnedByCurrentPlayer,
    movedShipIdsSet,
    getShipAttributes,
  ]);

  const isSelectedShipDisabled = useMemo(() => {
    if (!selectedShipId) return false;
    const attrs = getShipAttributes(selectedShipId);
    return !!attrs && attrs.hullPoints === 0;
  }, [selectedShipId, getShipAttributes]);

  const tutorialLastMoveGhostVisible = useMemo(
    () =>
      selectedShipId === null &&
      tutorialDisplayLastMove != null &&
      tutorialDisplayLastMove.shipId !== undefined,
    [selectedShipId, tutorialDisplayLastMove],
  );

  const setWeaponTypeFromGrid = useCallback(
    (type: "weapon" | "special" | "ram") => {
      if (selectedShipId != null) {
        const idKey = selectedShipId.toString();
        setWeaponPreferenceByShipId((prev) => ({ ...prev, [idKey]: type }));
      }
      setSelectedWeaponType(type);
    },
    [selectedShipId],
  );

  useLayoutEffect(() => {
    if (selectedShipId === null) {
      if (!tutorialLastMoveGhostVisible) {
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
    tutorialLastMoveGhostVisible,
  ]);

  /**
   * Pulse the Submit / Submit Retreat button (same idea as tutorial highlight)
   * when a tx step is ready to confirm: staged inputs present, dialog not open.
   */
  const shouldPulseSubmitMoveButton = useMemo(() => {
    if (!currentStep?.requiresTransaction || !isShowingProposedMove) {
      return false;
    }

    const stepId = currentStep.id;

    if (stepId === "special-emp") {
      const allowed =
        currentStep.allowedActions.useSpecial?.allowedTargets ?? [];
      return (
        selectedWeaponType === "special" &&
        targetShipId !== null &&
        allowed.includes(targetShipId.toString() as TutorialShipId)
      );
    }

    if (stepId === "shoot") {
      return previewPosition !== null && targetShipId !== null;
    }

    if (stepId === "rescue-outcome-sniper") {
      return (
        previewPosition !== null &&
        previewPosition.row === 5 &&
        previewPosition.col === 8
      );
    }

    if (stepId === "rescue") {
      if (!selectedShipId) return false;
      const sid = selectedShipId.toString() as TutorialShipId;
      if (sid === "1001") {
        return isSelectedShipDisabled;
      }
      if (sid === "1002") {
        return targetShipId !== null;
      }
      return false;
    }

    return previewPosition !== null;
  }, [
    currentStep,
    isShowingProposedMove,
    previewPosition,
    targetShipId,
    selectedWeaponType,
    selectedShipId,
    isSelectedShipDisabled,
  ]);

  /** special-emp: after Anvil is targeted under Weapons, pulse the weapon/special dropdown. */
  const shouldHighlightSpecialEmpWeaponDropdown = useMemo(
    () =>
      currentStep?.id === "special-emp" &&
      selectedShipId?.toString() === "1001" &&
      selectedWeaponType === "weapon" &&
      targetShipId?.toString() === "2002",
    [currentStep?.id, selectedShipId, selectedWeaponType, targetShipId],
  );

  const isCellOccupiedByAliveShip = useCallback(
    (row: number, col: number) =>
      gameState.shipPositions.some(
        (pos) =>
          (pos.status ?? 0) === 0 &&
          pos.position.row === row &&
          pos.position.col === col,
      ),
    [gameState.shipPositions],
  );

  const isEnemyDisabledTutorialShipId = useCallback(
    (shipId: TutorialShipId): boolean => {
      const ship = shipMap.get(Number(shipId));
      if (!ship) return false;
      if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return false;
      const attrs = getShipAttributes(shipId);
      if (!attrs) return false;
      return attrs.hullPoints === 0;
    },
    [shipMap, getShipAttributes],
  );

  const retreatPrepShipId =
    selectedShipId != null &&
    actionOverride === ActionType.Retreat &&
    isShipOwnedByCurrentPlayer(selectedShipId)
      ? selectedShipId
      : null;

  const retreatPrepIsCreator = useMemo(() => {
    if (retreatPrepShipId == null) return null;
    const ship = shipMap.get(retreatPrepShipId);
    return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : null;
  }, [retreatPrepShipId, shipMap]);

  // Disabled ships: pre-stage Retreat (player can submit or cancel and leave the ship on field).
  // Healthy ships: Retreat only if the player explicitly chose it for that ship.
  useEffect(() => {
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


  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid. Convert tutorial string IDs into the
    // number-based ShipPosition shape expected by GameGrid, but keep
    // the original tutorial IDs in gameState.
    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;
      const shipIdBigInt = Number(shipPosition.shipId);
      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        const basePosition: ShipPosition = {
          shipId: shipIdBigInt,
          position,
          isCreator: shipPosition.isCreator,
          isPreview: shipPosition.isPreview,
          status: shipPosition.status,
        };
        newGrid[position.row][position.col] = basePosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipIdBigInt && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...basePosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true,
          };
        } else if (selectedShipId === shipIdBigInt && hoverPreviewPosition) {
          newGrid[hoverPreviewPosition.row][hoverPreviewPosition.col] = {
            ...basePosition,
            position: { row: hoverPreviewPosition.row, col: hoverPreviewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    // Last move UI: show ghost at old position when no ship is selected (same as in-game)
    const canShowLastMove =
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.shipId !== undefined;
    if (canShowLastMove && tutorialDisplayLastMove) {
      const lm = tutorialDisplayLastMove;
      const oldPos = { row: lm.oldRow, col: lm.oldCol };
      const newPos = { row: lm.newRow, col: lm.newCol };
      if (
        (oldPos.row !== newPos.row || oldPos.col !== newPos.col) &&
        oldPos.row >= 0 &&
        oldPos.row < GRID_HEIGHT &&
        oldPos.col >= 0 &&
        oldPos.col < GRID_WIDTH &&
        !newGrid[oldPos.row][oldPos.col]
      ) {
        const lastMoveShipPosition = aliveShipPositions.find(
          (pos) => pos.shipId === lm.shipId,
        );
        if (lastMoveShipPosition) {
          newGrid[oldPos.row][oldPos.col] = {
            shipId: Number(lm.shipId),
            position: oldPos,
            isCreator: lastMoveShipPosition.isCreator,
            isPreview: true,
            status: lastMoveShipPosition.status,
          };
        }
      }

      const lmAction = Number(lm.actionType);
      const isTargetingLastMove =
        lmAction === ActionType.Shoot || lmAction === ActionType.Special;
      if (isTargetingLastMove && lm.targetShipId && lm.targetShipId !== "0") {
        let destroyedTargetShipPosition = gameState.shipPositions.find(
          (shipPosition) =>
            shipPosition.shipId === lm.targetShipId &&
            shipPosition.status === 1,
        );
        // Stale/persisted gameState can omit status on Anvil; canonical
        // scripted positions still place the destroyed target so EMP can resolve.
        if (
          !destroyedTargetShipPosition &&
          currentStep?.id === "ship-destruction"
        ) {
          const scripted =
            getScriptedStateForTutorialStepId("ship-destruction");
          destroyedTargetShipPosition = scripted?.shipPositions.find(
            (p) => p.shipId === lm.targetShipId,
          );
        }
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (
            row >= 0 &&
            row < GRID_HEIGHT &&
            col >= 0 &&
            col < GRID_WIDTH &&
            !newGrid[row][col]
          ) {
            newGrid[row][col] = {
              shipId: Number(destroyedTargetShipPosition.shipId),
              position: destroyedTargetShipPosition.position,
              isCreator: destroyedTargetShipPosition.isCreator,
              isPreview: destroyedTargetShipPosition.isPreview,
              status: destroyedTargetShipPosition.status,
            };
          }
        }
      }
    }

    return newGrid;
  }, [
    aliveShipPositions,
    gameState.shipPositions,
    tutorialDisplayLastMove,
    selectedShipId,
    previewPosition,
    hoverPreviewPosition,
    currentStep?.id,
  ]);

  // Calculate movement range for selected ship.
  const movementRange = useMemo(
    () =>
      computeMovementRange({
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        selectedShipId,
        hasShips: shipMap.size > 0,
        shipMap,
        getShipAttributes,
        shipPositions: allShipPositionsForGrid.filter((p) => (p.status ?? 0) === 0),
        previewPosition,
        canEnterOccupiedCell: (_row, _col, occupyingShipId) =>
          isEnemyDisabledTutorialShipId(occupyingShipId.toString()),
      }),
    [
      selectedShipId,
      shipMap,
      getShipAttributes,
      allShipPositionsForGrid,
      previewPosition,
      isEnemyDisabledTutorialShipId,
    ],
  );

  const isRammingMovePreview = useMemo(() => {
    if (!selectedShipId || !previewPosition) return false;
    const occupyingShip = gameState.shipPositions.find(
      (pos) =>
        (pos.status ?? 0) === 0 &&
        pos.position.row === previewPosition.row &&
        pos.position.col === previewPosition.col &&
        pos.shipId !== selectedShipId.toString(),
    );
    if (!occupyingShip) return false;
    return isEnemyDisabledTutorialShipId(occupyingShip.shipId);
  }, [
    selectedShipId,
    previewPosition,
    gameState.shipPositions,
    isEnemyDisabledTutorialShipId,
  ]);

  useEffect(() => {
    if (!isRammingMovePreview) return;
    if (targetShipId === null) return;
    setTargetShipId(null);
  }, [isRammingMovePreview, targetShipId]);

  const holdPositionState = useMemo(() => {
    if (!selectedShipId) return { row: -1, col: -1, isActive: false };
    const pos = gameState.shipPositions.find(
      (p) => p.shipId === selectedShipId.toString(),
    );
    const row = pos?.position.row ?? -1;
    const col = pos?.position.col ?? -1;
    const isActive =
      previewPosition !== null &&
      previewPosition.row === row &&
      previewPosition.col === col &&
      !isRammingMovePreview;
    return { row, col, isActive };
  }, [selectedShipId, gameState.shipPositions, previewPosition, isRammingMovePreview]);

  // Last-move new position pulse on the grid when no ship is selected (in-game parity).
  const highlightedMovePosition = useMemo(() => {
    // When showing last move (no ship selected), highlight the new position (same as in-game)
    if (
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.actionType !== ActionType.Retreat &&
      tutorialDisplayLastMove.newRow >= 0 &&
      tutorialDisplayLastMove.newCol >= 0
    ) {
      return {
        row: tutorialDisplayLastMove.newRow,
        col: tutorialDisplayLastMove.newCol,
      };
    }
    return null;
  }, [selectedShipId, tutorialDisplayLastMove]);

  /**
   * Grid positions for the tutorial highlight (yellow pulse): step 3 on player
   * fleet until a ship is selected; step 4 on enemy fleet until an enemy ship is selected;
   * step 5 on the Sentinel until a ship is selected; step 7 on the Resolute
   * until a ship is selected, then on allowed scoring-zone move destinations until
   * the move is staged; step 8 on the Vigilant until a ship is selected, then on
   * allowed move destinations until the move is staged, then on the Hammer after
   * the move is staged until a target is chosen;
   * step 10 (special-emp): Resolute until selected; then Anvil while Resolute
   * is on Weapons until Anvil is targeted; then weapon/special dropdown pulses instead; after
   * switching to Special, Anvil again if no target (target usually carries over from Weapons);
   * step 12 (rescue): Resolute and Vigilant both pulse until one is selected; then only
   * the selected ship pulses (Hammer is added while Vigilant is selected and no shot target yet);
   * step 13 (rescue-outcome-sniper): Sentinel until selected; allowed center cell(s) pulse
   * like other move steps; Hammer after center move is staged until a target is chosen;
   * step 13 (rescue-outcome-retreat): no grid tutorial highlight (narrative only).
   */
  const tutorialHighlightCells = useMemo(() => {
    const stepId = currentStep?.id;
    const positions = gameState.shipPositions;

    const cellsForIds = (ids: readonly number[]) => {
      const cells: { row: number; col: number }[] = [];
      for (const shipId of ids) {
        const idStr = shipId.toString() as TutorialShipId;
        const sp = positions.find((p) => p.shipId === idStr);
        if (sp) {
          cells.push({ row: sp.position.row, col: sp.position.col });
        }
      }
      return cells.length > 0 ? cells : undefined;
    };

    if (stepId === "goals") {
      const resourceCells: { row: number; col: number; hideLabel: true }[] = [];
      for (let row = 0; row < scoringGrid.length; row++) {
        const cols = scoringGrid[row];
        for (let col = 0; col < cols.length; col++) {
          if ((cols[col] ?? 0) > 0) {
            resourceCells.push({ row, col, hideLabel: true });
          }
        }
      }
      return resourceCells.length > 0 ? resourceCells : undefined;
    }

    if (stepId === "select-ship") {
      if (selectedShipId !== null) return undefined;
      return cellsForIds(TUTORIAL_SELECT_SHIP_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "view-enemy") {
      if (
        selectedShipId !== null &&
        isTutorialEnemyFleetShipId(selectedShipId)
      ) {
        return undefined;
      }
      return cellsForIds(TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "move-ship") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_MOVE_SHIP_HIGHLIGHT_SHIP_IDS);
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      if (
        moveCfg &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.length > 0
      ) {
        const isMoveStaged =
          previewPosition !== null &&
          moveCfg.allowedPositions.some(
            (p) =>
              p.row === previewPosition.row && p.col === previewPosition.col,
          );
        if (isMoveStaged) {
          return undefined;
        }
        return moveCfg.allowedPositions.map((p) => ({
          row: p.row,
          col: p.col,
        }));
      }
      return undefined;
    }

    if (stepId === "score-points") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_SCORE_POINTS_HIGHLIGHT_SHIP_IDS);
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      if (
        moveCfg &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.length > 0
      ) {
        const isMoveStaged =
          previewPosition !== null &&
          moveCfg.allowedPositions.some(
            (p) =>
              p.row === previewPosition.row && p.col === previewPosition.col,
          );
        if (isMoveStaged) {
          return undefined;
        }
        return moveCfg.allowedPositions.map((p) => ({
          row: p.row,
          col: p.col,
        }));
      }
      return undefined;
    }

    if (stepId === "shoot") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_SHOOT_HIGHLIGHT_SHIP_IDS);
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      if (
        moveCfg &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.length > 0
      ) {
        const isMoveStaged =
          previewPosition !== null &&
          moveCfg.allowedPositions.some(
            (p) =>
              p.row === previewPosition.row && p.col === previewPosition.col,
          );
        if (isMoveStaged && targetShipId === null) {
          return cellsForIds(TUTORIAL_SHOOT_HIGHLIGHT_ENEMY_SHIP_IDS);
        }
        if (!isMoveStaged) {
          return moveCfg.allowedPositions.map((p) => ({
            row: p.row,
            col: p.col,
          }));
        }
      }
      return undefined;
    }

    if (stepId === "special-emp") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_SHIP_IDS);
      }
      if (selectedShipId.toString() !== "1001") {
        return undefined;
      }
      // Weapons + Anvil targeted: dropdown highlight only (no grid pulse).
      if (
        selectedWeaponType === "weapon" &&
        targetShipId?.toString() === "2002"
      ) {
        return undefined;
      }
      // Weapons, not yet targeting Anvil: pulse Anvil so they open with the gun first.
      if (selectedWeaponType === "weapon") {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS);
      }
      // Special armed, no target yet: pulse Anvil for EMP targeting.
      if (selectedWeaponType === "special" && targetShipId === null) {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS);
      }
      return undefined;
    }

    if (stepId === "rescue") {
      const selectedId = selectedShipId?.toString();
      const playerCells: {
        row: number;
        col: number;
        label?: string;
        hideLabel?: boolean;
      }[] = [];
      for (const shipId of TUTORIAL_RESCUE_CHOICE_HIGHLIGHT_SHIP_IDS) {
        const idStr = shipId.toString() as TutorialShipId;
        // Hard choice: only pulse the ship the player is choosing; hide the other once one is selected.
        if (selectedId === "1001" && idStr === "1002") continue;
        if (selectedId === "1002" && idStr === "1001") continue;
        const sp = positions.find((p) => p.shipId === idStr);
        if (sp) {
          const resoluteSelectedPulseOnly =
            selectedId === "1001" && idStr === "1001";
          playerCells.push({
            row: sp.position.row,
            col: sp.position.col,
            ...(resoluteSelectedPulseOnly
              ? { hideLabel: true as const }
              : {
                  label:
                    idStr === "1001"
                      ? "Save Ship"
                      : idStr === "1002"
                        ? "Win Game"
                        : undefined,
                }),
          });
        }
      }
      const enemyCells =
        selectedShipId?.toString() === "1002" && targetShipId === null
          ? (cellsForIds(TUTORIAL_RESCUE_SNIPER_TARGET_HIGHLIGHT_SHIP_IDS) ??
            [])
          : [];
      const seen = new Set<string>();
      const merged: {
        row: number;
        col: number;
        label?: string;
        hideLabel?: boolean;
      }[] = [];
      for (const c of [...playerCells, ...enemyCells]) {
        const key = `${c.row},${c.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(c);
        }
      }
      return merged.length > 0 ? merged : undefined;
    }

    if (stepId === "rescue-outcome-retreat") {
      return undefined;
    }

    if (stepId === "rescue-outcome-sniper") {
      if (selectedShipId === null) {
        return cellsForIds(
          TUTORIAL_RESCUE_OUTCOME_SNIPER_FIGHTER_HIGHLIGHT_SHIP_IDS,
        );
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      if (
        moveCfg &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.length > 0
      ) {
        const isMoveStaged =
          previewPosition !== null &&
          moveCfg.allowedPositions.some(
            (p) =>
              p.row === previewPosition.row && p.col === previewPosition.col,
          );
        if (!isMoveStaged) {
          return moveCfg.allowedPositions.map((p) => ({
            row: p.row,
            col: p.col,
          }));
        }
        if (isMoveStaged && targetShipId === null) {
          return cellsForIds(
            TUTORIAL_RESCUE_OUTCOME_SNIPER_ENEMY_HIGHLIGHT_SHIP_IDS,
          );
        }
      }
      return undefined;
    }

    return undefined;
  }, [
    currentStep,
    selectedShipId,
    previewPosition,
    targetShipId,
    selectedWeaponType,
    gameState.shipPositions,
    scoringGrid,
  ]);

  // Last move UI props for GameGrid (same as in-game: ghost at old position, pulse at new)
  const lastMoveProps = useMemo(() => {
    if (selectedShipId !== null) {
      return {
        lastMoveShipId: null as number | null,
        lastMoveOldPosition: null as { row: number; col: number } | null,
        lastMoveNewPosition: null as { row: number; col: number } | null,
        lastMoveActionType: null as ActionType | null,
        lastMoveTargetShipId: null as number | null,
        lastMoveIsCurrentPlayer: undefined as boolean | undefined,
      };
    }
    if (!tutorialDisplayLastMove) {
      return {
        lastMoveShipId: null as number | null,
        lastMoveOldPosition: null as { row: number; col: number } | null,
        lastMoveNewPosition: null as { row: number; col: number } | null,
        lastMoveActionType: null as ActionType | null,
        lastMoveTargetShipId: null as number | null,
        lastMoveIsCurrentPlayer: undefined as boolean | undefined,
      };
    }
    const lm = tutorialDisplayLastMove;
    const ship = shipMap.get(Number(lm.shipId));
    const lmAction = Number(lm.actionType);
    return {
      lastMoveShipId: Number(lm.shipId),
      lastMoveOldPosition: { row: lm.oldRow, col: lm.oldCol },
      lastMoveNewPosition: { row: lm.newRow, col: lm.newCol },
      // Coerce so GameGrid strict checks (e.g. EMP) match after JSON or mixed types
      lastMoveActionType: lmAction as ActionType,
      lastMoveTargetShipId:
        (lmAction === ActionType.Shoot || lmAction === ActionType.Special) &&
        lm.targetShipId &&
        lm.targetShipId !== "0"
          ? Number(lm.targetShipId)
          : null,
      lastMoveIsCurrentPlayer: ship
        ? ship.owner === TUTORIAL_PLAYER_ADDRESS
        : undefined,
    };
  }, [tutorialDisplayLastMove, shipMap, selectedShipId]);

  // Last move object for GameEvents panel (adapt tutorial lastMove to onchain LastMove shape).
  // Hidden while any ship is selected (matches live game); proposed moves use the submit panel.
  const lastMoveForEvents: LastMove | undefined = useMemo(() => {
    if (selectedShipId !== null) {
      return undefined;
    }
    if (!tutorialDisplayLastMove) return undefined;
    const lm = tutorialDisplayLastMove;
    return {
      shipId: Number(lm.shipId),
      oldRow: lm.oldRow,
      oldCol: lm.oldCol,
      newRow: lm.newRow,
      newCol: lm.newCol,
      actionType: Number(lm.actionType) as ActionType,
      targetShipId: lm.targetShipId ? Number(lm.targetShipId) : 0,
      timestamp: 0,
    };
  }, [selectedShipId, tutorialDisplayLastMove]);

  const calculateDamageForShip = useDamageCalculation({
    selectedShipId,
    getShipAttributes,
    selectedWeaponType,
    specialData,
    specialType,
  });

  // Get valid targets
  // Show full range for viewing, but filter by tutorial constraints if step requires specific targets
  const validTargets = useMemo(() => {
    if (!selectedShipId) return [];
    if (isRammingMovePreview) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    // Match live game: disabled ships are retreat-only, no targeting UI.
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    // Get allowed targets from tutorial step (if step has specific constraints)
    let allowedTargets: TutorialShipId[] | null = null;
    if (
      currentStep?.allowedActions.shoot &&
      currentStep.allowedActions.shoot.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.shoot.allowedTargets;
    } else if (
      currentStep?.allowedActions.useSpecial &&
      currentStep.allowedActions.useSpecial.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.useSpecial.allowedTargets;
    } else if (
      currentStep?.allowedActions.assist &&
      currentStep.allowedActions.assist.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.assist.allowedTargets;
    }

    const allowedTargetsSet = allowedTargets ? new Set(allowedTargets) : null;

    const attributes = getShipAttributes(selectedShipId);
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const targets: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      // If step has constraints, only include allowed targets
      // Otherwise, show all valid targets (for viewing)
      if (allowedTargetsSet && !allowedTargetsSet.has(shipPosition.shipId)) {
        return;
      }

      const ship = shipMap.get(Number(shipPosition.shipId));
      if (!ship) return;

      // Filter targets based on weapon type
      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId.toString()) return;
        } else if (specialType === 1) {
          if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
        } else {
          if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
        }
      } else {
        if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      const canShoot = distance === 1 || distance <= shootingRange;

      // In the shoot step, always include allowed targets so clicking the enemy
      // adds them as target (grid uses validTargets and only then calls
      // setTargetShipId; otherwise it would select the ship and clear the proposed move).
      const isShootStepAllowedTarget =
        currentStep?.id === "shoot" &&
        allowedTargetsSet?.has(shipPosition.shipId) &&
        distance > 0;

      // Repair drones can target the caster's own ship (distance 0)
      const isSelfRepair =
        selectedWeaponType === "special" && specialType === 2 && distance === 0;

      if ((canShoot && distance > 0) || isSelfRepair || isShootStepAllowedTarget) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
          isShootStepAllowedTarget ||
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
    currentStep,
    previewPosition,
    shipMap,
    getShipAttributes,

    blockedGrid,
    gameState.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
    isRammingMovePreview,
  ]);

  // Threat-range targets for damage labels: all enemy ships reachable from any valid move position.
  const labelTargets = useMemo(
    () =>
      computeLabelTargets({
        selectedShipId,
        previewPosition,
        isRammingMovePreview,
        shipPositions: allShipPositionsForGrid,
        shipMap,
        playerAddress: TUTORIAL_PLAYER_ADDRESS,
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
      allShipPositionsForGrid,
      shipMap,
      getShipAttributes,
      blockedGrid,
      selectedWeaponType,
      specialRange,
      specialType,
    ],
  );

  // Get assistable targets
  const assistableTargets = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(Number(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [
    selectedShipId,
    previewPosition,
    shipMap,
    gameState.shipPositions,
    getShipAttributes,
  ]);

  const assistableTargetsFromStart = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(Number(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [selectedShipId, shipMap, gameState.shipPositions, getShipAttributes]);

  // Calculate shooting range positions (exact same logic as GameDisplay)
  const shootingRange = useMemo(
    () =>
      isRammingMovePreview
        ? []
        : computeShootingRange({
            gridWidth: GRID_WIDTH,
            gridHeight: GRID_HEIGHT,
            selectedShipId,
            hasShips: shipMap.size > 0,
            shipMap,
            getShipAttributes,
            shipPositions: allShipPositionsForGrid.filter((p) => (p.status ?? 0) === 0),
            previewPosition,
            selectedWeaponType,
            specialRange,
            specialType,
            blockedGrid,
          }),
    [
      selectedShipId,
      isRammingMovePreview,
      shipMap,
      getShipAttributes,
      allShipPositionsForGrid,
      previewPosition,
      selectedWeaponType,
      specialRange,
      specialType,
      blockedGrid,
    ],
  );

  // Drag shooting range and valid targets (simplified for tutorial)
  const dragShootingRange = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  const dragValidTargets = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  // Valid targets and shooting range overlay from the hovered movement tile.
  const hoverValidTargets = useMemo(
    () =>
      computeHoverValidTargets({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: shipMap.size > 0,
        shipPositions: allShipPositionsForGrid,
        shipMap,
        playerAddress: TUTORIAL_PLAYER_ADDRESS,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
      }),
    [selectedShipId, hoverPreviewPosition, shipMap, allShipPositionsForGrid, getShipAttributes, selectedWeaponType, specialType, specialRange, blockedGrid],
  );

  const hoverShootingRange = useMemo(
    () =>
      computeHoverShootingRange({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: shipMap.size > 0,
        shipPositions: allShipPositionsForGrid,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
      }),
    [selectedShipId, hoverPreviewPosition, shipMap, allShipPositionsForGrid, getShipAttributes, selectedWeaponType, specialType, specialRange, blockedGrid],
  );

  // Convert tutorial string ids to number ids for GameGrid targeting logic.
  const gridValidTargets = useMemo(
    () =>
      validTargets.map((t) => ({
        shipId: Number(t.shipId),
        position: t.position,
      })),
    [validTargets],
  );

  const gridAssistableTargets = useMemo(
    () =>
      assistableTargets.map((t) => ({
        shipId: Number(t.shipId),
        position: t.position,
      })),
    [assistableTargets],
  );

  const gridAssistableTargetsFromStart = useMemo(
    () =>
      assistableTargetsFromStart.map((t) => ({
        shipId: Number(t.shipId),
        position: t.position,
      })),
    [assistableTargetsFromStart],
  );

  // GameGrid expects Set<number> for movedShipIdsSet; tutorial state uses string IDs.
  const gridMovedShipIdsSet = useMemo(() => {
    const set = new Set<number>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(Number(id)));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(Number(id)));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  const wrappedSetSelectedShipId = useCallback(
    (shipId: number | null) => {
      if (shipId === null) {
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        return;
      }

      // In the shooting tutorial step, if the Vigilant is already selected
      // and the user clicks Hammer, always treat that click as
      // targeting the enemy for the staged move+shoot, not as a selection
      // change. This prevents the proposed move from being cleared.
      if (
        currentStep?.id === "shoot" &&
        selectedShipId !== null &&
        shipId !== selectedShipId
      ) {
        const idString = shipId.toString() as TutorialShipId;
        if (
          currentStep.allowedActions.shoot &&
          currentStep.allowedActions.shoot.allowedTargets.includes(idString)
        ) {
          setTargetShipId(shipId);
          return;
        }
      }

      const idString = shipId.toString() as TutorialShipId;

      // Validate ship selection
      const validation = validateAction({
        type: "selectShip",
        shipId: idString,
      });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      // When changing selection to a different ship, clear any existing preview so
      // the new selection starts in the movement + threat state (same as main game).
      setSelectedShipId(shipId);
      setPreviewPosition(null);
      executeAction({ type: "selectShip", shipId: idString });
      setTargetShipId(null);
    },
    [
      currentStep,
      selectedShipId,
      previewPosition,
      validateAction,
      executeAction,
    ],
  );

  /** Match GameDisplay `handleCancelMove`: clear staged move, target, and selection. */
  const handleCancelMove = useCallback(() => {
    wrappedSetSelectedShipId(null);
    setActionOverride(null);
    setDraggedShipId(null);
    setDragOverCell(null);
  }, [wrappedSetSelectedShipId]);

  /** Board frame clicks (padding) do not hit GameGrid; clear selection and target like empty-cell deselect. */
  const handleBoardChromeMouseDown = useCallback(() => {
    wrappedSetSelectedShipId(null);
    setDraggedShipId(null);
    setDragOverCell(null);
  }, [wrappedSetSelectedShipId]);

  /** GameGrid clears selection on context menu; clear retreat override here (matches handleCancelMove). */
  const handleGridRightClickDeselect = useCallback(() => {
    setActionOverride(null);
  }, []);

  const wrappedSetPreviewPosition = useCallback(
    (position: { row: number; col: number } | null) => {
      if (!position) {
        setPreviewPosition(null);
        return;
      }

      // Hard choice (rescue): Vigilant is shoot-only and cannot stage moves to a new square.
      // Clicking a target still sets preview to the Vigilant's current cell first (stay-in-place + fire);
      // only block when the player tries to move to a different cell.
      if (
        currentStep?.id === "rescue" &&
        selectedShipId?.toString() === "1002"
      ) {
        const currentPos = gameState.shipPositions.find(
          (p) => p.shipId === selectedShipId.toString(),
        )?.position;
        if (
          currentPos &&
          (position.row !== currentPos.row || position.col !== currentPos.col)
        ) {
          toast.error("Vigilant cannot move in this step.");
          return;
        }
      }

      // Validate move action
      if (
        selectedShipId &&
        currentStep?.allowedActions.moveShip &&
        selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
      ) {
        const allowedPositions =
          currentStep.allowedActions.moveShip.allowedPositions;
        const isValidMove = allowedPositions.some(
          (pos) => pos.row === position.row && pos.col === position.col,
        );

        if (!isValidMove) {
          toast.error("Move not allowed in this tutorial step");
          return;
        }

        const moveValidation = validateAction({
          type: "moveShip",
          shipId: selectedShipId.toString() as TutorialShipId,
          position,
        });
        if (!moveValidation.valid) {
          toast.error(moveValidation.message || "Move not allowed");
          return;
        }

        // Stage the preview only. The actual move is submitted via the
        // top action UI (Submit button), matching the live game flow.
        setPreviewPosition(position);
      } else {
        setPreviewPosition(position);
      }
    },
    [
      selectedShipId,
      currentStep,
      gameState.shipPositions,
      validateAction,
      executeAction,
    ],
  );

  const wrappedSetTargetShipId = useCallback(
    (shipId: number | null) => {
      if (!shipId || shipId === 0) {
        setTargetShipId(shipId);
        return;
      }

      if (!selectedShipId) {
        setTargetShipId(shipId);
        return;
      }

      const idString = shipId.toString() as TutorialShipId;

      // Check for shoot action
      if (
        currentStep?.allowedActions.shoot &&
        selectedShipId.toString() === currentStep.allowedActions.shoot.shipId &&
        currentStep.allowedActions.shoot.allowedTargets.includes(idString)
      ) {
        // In the shooting tutorial step, clicking an enemy in range should
        // only stage the target for the composite move+shoot action. The
        // actual shoot is executed when the user clicks Submit, just like
        // in the main game.
        if (
          currentStep.id === "shoot" ||
          currentStep.id === "rescue-outcome-sniper"
        ) {
          if (currentStep.id === "shoot") {
            // Require a proposed move to (1, 3) before allowing the shot.
            if (
              !previewPosition ||
              previewPosition.row !== 1 ||
              previewPosition.col !== 3
            ) {
              toast.error(
                "Move the Vigilant to (1, 3) before firing on the enemy.",
              );
              return;
            }
          } else if (currentStep.id === "rescue-outcome-sniper") {
            // Require the fighter to stage the center move before optional shot.
            if (
              !previewPosition ||
              previewPosition.row !== 5 ||
              previewPosition.col !== 8
            ) {
              toast.error(
                "Move the Sentinel to (5, 8) before firing on the enemy.",
              );
              return;
            }
          }

          // Stage the target only; Submit will call executeAction for the
          // actual shoot.
          setTargetShipId(shipId);
          return;
        }

        // In rescue, the sniper shot is staged (target selection) and is only
        // executed when the player clicks Submit.
        if (
          currentStep.id === "rescue" &&
          selectedShipId.toString() === "1002"
        ) {
          const currentPos = gameState.shipPositions.find(
            (pos) => pos.shipId === selectedShipId.toString(),
          )?.position;
          if (currentPos) {
            // Keep sniper stationary but provide an explicit firing origin so
            // railgun animation/effects can render when target is selected.
            setPreviewPosition({ row: currentPos.row, col: currentPos.col });
          }
          setTargetShipId(shipId);
          return;
        }

        const shootValidation = validateAction({
          type: "shoot",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (shootValidation.valid) {
          executeAction({
            type: "shoot",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Shoot,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(shootValidation.message || "Shoot not allowed");
          return;
        }
      }

      // Check for useSpecial action
      if (
        currentStep?.allowedActions.useSpecial &&
        selectedShipId.toString() ===
          currentStep.allowedActions.useSpecial.shipId &&
        currentStep.allowedActions.useSpecial.allowedTargets.includes(idString)
      ) {
        const specialValidation = validateAction({
          type: "useSpecial",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
          specialType: currentStep.allowedActions.useSpecial.specialType,
        });
        if (specialValidation.valid) {
          // Stage the target only; Submit will call executeAction for the
          // actual special use.
          setTargetShipId(shipId);
          return;
        } else {
          toast.error(
            specialValidation.message || "Special ability not allowed",
          );
          return;
        }
      }

      // Check for assist action
      if (
        currentStep?.allowedActions.assist &&
        selectedShipId.toString() ===
          currentStep.allowedActions.assist.shipId &&
        currentStep.allowedActions.assist.allowedTargets.includes(idString)
      ) {
        const assistValidation = validateAction({
          type: "assist",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (assistValidation.valid) {
          executeAction({
            type: "assist",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Assist,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(assistValidation.message || "Assist not allowed");
          return;
        }
      }

      // If no matching action, just set the target (for display purposes)
      setTargetShipId(shipId);
    },
    [
      selectedShipId,
      currentStep,
      previewPosition,
      validateAction,
      executeAction,
      gameState.shipPositions,
    ],
  );

  // Submit handler for staged move (selected ship + preview position). This mirrors
  // the live game flow where the player first stages a move on the grid, then
  // confirms it via the action panel, which may trigger a (simulated) transaction.
  const handleSubmitMove = useCallback(() => {
    if (!selectedShipId) {
      return;
    }

    if (actionOverride === ActionType.Retreat) {
      const currentPos = gameState.shipPositions.find(
        (p) => p.shipId === selectedShipId.toString(),
      )?.position;
      if (!currentPos) return;
      executeAction({
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: currentPos,
        actionType: ActionType.Retreat,
      });
      setActionOverride(null);
      return;
    }

    // For the shooting tutorial step, Submit should execute the composite
    // move+shoot action in one go: apply the staged move, then open the
    // simulated transaction for the shot.
    if (currentStep?.id === "shoot") {
      if (!previewPosition) {
        return;
      }
      if (!currentStep.allowedActions.moveShip) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      if (!targetShipId) {
        toast.error("Select an enemy ship to target before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      // Apply the move immediately (no tx). Validation has already run earlier.
      executeAction(moveAction);

      const shootAction: TutorialAction = {
        type: "shoot",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Shoot,
      };

      executeAction(shootAction);
      // For the shooting step, keep selection and preview/target state while
      // the simulated transaction dialog is open so the player continues to
      // see the staged move+shoot in the UI. State will be cleared when the
      // step advances after tx approval.
      return;
    }

    // Sniper branch step: submit move-to-center, optionally with a shot target.
    if (currentStep?.id === "rescue-outcome-sniper") {
      if (!previewPosition) {
        toast.error("Move the Sentinel to (5, 8) before submitting.");
        return;
      }
      if (previewPosition.row !== 5 || previewPosition.col !== 8) {
        toast.error("Move the Sentinel to (5, 8) before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
        // If the player selected a target, we'll perform the optional shot
        // after the tx is approved (handled in useOnboardingTutorial).
        targetShipId: targetShipId
          ? (targetShipId.toString() as TutorialShipId)
          : undefined,
      };
      executeAction(moveAction);
      return;
    }

    // Rescue step has two valid submit paths:
    // 1) Select disabled EMP and submit retreat.
    // 2) Select sniper, keep position, stage target, then submit shoot.
    if (currentStep?.id === "rescue") {
      const selectedId = selectedShipId.toString() as TutorialShipId;

      if (selectedId === "1001") {
        const currentPos = gameState.shipPositions.find(
          (pos) => pos.shipId === selectedId,
        )?.position;
        if (!currentPos) return;

        executeAction({
          type: "moveShip",
          shipId: selectedId,
          position: currentPos,
          actionType: ActionType.Retreat,
        });
      } else if (selectedId === "1002") {
        if (!targetShipId) {
          toast.error("Select Hammer as target before submitting.");
          return;
        }
        executeAction({
          type: "shoot",
          shipId: selectedId,
          targetShipId: targetShipId.toString() as TutorialShipId,
          actionType: ActionType.Shoot,
        });
      } else {
        toast.error("Select Resolute or Vigilant.");
        return;
      }
    } else if (currentStep?.id === "special-emp") {
      // Special EMP step: no movement, just fire the special at the staged target.
      const isEmpSelected = selectedWeaponType === "special";
      const hasTarget = !!targetShipId;
      const allowedTargets =
        currentStep.allowedActions.useSpecial?.allowedTargets ?? [];
      const isAllowedTarget =
        hasTarget &&
        allowedTargets.includes(targetShipId!.toString() as TutorialShipId);

      // Only requirement for submit in this step:
      // - EMP is selected in the dropdown
      // - Target is one of the allowed useSpecial targets (Anvil)
      if (!isEmpSelected || !isAllowedTarget) {
        toast.error(
          "Select Anvil as your target and switch to EMP before submitting.",
        );
        return;
      }

      const action: TutorialAction = {
        type: "useSpecial",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Special,
      };

      executeAction(action);
    } else {
      if (!previewPosition) {
        return;
      }
      if (
        !currentStep?.allowedActions.moveShip ||
        selectedShipId.toString() !== currentStep.allowedActions.moveShip.shipId
      ) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      const action: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      executeAction(action);
    }

    // For most steps, clear local staging after submitting.
    // Keep local staging for steps that rely on pending tx preview state:
    // - shoot: staged move+target should remain visible until tx decision
    // - special-emp: staged target should remain visible until tx decision
    // - rescue: staged branch choice (retreat or sniper shot) should remain
    //   visible until approve, or until player cancels via top move-selection UI.
    if (
      currentStep?.id !== "shoot" &&
      currentStep?.id !== "special-emp" &&
      currentStep?.id !== "rescue" &&
      currentStep?.id !== "rescue-outcome-sniper"
    ) {
      setPreviewPosition(null);
      setTargetShipId(null);
      setSelectedShipId(null);
    }
  }, [
    selectedShipId,
    previewPosition,
    targetShipId,
    gameState.shipPositions,
    currentStep,
    isSelectedShipDisabled,
    selectedWeaponType,
    executeAction,
    actionOverride,
  ]);

  const tutorialGridPanelConfig = useMemo(() => {
    if (!currentStep?.id) return null;
    const base = getTutorialGridPanelConfig(currentStep.id);
    if (!base) return null;
    if (currentStep.id === "completion-sniper") {
      return {
        ...base,
        primaryCta: {
          eyebrow: "Ready for more?",
          headline: "Take your fleet live",
          supporting: TUTORIAL_COMPLETION_SNIPER_PRIMARY_CTA_SUPPORTING,
          buttonLabel: isTutorialRewardAlreadyClaimed
            ? "Reward Claimed / View Ships"
            : !address
              ? "Log in"
              : pendingTutorialClaimPath === "win" &&
                  (isTutorialClaimPending || isTutorialClaimConfirming)
                ? "Claiming..."
                : "Claim 2 ships + win",
          onClick: () => void runTutorialClaimTx("win"),
        },
      };
    }
    if (currentStep.id === "completion-retreat") {
      return {
        ...base,
        primaryCta: {
          eyebrow: "Ready for more?",
          headline: "Take your fleet live",
          supporting: TUTORIAL_COMPLETION_RETREAT_PRIMARY_CTA_SUPPORTING,
          buttonLabel: isTutorialRewardAlreadyClaimed
            ? "Reward Claimed / View Ships"
            : !address
              ? "Log in"
              : pendingTutorialClaimPath === "loss" &&
                  (isTutorialClaimPending || isTutorialClaimConfirming)
                ? "Claiming..."
                : "Claim 3 ships + loss record",
          onClick: () =>
            void runTutorialClaimTx("loss"),
        },
      };
    }
    return base;
  }, [
    address,
    currentStep?.id,
    isTutorialRewardAlreadyClaimed,
    isTutorialClaimConfirming,
    isTutorialClaimPending,
    pendingTutorialClaimPath,
    runTutorialClaimTx,
  ]);

  const isMobileJoiner =
    gameState.metadata.joiner.toLowerCase() ===
    TUTORIAL_PLAYER_ADDRESS.toLowerCase();
  const myScore = isMobileJoiner
    ? gameState.joinerScore.toString()
    : gameState.creatorScore.toString();
  const opponentScore = isMobileJoiner
    ? gameState.creatorScore.toString()
    : gameState.joinerScore.toString();
  const maxScore = gameState.maxScore.toString();
  const mobileTurnLabel = isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN";
  const mobileTurnTime = "99:99";
  const mobileTurnPct = 100;
  const mobileSelectedShipAttributes =
    selectedShip ? getShipAttributes(selectedShip.id) : null;
  const mobileSelectedShipPosition =
    selectedShip
      ? gameState.shipPositions.find(
          (position) => position.shipId === selectedShip.id.toString(),
        )
      : undefined;
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
    selectedWeaponType === "special" && selectedShip
      ? getSpecialName(selectedShip.equipment.special)
      : selectedShip
        ? getMainWeaponName(selectedShip.equipment.mainWeapon)
        : "Weapon";
  const tutorialDefaultLabel = isLandscapeMobile ? "Tap here" : "Click here";
  const shouldHighlightMobileCloseButton =
    isLandscapeMobile &&
    selectedShip !== null &&
    (currentStep?.id === "select-ship" || currentStep?.id === "view-enemy");

  const updateMobileTutorialScrollHint = useCallback(() => {
    const el = mobileTutorialScrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const canScrollDown = el.scrollHeight > el.clientHeight + 8 && remaining > 16;
    setMobileTutorialMoreBelow((prev) =>
      prev === canScrollDown ? prev : canScrollDown,
    );
  }, []);

  useEffect(() => {
    if (mobileLeftPanelTab !== "tutorial") return;
    const el = mobileTutorialScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setMobileTutorialMoreBelow(false);
    requestAnimationFrame(updateMobileTutorialScrollHint);
  }, [
    mobileLeftPanelTab,
    currentStepIndex,
    updateMobileTutorialScrollHint,
  ]);

  useEffect(() => {
    if (mobileLeftPanelTab !== "tutorial") return;
    const scrollEl = mobileTutorialScrollRef.current;
    const contentEl = mobileTutorialContentRef.current;
    if (!scrollEl) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateMobileTutorialScrollHint);
    });
    if (contentEl) ro.observe(contentEl);
    window.addEventListener("resize", updateMobileTutorialScrollHint);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateMobileTutorialScrollHint);
    };
  }, [mobileLeftPanelTab, updateMobileTutorialScrollHint]);

  if (requiresLandscapeMode) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md border-2 bg-near-black/85 p-6 text-center" style={{ borderColor: "var(--color-cyan)" }}>
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
            className="text-xl font-bold uppercase tracking-wider text-cyan"
            style={STYLE_LABEL}
          >
            Rotate to Landscape
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            The tutorial battle view requires landscape mode on mobile. Rotate
            your device to continue.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-5 border border-steel px-4 py-2 text-sm font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-cyan hover:text-cyan"
              style={{ borderRadius: 0 }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

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
                  {onBack ? (
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
                  ) : null}
                  <div className="min-w-0 flex-1 text-center">
                    <p className="truncate text-[10px] uppercase tracking-wider text-text-secondary">
                      Game 0 | Round {gameState.turnState.currentRound.toString()}
                    </p>
                    <p
                      className="truncate text-[10px] uppercase tracking-wider"
                      style={{
                        color: isMyTurn
                          ? "var(--color-cyan)"
                          : "var(--color-warning-red)",
                      }}
                    >
                      {mobileTurnLabel} | {mobileTurnTime}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
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

              <div className="mb-2 grid grid-cols-5 gap-1">
                {(["tutorial", "status", "actions", "events"] as const).map((tab) => (
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

              <div
                className={`min-h-0 flex-1 ${
                  mobileLeftPanelTab === "tutorial"
                    ? "overflow-hidden"
                    : "overflow-y-auto"
                }`}
              >
                {mobileLeftPanelTab === "tutorial" ? (
                  tutorialGridPanelConfig ? (
                    <div
                      className="flex h-full min-h-0 flex-col border border-solid p-2"
                      style={{
                        borderColor: "var(--color-gunmetal)",
                        backgroundColor: "color-mix(in srgb, var(--color-near-black) 85%, transparent)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="min-w-0 text-sm font-bold uppercase tracking-wide text-cyan leading-tight"
                          style={{
                            ...STYLE_LABEL,
                          }}
                        >
                          {tutorialGridPanelConfig.title}
                        </h3>
                        <span className="shrink-0 text-[10px] font-mono text-text-muted">
                          {displayStepNumber}/{displayTotalSteps}
                        </span>
                      </div>

                      <div className="h-1 w-full bg-gunmetal">
                        <div
                          className="h-1 bg-cyan transition-all duration-300"
                          style={{
                            width: `${(displayStepNumber / displayTotalSteps) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="relative mt-2 min-h-0 flex-1">
                        <div
                          ref={mobileTutorialScrollRef}
                          onScroll={updateMobileTutorialScrollHint}
                          className="h-full overflow-y-auto overscroll-contain pr-0.5 [touch-action:pan-y]"
                        >
                          <div
                            ref={mobileTutorialContentRef}
                            className="space-y-2.5"
                          >
                            {typeof tutorialGridPanelConfig.brief === "string" ? (
                              <p
                                className="text-[11px] leading-relaxed whitespace-pre-line text-text-primary"
                                style={{
                                  fontFamily:
                                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                                }}
                              >
                                {toMobileTouchCopy(tutorialGridPanelConfig.brief)}
                              </p>
                            ) : (
                              <div
                                className="space-y-1 text-[11px] leading-relaxed text-text-primary"
                                style={{
                                  fontFamily:
                                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                                }}
                              >
                                {mapNodeToMobileTouchCopy(tutorialGridPanelConfig.brief)}
                              </div>
                            )}

                            {tutorialGridPanelConfig.tasks &&
                            tutorialGridPanelConfig.tasks.length > 0 ? (
                              <div className="space-y-1">
                                <p
                                  className="text-[10px] uppercase tracking-wider text-cyan/90"
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                  }}
                                >
                                  {mapNodeToMobileTouchCopy(
                                    tutorialGridPanelConfig.tasksSectionLabel ?? "Orders",
                                  )}
                                </p>
                                <ol
                                  className="list-decimal list-outside pl-4 space-y-0.5 text-[11px] leading-snug text-text-primary"
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                  }}
                                >
                                  {tutorialGridPanelConfig.tasks.map((task, idx) => {
                                    const key =
                                      React.isValidElement(task) && task.key != null
                                        ? String(task.key)
                                        : String(idx);
                                    return (
                                      <li key={key}>{mapNodeToMobileTouchCopy(task)}</li>
                                    );
                                  })}
                                </ol>
                              </div>
                            ) : null}

                            {tutorialGridPanelConfig.primaryCta ? (
                              <div className="space-y-1.5 border border-solid p-2" style={{ borderColor: "var(--color-cyan)", backgroundColor: "rgba(0, 38, 54, 0.35)" }}>
                                <p
                                  className="text-[10px] uppercase tracking-wider text-cyan/95"
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                  }}
                                >
                                  {tutorialGridPanelConfig.primaryCta.eyebrow}
                                </p>
                                <p
                                  className="text-sm font-bold uppercase tracking-wide text-white"
                                  style={{
                                    fontFamily:
                                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                                  }}
                                >
                                  {tutorialGridPanelConfig.primaryCta.headline}
                                </p>
                                <div
                                  className="text-[11px] leading-relaxed text-text-primary"
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                  }}
                                >
                                  {tutorialGridPanelConfig.primaryCta.supporting}
                                </div>
                                <button
                                  type="button"
                                  onClick={tutorialGridPanelConfig.primaryCta.onClick}
                                  className="w-full border border-solid px-2 py-1 text-xs uppercase tracking-wider"
                                  style={{
                                    borderColor: "var(--color-cyan)",
                                    color: "var(--color-cyan)",
                                    backgroundColor: "var(--color-near-black)",
                                    borderRadius: 0,
                                  }}
                                >
                                  {tutorialGridPanelConfig.primaryCta.buttonLabel}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {mobileTutorialMoreBelow ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-gradient-to-t from-near-black from-30% via-near-black/75 to-transparent pb-1">
                            <span className="border border-cyan/40 bg-near-black/95 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-cyan">
                              Scroll for more
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid shrink-0 grid-cols-2 gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => previousStep()}
                          disabled={currentStepIndex === 0}
                          className="px-2 py-1 border border-solid text-[10px] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderColor: "var(--color-gunmetal)",
                            color: "var(--color-text-secondary)",
                            backgroundColor: "var(--color-steel)",
                            borderRadius: 0,
                          }}
                        >
                          ← Prev
                        </button>
                        {!isVisibleLastStep ? (
                          <button
                            type="button"
                            onClick={() => nextStep()}
                            disabled={!isStepComplete}
                            className="px-2 py-1 border border-solid text-[10px] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              borderColor: "var(--color-cyan)",
                              color: "var(--color-cyan)",
                              backgroundColor: "var(--color-near-black)",
                              borderRadius: 0,
                            }}
                          >
                            NEXT &gt;&gt;
                          </button>
                        ) : (
                          <div />
                        )}
                        <button
                          type="button"
                          onClick={() => resetTutorial()}
                          className="px-2 py-1 border border-solid text-[10px] uppercase tracking-wider"
                          style={{
                            borderColor: "var(--color-amber)",
                            color: "var(--color-amber)",
                            backgroundColor: "var(--color-steel)",
                            borderRadius: 0,
                          }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => onBack?.()}
                          className="px-2 py-1 border border-solid text-[10px] uppercase tracking-wider"
                          style={{
                            borderColor: "var(--color-gunmetal)",
                            color: "var(--color-text-secondary)",
                            backgroundColor: "var(--color-slate)",
                            borderRadius: 0,
                          }}
                        >
                          Quit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-secondary">
                      Tutorial briefing unavailable for this step.
                    </div>
                  )
                ) : null}
                {mobileLeftPanelTab === "actions" ? (
                  isShowingProposedMove ? (
                    <div className="space-y-2">
                      <div className="text-sm text-text-secondary">
                        Submit your selected move or cancel and pick again.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelMove}
                          className="flex-1 px-2 py-1 border border-solid text-xs uppercase tracking-wider"
                          style={{
                            borderColor: "var(--color-gunmetal)",
                            color: "var(--color-text-secondary)",
                            backgroundColor: "var(--color-steel)",
                            borderRadius: 0,
                          }}
                        >
                          Cancel
                        </button>
                        <div className="relative flex-1">
                          {shouldPulseSubmitMoveButton && (
                            <div className="absolute -top-7 left-1/2 z-[280] -translate-x-1/2 pointer-events-none">
                              <div className="relative inline-block">
                                <div
                                  className="absolute inset-0 bg-near-black"
                                  style={{ opacity: 1 }}
                                  aria-hidden
                                />
                                <div className="relative border border-amber bg-steel px-2 py-1 text-center font-mono text-xs text-white whitespace-nowrap">
                                  Tap here
                                </div>
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleSubmitMove}
                            className={`w-full px-2 py-1 border border-solid text-xs uppercase tracking-wider ${
                              shouldPulseSubmitMoveButton
                                ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                                : ""
                            }`}
                            style={{
                              borderColor: shouldPulseSubmitMoveButton
                                ? "var(--color-amber)"
                                : "var(--color-phosphor-green)",
                              color: shouldPulseSubmitMoveButton
                                ? "var(--color-amber)"
                                : "var(--color-phosphor-green)",
                              backgroundColor: shouldPulseSubmitMoveButton
                                ? "rgba(47, 47, 54, 0.5)"
                                : "var(--color-near-black)",
                              borderRadius: 0,
                            }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
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
                  </div>
                ) : null}
                {mobileLeftPanelTab === "events" ? (
                  <GameEvents
                    lastMove={selectedShipId !== null ? undefined : lastMoveForEvents}
                    shipMap={shipMap}
                    address={TUTORIAL_PLAYER_ADDRESS}
                    appendDestroyedText={
                      currentStep?.id === "ship-destruction" ||
                      currentStep?.id === "rescue"
                    }
                  />
                ) : null}
              </div>

              {selectedShip ? (
                <div
                  className="absolute inset-0 z-[260] overflow-y-auto px-1 pb-1 pt-0.5"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 97%, transparent)",
                  }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="relative min-w-0">
                      {shouldHighlightSpecialEmpWeaponDropdown ? (
                        <div className="absolute -top-7 left-1/2 z-[280] -translate-x-1/2 pointer-events-none">
                          <div className="relative inline-block">
                            <div
                              className="absolute inset-0 bg-near-black"
                              style={{ opacity: 1 }}
                              aria-hidden
                            />
                            <div className="relative border border-amber bg-steel px-2 py-1 text-center font-mono text-xs text-white whitespace-nowrap">
                              Tap here
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setIsMobileWeaponMenuOpen((prev) => !prev)}
                        disabled={!selectedShip || !(selectedShip.equipment.special > 0)}
                        className={`flex min-w-[7.5rem] max-w-[10.5rem] items-center justify-between gap-2 border border-solid px-2 py-1 text-[10px] uppercase tracking-wider text-cyan disabled:opacity-50 disabled:cursor-default ${
                          shouldHighlightSpecialEmpWeaponDropdown
                            ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                            : "bg-black/40"
                        }`}
                        style={{
                          borderColor: shouldHighlightSpecialEmpWeaponDropdown
                            ? "var(--color-amber)"
                            : "var(--color-gunmetal)",
                          backgroundColor: shouldHighlightSpecialEmpWeaponDropdown
                            ? "rgba(47, 47, 54, 0.5)"
                            : "rgba(0, 0, 0, 0.4)",
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
                    <div className="relative">
                      {shouldHighlightMobileCloseButton ? (
                        <div className="absolute top-[calc(100%+4px)] right-0 z-[280] pointer-events-none">
                          <div className="relative inline-block">
                            <div
                              className="absolute inset-0 bg-near-black"
                              style={{ opacity: 1 }}
                              aria-hidden
                            />
                            <div className="relative border border-amber bg-steel px-2 py-1 text-center font-mono text-xs text-white whitespace-nowrap">
                              Tap here
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileWeaponMenuOpen(false);
                          setSelectedShipId(null);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] uppercase border border-solid ${
                          shouldHighlightMobileCloseButton
                            ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                            : ""
                        }`}
                        style={{
                          borderColor: shouldHighlightMobileCloseButton
                            ? "var(--color-amber)"
                            : "var(--color-gunmetal)",
                          color: shouldHighlightMobileCloseButton
                            ? "var(--color-amber)"
                            : "var(--color-text-secondary)",
                          backgroundColor: shouldHighlightMobileCloseButton
                            ? "var(--color-steel)"
                            : "var(--color-steel)",
                          borderRadius: 0,
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="origin-top scale-[0.9] transform-gpu">
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
                        hasMoved={movedShipIdsSet.has(selectedShip.id.toString() as TutorialShipId)}
                        gameViewMode={true}
                        hideRarityLabel={true}
                        hideRankLabel={true}
                        hideOuterFrame={true}
                        layoutShipId={selectedShip.id.toString()}
                      />
                    </div>
                    {isShowingProposedMove ? (
                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelMove}
                            className="flex-1 px-2 py-1 border border-solid text-[10px] uppercase tracking-wider"
                            style={{
                              borderColor: "var(--color-gunmetal)",
                              color: "var(--color-text-secondary)",
                              backgroundColor: "var(--color-steel)",
                              borderRadius: 0,
                            }}
                          >
                            Cancel
                          </button>
                          <div className="relative flex-1">
                            {shouldPulseSubmitMoveButton && (
                              <div className="absolute -top-7 left-1/2 z-[280] -translate-x-1/2 pointer-events-none">
                                <div className="relative inline-block">
                                  <div
                                    className="absolute inset-0 bg-near-black"
                                    style={{ opacity: 1 }}
                                    aria-hidden
                                  />
                                  <div className="relative border border-amber bg-steel px-2 py-1 text-center font-mono text-xs text-white whitespace-nowrap">
                                    Tap here
                                  </div>
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleSubmitMove}
                              className={`w-full px-2 py-1 border border-solid text-[10px] uppercase tracking-wider ${
                                shouldPulseSubmitMoveButton
                                  ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]"
                                  : ""
                              }`}
                              style={{
                                borderColor: shouldPulseSubmitMoveButton
                                  ? "var(--color-amber)"
                                  : "var(--color-phosphor-green)",
                                color: shouldPulseSubmitMoveButton
                                  ? "var(--color-amber)"
                                  : "var(--color-phosphor-green)",
                                backgroundColor: shouldPulseSubmitMoveButton
                                  ? "var(--color-steel)"
                                  : "var(--color-near-black)",
                                borderRadius: 0,
                              }}
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
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
            }}
          >
            <div
              className="h-full max-h-full"
              style={{
                height: "100%",
                width: "auto",
                aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
              }}
            >
              <GameBoardLayout
                isCurrentPlayerTurn={isMyTurn}
                containerRef={gridContainerRef}
                onBoardChromeMouseDown={handleBoardChromeMouseDown}
              >
                <div
                  className="relative h-full [contain:layout]"
                  style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
                >
                  <div className="absolute inset-0 min-h-0 overflow-hidden">
                    <GameGrid
                      grid={grid}
                      allShipPositions={allShipPositionsForGrid}
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
                      validTargets={gridValidTargets}
                      assistableTargets={gridAssistableTargets}
                      assistableTargetsFromStart={gridAssistableTargetsFromStart}
                      dragShootingRange={dragShootingRange}
                      dragValidTargets={dragValidTargets}
                      hoverValidTargets={hoverValidTargets}
                      hoverShootingRange={hoverShootingRange}
                      labelTargets={labelTargets}
                      isCurrentPlayerTurn={isMyTurn}
                      isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                      movedShipIdsSet={gridMovedShipIdsSet}
                      specialType={specialType}
                      blockedGrid={blockedGrid}
                      scoringGrid={scoringGrid}
                      onlyOnceGrid={onlyOnceGrid}
                      calculateDamage={calculateDamageForShip}
                      getShipAttributes={getShipAttributes}
                      disableTooltips={true}
                      address={TUTORIAL_PLAYER_ADDRESS}
                      currentTurn={gameState.turnState.currentTurn}
                      highlightedMovePosition={highlightedMovePosition}
                      lastMoveShipId={lastMoveProps.lastMoveShipId}
                      lastMoveOldPosition={lastMoveProps.lastMoveOldPosition}
                      lastMoveNewPosition={lastMoveProps.lastMoveNewPosition}
                      lastMoveActionType={lastMoveProps.lastMoveActionType}
                      lastMoveTargetShipId={lastMoveProps.lastMoveTargetShipId}
                      lastMoveIsCurrentPlayer={lastMoveProps.lastMoveIsCurrentPlayer}
                      showLastMoveEmpReplayWhenSelected={
                        currentStep?.id === "ship-destruction" ||
                        currentStep?.id === "destroy-disabled"
                      }
                      retreatPrepShipId={retreatPrepShipId}
                      retreatPrepIsCreator={retreatPrepIsCreator}
                      tutorialHighlightCells={tutorialHighlightCells}
                      tutorialDefaultLabel={tutorialDefaultLabel}
                      onGridRightClickDeselect={handleGridRightClickDeselect}
                      setSelectedShipId={wrappedSetSelectedShipId}
                      setPreviewPosition={wrappedSetPreviewPosition}
                      setTargetShipId={wrappedSetTargetShipId}
                      setSelectedWeaponType={setWeaponTypeFromGrid}
                      setHoveredCell={setHoveredCell}
                      setDraggedShipId={setDraggedShipId}
                      setDragOverCell={setDragOverCell}
                      onMoveTileHover={setHoverPreviewPosition}
                      showConfirmWidget={
                        isShowingProposedMove &&
                        actionOverride !== ActionType.Retreat &&
                        (
                          previewPosition !== null ||
                          targetShipId !== null
                        )
                      }
                      confirmWidgetLabel={
                        isRammingMovePreview ? "RAM"
                          : (selectedWeaponType === "special" && specialType === 2 && targetShipId != null) ? "REPAIR"
                          : (targetShipId != null && targetShipId !== 0) ? "FIRE"
                          : (actionOverride == null && (targetShipId === null || (targetShipId === 0 && !(selectedWeaponType === "special" && specialType === 3)))) ? "HOLD FIRE"
                          : "SUBMIT"
                      }
                      onConfirmMove={handleSubmitMove}
                      onCancelMove={handleCancelMove}
                    />
                  </div>
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
                          <FleeSafetySwitch gameId={0} locked />
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                <div>
                  <h4 className="mb-2 text-xs uppercase tracking-wider text-cyan">[MY FLEET]</h4>
                  <div className="space-y-2">
                    {gameState.creatorActiveShipIds
                      .filter(() => !isMobileJoiner)
                      .concat(gameState.joinerActiveShipIds.filter(() => isMobileJoiner))
                      .map((shipId) => {
                        const ship = shipMap.get(Number(shipId));
                        const attrs = getShipAttributes(shipId);
                        const hasMoved = movedShipIdsSet.has(shipId);
                        if (!ship || !attrs) return null;
                        return (
                          <ShipCard
                            key={`my-${shipId}`}
                            ship={ship}
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
                            isCurrentPlayerShip={true}
                            flipShip={ship.owner === gameState.metadata.creator}
                            reactorCriticalStatus={
                              attrs.reactorCriticalTimer > 0 && attrs.hullPoints === 0
                                ? "critical"
                                : attrs.reactorCriticalTimer > 0
                                  ? "warning"
                                  : "none"
                            }
                            hasMoved={hasMoved}
                            gameViewMode={true}
                          />
                        );
                      })}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs uppercase tracking-wider text-warning-red">Opponent&apos;s Fleet</h4>
                  <div className="space-y-2">
                    {gameState.creatorActiveShipIds
                      .filter(() => isMobileJoiner)
                      .concat(gameState.joinerActiveShipIds.filter(() => !isMobileJoiner))
                      .map((shipId) => {
                        const ship = shipMap.get(Number(shipId));
                        const attrs = getShipAttributes(shipId);
                        const hasMoved = movedShipIdsSet.has(shipId);
                        if (!ship || !attrs) return null;
                        return (
                          <ShipCard
                            key={`opp-${shipId}`}
                            ship={ship}
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
                            isCurrentPlayerShip={false}
                            flipShip={ship.owner === gameState.metadata.creator}
                            reactorCriticalStatus={
                              attrs.reactorCriticalTimer > 0 && attrs.hullPoints === 0
                                ? "critical"
                                : attrs.reactorCriticalTimer > 0
                                  ? "warning"
                                  : "none"
                            }
                            hasMoved={hasMoved}
                            gameViewMode={true}
                          />
                        );
                      })}
                  </div>
                </div>
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
        isLandscapeMobile ? "h-[100dvh] overflow-hidden" : ""
      } ${
        isLandscapeMobile ? "gap-2 pb-2" : "gap-6"
      } ${
        chromeOnSide ? GAME_VIEW_SIDE_ROOT_CLASS : "mx-auto w-full"
      }`}
      style={
        isLandscapeMobile
          ? {
              marginLeft: 0,
              width: "100%",
              maxWidth: "none",
            }
          : chromeOnSide
          ? {
              marginLeft: "8px",
            }
          : undefined
      }
    >
      <div
        className={
          chromeOnSide
            ? "flex min-h-0 min-w-0 flex-row items-stretch gap-4 pt-3"
            : "flex flex-col gap-6 pt-3"
        }
      >
        {/* Header: back + game/round/turn + score + (optional) proposed move + Flee locked */}
        <div
          className={
            chromeOnSide
              ? "flex min-h-0 self-stretch w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-hidden pl-2 pr-1"
              : "flex items-start justify-between gap-6"
          }
        >
          <div
            className={
              chromeOnSide
                ? "flex shrink-0 flex-col items-stretch gap-3"
                : "flex items-center gap-4"
            }
          >
            <div className="flex w-full min-w-0 items-stretch gap-2">
              <div className="flex w-1/5 min-h-0 shrink-0 justify-start">
                <button
                  onClick={onBack}
                  className="flex min-h-0 w-full items-center justify-center px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-slate)";
                    e.currentTarget.style.borderColor = "var(--color-cyan)";
                    e.currentTarget.style.color = "var(--color-cyan)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-steel)";
                    e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  ←
                </button>
              </div>
              <div className="flex min-h-0 w-4/5 min-w-0 flex-col justify-center">
                <FleeSafetySwitch gameId={0} locked />
              </div>
            </div>
            <div
              className={
                chromeOnSide ? "flex flex-col gap-2" : "flex items-start gap-6"
              }
            >
              <div className="flex flex-col gap-3">
                {/* Meta strip */}
                <div className="flex items-center gap-2 border-b border-solid pb-2" style={{ borderColor: "var(--color-gunmetal)", ...STYLE_LABEL }}>
                  <span className="font-bold uppercase tracking-wider" style={{ fontSize: 17, color: "var(--color-text-primary)" }}>GAME 0</span>
                  <span style={{ color: "var(--color-text-muted)" }}>·</span>
                  <span className="uppercase tracking-wide" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    RND {gameState.turnState.currentRound.toString()}
                  </span>
                </div>
                {/* Turn indicator · 99:99 and static bar (no countdown in tutorial) */}
                <div className="flex flex-col gap-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider" style={{ ...STYLE_LABEL, color: isMyTurn ? "var(--color-cyan)" : "var(--color-warning-red)" }}>
                      {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                    </span>
                    <span className="text-sm" style={{ ...STYLE_MONO, color: isMyTurn ? "var(--color-cyan)" : "var(--color-warning-red)" }}>
                      99:99
                    </span>
                  </div>
                  <div className="mt-2 h-px" style={{ backgroundColor: isMyTurn ? "var(--color-cyan)" : "var(--color-warning-red)" }} />
                </div>
              </div>
              {/* Score grouped with game/round (same conceptual row as in reference) */}
              <div
                className={
                  chromeOnSide
                    ? `w-full shrink-0 border border-solid overflow-hidden ${currentStep?.id === "goals" ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]" : ""}`
                    : `w-48 shrink-0 border border-solid overflow-hidden ${currentStep?.id === "goals" ? "animate-pulse ring-2 ring-amber ring-offset-2 ring-offset-[var(--color-near-black)]" : ""}`
                }
                style={{
                  backgroundColor: currentStep?.id === "goals" ? "var(--color-steel)" : "var(--color-slate)",
                  borderColor: currentStep?.id === "goals" ? "var(--color-amber)" : "var(--color-gunmetal)",
                  borderTopColor: currentStep?.id === "goals" ? "var(--color-amber)" : "var(--color-steel)",
                  borderLeftColor: currentStep?.id === "goals" ? "var(--color-amber)" : "var(--color-steel)",
                  borderRadius: 0,
                }}
              >
                <div className="flex items-stretch" style={{ ...STYLE_MONO, fontSize: "22px" }}>
                  <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                    <span className="material-symbols-outlined leading-none" style={{ fontSize: 27, color: "var(--color-cyan)" }}>person</span>
                    <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{gameState.creatorScore.toString()}/{gameState.maxScore.toString()}</span>
                  </div>
                  <div style={{ width: 1, backgroundColor: currentStep?.id === "goals" ? "var(--color-amber)" : "var(--color-gunmetal)", flexShrink: 0 }} />
                  <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
                    <span className="material-symbols-outlined leading-none" style={{ fontSize: 27, color: "var(--color-warning-red)" }}>person</span>
                    <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{gameState.joinerScore.toString()}/{gameState.maxScore.toString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fleet status panel */}
          {chromeOnSide && (() => {
            const myIds = gameState.creatorActiveShipIds;
            const enemyIds = gameState.joinerActiveShipIds;

            const renderCard = (shipId: string, teamColor: string, flip: boolean) => {
              const id = Number(shipId);
              const ship = shipMap.get(id);
              const attrs = getShipAttributes(id);
              const hasMoved = movedShipIdsSet.has(shipId);
              const isSOS = !!attrs && attrs.hullPoints === 0;
              const hpPct = attrs && attrs.maxHullPoints > 0
                ? Math.max(0, (attrs.hullPoints / attrs.maxHullPoints) * 100)
                : 0;
              const shipPos = gameState.shipPositions.find((sp) => sp.shipId === shipId);
              const isHoveredFromGrid = hoveredCell?.shipId === id;
              const isSelectedInGrid = selectedShipId === id;
              return (
                <div
                  key={shipId}
                  className="flex min-w-0 w-full flex-col gap-0.5 overflow-hidden cursor-pointer"
                  style={{ opacity: hasMoved ? 0.45 : 1 }}
                  onClick={() => setSelectedShipId(id)}
                  onMouseEnter={() => shipPos && setHoveredCell({ shipId: id, row: shipPos.position.row, col: shipPos.position.col, isCreator: shipPos.isCreator, fromFleet: true })}
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
                    {myIds.map((id) => renderCard(id, "var(--color-cyan)", true))}
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
                    {enemyIds.map((id) => renderCard(id, "var(--color-warning-red)", false))}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        <div
          className={
            chromeOnSide ? "relative min-h-0 min-w-0 flex-1" : "relative w-full"
          }
        >
          <GameBoardLayout
            isCurrentPlayerTurn={isMyTurn}
            containerRef={gridContainerRef}
            onBoardChromeMouseDown={handleBoardChromeMouseDown}
          >
            {/* Fixed 17×11 aspect so the board does not resize between tutorial steps
              while state hydrates; overlay blocks interaction until ready. */}
            <div
              className="relative w-full [contain:layout]"
              style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
            >
              {!isStepHydrated && (
                <div
                  className="absolute inset-0 z-[200] flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-near-black)" }}
                  aria-busy
                  aria-live="polite"
                >
                  <span className="text-cyan font-mono">
                    Preparing tutorial step...
                  </span>
                </div>
              )}
              <div className="absolute inset-0 min-h-0 overflow-hidden">
                <GameGrid
                  grid={grid}
                  allShipPositions={allShipPositionsForGrid}
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
                  validTargets={gridValidTargets}
                  assistableTargets={gridAssistableTargets}
                  assistableTargetsFromStart={gridAssistableTargetsFromStart}
                  dragShootingRange={dragShootingRange}
                  dragValidTargets={dragValidTargets}
                  hoverValidTargets={hoverValidTargets}
                  hoverShootingRange={hoverShootingRange}
                  labelTargets={labelTargets}
                  isCurrentPlayerTurn={isMyTurn}
                  isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                  movedShipIdsSet={gridMovedShipIdsSet}
                  specialType={specialType}
                  blockedGrid={blockedGrid}
                  scoringGrid={scoringGrid}
                  onlyOnceGrid={onlyOnceGrid}
                  calculateDamage={calculateDamageForShip}
                  getShipAttributes={getShipAttributes}
                  disableTooltips={false}
                  address={TUTORIAL_PLAYER_ADDRESS}
                  currentTurn={gameState.turnState.currentTurn}
                  highlightedMovePosition={highlightedMovePosition}
                  lastMoveShipId={lastMoveProps.lastMoveShipId}
                  lastMoveOldPosition={lastMoveProps.lastMoveOldPosition}
                  lastMoveNewPosition={lastMoveProps.lastMoveNewPosition}
                  lastMoveActionType={lastMoveProps.lastMoveActionType}
                  lastMoveTargetShipId={lastMoveProps.lastMoveTargetShipId}
                  lastMoveIsCurrentPlayer={
                    lastMoveProps.lastMoveIsCurrentPlayer
                  }
                  showLastMoveEmpReplayWhenSelected={
                    currentStep?.id === "ship-destruction" ||
                    currentStep?.id === "destroy-disabled"
                  }
                  retreatPrepShipId={retreatPrepShipId}
                  retreatPrepIsCreator={retreatPrepIsCreator}
                  tutorialHighlightCells={tutorialHighlightCells}
                  tutorialDefaultLabel={tutorialDefaultLabel}
                  onGridRightClickDeselect={handleGridRightClickDeselect}
                  setSelectedShipId={wrappedSetSelectedShipId}
                  setPreviewPosition={wrappedSetPreviewPosition}
                  setTargetShipId={wrappedSetTargetShipId}
                  setSelectedWeaponType={setWeaponTypeFromGrid}
                  setHoveredCell={setHoveredCell}
                  setDraggedShipId={setDraggedShipId}
                  setDragOverCell={setDragOverCell}
                  onMoveTileHover={setHoverPreviewPosition}
                  showConfirmWidget={
                    isShowingProposedMove &&
                    previewPosition !== null &&
                    actionOverride !== ActionType.Retreat
                  }
                  onConfirmMove={handleSubmitMove}
                  onCancelMove={handleCancelMove}
                />
              </div>
              {tutorialGridPanelConfig && (
                <TutorialGridTaskPanel
                  title={tutorialGridPanelConfig.title}
                  brief={tutorialGridPanelConfig.brief}
                  tasks={tutorialGridPanelConfig.tasks}
                  tasksSectionLabel={tutorialGridPanelConfig.tasksSectionLabel}
                  primaryCta={tutorialGridPanelConfig.primaryCta}
                  panelAnchor={
                    currentStep?.id === "rescue" ||
                    currentStep?.id === "goals" ||
                    currentStep?.id === "view-enemy" ||
                    currentStep?.id === "move-ship" ||
                    currentStep?.id === "score-points" ||
                    currentStep?.id === "special-emp"
                      ? "left"
                      : "right"
                  }
                  panelVerticalAnchor={
                    currentStep?.id === "rescue" ? "bottom" : "top"
                  }
                  panelBottomRowExclusive={
                    tutorialGridPanelConfig.panelBottomRowExclusive
                  }
                  panelFitToContent={tutorialGridPanelConfig.panelFitToContent}
                  compactPreset={currentStep?.id === "welcome" ? "welcome" : undefined}
                  displayStepNumber={displayStepNumber}
                  displayTotalSteps={displayTotalSteps}
                  currentStepIndex={currentStepIndex}
                  isVisibleLastStep={isVisibleLastStep}
                  isStepComplete={isStepComplete}
                  onNext={() => nextStep()}
                  onPrevious={() => previousStep()}
                  onReset={() => resetTutorial()}
                  onQuit={onBack}
                  tutorialRewardCacheDebug={
                    isTutorialCompletionStep
                      ? {
                          onClear: handleClearTutorialRewardCache,
                          disabled: !address,
                        }
                      : undefined
                  }
                />
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
                        lastMove={lastMoveForEvents}
                        shipMap={shipMap}
                        address={TUTORIAL_PLAYER_ADDRESS}
                        appendDestroyedText={
                          currentStep?.id === "ship-destruction" ||
                          currentStep?.id === "rescue"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GameBoardLayout>
        </div>
      </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Fleet - Left (tutorial player) */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                ...STYLE_LABEL,
                color: "var(--color-cyan)",
                fontSize: "18px",
              }}
            >
              My Fleet
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
                ({gameState.metadata.creator})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.creatorActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(Number(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
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
                      flipShip={true}
                      reactorCriticalStatus={reactorCriticalStatus}
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent's Fleet - Right */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                ...STYLE_LABEL,
                color: "var(--color-warning-red)",
                fontSize: "18px",
              }}
            >
              Opponent&apos;s Fleet
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
                ({gameState.metadata.joiner})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.joinerActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(Number(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
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
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          </div>
        </div>
      )}

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border p-4" style={{ borderColor: "var(--color-cyan)" }}>
          <p className="text-cyan font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name || selectedShipId.toString()}
          </p>
          {currentStep?.allowedActions.moveShip &&
            selectedShipId.toString() ===
              currentStep.allowedActions.moveShip.shipId && (
              <p className="text-amber text-sm mt-2">
                Click a highlighted grid cell to move.
              </p>
            )}
          {currentStep?.allowedActions.shoot &&
            selectedShipId.toString() ===
              currentStep.allowedActions.shoot.shipId && (
              <p className="text-amber text-sm mt-2">
                Click a highlighted enemy ship to shoot.
              </p>
            )}
          {currentStep?.allowedActions.useSpecial &&
            selectedShipId.toString() ===
              currentStep.allowedActions.useSpecial.shipId && (
              <p className="text-amber text-sm mt-2">
                Click a highlighted ship to use your special ability.
              </p>
            )}
          {currentStep?.allowedActions.assist &&
            selectedShipId.toString() ===
              currentStep.allowedActions.assist.shipId && (
              <p className="text-amber text-sm mt-2">
                Click the highlighted friendly ship to assist it.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

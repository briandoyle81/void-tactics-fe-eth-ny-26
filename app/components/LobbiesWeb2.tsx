"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useLobbiesWeb2 } from "../hooks/useLobbiesWeb2";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import ShipCard from "./ShipCard";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { MapDisplayWeb2 } from "./MapDisplayWeb2";
import { findNextDeploymentPosition } from "../utils/mapGridUtils";
import { GRID_DIMENSIONS } from "../types/types";
import { useFleetViewWeb2 } from "../hooks/useFleetViewWeb2";
import { FleetViewModal } from "./FleetViewModal";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { LobbyCreateSection } from "./LobbyCreateSection";
import { type FleetFilters, DEFAULT_FLEET_FILTERS, matchesFleetFilters } from "../utils/fleetFilters";
import { LoadFleetMenu, type FleetLoadPlan } from "./LoadFleetMenu";
import { readFleetCompositionPersisted, type FleetComposition } from "../utils/fleetCompositionStorage";
import { Web2LobbyStatus } from "../types/web2Lobby";
import { LobbyCard } from "./LobbyCard";
import { usePlayerStatsWeb2 } from "../hooks/usePlayerStatsWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useLobbyPauseAdminWeb2 } from "../hooks/useLobbyPauseAdminWeb2";
import {
  LobbyCreateForm,
  LobbyTurnOrderNote,
  CardCheckbox,
  type ThreatScale,
  type TurnPace,
  type ScoreLength,
} from "./LobbyCreateForm";
import { AI_USER_ID } from "../config/aiUser";
import { useAIEncounterMapsWeb2 } from "../hooks/useAIEncounterMapsWeb2";
import {
  SKIRMISH_THREAT_LIMIT,
  BATTLE_THREAT_LIMIT,
  IMMEDIATE_GAME_TURN_SECONDS,
  CORRESPONDENCE_GAME_TURN_SECONDS,
  SHORT_MAX_SCORE,
  MEDIUM_MAX_SCORE,
  LONG_MAX_SCORE,
  MIN_SHIPS_FOR_LOBBIES,
  MAX_SHIPS_PER_FLEET,
} from "../utils/lobbyFormatters";
import {
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormattersWeb2";
import { WinLossBadge } from "./WinLossBadge";
import { LobbyCardActions } from "./LobbyCardActions";
import { lobbyStatusColor, lobbyStatusLabel } from "../utils/lobbyStatusDisplay";

/** Same tab-navigation mechanism as `Lobbies.tsx`'s `navigateToGamesTab` — mode-agnostic, just switches the active tab. */
function navigateToGamesTab() {
  localStorage.setItem("void-tactics-active-tab", "Games");
  localStorage.setItem("void-tactics-force-games-tab", "true");
  window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
  document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
}

/** Web2 user ids (NextAuth subs / cuids) aren't addresses, but truncating them the same way keeps the card's identity row visually consistent with web3's. */
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/** Web2-mode counterpart to `Lobbies.tsx`'s inline `CreatorStats` — same
 * W/L badge, backed by usePlayerStatsWeb2 instead of an on-chain read. */
function CreatorStatsWeb2({ userId }: { userId: string }) {
  const stats = usePlayerStatsWeb2(userId);
  if (!stats) return null;
  return <WinLossBadge wins={stats.wins} losses={stats.losses} />;
}

// Web2-mode counterpart to `Lobbies.tsx`. Lobby browse/create/join/leave,
// fleet selection with ship+starting-position picking (via the shared
// MapDisplayView, same click/drag/tap-to-place mechanics as web3), reject a
// reserved invite, and the creator/joiner timeout-penalty actions. See
// docs/merge-explore-traditional-plan.md for what's still open — most
// notably, once a lobby's fleets are both submitted a Game row is created,
// but there is no web2 GameDisplay yet to actually play it.

const LobbiesWeb2: React.FC = () => {
  const { userId, email: currentUserEmail } = useCurrentUser();
  const {
    lobbyList,
    loadLobbies,
    createLobby,
    createAILobby,
    joinLobby,
    leaveLobby,
    createFleet,
    acceptGame,
    rejectGame,
    timeoutJoiner,
    quitWithPenalty,
    playerState,
    freeGamesPerAddress,
    lobbyCreationCostUtc,
    reservationFeeUtc,
    paused,
  } = useLobbiesWeb2();
  const { ships, isLoading: shipsLoading } = useOwnedShipsWeb2();
  const isAdmin = useWeb2Admin();
  const { setPaused } = useLobbyPauseAdminWeb2();
  const [pauseToggleBusy, setPauseToggleBusy] = useState(false);
  const handleTogglePaused = async () => {
    setPauseToggleBusy(true);
    try {
      await setPaused(!paused);
      toast.success(paused ? "Lobby creation resumed" : "Lobby creation paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pause state");
    } finally {
      setPauseToggleBusy(false);
    }
  };

  const [reservedJoinerEmail, setReservedJoinerEmail] = useState("");
  const [opponentMode, setOpponentMode] = useState<"pvp" | "ai">("pvp");
  const [aiMapId, setAiMapId] = useState<number | null>(null);
  const { mapIds: aiMapIds, isLoading: aiMapsLoading } = useAIEncounterMapsWeb2();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [costLimit, setCostLimit] = useState(SKIRMISH_THREAT_LIMIT);
  const [turnTimeSeconds, setTurnTimeSeconds] = useState(IMMEDIATE_GAME_TURN_SECONDS);
  // Matches web3 Lobbies.tsx's create-form default (scoreLength: "medium").
  const [maxScore, setMaxScore] = useState(MEDIUM_MAX_SCORE);
  const [busy, setBusy] = useState(false);
  const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);
  const [viewingFleet, setViewingFleet] = useState<{ lobbyId: number; fleetId: number } | null>(null);
  const fleetView = useFleetViewWeb2(viewingFleet?.lobbyId ?? null, viewingFleet?.fleetId ?? null);

  // Fleet-selection ship placement — mirrors Lobbies.tsx's shipPositions/
  // selectedShipId/drag-and-drop/tap-to-place state so web2 fleets carry
  // real starting positions instead of leaving them for the server default.
  const [shipPositions, setShipPositions] = useState<Array<{ shipId: number; row: number; col: number }>>([]);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const lastDragOverPositionRef = useRef<{ row: number; col: number } | null>(null);
  const [tapPendingShipId, setTapPendingShipId] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [fleetFilters, setFleetFilters] = useState<FleetFilters>(DEFAULT_FLEET_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showLoadFleetMenu, setShowLoadFleetMenu] = useState(false);
  const [showFleetConfirmation, setShowFleetConfirmation] = useState(false);
  const [showInGameProperties, setShowInGameProperties] = useState(true);

  const savedFleetCompositions = useMemo(
    () => (userId ? readFleetCompositionPersisted(userId).fleets : []),
    [userId],
  );
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  const selectedShipIds = useMemo(
    () => new Set(shipPositions.map((p) => p.shipId)),
    [shipPositions],
  );

  // Selected ships bypass filters (so you don't lose sight of ships you've
  // already picked while adjusting filter criteria), matching Lobbies.tsx's
  // filteredShips. Lifted to component scope (rather than computed inline in
  // the fleet-selection modal's render) so its ship ids can feed the
  // in-game-attributes hook below, which — being a hook — can't live inside
  // the modal's render-time IIFE.
  const filteredShips = useMemo(
    () =>
      ships.filter((s) => {
        if (selectedShipIds.has(s.id)) return true;
        return matchesFleetFilters(
          {
            cost: s.shipData.cost,
            isShiny: s.shipData.shiny,
            accuracy: s.traits.accuracy,
            hull: s.traits.hull,
            speed: s.traits.speed,
            isConstructed: s.shipData.constructed,
            isDestroyed: s.shipData.timestampDestroyed > 0,
            inFleet: s.shipData.inFleet,
            mainWeapon: s.equipment.mainWeapon,
            shields: s.equipment.shields,
            special: s.equipment.special,
          },
          fleetFilters,
        );
      }),
    [ships, selectedShipIds, fleetFilters],
  );

  const filteredShipIds = useMemo(
    () => (selectedLobbyId ? filteredShips.map((s) => s.id) : []),
    [selectedLobbyId, filteredShips],
  );
  const {
    attributesByShipId,
    isLoading: attributesLoading,
    isFromCache,
  } = useShipAttributesByIdsWeb2(filteredShipIds);

  const constructedShipCount = ships.filter(
    (s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0,
  ).length;

  // Same three-state gating as Lobbies.tsx: loading vs "own too few ships"
  // vs "own enough but haven't constructed enough".
  const needsShipsForLobbyUi =
    !!userId && !shipsLoading && ships.length < MIN_SHIPS_FOR_LOBBIES;
  const needsConstructForLobbyUi =
    !!userId &&
    !shipsLoading &&
    ships.length >= MIN_SHIPS_FOR_LOBBIES &&
    constructedShipCount < MIN_SHIPS_FOR_LOBBIES;
  const lobbyUiLoadingShips = !!userId && shipsLoading;

  const navigateToManageNavyForShips = () => {
    window.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-manage-navy", { bubbles: true }),
    );
    document.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-manage-navy", { bubbles: true }),
    );
  };

  const myLobby = useMemo(
    () =>
      lobbyList.lobbies.find(
        (l) => l.basic.creator === userId || l.players.joiner === userId,
      ),
    [lobbyList.lobbies, userId],
  );

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
    } finally {
      setBusy(false);
    }
  };

  // Default the AI map picker to the first available AI-configured map.
  useEffect(() => {
    if (aiMapId === null && aiMapIds.length > 0) setAiMapId(aiMapIds[0]);
  }, [aiMapId, aiMapIds]);

  const handleCreate = () =>
    run("create lobby", async () => {
      if (opponentMode === "ai") {
        if (aiMapId === null) return;
        await createAILobby({ costLimit, turnTimeSeconds, maxScore, mapId: aiMapId });
        setShowCreateForm(false);
        toast.success("Match against AI created");
        return;
      }
      // Matches web3's Lobbies.tsx, which also has no real map picker (its
      // "Map" field is a locked input hardcoded to map 1) — this keeps both
      // modes on the same fixed map rather than leaving mapId unset (which
      // left games with no blocked/scoring tiles).
      await createLobby({
        costLimit,
        turnTimeSeconds,
        maxScore,
        selectedMapId: 1,
        reservedJoinerEmail: reservedJoinerEmail.trim() || undefined,
      });
      setReservedJoinerEmail("");
      setShowCreateForm(false);
      toast.success("Lobby created");
    });

  const threatScale: ThreatScale = costLimit === BATTLE_THREAT_LIMIT ? "battle" : "skirmish";
  const turnPace: TurnPace =
    turnTimeSeconds === CORRESPONDENCE_GAME_TURN_SECONDS ? "correspondence" : "immediate";
  const scoreLength: ScoreLength =
    maxScore === LONG_MAX_SCORE ? "long" : maxScore === MEDIUM_MAX_SCORE ? "medium" : "short";

  const handleJoin = (lobbyId: number) =>
    run("join lobby", async () => {
      await joinLobby(lobbyId);
      toast.success("Joined lobby");
    });

  const handleLeave = (lobbyId: number) =>
    run("leave lobby", async () => {
      await leaveLobby(lobbyId);
      toast.success("Left lobby");
    });

  const handleAccept = (lobbyId: number) =>
    run("accept game", async () => {
      await acceptGame(lobbyId);
      toast.success("Game accepted!");
    });

  const handleReject = (lobbyId: number) =>
    run("reject invite", async () => {
      await rejectGame(lobbyId);
      toast.success("Invite declined");
    });

  const handleTimeoutJoiner = (lobbyId: number) =>
    run("timeout joiner", () => timeoutJoiner(lobbyId));

  const handleQuitWithPenalty = (lobbyId: number) =>
    run("quit with penalty", () => quitWithPenalty(lobbyId));

  const selectedCost = ships
    .filter((s) => selectedShipIds.has(s.id))
    .reduce((sum, s) => sum + s.shipData.cost, 0);

  const selectedLobby = useMemo(
    () => lobbyList.lobbies.find((l) => l.basic.id === selectedLobbyId) ?? null,
    [lobbyList.lobbies, selectedLobbyId],
  );

  // While the fleet-selection modal is open and waiting on the opponent's
  // fleet, poll faster than the list's normal background interval — mirrors
  // Lobbies.tsx's isWaitingForOtherFleet effect, so "WAITING FOR OPPOSING
  // ADMIRAL" clears promptly once they submit.
  const isWaitingForOtherFleet =
    !!selectedLobby &&
    (selectedLobby.players.creatorFleetId === 0 || selectedLobby.players.joinerFleetId === 0);
  useEffect(() => {
    if (!selectedLobbyId || !isWaitingForOtherFleet) return;
    const interval = setInterval(() => {
      loadLobbies();
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedLobbyId, isWaitingForOtherFleet, loadLobbies]);

  // Function to add ship to fleet with a default position
  const addShipToFleet = (shipId: number, isCreator: boolean) => {
    const existingPositions = shipPositions.map((pos) => ({ row: pos.row, col: pos.col }));
    const position = findNextDeploymentPosition(isCreator, existingPositions);
    if (position) {
      setShipPositions((prev) => [...prev, { shipId, row: position.row, col: position.col }]);
    }
  };

  const removeShipFromFleet = (shipId: number) => {
    setShipPositions((prev) => prev.filter((pos) => pos.shipId !== shipId));
    if (selectedShipId === shipId) setSelectedShipId(null);
  };

  const handleShipSelect = (shipId: number) => {
    setSelectedShipId(shipId);
    setTapPendingShipId(null);
  };

  const handleShipMove = (shipId: number, row: number, col: number, isCreator: boolean) => {
    const inDeploymentZone = isCreator ? col >= 0 && col <= 3 : col >= 13 && col <= 16;
    const isValidPosition =
      row >= 0 && row < GRID_DIMENSIONS.HEIGHT && col >= 0 && col < GRID_DIMENSIONS.WIDTH && inDeploymentZone;
    if (!isValidPosition) return;

    const existingPosition = shipPositions.find((pos) => pos.row === row && pos.col === col);
    if (existingPosition) return;

    if (!shipPositions.some((pos) => pos.shipId === shipId)) {
      setShipPositions((prev) => [...prev, { shipId, row, col }]);
      setTapPendingShipId(null);
      return;
    }

    setShipPositions((prev) => prev.map((pos) => (pos.shipId === shipId ? { ...pos, row, col } : pos)));
    setSelectedShipId(null);
    setTapPendingShipId(null);
  };

  const handleDragStart = (shipId: number) => setDraggedShipId(shipId);
  const handleDragEnd = () => {
    setDraggedShipId(null);
    setDragOverPosition(null);
    lastDragOverPositionRef.current = null;
  };
  const handleDragOver = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault();
    const newPosition = { row, col };
    const lastPosition = lastDragOverPositionRef.current;
    if (!lastPosition || lastPosition.row !== row || lastPosition.col !== col) {
      lastDragOverPositionRef.current = newPosition;
      setDragOverPosition(newPosition);
    }
  };
  const handleDrop = (row: number, col: number, e: React.DragEvent | undefined, isCreator: boolean) => {
    let shipIdToMove = draggedShipId;
    if (!shipIdToMove && e) {
      const data = e.dataTransfer.getData("text/plain");
      if (data) {
        const parsed = Number(data);
        if (!Number.isNaN(parsed)) shipIdToMove = parsed;
      }
    }
    if (shipIdToMove === null) return;
    handleShipMove(shipIdToMove, row, col, isCreator);
    setDraggedShipId(null);
    setDragOverPosition(null);
    lastDragOverPositionRef.current = null;
  };

  // Ship list tap handler — desktop adds immediately, touch enters pending-placement mode
  const handleListShipTap = (shipId: number, canSelect: boolean, isCreator: boolean) => {
    if (!canSelect) return;
    if (selectedShipIds.has(shipId)) {
      removeShipFromFleet(shipId);
      setTapPendingShipId(null);
    } else if (isTouchDevice) {
      setTapPendingShipId((prev) => (prev === shipId ? null : shipId));
    } else {
      addShipToFleet(shipId, isCreator);
    }
  };

  const resetFleetSelectionModalState = () => {
    setSelectedLobbyId(null);
    setShipPositions([]);
    setSelectedShipId(null);
    setTapPendingShipId(null);
    setDraggedShipId(null);
    setDragOverPosition(null);
    setFiltersExpanded(false);
    setShowLoadFleetMenu(false);
    setShowFleetConfirmation(false);
  };

  const clearFleetDraftSelection = () => {
    setShipPositions([]);
    setSelectedShipId(null);
    setShowLoadFleetMenu(false);
  };

  const applyLoadedFleetSelection = (shipIdsToLoad: number[], isCreator: boolean) => {
    const placedShipIds: number[] = [];
    const nextPositions: Array<{ shipId: number; row: number; col: number }> = [];
    const existingPositions: Array<{ row: number; col: number }> = [];
    for (const shipId of shipIdsToLoad) {
      const position = findNextDeploymentPosition(isCreator, existingPositions);
      if (!position) break;
      placedShipIds.push(shipId);
      nextPositions.push({ shipId, row: position.row, col: position.col });
      existingPositions.push(position);
    }

    setShipPositions(nextPositions);
    setSelectedShipId(null);
    setShowLoadFleetMenu(false);

    if (placedShipIds.length === 0) {
      toast.error("No ships could be loaded into deployment slots");
    } else if (placedShipIds.length < shipIdsToLoad.length) {
      toast.error(
        `Loaded ${placedShipIds.length}/${shipIdsToLoad.length} ships due to deployment capacity.`,
      );
    } else {
      toast.success(`Loaded ${placedShipIds.length} ships from saved fleet.`);
    }
  };

  const getFleetSummary = (fleet: FleetComposition) => {
    let availableCount = 0;
    let unavailableCount = 0;
    let totalThreat = 0;
    for (const shipIdString of fleet.shipIds) {
      const ship = ships.find((s) => String(s.id) === shipIdString);
      if (!ship) {
        unavailableCount++;
        continue;
      }
      totalThreat += ship.shipData.cost;
      if (ship.shipData.constructed && ship.shipData.timestampDestroyed === 0 && !ship.shipData.inFleet) {
        availableCount++;
      } else {
        unavailableCount++;
      }
    }
    return { totalShips: fleet.shipIds.length, totalThreat, availableCount, unavailableCount };
  };

  const getFleetLoadPlan = (fleet: FleetComposition, isCreator: boolean): FleetLoadPlan => {
    const availableShipIds: number[] = [];
    let unavailableCount = 0;
    for (const shipIdString of fleet.shipIds) {
      const ship = ships.find((s) => String(s.id) === shipIdString);
      if (!ship || !ship.shipData.constructed || ship.shipData.timestampDestroyed > 0 || ship.shipData.inFleet) {
        unavailableCount++;
        continue;
      }
      availableShipIds.push(ship.id);
    }
    return {
      availableCount: availableShipIds.length,
      unavailableCount,
      load: () => applyLoadedFleetSelection(availableShipIds, isCreator),
    };
  };

  const handleSubmitFleet = (lobbyId: number) =>
    run("submit fleet", async () => {
      const shipIds = shipPositions.map((p) => p.shipId);
      const startingPositions = shipPositions.map((p) => ({ row: p.row, col: p.col }));
      const result = await createFleet(lobbyId, shipIds, startingPositions);
      resetFleetSelectionModalState();
      toast.success(
        result.gameId
          ? `Fleet submitted — game #${result.gameId} started`
          : "Fleet submitted — waiting on opponent",
      );
    });

  const handleCreateFleetModal = (lobbyId: number) => {
    if (shipPositions.length === 0) return;
    if (shipPositions.length > MAX_SHIPS_PER_FLEET) {
      toast.error(
        `A fleet can have at most ${MAX_SHIPS_PER_FLEET} ships for this map. Remove ships until you are at or below the limit.`,
      );
      return;
    }

    const lobby = lobbyList.lobbies.find((l) => l.basic.id === lobbyId);
    const lobbyCostLimit = lobby ? lobby.basic.costLimit : 1000;
    const isOverLimit = lobbyCostLimit > 0 && selectedCost > lobbyCostLimit;
    const isUnder90Percent = lobbyCostLimit > 0 && selectedCost < lobbyCostLimit * 0.9;

    if (isOverLimit) {
      toast.error(
        `Fleet threat (${selectedCost}) exceeds this lobby limit (${lobbyCostLimit}). Remove ships or pick a different lobby.`,
      );
      return;
    }

    if (isUnder90Percent) {
      setShowFleetConfirmation(true);
      return;
    }

    handleSubmitFleet(lobbyId);
  };

  const createFleetWithConfirmation = (lobbyId: number) => {
    setShowFleetConfirmation(false);
    handleSubmitFleet(lobbyId);
  };

  return (
    <div className="flex flex-col gap-6">
      {isAdmin && (
        <div
          className="mb-6 flex items-center justify-between gap-3 border border-warning-red/60 bg-black/40 p-3 font-mono text-sm"
          style={{ borderRadius: 0 }}
        >
          <span className="text-warning-red">
            [ADMIN] Lobby creation is currently {paused ? "PAUSED" : "OPEN"}
          </span>
          <button
            type="button"
            onClick={() => void handleTogglePaused()}
            disabled={pauseToggleBusy}
            className="border border-warning-red px-3 py-1 text-xs font-bold text-warning-red hover:bg-warning-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: 0 }}
          >
            {pauseToggleBusy ? "UPDATING…" : paused ? "RESUME LOBBIES" : "PAUSE LOBBIES"}
          </button>
        </div>
      )}

      <LobbyCreateSection
        isSignedIn={!!userId}
        shipsLoading={lobbyUiLoadingShips}
        needsShips={needsShipsForLobbyUi}
        needsConstruct={needsConstructForLobbyUi}
        constructedReadyCount={constructedShipCount}
        onNavigateToManageNavy={navigateToManageNavyForShips}
        activeLobbiesCount={myLobby ? 1 : 0}
        kickCount={playerState.kickCount}
        hasActiveLobby={!!myLobby}
        freeGames={freeGamesPerAddress}
        canCreateLobby={!!userId && !paused}
        disabledLabel={paused ? "LOBBIES PAUSED" : null}
        showCreateForm={showCreateForm}
        onToggleCreateForm={() => setShowCreateForm(true)}
        createFormElement={
          <LobbyCreateForm
            threatScale={threatScale}
            onThreatScaleChange={(v) => setCostLimit(v === "battle" ? BATTLE_THREAT_LIMIT : SKIRMISH_THREAT_LIMIT)}
            turnPace={turnPace}
            onTurnPaceChange={(v) =>
              setTurnTimeSeconds(v === "correspondence" ? CORRESPONDENCE_GAME_TURN_SECONDS : IMMEDIATE_GAME_TURN_SECONDS)
            }
            scoreLength={scoreLength}
            onScoreLengthChange={(v) =>
              setMaxScore(v === "long" ? LONG_MAX_SCORE : v === "medium" ? MEDIUM_MAX_SCORE : SHORT_MAX_SCORE)
            }
            mapIdLabel={opponentMode === "ai" ? String(aiMapId ?? "") : "1"}
            onClose={() => setShowCreateForm(false)}
            extraFields={
              <>
                <div>
                  <span className="block text-sm text-text-muted mb-2">Opponent</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <CardCheckbox
                      checked={opponentMode === "pvp"}
                      onCheck={(c) => setOpponentMode(c ? "pvp" : "ai")}
                      label="Player"
                      caption="Open lobby or reserve for a specific email"
                    />
                    <CardCheckbox
                      checked={opponentMode === "ai"}
                      onCheck={(c) => setOpponentMode(c ? "ai" : "pvp")}
                      label="AI"
                      caption="AI opponent — same fees/flow as a reserved match"
                    />
                  </div>
                </div>
                {opponentMode === "ai" ? (
                  <>
                    <div>
                      <span className="block text-sm text-text-muted mb-2">Map</span>
                      {aiMapsLoading ? (
                        <p className="text-xs text-text-muted">Loading AI-configured maps...</p>
                      ) : aiMapIds.length === 0 ? (
                        <p className="text-xs text-warning-red">No maps have AI content configured yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                          {aiMapIds.map((id) => (
                            <CardCheckbox
                              key={id}
                              checked={aiMapId === id}
                              onCheck={(c) => c && setAiMapId(id)}
                              label={`Map ${id}`}
                              caption="AI encounter configured"
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <LobbyTurnOrderNote />
                    <div className="border border-amber/60 bg-black/30 p-3 font-mono text-xs space-y-1">
                      <p className="text-amber font-bold tracking-wider">{"// COST BREAKDOWN"}</p>
                      {playerState.lobbiesCreatedCount >= freeGamesPerAddress && lobbyCreationCostUtc > 0 ? (
                        <div className="flex justify-between gap-4">
                          <span className="text-text-secondary">Lobby fee (free games exhausted)</span>
                          <span className="text-amber font-bold shrink-0">{lobbyCreationCostUtc} UTC</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-4">
                        <span className="text-text-secondary">Reservation fee (vs AI)</span>
                        <span className="text-amber font-bold shrink-0">{reservationFeeUtc} UTC</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-text-muted mb-1">
                        Reserve for Player (Optional — enter their email)
                      </label>
                      <input
                        type="text"
                        value={reservedJoinerEmail}
                        onChange={(e) => setReservedJoinerEmail(e.target.value)}
                        className={`w-full px-3 py-2 bg-black/60 border rounded-none text-cyan ${
                          reservedJoinerEmail.trim() &&
                          currentUserEmail &&
                          reservedJoinerEmail.trim().toLowerCase() === currentUserEmail.toLowerCase()
                            ? "border-warning-red"
                            : "border-amber"
                        }`}
                        placeholder="player@example.com (leave empty for open lobby)"
                      />
                      {reservedJoinerEmail.trim() &&
                      currentUserEmail &&
                      reservedJoinerEmail.trim().toLowerCase() === currentUserEmail.toLowerCase() ? (
                        <p className="text-xs text-warning-red mt-1 font-bold">
                          [ERR] Cannot reserve a lobby for yourself! Please enter a
                          different player&apos;s email or leave empty for an open
                          lobby.
                        </p>
                      ) : reservedJoinerEmail.trim() ? (
                        <p className="text-xs text-amber mt-1">
                          {`// Requires ${reservationFeeUtc} UTC to reserve game for this player`}
                        </p>
                      ) : (
                        <p className="text-xs text-amber mt-1">
                          Leave empty to create an open lobby
                        </p>
                      )}
                    </div>
                    <LobbyTurnOrderNote />
                    {/* Cost summary — only shown when fees apply */}
                    {(playerState.lobbiesCreatedCount >= freeGamesPerAddress && lobbyCreationCostUtc > 0) ||
                    (reservedJoinerEmail.trim() &&
                      currentUserEmail &&
                      reservedJoinerEmail.trim().toLowerCase() !== currentUserEmail.toLowerCase()) ? (
                      <div className="border border-amber/60 bg-black/30 p-3 font-mono text-xs space-y-1">
                        <p className="text-amber font-bold tracking-wider">{"// COST BREAKDOWN"}</p>
                        {playerState.lobbiesCreatedCount >= freeGamesPerAddress && lobbyCreationCostUtc > 0 ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Lobby fee (free games exhausted)</span>
                            <span className="text-amber font-bold shrink-0">{lobbyCreationCostUtc} UTC</span>
                          </div>
                        ) : null}
                        {reservedJoinerEmail.trim() &&
                        currentUserEmail &&
                        reservedJoinerEmail.trim().toLowerCase() !== currentUserEmail.toLowerCase() ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Reservation fee (private lobby)</span>
                            <span className="text-amber font-bold shrink-0">{reservationFeeUtc} UTC</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </>
            }
            footer={
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleCreate}
                  disabled={
                    busy ||
                    (opponentMode === "ai"
                      ? aiMapId === null
                      : !!(
                          reservedJoinerEmail.trim() &&
                          currentUserEmail &&
                          reservedJoinerEmail.trim().toLowerCase() === currentUserEmail.toLowerCase()
                        ))
                  }
                  className="w-full flex-1 px-6 py-3 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent sm:w-auto"
                >
                  CREATE
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="w-full px-4 py-2 border border-warning-red text-warning-red hover:bg-warning-red/20 sm:w-auto"
                  style={{ borderRadius: 0 }}
                >
                  CANCEL
                </button>
              </div>
            }
          />
        }
      />

      {!lobbyUiLoadingShips && !needsShipsForLobbyUi && !needsConstructForLobbyUi && (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-lg font-bold text-cyan">AVAILABLE LOBBIES</h4>
          <button
            onClick={() => loadLobbies()}
            className="w-full px-3 py-2 text-xs border border-cyan text-cyan hover:bg-cyan/10 sm:w-auto sm:py-1"
            style={{ borderRadius: 0 }}
          >
            REFRESH
          </button>
        </div>
        {lobbyList.isLoading ? (
          <div className="text-center text-text-muted">ACQUIRING DATA...</div>
        ) : lobbyList.error ? (
          <div className="text-center text-warning-red">[ERR]: {lobbyList.error}</div>
        ) : lobbyList.lobbies.length === 0 ? (
          <div className="text-center text-text-muted">[NO OPEN ENGAGEMENTS]</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lobbyList.lobbies.map((lobby) => {
            const isCreatorMe = lobby.basic.creator === userId;
            const isJoinerMe = lobby.players.joiner === userId;
            const isReservedForMe = lobby.players.reservedJoiner === userId;
            const hasReservedJoiner = lobby.players.reservedJoiner !== "";
            const isFleetSelection = lobby.state.status === Web2LobbyStatus.FleetSelection;
            const myFleetId = isCreatorMe ? lobby.players.creatorFleetId : lobby.players.joinerFleetId;
            const opponentFleetId = isCreatorMe ? lobby.players.joinerFleetId : lobby.players.creatorFleetId;
            return (
              <LobbyCard
                key={lobby.basic.id}
                lobbyIdLabel={String(lobby.basic.id)}
                isCreatorMe={isCreatorMe}
                statusColorClass={lobbyStatusColor(lobby.state.status)}
                statusText={lobbyStatusLabel(lobby.state.status)}
                creatorLabel={truncateId(lobby.basic.creator)}
                creatorStats={<CreatorStatsWeb2 userId={lobby.basic.creator} />}
                joinerLabel={
                  lobby.players.joiner === AI_USER_ID
                    ? "AI"
                    : lobby.players.joiner
                      ? truncateId(lobby.players.joiner)
                      : null
                }
                isJoinerMe={isJoinerMe}
                joinerStats={
                  lobby.players.joiner && lobby.players.joiner !== AI_USER_ID ? (
                    <CreatorStatsWeb2 userId={lobby.players.joiner} />
                  ) : undefined
                }
                reservedLabel={hasReservedJoiner ? truncateId(lobby.players.reservedJoiner) : null}
                threatLabel={formatThreatShort(lobby.basic.costLimit)}
                turnLabel={formatTurnShort(lobby.gameConfig.turnTime)}
                mapLabel={`#${lobby.gameConfig.selectedMapId}`}
                scoreLabel={formatScoreShort(lobby.gameConfig.maxScore)}
                creatorFleetButton={
                  lobby.players.creatorFleetId > 0 ? (
                    <button
                      onClick={() => setViewingFleet({ lobbyId: lobby.basic.id, fleetId: lobby.players.creatorFleetId })}
                      className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                        isCreatorMe
                          ? "border-amber text-amber hover:bg-amber/10"
                          : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      CMDR FLEET #{lobby.players.creatorFleetId}
                    </button>
                  ) : undefined
                }
                joinerFleetButton={
                  lobby.players.joinerFleetId > 0 ? (
                    <button
                      onClick={() => setViewingFleet({ lobbyId: lobby.basic.id, fleetId: lobby.players.joinerFleetId })}
                      className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                        isJoinerMe
                          ? "border-cyan text-cyan hover:bg-cyan/10"
                          : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      JOIN FLEET #{lobby.players.joinerFleetId}
                    </button>
                  ) : undefined
                }
                actions={
                  <LobbyCardActions
                    status={lobby.state.status}
                    isCreatorMe={isCreatorMe}
                    isJoinerMe={isJoinerMe}
                    hasJoiner={!!lobby.players.joiner}
                    hasReservedJoiner={hasReservedJoiner}
                    isReservedForMe={isReservedForMe}
                    reservedLabel={truncateId(lobby.players.reservedJoiner)}
                    hasActiveLobby={!!myLobby}
                    myFleetId={myFleetId}
                    opponentFleetId={opponentFleetId}
                    onGoToGames={navigateToGamesTab}
                    onSelectFleet={() => setSelectedLobbyId(lobby.basic.id)}
                    joinButton={
                      <button
                        onClick={() => handleJoin(lobby.basic.id)}
                        disabled={busy || !!myLobby}
                        className="w-full px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        JOIN LOBBY
                      </button>
                    }
                    acceptButton={
                      <button
                        onClick={() => handleAccept(lobby.basic.id)}
                        disabled={busy || !!myLobby}
                        className="flex-1 px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ACCEPT
                      </button>
                    }
                    rejectButton={
                      <button
                        onClick={() => handleReject(lobby.basic.id)}
                        disabled={busy}
                        className="flex-1 px-6 py-3 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        REJECT
                      </button>
                    }
                    leaveButton={
                      <button
                        onClick={() => handleLeave(lobby.basic.id)}
                        disabled={busy}
                        className="w-full px-4 py-2.5 border border-warning-red/60 text-warning-red/70 hover:border-warning-red hover:text-warning-red hover:bg-warning-red/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        LEAVE LOBBY
                      </button>
                    }
                    creatorExtraControls={
                      isFleetSelection ? (
                        <button
                          onClick={() => handleTimeoutJoiner(lobby.basic.id)}
                          disabled={busy}
                          className="w-full px-4 py-2.5 border border-amber/60 text-amber/80 hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          TIMEOUT JOINER
                        </button>
                      ) : undefined
                    }
                    joinerExtraControls={
                      isFleetSelection ? (
                        <button
                          onClick={() => handleQuitWithPenalty(lobby.basic.id)}
                          disabled={busy}
                          className="w-full px-4 py-2.5 border border-amber/60 text-amber/80 hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          QUIT (PENALIZE CREATOR)
                        </button>
                      ) : undefined
                    }
                  />
                }
              />
            );
          })}
        </div>
        )}
      </div>
      )}

      {/* Fleet Selection Modal — shares FleetSelectionModal.tsx's chrome with
          Lobbies.tsx (web3's layout is canonical). One deliberate gap: web3's
          "stale costs version" gate has no web2 equivalent by design — GET
          /api/ships already recalculates any stale ship costs server-side
          (recalcStaleShips.ts) before returning them, so a web2 fleet can
          never contain a ship with an out-of-date cost to gate against. */}
      {selectedLobby &&
        (() => {
          const lobby = selectedLobby;
          const isCreator = lobby.basic.creator === userId;
          const myFleetId = isCreator ? lobby.players.creatorFleetId : lobby.players.joinerFleetId;
          const opponentFleetId = isCreator ? lobby.players.joinerFleetId : lobby.players.creatorFleetId;
          const participantHasFleet = myFleetId > 0;
          const opponentHasFleet = opponentFleetId > 0;
          const lobbyCostLimit = lobby.basic.costLimit;
          const isOverLimit = lobbyCostLimit > 0 && selectedCost > lobbyCostLimit;
          const isUnder90Percent = lobbyCostLimit > 0 && selectedCost < lobbyCostLimit * 0.9;

          // Same as Lobbies.tsx's hasMovedShip: require at least one ship off the
          // default deployment column (creator: col 0, joiner: far-right column)
          // before allowing submission, so players actually engage the placement UI.
          const hasMovedShip =
            shipPositions.length > 0 &&
            shipPositions.some((pos) =>
              isCreator ? pos.col !== 0 : pos.col !== GRID_DIMENSIONS.WIDTH - 1,
            );

          const shipListItems = filteredShips.map((s) => {
            const canSelect = s.shipData.timestampDestroyed === 0 && s.shipData.constructed && !s.shipData.inFleet;
            return {
              key: String(s.id),
              canSelect,
              isPending: tapPendingShipId === s.id,
              isTouchDevice,
              onDragStart: () => handleDragStart(s.id),
              onDragEnd: handleDragEnd,
              card: (
                <ShipCard
                  ship={toShipCardDataWeb2(s)}
                  shipImage={<ShipImageWeb2 ship={s} className="h-full w-full" />}
                  isStarred={false}
                  onToggleStar={() => {}}
                  isSelected={selectedShipIds.has(s.id)}
                  onToggleSelection={() => handleListShipTap(s.id, canSelect, isCreator)}
                  onRecycleClick={() => {}}
                  showInGameProperties={showInGameProperties}
                  inGameAttributes={attributesByShipId.get(s.id)}
                  attributesLoading={attributesLoading}
                  selectionMode
                  hideRecycle
                  hideCheckbox
                  onCardClick={() => handleListShipTap(s.id, canSelect, isCreator)}
                  canSelect={canSelect}
                  flipShip={isCreator}
                />
              ),
            };
          });

          const mapDisplay = (
            <MapDisplayWeb2
              mapId={lobby.gameConfig.selectedMapId}
              className="w-full h-full"
              showPlayerOverlay
              showDeployZoneLabel
              pendingPlacementShipId={tapPendingShipId}
              isCreator={isCreator}
              isCreatorViewer={isCreator}
              shipPositions={shipPositions}
              ships={ships.filter((s) => selectedShipIds.has(s.id))}
              selectedShipId={selectedShipId}
              onShipSelect={handleShipSelect}
              onShipMove={(shipId, row, col) => handleShipMove(shipId, row, col, isCreator)}
              allowSelection
              selectableShipIds={Array.from(selectedShipIds)}
              onDragOver={handleDragOver}
              onDrop={(row, col, e) => handleDrop(row, col, e, isCreator)}
              dragOverPosition={dragOverPosition}
            />
          );

          return (
            <FleetSelectionModal
              participantHasFleet={participantHasFleet}
              opponentHasFleet={opponentHasFleet}
              onGoToGames={() => {
                resetFleetSelectionModalState();
                navigateToGamesTab();
              }}
              createButtonState={{
                isBusy: busy,
                busyLabel: "CREATING FLEET...",
                selectedCount: selectedShipIds.size,
                maxShips: MAX_SHIPS_PER_FLEET,
                isOverLimit,
                costLimit: lobbyCostLimit,
                isUnder90Percent,
                hasMovedShip,
                hasStaleCosts: false,
              }}
              onCreateFleet={() => handleCreateFleetModal(lobby.basic.id)}
              onCancel={resetFleetSelectionModalState}
              filtersExpanded={filtersExpanded}
              onToggleFilters={() => setFiltersExpanded(!filtersExpanded)}
              loadFleetMenu={
                <LoadFleetMenu
                  fleets={savedFleetCompositions}
                  isOpen={showLoadFleetMenu}
                  onToggleOpen={() => setShowLoadFleetMenu((prev) => !prev)}
                  onClose={() => setShowLoadFleetMenu(false)}
                  getSummary={getFleetSummary}
                  getLoadPlan={(fleet) => getFleetLoadPlan(fleet, isCreator)}
                />
              }
              onClearFleetSelection={clearFleetDraftSelection}
              isBusy={busy}
              totalCost={selectedCost}
              costLimit={lobbyCostLimit}
              isOverLimit={isOverLimit}
              isUnder90Percent={isUnder90Percent}
              leaveButton={
                <button
                  type="button"
                  onClick={() => handleLeave(lobby.basic.id)}
                  disabled={busy}
                  className="px-3 py-1 text-sm font-bold text-warning-red border border-warning-red rounded-none hover:text-warning-red/80 hover:border-warning-red/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  LEAVE LOBBY
                </button>
              }
              onClose={resetFleetSelectionModalState}
              showFirstFleetHint={!participantHasFleet}
              fleetFilters={fleetFilters}
              onFleetFiltersChange={setFleetFilters}
              shownCount={filteredShips.length}
              totalCount={ships.length}
              showInGameProperties={showInGameProperties}
              onToggleInGameProperties={setShowInGameProperties}
              isAttributesFromCache={isFromCache}
              shipsLoading={shipsLoading}
              isCreator={isCreator}
              shipListItems={shipListItems}
              mapDisplay={mapDisplay}
            />
          );
        })()}

      {/* Fleet Threat Confirmation Dialog */}
      {showFleetConfirmation && selectedLobby && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[420]">
          <div className="bg-near-black border border-amber rounded-none p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-amber text-2xl font-mono font-bold mb-4 tracking-widest">[!]</div>
              <h3 className="text-xl font-bold text-amber mb-4">FLEET THREAT WARNING</h3>
              <p className="text-text-secondary mb-6">
                Your fleet threat ({selectedCost}) is less than 90% of the maximum (
                {selectedLobby.basic.costLimit}). You&apos;re only using{" "}
                {Math.round((selectedCost / selectedLobby.basic.costLimit) * 100)}% of your available
                budget.
              </p>
              <p className="text-sm text-text-muted mb-6">
                Consider adding more ships to maximize your fleet&apos;s potential, or proceed with your
                current selection.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFleetConfirmation(false)}
                  className="flex-1 px-4 py-2 border border-gunmetal text-text-muted rounded-none hover:bg-steel/20"
                >
                  GO BACK
                </button>
                <button
                  onClick={() => createFleetWithConfirmation(selectedLobby.basic.id)}
                  disabled={busy || selectedShipIds.size > MAX_SHIPS_PER_FLEET}
                  className="flex-1 px-4 py-2 border border-amber text-amber rounded-none hover:bg-amber/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "CREATING..." : "CONFIRM FLEET"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fleet View Modal */}
      {viewingFleet && (
        <FleetViewModal
          fleetIdLabel={String(viewingFleet.fleetId)}
          ownerLabel={fleetView.ownerId ? truncateId(fleetView.ownerId) : ""}
          isOwnerMe={!!fleetView.ownerId && fleetView.ownerId === userId}
          onClose={() => setViewingFleet(null)}
          isLoading={fleetView.isLoading}
          shipCards={fleetView.ships.map((ship) => (
            <ShipCard
              key={ship.id}
              ship={toShipCardDataWeb2(ship)}
              shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
              isStarred={false}
              onToggleStar={() => {}}
              isSelected={false}
              onToggleSelection={() => {}}
              onRecycleClick={() => {}}
              showInGameProperties={false}
              hideRecycle
              hideCheckbox
            />
          ))}
        />
      )}
    </div>
  );
};

export default LobbiesWeb2;

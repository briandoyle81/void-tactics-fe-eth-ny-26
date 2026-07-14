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
import { FleetFilterPanel } from "./FleetFilterPanel";
import { type FleetFilters, DEFAULT_FLEET_FILTERS, matchesFleetFilters } from "../utils/fleetFilters";
import { LoadFleetMenu, type FleetLoadPlan } from "./LoadFleetMenu";
import { readFleetCompositionPersisted, type FleetComposition } from "../utils/fleetCompositionStorage";
import { Web2Lobby, Web2LobbyStatus } from "../types/web2Lobby";
import { LobbyCard } from "./LobbyCard";
import {
  LobbyCreateForm,
  LobbyTurnOrderNote,
  type ThreatScale,
  type TurnPace,
  type ScoreLength,
} from "./LobbyCreateForm";
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

/** Same tab-navigation mechanism as `Lobbies.tsx`'s `navigateToGamesTab` — mode-agnostic, just switches the active tab. */
function navigateToGamesTab() {
  localStorage.setItem("void-tactics-active-tab", "Games");
  localStorage.setItem("void-tactics-force-games-tab", "true");
  window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
  document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
}

/** Same status color/text mapping as `Lobbies.tsx`'s inline `getStatusColor`/`getStatusText` — the numeric status values line up 1:1 with web3's `LobbyStatus`. */
function getStatusColor(status: Web2LobbyStatus) {
  switch (status) {
    case Web2LobbyStatus.Open:
      return "text-phosphor-green";
    case Web2LobbyStatus.FleetSelection:
      return "text-amber";
    case Web2LobbyStatus.InGame:
      return "text-warning-red";
    default:
      return "text-text-muted";
  }
}

function getStatusText(status: Web2LobbyStatus) {
  switch (status) {
    case Web2LobbyStatus.Open:
      return "OPEN";
    case Web2LobbyStatus.FleetSelection:
      return "FLEET SELECTION";
    case Web2LobbyStatus.InGame:
      return "IN GAME";
    default:
      return "UNKNOWN";
  }
}

/** Web2 user ids (NextAuth subs / cuids) aren't addresses, but truncating them the same way keeps the card's identity row visually consistent with web3's. */
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

// Web2-mode counterpart to `Lobbies.tsx`. Lobby browse/create/join/leave,
// fleet selection with ship+starting-position picking (via the shared
// MapDisplayView, same click/drag/tap-to-place mechanics as web3), reject a
// reserved invite, and the creator/joiner timeout-penalty actions. See
// docs/merge-explore-traditional-plan.md for what's still open — most
// notably, once a lobby's fleets are both submitted a Game row is created,
// but there is no web2 GameDisplay yet to actually play it.

const LobbiesWeb2: React.FC = () => {
  const { userId } = useCurrentUser();
  const {
    lobbyList,
    loadLobbies,
    createLobby,
    joinLobby,
    leaveLobby,
    createFleet,
    acceptGame,
    rejectGame,
    timeoutJoiner,
    quitWithPenalty,
  } = useLobbiesWeb2();
  const { ships } = useOwnedShipsWeb2();

  const [costLimit, setCostLimit] = useState(SKIRMISH_THREAT_LIMIT);
  const [turnTimeSeconds, setTurnTimeSeconds] = useState(IMMEDIATE_GAME_TURN_SECONDS);
  const [maxScore, setMaxScore] = useState(SHORT_MAX_SCORE);
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

  const constructedShipCount = ships.filter(
    (s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0,
  ).length;
  const canUseLobbies = constructedShipCount >= MIN_SHIPS_FOR_LOBBIES;

  const myLobby = useMemo(
    () =>
      lobbyList.lobbies.find(
        (l) => l.basic.creator === userId || l.players.joiner === userId,
      ),
    [lobbyList.lobbies, userId],
  );

  const openLobbies = useMemo(
    () =>
      lobbyList.lobbies.filter(
        (l) =>
          l.state.status === Web2LobbyStatus.Open &&
          l.basic.creator !== userId &&
          (!l.players.reservedJoiner || l.players.reservedJoiner === userId),
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

  const handleCreate = () =>
    run("create lobby", async () => {
      // Matches web3's Lobbies.tsx, which also has no real map picker (its
      // "Map" field is a locked input hardcoded to map 1) — this keeps both
      // modes on the same fixed map rather than leaving mapId unset (which
      // left games with no blocked/scoring tiles).
      await createLobby({ costLimit, turnTimeSeconds, maxScore, selectedMapId: 1 });
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
    handleSubmitFleet(lobbyId);
  };

  if (!canUseLobbies) {
    return (
      <div className="font-mono text-sm text-text-muted">
        You need at least {MIN_SHIPS_FOR_LOBBIES} constructed ships to use lobbies
        ({constructedShipCount}/{MIN_SHIPS_FOR_LOBBIES}).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {myLobby && (
        <LobbyPanel
          lobby={myLobby}
          userId={userId}
          onLeave={() => handleLeave(myLobby.basic.id)}
          onReject={() => handleReject(myLobby.basic.id)}
          onTimeoutJoiner={() => handleTimeoutJoiner(myLobby.basic.id)}
          onQuitWithPenalty={() => handleQuitWithPenalty(myLobby.basic.id)}
          onOpenFleetSelect={() => setSelectedLobbyId(myLobby.basic.id)}
          onViewFleet={(fleetId) => setViewingFleet({ lobbyId: myLobby.basic.id, fleetId })}
          busy={busy}
        />
      )}

      {!myLobby && (
        <LobbyCreateForm
          title="[CREATE LOBBY]"
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
          mapIdLabel="1"
          extraFields={<LobbyTurnOrderNote />}
          footer={
            <button
              onClick={handleCreate}
              disabled={busy}
              className="w-full flex-1 px-6 py-3 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent sm:w-auto"
            >
              CREATE
            </button>
          }
        />
      )}

      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-text-primary">
          [OPEN LOBBIES] — {openLobbies.length}
        </h3>
        {lobbyList.isLoading && <div className="font-mono text-sm text-text-muted">Loading…</div>}
        {openLobbies.length === 0 && !lobbyList.isLoading && (
          <div className="font-mono text-sm text-text-muted">No open lobbies right now.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {openLobbies.map((lobby) => {
            const isReservedForMe = lobby.players.reservedJoiner === userId;
            return (
              <LobbyCard
                key={lobby.basic.id}
                lobbyIdLabel={String(lobby.basic.id)}
                isCreatorMe={false}
                statusColorClass={getStatusColor(lobby.state.status)}
                statusText={getStatusText(lobby.state.status)}
                creatorLabel={truncateId(lobby.basic.creator)}
                threatLabel={formatThreatShort(lobby.basic.costLimit)}
                turnLabel={formatTurnShort(lobby.gameConfig.turnTime)}
                mapLabel={`#${lobby.gameConfig.selectedMapId}`}
                scoreLabel={formatScoreShort(lobby.gameConfig.maxScore)}
                actions={
                  isReservedForMe ? (
                    <div className="space-y-2">
                      <p className="text-sm text-amber text-center font-mono">
                        [GAME RESERVED FOR YOU]
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(lobby.basic.id)}
                          disabled={busy || !!myLobby}
                          className="flex-1 px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={() => handleReject(lobby.basic.id)}
                          disabled={busy}
                          className="flex-1 px-6 py-3 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          REJECT
                        </button>
                      </div>
                      {!!myLobby && (
                        <p className="text-xs text-amber text-center">
                          You already have an active lobby. Complete it before
                          accepting another.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleJoin(lobby.basic.id)}
                        disabled={busy || !!myLobby}
                        className="w-full px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        JOIN LOBBY
                      </button>
                      {!!myLobby && (
                        <p className="text-xs text-amber text-center">
                          You already have an active lobby. Complete it before
                          joining another.
                        </p>
                      )}
                    </>
                  )
                }
              />
            );
          })}
        </div>
      </div>

      {/* Fleet Selection Modal — matches web3's SELECT FLEET/VIEW FLEET modal chrome, including the ship-list + MapDisplayWeb2 starting-position picker. */}
      {selectedLobby &&
        (() => {
          const lobby = selectedLobby;
          const isCreator = lobby.basic.creator === userId;
          const myFleetId = isCreator ? lobby.players.creatorFleetId : lobby.players.joinerFleetId;
          const opponentFleetId = isCreator ? lobby.players.joinerFleetId : lobby.players.creatorFleetId;
          const participantHasFleet = myFleetId > 0;
          const opponentHasFleet = opponentFleetId > 0;
          const bothHaveFleets = participantHasFleet && opponentHasFleet;
          const lobbyCostLimit = lobby.basic.costLimit;
          const isOverLimit = lobbyCostLimit > 0 && selectedCost > lobbyCostLimit;
          const isUnder90Percent = lobbyCostLimit > 0 && selectedCost < lobbyCostLimit * 0.9;
          const fleetExceedsMaxSize = selectedShipIds.size > MAX_SHIPS_PER_FLEET;

          // Same as Lobbies.tsx's hasMovedShip: require at least one ship off the
          // default deployment column (creator: col 0, joiner: far-right column)
          // before allowing submission, so players actually engage the placement UI.
          const hasMovedShip =
            shipPositions.length > 0 &&
            shipPositions.some((pos) =>
              isCreator ? pos.col !== 0 : pos.col !== GRID_DIMENSIONS.WIDTH - 1,
            );

          // Selected ships bypass filters (so you don't lose sight of ships
          // you've already picked while adjusting filter criteria), matching
          // Lobbies.tsx's filteredShips.
          const filteredShips = ships.filter((s) => {
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
          });

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[400]">
              <div className="bg-near-black border border-cyan rounded-none p-6 w-full max-w-4xl max-h-[90vh] flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-bold text-cyan whitespace-nowrap">
                      {participantHasFleet ? "VIEW FLEET" : "SELECT FLEET"}
                    </h4>
                    {participantHasFleet && (
                      <span className="px-3 py-1 text-xs font-bold text-phosphor-green bg-phosphor-green/20 border border-phosphor-green rounded-none whitespace-nowrap">
                        FLEET SELECTED
                      </span>
                    )}
                    {participantHasFleet && !opponentHasFleet && (
                      <span className="px-3 py-1 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
                        WAITING FOR OPPOSING ADMIRAL
                      </span>
                    )}
                  </div>

                  {!participantHasFleet ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCreateFleetModal(lobby.basic.id)}
                        disabled={
                          busy ||
                          selectedShipIds.size === 0 ||
                          fleetExceedsMaxSize ||
                          isOverLimit ||
                          isUnder90Percent ||
                          !hasMovedShip
                        }
                        className="px-4 py-2 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {busy
                          ? "CREATING FLEET..."
                          : fleetExceedsMaxSize
                            ? `MAX ${MAX_SHIPS_PER_FLEET} SHIPS (${selectedShipIds.size} SELECTED)`
                            : isOverLimit
                              ? `OVER ${lobbyCostLimit} THREAT LIMIT`
                              : isUnder90Percent
                                ? `NEED ${Math.round(lobbyCostLimit * 0.9)} POINTS`
                                : !hasMovedShip
                                  ? "MOVE AT LEAST ONE SHIP FORWARD"
                                  : `CREATE FLEET (${selectedShipIds.size})`}
                      </button>
                      <button
                        onClick={resetFleetSelectionModalState}
                        disabled={busy}
                        className="px-4 py-2 border border-warning-red text-warning-red rounded-none hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        CANCEL
                      </button>
                    </div>
                  ) : bothHaveFleets ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetFleetSelectionModalState();
                        navigateToGamesTab();
                      }}
                      className="px-4 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                    >
                      GO TO GAMES
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resetFleetSelectionModalState}
                      className="px-4 py-2 border border-gunmetal text-text-muted rounded-none font-mono font-bold text-sm tracking-wider"
                    >
                      CLOSE
                    </button>
                  )}
                </div>

                {!participantHasFleet ? (
                  <>
                    <div className="relative flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-text-secondary">
                        Cost {selectedCost}
                        {lobbyCostLimit > 0 ? ` / ${lobbyCostLimit}` : ""}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setFiltersExpanded(!filtersExpanded)}
                          className="px-2 py-1 text-xs font-bold text-cyan border border-cyan rounded-none hover:text-cyan/80 hover:border-cyan/80 transition-colors"
                        >
                          FILTERS ▼
                        </button>
                        <LoadFleetMenu
                          fleets={savedFleetCompositions}
                          isOpen={showLoadFleetMenu}
                          onToggleOpen={() => setShowLoadFleetMenu((prev) => !prev)}
                          onClose={() => setShowLoadFleetMenu(false)}
                          getSummary={getFleetSummary}
                          getLoadPlan={(fleet) => getFleetLoadPlan(fleet, isCreator)}
                        />
                        <button
                          type="button"
                          onClick={clearFleetDraftSelection}
                          className="px-2 py-1 text-xs font-bold text-text-muted border border-steel rounded-none hover:text-text-secondary hover:border-steel transition-colors"
                        >
                          CLEAR FLEET SELECTION
                        </button>
                      </div>
                    </div>
                    {filtersExpanded && (
                      <FleetFilterPanel
                        filters={fleetFilters}
                        onFiltersChange={setFleetFilters}
                        onClose={() => setFiltersExpanded(false)}
                        shownCount={filteredShips.length}
                        totalCount={ships.length}
                      />
                    )}
                    <div className="flex gap-4 flex-1 min-h-0">
                      {isCreator ? (
                        <>
                          <div className="w-1/3 h-full overflow-y-auto">
                            <div className="grid grid-cols-1 gap-3 content-start">
                              {filteredShips
                                .map((s) => {
                                  const canSelect = s.shipData.timestampDestroyed === 0 && s.shipData.constructed && !s.shipData.inFleet;
                                  const isPending = tapPendingShipId === s.id;
                                  return (
                                    <div
                                      key={s.id}
                                      draggable={canSelect && !isTouchDevice}
                                      onDragStart={(e) => {
                                        if (canSelect) {
                                          handleDragStart(s.id);
                                          e.dataTransfer.effectAllowed = "move";
                                        }
                                      }}
                                      onDragEnd={handleDragEnd}
                                      className={`${canSelect && !isTouchDevice ? "cursor-move" : ""} ${isPending ? "outline outline-2 outline-amber" : ""}`}
                                    >
                                      <ShipCard
                                        ship={toShipCardDataWeb2(s)}
                                        shipImage={<ShipImageWeb2 ship={s} className="h-full w-full" />}
                                        isStarred={false}
                                        onToggleStar={() => {}}
                                        isSelected={selectedShipIds.has(s.id)}
                                        onToggleSelection={() => handleListShipTap(s.id, canSelect, isCreator)}
                                        onRecycleClick={() => {}}
                                        showInGameProperties={false}
                                        selectionMode
                                        hideRecycle
                                        hideCheckbox
                                        onCardClick={() => handleListShipTap(s.id, canSelect, isCreator)}
                                        canSelect={canSelect}
                                        flipShip={isCreator}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                          <div className="w-2/3 h-full flex items-center justify-center">
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
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-2/3 h-full flex items-center justify-center">
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
                          </div>
                          <div className="w-1/3 h-full overflow-y-auto">
                            <div className="grid grid-cols-1 gap-3 content-start">
                              {filteredShips
                                .map((s) => {
                                  const canSelect = s.shipData.timestampDestroyed === 0 && s.shipData.constructed && !s.shipData.inFleet;
                                  const isPending = tapPendingShipId === s.id;
                                  return (
                                    <div
                                      key={s.id}
                                      draggable={canSelect && !isTouchDevice}
                                      onDragStart={(e) => {
                                        if (canSelect) {
                                          handleDragStart(s.id);
                                          e.dataTransfer.effectAllowed = "move";
                                        }
                                      }}
                                      onDragEnd={handleDragEnd}
                                      className={`${canSelect && !isTouchDevice ? "cursor-move" : ""} ${isPending ? "outline outline-2 outline-amber" : ""}`}
                                    >
                                      <ShipCard
                                        ship={toShipCardDataWeb2(s)}
                                        shipImage={<ShipImageWeb2 ship={s} className="h-full w-full" />}
                                        isStarred={false}
                                        onToggleStar={() => {}}
                                        isSelected={selectedShipIds.has(s.id)}
                                        onToggleSelection={() => handleListShipTap(s.id, canSelect, isCreator)}
                                        onRecycleClick={() => {}}
                                        showInGameProperties={false}
                                        selectionMode
                                        hideRecycle
                                        hideCheckbox
                                        onCardClick={() => handleListShipTap(s.id, canSelect, isCreator)}
                                        canSelect={canSelect}
                                        flipShip={isCreator}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-sm text-text-secondary">
                    {opponentHasFleet
                      ? "Both fleets submitted."
                      : "Fleet submitted — waiting on opponent."}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

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

function LobbyPanel({
  lobby,
  userId,
  onLeave,
  onReject,
  onTimeoutJoiner,
  onQuitWithPenalty,
  onOpenFleetSelect,
  onViewFleet,
  busy,
}: {
  lobby: Web2Lobby;
  userId: string | null;
  onLeave: () => void;
  onReject: () => void;
  onTimeoutJoiner: () => void;
  onQuitWithPenalty: () => void;
  onOpenFleetSelect: () => void;
  onViewFleet: (fleetId: number) => void;
  busy: boolean;
}) {
  const isCreator = lobby.basic.creator === userId;
  const isJoiner = lobby.players.joiner === userId;
  const isReservedInvite =
    lobby.state.status === Web2LobbyStatus.Open &&
    lobby.players.reservedJoiner === userId;
  const isFleetSelection = lobby.state.status === Web2LobbyStatus.FleetSelection;
  const isInGame = lobby.state.status === Web2LobbyStatus.InGame;

  const myFleetId = isCreator ? lobby.players.creatorFleetId : lobby.players.joinerFleetId;
  const opponentFleetId = isCreator ? lobby.players.joinerFleetId : lobby.players.creatorFleetId;

  return (
    <LobbyCard
      lobbyIdLabel={String(lobby.basic.id)}
      isCreatorMe={isCreator}
      statusColorClass={getStatusColor(lobby.state.status)}
      statusText={getStatusText(lobby.state.status)}
      creatorLabel={truncateId(lobby.basic.creator)}
      joinerLabel={lobby.players.joiner ? truncateId(lobby.players.joiner) : null}
      isJoinerMe={isJoiner}
      reservedLabel={
        isReservedInvite && !isJoiner ? truncateId(lobby.players.reservedJoiner) : null
      }
      threatLabel={formatThreatShort(lobby.basic.costLimit)}
      turnLabel={formatTurnShort(lobby.gameConfig.turnTime)}
      mapLabel={`#${lobby.gameConfig.selectedMapId}`}
      scoreLabel={formatScoreShort(lobby.gameConfig.maxScore)}
      creatorFleetButton={
        lobby.players.creatorFleetId > 0 ? (
          <button
            onClick={() => onViewFleet(lobby.players.creatorFleetId)}
            className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
              isCreator ? "border-amber text-amber hover:bg-amber/10" : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
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
            onClick={() => onViewFleet(lobby.players.joinerFleetId)}
            className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
              isJoiner ? "border-cyan text-cyan hover:bg-cyan/10" : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
            }`}
            style={{ borderRadius: 0 }}
          >
            JOIN FLEET #{lobby.players.joinerFleetId}
          </button>
        ) : undefined
      }
      actions={
        <div className="flex flex-col gap-2">
          {isInGame && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-amber">Game started.</span>
              <button
                onClick={navigateToGamesTab}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid"
                style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
              >
                Go to Games
              </button>
            </div>
          )}

          {isReservedInvite && !isJoiner && (
            <button
              onClick={onReject}
              disabled={busy}
              className="self-start px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
              style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
            >
              Decline Invite
            </button>
          )}

          {isFleetSelection &&
            (myFleetId === 0 ? (
              <button
                type="button"
                onClick={onOpenFleetSelect}
                className="w-full px-4 py-2.5 border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                SELECT FLEET
              </button>
            ) : opponentFleetId === 0 ? (
              <button
                type="button"
                onClick={onOpenFleetSelect}
                className="w-full px-4 py-2.5 border border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                VIEW FLEET SELECTION
              </button>
            ) : (
              <button
                type="button"
                onClick={navigateToGamesTab}
                className="w-full px-4 py-2.5 border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                GO TO GAMES
              </button>
            ))}

          <div className="flex flex-wrap gap-2">
            {!isInGame && (
              <button
                onClick={onLeave}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
              >
                Leave Lobby
              </button>
            )}
            {isCreator && isFleetSelection && (
              <button
                onClick={onTimeoutJoiner}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)", borderRadius: 0 }}
              >
                Timeout Joiner
              </button>
            )}
            {isJoiner && isFleetSelection && (
              <button
                onClick={onQuitWithPenalty}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)", borderRadius: 0 }}
              >
                Quit (Penalize Creator)
              </button>
            )}
          </div>
        </div>
      }
    />
  );
}

export default LobbiesWeb2;

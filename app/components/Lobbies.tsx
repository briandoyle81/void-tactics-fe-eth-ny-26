"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAccount } from "../hooks/useAccount";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useLobbies } from "../hooks/useLobbies";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetsRead } from "../hooks/useFleetsContract";
import { useShipsRead } from "../hooks/useShipsContract";
import {
  LobbyStatus,
  Lobby,
  Ship,
  Attributes,
  GRID_DIMENSIONS,
} from "../types/types";
import { toast } from "react-hot-toast";
import { cacheShipsData } from "../hooks/useShipDataCache";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
import { LobbyCreateButton } from "./LobbyCreateButton";
import { LobbyJoinButton } from "./LobbyJoinButton";
import { LobbyLeaveButton } from "./LobbyLeaveButton";
import { LobbyAcceptButton } from "./LobbyAcceptButton";
import { LobbyRejectButton } from "./LobbyRejectButton";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { useCurrentCostsVersion } from "../hooks/useShipAttributesContract";
import { calculateShipRank, getRankColor } from "../utils/shipLevel";
import { formatDestroyedDate } from "../utils/dateUtils";
import { MapDisplay } from "./MapDisplay";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { useLobby } from "../hooks/useLobbiesContract";
import { useUtcBalance } from "../hooks/useUtcBalance";
import {
  readFleetDrafts,
  writeFleetDraft,
  removeFleetDraft,
} from "../utils/fleetSelectionDraftStorage";
import {
  readFleetCompositionPersisted,
  type FleetComposition,
} from "../utils/fleetCompositionStorage";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, getNativeTokenSymbol } from "../config/networks";
import {
  IMMEDIATE_GAME_TURN_SECONDS,
  CORRESPONDENCE_GAME_TURN_SECONDS,
  formatLobbyTurnTimeDisplay,
  SKIRMISH_THREAT_LIMIT,
  BATTLE_THREAT_LIMIT,
  formatLobbyCostLimitDisplay,
  SHORT_MAX_SCORE,
  MEDIUM_MAX_SCORE,
  LONG_MAX_SCORE,
  formatLobbyMaxScoreDisplay,
  VOID_TACTICS_ALPHA_DISCORD_INVITE,
  MIN_SHIPS_FOR_LOBBIES,
  MAX_SHIPS_PER_FLEET,
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormatters";
import { usePlayerStats } from "../hooks/usePlayerStats";

function CreatorStats({
  address,
  chainId,
}: {
  address: `0x${string}`;
  chainId: number;
}) {
  const stats = usePlayerStats(address, chainId);
  if (!stats) return null;
  return (
    <div
      className="flex items-center gap-2 text-base font-bold tabular-nums"
      style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
    >
      <span className="text-phosphor-green">{stats.wins}W</span>
      <span
        className="text-[10px] font-normal"
        style={{ color: "color-mix(in srgb, var(--color-text-muted) 40%, transparent)" }}
      >
        /
      </span>
      <span className="text-warning-red">{stats.losses}L</span>
    </div>
  );
}

const Lobbies: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { userId } = useCurrentUser();
  const chainId = useSelectedChainId();
  const {
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,
    createFleet,
    loadLobbies,
    timeoutJoiner,
    quitWithPenalty,
  } = useLobbies();


  const { ships, isLoading: shipsLoading, shipCount } = useOwnedShips();

  const constructedReadyCount = useMemo(
    () => ships.filter((s) => s.shipData.constructed === true).length,
    [ships],
  );

  const navigateToManageNavyForShips = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-manage-navy", {
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-manage-navy", {
        bubbles: true,
      }),
    );
  }, []);

  const needsShipsForLobbyUi =
    isConnected && !shipsLoading && shipCount < MIN_SHIPS_FOR_LOBBIES;
  const needsConstructForLobbyUi =
    isConnected &&
    !shipsLoading &&
    shipCount >= MIN_SHIPS_FOR_LOBBIES &&
    constructedReadyCount < MIN_SHIPS_FOR_LOBBIES;
  const lobbyUiLoadingShips = isConnected && shipsLoading;

  const { data: currentCostsVersion } = useCurrentCostsVersion();
  const globalCostsVersion =
    currentCostsVersion !== undefined && currentCostsVersion !== null
      ? Number(currentCostsVersion)
      : null;
  const { games: playerGames, refetch: refetchGames } = usePlayerGames();
  const { balance: utcBalance, refetch: refetchUtcBalance } = useUtcBalance();

  // Calculate player state from lobby list instead of blockchain
  const playerLobbies = lobbyList.lobbies.filter(
    (lobby) =>
      lobby.basic.creator === userId || lobby.players.joiner === userId,
  );
  const activeLobbiesCount = playerLobbies.length;
  const hasActiveLobby = activeLobbiesCount > 0;

  // Calculate lobby creation permissions
  const canCreateLobby = !paused && isConnected;
  const needsPaymentForLobby =
    activeLobbiesCount >= (freeGamesPerAddress ?? 0);

  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if ((needsShipsForLobbyUi || needsConstructForLobbyUi) && showCreateForm) {
      setShowCreateForm(false);
    }
  }, [needsShipsForLobbyUi, needsConstructForLobbyUi, showCreateForm]);
  const [selectedLobby, setSelectedLobby] = useState<number | null>(null);
  const selectedLobbyRef = useRef<number | null>(null);
  useEffect(() => {
    selectedLobbyRef.current = selectedLobby;
  }, [selectedLobby]);
  const [selectedShips, setSelectedShips] = useState<number[]>([]);
  const [shipPositions, setShipPositions] = useState<
    Array<{ shipId: number; row: number; col: number }>
  >([]);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [showFleetConfirmation, setShowFleetConfirmation] = useState(false);

  // Drag and drop state
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  // Track last drag over position to prevent excessive state updates
  const lastDragOverPositionRef = useRef<{ row: number; col: number } | null>(
    null,
  );

  // Tap-to-place state for touch devices
  const [tapPendingShipId, setTapPendingShipId] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  // Validate selected lobby when lobby list loads (e.g. lobby no longer exists or user not in it)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      address &&
      selectedLobby &&
      lobbyList.lobbies.length > 0
    ) {
      const lobby = lobbyList.lobbies.find(
        (l) =>
          l.basic.id === selectedLobby &&
          (l.basic.creator === userId || l.players.joiner === userId),
      );
      if (!lobby) {
        if (chainId && address) {
          removeFleetDraft(chainId, address, selectedLobby);
        }
        setSelectedLobby(null);
      }
    }
  }, [selectedLobby, address, lobbyList.lobbies, chainId]);

  const [isCreatingFleet, setIsCreatingFleet] = useState(false);
  const [showFleetView, setShowFleetView] = useState(false);
  const [showLoadFleetMenu, setShowLoadFleetMenu] = useState(false);
  const [pendingLoadFleet, setPendingLoadFleet] = useState<{
    fleet: FleetComposition;
    availableShipIds: number[];
    unavailableCount: number;
  } | null>(null);
  const [viewingFleetId, setViewingFleetId] = useState<number | null>(null);
  const [viewingFleetOwner, setViewingFleetOwner] = useState<string | null>(
    null,
  );

  const savedFleetCompositions = useMemo(() => {
    if (!chainId || !address) return [] as FleetComposition[];
    return readFleetCompositionPersisted(chainId, address).fleets;
  }, [chainId, address]);

  // Live lobby data for the currently selected lobby (avoids relying on lobby list refresh timing)
  const { lobby: selectedLobbyLive, refetch: refetchSelectedLobby } = useLobby(
    selectedLobby ?? 0,
    {
      enabled: selectedLobby != null,
    },
  );

  // Fleet ship data fetching
  const [viewingFleetShips, setViewingFleetShips] = React.useState<Ship[]>([]);
  const [fleetShipsLoading, setFleetShipsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!viewingFleetId) { setViewingFleetShips([]); return; }
    let cancelled = false;
    setFleetShipsLoading(true);
    fetch(`/api/fleets/${viewingFleetId}`)
      .then((r) => r.json())
      .then((data: { ships?: Ship[] }) => {
        if (!cancelled) {
          const ships = data.ships ?? [];
          setViewingFleetShips(ships);
          if (ships.length > 0) cacheShipsData(ships);
        }
      })
      .catch(() => { if (!cancelled) setViewingFleetShips([]); })
      .finally(() => { if (!cancelled) setFleetShipsLoading(false); });
    return () => { cancelled = true; };
  }, [viewingFleetId]);

  /**
   * Single-lobby reads (`useLobby` / getLobby) can lag the player's lobby list right
   * after a fleet tx (joiner second is the common case). Merge list + live and prefer
   * whichever snapshot shows more fleets selected so GO TO GAMES and playerFleetId stay correct.
   */
  const resolvedLobbyForSelected = React.useMemo(() => {
    if (!selectedLobby) return null;
    const fromList = lobbyList.lobbies.find((l) => l.basic.id === selectedLobby);
    const live = selectedLobbyLive;
    if (!live && !fromList) return null;
    if (!live) return fromList;
    if (!fromList) return live;
    const fleetSlots = (L: Lobby) =>
      (L.players.creatorFleetId > 0 ? 1 : 0) +
      (L.players.joinerFleetId > 0 ? 1 : 0);
    const listN = fleetSlots(fromList);
    const liveN = fleetSlots(live);
    if (listN > liveN) return fromList;
    if (liveN > listN) return live;
    return live;
  }, [selectedLobby, selectedLobbyLive, lobbyList.lobbies]);

  // When viewing a lobby that is waiting for the other player's fleet, poll so both players see updates
  const currentLobbyForPolling = resolvedLobbyForSelected;
  const isWaitingForOtherFleet =
    currentLobbyForPolling &&
    (currentLobbyForPolling.players.creatorFleetId === 0 ||
      currentLobbyForPolling.players.joinerFleetId === 0);

  React.useEffect(() => {
    if (!selectedLobby || !isWaitingForOtherFleet) return;
    const interval = setInterval(() => {
      loadLobbies();
      refetchSelectedLobby();
    }, 2000);
    return () => clearInterval(interval);
  }, [
    selectedLobby,
    isWaitingForOtherFleet,
    loadLobbies,
    refetchSelectedLobby,
  ]);

  // Determine the player's existing fleet ID when fleet selection modal is open
  const playerFleetId = React.useMemo(() => {
    if (!selectedLobby || !userId) return null;
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const isCreator = lobby.basic.creator === userId;
    return isCreator
      ? lobby.players.creatorFleetId > 0
        ? lobby.players.creatorFleetId
        : null
      : lobby.players.joinerFleetId > 0
        ? lobby.players.joinerFleetId
        : null;
  }, [selectedLobby, userId, resolvedLobbyForSelected]);

  const selectedLobbyPlayerHasFleetOnChain = React.useMemo(() => {
    if (!resolvedLobbyForSelected || !userId) return false;
    const isCreator = resolvedLobbyForSelected.basic.creator === userId;
    return isCreator
      ? resolvedLobbyForSelected.players.creatorFleetId > 0
      : resolvedLobbyForSelected.players.joinerFleetId > 0;
  }, [resolvedLobbyForSelected, userId]);

  // Fetch the player's existing fleet data when viewing their own fleet
  // Fetch the player's own submitted fleet (ships + positions) from the API
  const [playerFleetData, setPlayerFleetData] = React.useState<{
    ships: Ship[];
    positions: Array<{ shipId: number; row: number; col: number }>;
  } | null>(null);
  const lastLoadedPlayerFleetId = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!playerFleetId) {
      setPlayerFleetData(null);
      lastLoadedPlayerFleetId.current = null;
      return;
    }
    if (lastLoadedPlayerFleetId.current === playerFleetId) return;
    fetch(`/api/fleets/${playerFleetId}`)
      .then((r) => r.json())
      .then((data: { ships?: Ship[]; positions?: Array<{ shipId: number; row: number; col: number }> }) => {
        const ships = data.ships ?? [];
        const positions = data.positions ?? [];
        setPlayerFleetData({ ships, positions });
        if (ships.length > 0) cacheShipsData(ships);
        lastLoadedPlayerFleetId.current = playerFleetId;
      })
      .catch(() => {});
  }, [playerFleetId]);

  const playerFleetIdsAndPositions = playerFleetData;

  // Normalize player fleet ships
  const playerFleetShips = React.useMemo(
    () => playerFleetData?.ships.filter(
      (ship): ship is Ship => !!ship?.id && !!ship.equipment && !!ship.shipData && !!ship.traits && !!ship.owner,
    ) ?? [],
    [playerFleetData],
  );

  const resolveFleetPickerShip = useCallback(
    (shipId: number): Ship | undefined =>
      ships.find((s) => s.id === shipId) ??
      playerFleetShips.find((s) => s.id === shipId),
    [ships, playerFleetShips],
  );

  // Drop ships that are not on the current global costs version from selection
  useEffect(() => {
    if (globalCostsVersion === null) return;
    let removedCount = 0;
    setSelectedShips((prev) => {
      const next = prev.filter((id) => {
        const ship = resolveFleetPickerShip(id);
        return (
          ship !== undefined &&
          Number(ship.shipData.costsVersion) === globalCostsVersion
        );
      });
      removedCount = prev.length - next.length;
      return next.length === prev.length ? prev : next;
    });
    setShipPositions((prev) => {
      const next = prev.filter((p) => {
        const ship = resolveFleetPickerShip(p.shipId);
        return (
          ship !== undefined &&
          Number(ship.shipData.costsVersion) === globalCostsVersion
        );
      });
      return next.length === prev.length ? prev : next;
    });
    if (removedCount > 0) {
      toast(
        `${removedCount} ship${removedCount > 1 ? "s" : ""} removed from your fleet — cost data is out of date. Update them in Manage Navy.`,
        { icon: "⚠️", duration: 6000 },
      );
    }
  }, [globalCostsVersion, ships, playerFleetShips, resolveFleetPickerShip]);

  // Track the last loaded fleet ID to avoid reloading unnecessarily
  const lastLoadedFleetIdRef = useRef<number | null>(null);
  /** Avoid re-applying localStorage draft on every render while a lobby stays open. */
  const lastHydratedDraftLobbyRef = useRef<number | null>(null);
  /**
   * Hydrate updates ship state asynchronously; skip one persist pass so we do not
   * write stale (pre-hydrate) selection over the saved draft.
   */
  const skipNextDraftPersistRef = useRef(false);

  useEffect(() => {
    if (!selectedLobby) {
      lastHydratedDraftLobbyRef.current = null;
    }
  }, [selectedLobby]);

  // Load saved draft when opening fleet picker (no on-chain fleet yet for this lobby)
  useEffect(() => {
    if (
      !selectedLobby ||
      !address ||
      !chainId ||
      !resolvedLobbyForSelected ||
      selectedLobbyPlayerHasFleetOnChain
    ) {
      if (selectedLobby && selectedLobbyPlayerHasFleetOnChain) {
        lastHydratedDraftLobbyRef.current = selectedLobby;
      }
      return;
    }
    if (lastHydratedDraftLobbyRef.current === selectedLobby) return;
    // Wait until ships are loaded so we can validate availability
    if (shipsLoading || ships.length === 0) return;

    const drafts = readFleetDrafts(chainId, address);
    const raw = drafts[selectedLobby.toString()];
    skipNextDraftPersistRef.current = true;
    if (raw?.shipIds?.length) {
      try {
        const ids = raw.shipIds.map((s) => Number(s));
        // Only keep ships that are still available (not inFleet, constructed, not destroyed)
        const availabilityMap = new Map(ships.map((s) => [s.id.toString(), s]));
        const validIds = ids.filter((id) => {
          const s = availabilityMap.get(id.toString());
          return s && s.shipData.constructed && !(s.shipData.timestampDestroyed > 0) && !s.shipData.inFleet;
        });
        const pos = (raw.positions || [])
          .map((p) => ({ shipId: Number(p.shipId), row: p.row, col: p.col }))
          .filter((p) => validIds.some((id) => id === p.shipId));
        setSelectedShips(validIds);
        setShipPositions(pos);
      } catch {
        setSelectedShips([]);
        setShipPositions([]);
      }
    } else {
      setSelectedShips([]);
      setShipPositions([]);
    }
    setSelectedShipId(null);
    lastHydratedDraftLobbyRef.current = selectedLobby;
  }, [
    selectedLobby,
    address,
    chainId,
    resolvedLobbyForSelected,
    selectedLobbyPlayerHasFleetOnChain,
    ships,
    shipsLoading,
  ]);

  // Persist draft while picking a fleet (not after fleet exists on-chain)
  useEffect(() => {
    if (
      !selectedLobby ||
      !address ||
      !chainId ||
      !resolvedLobbyForSelected ||
      selectedLobbyPlayerHasFleetOnChain
    ) {
      if (
        selectedLobby &&
        address &&
        chainId &&
        selectedLobbyPlayerHasFleetOnChain
      ) {
        removeFleetDraft(chainId, address, selectedLobby);
      }
      return;
    }
    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }
    writeFleetDraft(chainId, address, selectedLobby, selectedShips, shipPositions);
  }, [
    selectedLobby,
    address,
    chainId,
    resolvedLobbyForSelected,
    selectedLobbyPlayerHasFleetOnChain,
    selectedShips,
    shipPositions,
  ]);

  // Load player's existing fleet into selection state when fleet data arrives
  useEffect(() => {
    if (
      selectedLobby &&
      playerFleetId &&
      playerFleetData &&
      lastLoadedFleetIdRef.current !== playerFleetId
    ) {
      const { ships, positions } = playerFleetData;
      const shipIds = ships.map((s) => s.id);
      if (shipIds.length > 0) {
        setSelectedShips(shipIds);
        setShipPositions(positions);
        lastLoadedFleetIdRef.current = playerFleetId;
      }
    } else if (!selectedLobby || !playerFleetId) {
      lastLoadedFleetIdRef.current = null;
    }
  }, [selectedLobby, playerFleetId, playerFleetData]);

  const opponentPositions = React.useMemo(
    () => [] as Array<{ shipId: number; row: number; col: number }>,
    [],
  );

  // Load opponent ship objects using existing ships contract reader
  const { data: opponentShipsData } = useShipsRead(
    "getShipsByIds",
    opponentPositions.length > 0
      ? [opponentPositions.map((p) => p.shipId)]
      : undefined,
  );

  // Cache opponent ships data
  React.useEffect(() => {
    if (opponentShipsData && Array.isArray(opponentShipsData)) {
      const ships = opponentShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [opponentShipsData]);
  // Use existing image caching via ShipImage component; just shape into array
  const opponentShips = React.useMemo(
    () => (opponentShipsData as Ship[]) || [],
    [opponentShipsData],
  );

  // Fleet selection filters
  const [fleetFilters, setFleetFilters] = useState({
    showShiny: true,
    showCommon: true,
    showUnavailable: false,
    minCost: 0,
    maxCost: 10000,
    minAccuracy: 0,
    maxAccuracy: 2,
    minHull: 0,
    maxHull: 2,
    minSpeed: 0,
    maxSpeed: 2,
    weaponType: "all",
    defenseType: "all",
    specialType: "all",
  });

  // In-game properties toggle
  const [showInGameProperties, setShowInGameProperties] = useState(true);

  // Get ship attributes for in-game properties
  const shipIds = React.useMemo(() => ships.map((ship) => ship.id), [ships]);
  // Ship attributes (movement, weapon range, etc.) from contract – same source and calculation for creator and joiner
  const {
    attributesMap,
    isLoading: attributesLoading,
  } = useShipAttributesByIds(shipIds);

  // Helper function to find next available position for a ship
  const findNextPosition = (
    isCreator: boolean,
    existingPositions: Array<{ row: number; col: number }>,
  ) => {
    if (isCreator) {
      // Creator ships start in upper left (rows 0-10, cols 0-3)
      // Find the next available position in order: (0,0), (1,0), (2,0), ..., (10,0), (0,1), (1,1), etc.
      for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 11; row++) {
          if (
            !existingPositions.some((pos) => pos.row === row && pos.col === col)
          ) {
            return { row, col };
          }
        }
      }
    } else {
      // Joiner ships start in lower right (rows 0-10, cols 13-16)
      // Find the next available position in order: (10,16), (9,16), (8,16), ..., (0,16), (10,15), etc.
      for (let col = 16; col >= 13; col--) {
        for (let row = 10; row >= 0; row--) {
          if (
            !existingPositions.some((pos) => pos.row === row && pos.col === col)
          ) {
            return { row, col };
          }
        }
      }
    }
    return null; // No available position
  };

  // Function to add ship to fleet with position
  const addShipToFleet = (shipId: number) => {
    const normalizedId = Number(shipId);
    const currentLobby = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === selectedLobby,
    );
    if (!currentLobby) return;

    const isCreator = currentLobby.basic.creator === userId;
    const existingPositions = shipPositions.map((pos) => ({
      row: pos.row,
      col: pos.col,
    }));

    const position = findNextPosition(isCreator, existingPositions);

    if (position) {
      setSelectedShips((prev) => prev.some((id) => String(id) === String(normalizedId)) ? prev : [...prev, normalizedId]);
      setShipPositions((prev) => {
        return [...prev.filter((pos) => String(pos.shipId) !== String(normalizedId)), { shipId: normalizedId, row: position.row, col: position.col }];
      });
    }
  };

  // Function to remove ship from fleet
  const removeShipFromFleet = (shipId: number) => {
    const normalizedId = Number(shipId);
    setSelectedShips((prev) => prev.filter((id) => String(id) !== String(normalizedId)));
    setShipPositions((prev) => prev.filter((pos) => String(pos.shipId) !== String(normalizedId)));
    // Clear selection if the removed ship was selected
    if (String(selectedShipId) === String(normalizedId)) {
      setSelectedShipId(null);
    }
  };

  // Function to handle ship selection on the grid
  const handleShipSelect = (shipId: number) => {
    setSelectedShipId(Number(shipId));
    setTapPendingShipId(null);
  };

  // Function to handle ship movement on the grid
  const handleShipMove = (shipId: number, row: number, col: number) => {
    const normalizedShipId = Number(shipId);
    const isInFleet = selectedShips.some((id) => String(id) === String(normalizedShipId));

    if (!isInFleet) {
      // Ship not in fleet - try to add it
      const currentLobby = lobbyList.lobbies.find(
        (lobby) => lobby.basic.id === selectedLobby,
      );
      if (!currentLobby) return;

      const isCreator = currentLobby.basic.creator === userId;

      // Same deployment zone rules as MapDisplay: creator left 4 cols (0-3), joiner right 4 cols (13-16)
      const isValidPosition =
        row >= 0 &&
        row < GRID_DIMENSIONS.HEIGHT &&
        col >= 0 &&
        col < GRID_DIMENSIONS.WIDTH &&
        (isCreator ? col <= 3 : col >= 13 && col <= 16);

      if (!isValidPosition) return;

      // Check if position is already occupied
      const existingPosition = shipPositions.find(
        (pos) => pos.row === row && pos.col === col,
      );
      if (existingPosition) return;

      setSelectedShips((prev) => prev.some((id) => String(id) === String(normalizedShipId)) ? prev : [...prev, normalizedShipId]);
      setShipPositions((prev) => {
        const filtered = prev.filter((pos) => String(pos.shipId) !== String(normalizedShipId));
        return [...filtered, { shipId: normalizedShipId, row, col }];
      });
      setTapPendingShipId(null);
      return;
    }

    // Same deployment zone rules as MapDisplay (creator 0-3, joiner 13-16)
    const currentLobbyForMove = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === selectedLobby,
    );
    if (currentLobbyForMove) {
      const isCreatorMove = currentLobbyForMove.basic.creator === userId;
      const inDeploymentZone = isCreatorMove
        ? col >= 0 && col <= 3
        : col >= 13 && col <= 16;
      if (
        row < 0 ||
        row >= GRID_DIMENSIONS.HEIGHT ||
        col < 0 ||
        col >= GRID_DIMENSIONS.WIDTH ||
        !inDeploymentZone
      ) {
        return;
      }
    }

    // Check if position is already occupied by a different ship
    const existingPosition = shipPositions.find(
      (pos) => pos.row === row && pos.col === col && String(pos.shipId) !== String(normalizedShipId),
    );
    if (existingPosition) return;

    // Update the ship's position: remove all stale/duplicate entries for this ship, add one at the new position
    setShipPositions((prev) => {
      const filtered = prev.filter((pos) => String(pos.shipId) !== String(normalizedShipId));
      return [...filtered, { shipId: normalizedShipId, row, col }];
    });

    // Clear selection and pending placement after moving
    setSelectedShipId(null);
    setTapPendingShipId(null);
  };

  // Drag and drop handlers
  const handleDragStart = (shipId: number) => {
    setDraggedShipId(Number(shipId));
  };

  const handleDragEnd = () => {
    setDraggedShipId(null);
    setDragOverPosition(null);
    lastDragOverPositionRef.current = null;
  };

  const [isDraggingOverList, setIsDraggingOverList] = React.useState(false);

  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOverList(true);
  };

  const handleListDragLeave = () => {
    setIsDraggingOverList(false);
  };

  const handleListDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverList(false);
    const data = e.dataTransfer.getData("text/plain");
    const shipId = draggedShipId ?? (data && /^\d+$/.test(data) ? Number(data) : null);
    if (!shipId) return;
    setSelectedShips((prev) => prev.filter((id) => id !== shipId));
    setShipPositions((prev) => prev.filter((p) => p.shipId !== shipId));
    setDraggedShipId(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    // Only update state if the position actually changed
    const newPosition = { row, col };
    const lastPosition = lastDragOverPositionRef.current;
    if (
      !lastPosition ||
      lastPosition.row !== newPosition.row ||
      lastPosition.col !== newPosition.col
    ) {
      lastDragOverPositionRef.current = newPosition;
      setDragOverPosition(newPosition);
    }
  };

  const handleDrop = (row: number, col: number, e?: React.DragEvent) => {
    // Try to get ship ID from draggedShipId state first (from ship list)
    let shipIdToMove = draggedShipId;

    // If not in state, try to get from dataTransfer (from grid drag)
    if (!shipIdToMove && e) {
      const data = e.dataTransfer.getData("text/plain");
      if (data && /^\d+$/.test(data)) {
        try {
          shipIdToMove = Number(data);
        } catch {
          // ignore parse error
        }
      }
    }

    if (!shipIdToMove) return;

    // Use handleShipMove to handle the drop
    handleShipMove(shipIdToMove, row, col);

    // Clear drag state
    setDraggedShipId(null);
    setDragOverPosition(null);
    lastDragOverPositionRef.current = null;
  };

  // Ship list tap handler — desktop adds immediately, touch enters pending-placement mode
  const handleListShipTap = (shipId: number, canSelect: boolean) => {
    if (!canSelect) return;
    const normalizedId = Number(shipId);
    if (selectedShips.some((id) => String(id) === String(normalizedId))) {
      removeShipFromFleet(normalizedId);
      setTapPendingShipId(null);
    } else if (isTouchDevice) {
      setTapPendingShipId((prev) => (prev === normalizedId ? null : normalizedId));
    } else {
      addShipToFleet(normalizedId);
    }
  };

  // Navigate to Games tab (used by Go to Games button)
  const navigateToGamesTab = useCallback(() => {
    localStorage.setItem("void-tactics-active-tab", "Games");
    // Fallback marker so Home can detect explicit Games navigation intent.
    localStorage.setItem("void-tactics-force-games-tab", "true");

    // Use fresh event objects per target (re-dispatching the same Event object
    // is unreliable across environments).
    window.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-games", {
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new CustomEvent("void-tactics-navigate-to-games", {
        bubbles: true,
      }),
    );
  }, []);

  const resetFleetSelectionModalState = useCallback(() => {
    const lid = selectedLobbyRef.current;
    if (lid != null && address && chainId) {
      removeFleetDraft(chainId, address, lid);
    }
    setSelectedLobby(null);
    setSelectedShips([]);
    setShipPositions([]);
    setSelectedShipId(null);
    setShowLoadFleetMenu(false);
    setPendingLoadFleet(null);
    setFiltersExpanded(false);
    setShowFleetConfirmation(false);
    lastLoadedFleetIdRef.current = null;
    setFleetFilters({
      showShiny: true,
      showCommon: true,
      showUnavailable: false,
      minCost: 0,
      maxCost: 10000,
      minAccuracy: 0,
      maxAccuracy: 2,
      minHull: 0,
      maxHull: 2,
      minSpeed: 0,
      maxSpeed: 2,
      weaponType: "all",
      defenseType: "all",
      specialType: "all",
    });
  }, [address, chainId]);

  useEffect(() => {
    const onChainChanged = () => {
      setShowCreateForm(false);
      resetFleetSelectionModalState();
      setShowFleetView(false);
      setIsCreatingFleet(false);
      setViewingFleetId(null);
      setViewingFleetOwner(null);
      setDraggedShipId(null);
      setDragOverPosition(null);
      setPendingLoadFleet(null);
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(
        VOID_TACTICS_CHAIN_CHANGED_EVENT,
        onChainChanged,
      );
    };
  }, [resetFleetSelectionModalState]);

  /** Close the fleet modal but keep in-memory and saved draft selection. */
  const closeFleetModalOnly = useCallback(() => {
    setSelectedLobby(null);
    setFiltersExpanded(false);
    setShowFleetConfirmation(false);
    setShowLoadFleetMenu(false);
    setPendingLoadFleet(null);
  }, []);

  const clearFleetDraftSelection = useCallback(() => {
    if (!selectedLobby || !address) return;
    if (chainId) {
      removeFleetDraft(chainId, address, selectedLobby);
    }
    setSelectedShips([]);
    setShipPositions([]);
    setSelectedShipId(null);
    setShowLoadFleetMenu(false);
    setPendingLoadFleet(null);
  }, [selectedLobby, address, chainId]);

  const applyLoadedFleetSelection = (shipIdsToLoad: number[]) => {
    if (!selectedLobby) return;
    const currentLobby = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === selectedLobby,
    );
    if (!currentLobby) return;
    const isCreator = currentLobby.basic.creator === userId;

    const placedShipIds: number[] = [];
    const nextPositions: Array<{ shipId: number; row: number; col: number }> = [];
    const existingPositions: Array<{ row: number; col: number }> = [];
    for (const shipId of shipIdsToLoad) {
      const position = findNextPosition(isCreator, existingPositions);
      if (!position) break;
      placedShipIds.push(shipId);
      nextPositions.push({ shipId, row: position.row, col: position.col });
      existingPositions.push(position);
    }

    setSelectedShips(placedShipIds);
    setShipPositions(nextPositions);
    setSelectedShipId(null);
    setShowLoadFleetMenu(false);
    setPendingLoadFleet(null);

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

  const handleRequestLoadSavedFleet = (fleet: FleetComposition) => {
    const availableShipIds: number[] = [];
    let unavailableCount = 0;

    for (const shipIdString of fleet.shipIds) {
      const ship = ships.find((s) => s.id.toString() === shipIdString);
      if (!ship) {
        unavailableCount++;
        continue;
      }
      if (!ship.shipData.constructed) {
        unavailableCount++;
        continue;
      }
      if (ship.shipData.timestampDestroyed > 0) {
        unavailableCount++;
        continue;
      }
      if (ship.shipData.inFleet) {
        unavailableCount++;
        continue;
      }
      availableShipIds.push(ship.id);
    }

    if (availableShipIds.length === 0) {
      toast.error("No available ships from that saved fleet can be loaded.");
      return;
    }

    if (unavailableCount > 0) {
      setShowLoadFleetMenu(false);
      setPendingLoadFleet({
        fleet,
        availableShipIds,
        unavailableCount,
      });
      return;
    }

    applyLoadedFleetSelection(availableShipIds);
  };

  const getSavedFleetSummary = useCallback(
    (fleet: FleetComposition) => {
      let availableCount = 0;
      let unavailableCount = 0;
      let totalThreat = 0;
      for (const shipIdString of fleet.shipIds) {
        const ship = ships.find((s) => s.id.toString() === shipIdString);
        if (!ship) {
          unavailableCount++;
          continue;
        }
        totalThreat += Number(ship.shipData.cost);
        if (
          ship.shipData.constructed &&
          !(ship.shipData.timestampDestroyed > 0) &&
          !ship.shipData.inFleet
        ) {
          availableCount++;
        } else {
          unavailableCount++;
        }
      }
      return {
        totalShips: fleet.shipIds.length,
        totalThreat,
        availableCount,
        unavailableCount,
      };
    },
    [ships],
  );

  // Close fleet selection modal (if open) and switch to Games tab
  const closeFleetModalAndGoToGames = useCallback(() => {
    resetFleetSelectionModalState();
    navigateToGamesTab();
  }, [resetFleetSelectionModalState, navigateToGamesTab]);

  const fleetSelectionAttributesLoading = attributesLoading;

  const [dragging, setDragging] = useState<{
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed"
      | null;
    startX: number;
    startValue: number;
    container: HTMLElement | null;
  }>({ type: null, startX: 0, startValue: 0, container: null });

  const handleThumbMouseDown = (
    e: React.MouseEvent,
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed",
  ) => {
    e.preventDefault();
    const container = (e.target as HTMLElement).closest(
      ".range-slider-container",
    ) as HTMLElement;
    if (!container) return;

    const currentValue = fleetFilters[type];
    setDragging({
      type,
      startX: e.clientX,
      startValue: currentValue,
      container, // Store the specific container
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.type || !dragging.container) return;

      const rect = dragging.container.getBoundingClientRect();
      const containerWidth = rect.width - 20; // Account for 10px padding on each side
      const halfThumbWidth = 9; // Account for half thumb width
      const availableWidth = containerWidth - halfThumbWidth;
      const relativeX = e.clientX - rect.left - 10; // Account for padding
      const percentage = Math.max(0, Math.min(1, relativeX / availableWidth));
      const newValue = Math.round(percentage * 2); // 0, 1, or 2

      // Clamp the value to valid range (0, 1, 2)
      const clampedValue = Math.max(0, Math.min(2, newValue));

      if (dragging.type.includes("min")) {
        const maxType = dragging.type.replace(
          "min",
          "max",
        ) as keyof typeof fleetFilters;
        const maxValue = fleetFilters[maxType] as number;
        if (clampedValue <= maxValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      } else {
        const minType = dragging.type.replace(
          "max",
          "min",
        ) as keyof typeof fleetFilters;
        const minValue = fleetFilters[minType] as number;
        if (clampedValue >= minValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      }
    },
    [dragging.type, dragging.container, fleetFilters],
  );

  const handleMouseUp = () => {
    setDragging({ type: null, startX: 0, startValue: 0, container: null });
  };

  useEffect(() => {
    if (dragging.type) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  // Filter panel state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter ships based on current filters
  const filteredShips = ships.filter((ship) => {
    const costsVersionOk =
      globalCostsVersion === null ||
      Number(ship.shipData.costsVersion) === globalCostsVersion;

    if (selectedShips.includes(ship.id)) {
      return costsVersionOk;
    }

    if (!costsVersionOk) return false;

    // Filter out ships that are not available for fleet selection
    // Ships must be constructed, not destroyed, and not already in a fleet
    // Unless showUnavailable is enabled
    if (!fleetFilters.showUnavailable) {
      if (!ship.shipData.constructed) return false;
      if (ship.shipData.timestampDestroyed > 0) return false;
      if (ship.shipData.inFleet) return false;
    }

    const cost = Number(ship.shipData.cost);
    const isShiny = ship.shipData.shiny;
    const accuracy = ship.traits.accuracy;
    const hull = ship.traits.hull;
    const speed = ship.traits.speed;

    // Rarity filters
    if (isShiny && !fleetFilters.showShiny) return false;
    if (!isShiny && !fleetFilters.showCommon) return false;

    // Cost filters
    if (cost < fleetFilters.minCost || cost > fleetFilters.maxCost)
      return false;

    // Trait filters
    if (
      accuracy < fleetFilters.minAccuracy ||
      accuracy > fleetFilters.maxAccuracy
    )
      return false;
    if (hull < fleetFilters.minHull || hull > fleetFilters.maxHull)
      return false;
    if (speed < fleetFilters.minSpeed || speed > fleetFilters.maxSpeed)
      return false;

    // Equipment filters
    if (fleetFilters.weaponType !== "all") {
      const weaponName = getMainWeaponName(
        ship.equipment.mainWeapon,
      ).toLowerCase();
      if (!weaponName.includes(fleetFilters.weaponType.toLowerCase()))
        return false;
    }

    if (fleetFilters.defenseType !== "all") {
      const hasShield = ship.equipment.shields > 0;
      if (fleetFilters.defenseType === "shield" && !hasShield) return false;
      if (fleetFilters.defenseType === "armor" && hasShield) return false;
    }

    if (fleetFilters.specialType !== "all") {
      const specialName = getSpecialName(ship.equipment.special).toLowerCase();
      if (fleetFilters.specialType === "none" && specialName !== "none")
        return false;
      if (
        fleetFilters.specialType !== "none" &&
        !specialName.includes(fleetFilters.specialType.toLowerCase())
      )
        return false;
    }

    return true;
  });

  const selectedFleetHasStaleCostsVersion = useMemo(() => {
    if (globalCostsVersion === null) return false;
    return selectedShips.some((id) => {
      const ship = resolveFleetPickerShip(id);
      return (
        !ship || Number(ship.shipData.costsVersion) !== globalCostsVersion
      );
    });
  }, [globalCostsVersion, selectedShips, resolveFleetPickerShip]);

  // Create lobby form state
  const [createForm, setCreateForm] = useState({
    threatScale: "skirmish" as "skirmish" | "battle",
    turnPace: "immediate" as "immediate" | "correspondence",
    selectedMapId: "1",
    scoreLength: "medium" as "short" | "medium" | "long",
    creatorGoesFirst: false,
    reservedJoiner: "", // Optional: address to reserve for (empty for open lobby)
  });

  const createFormMaxScore = useMemo(() => {
    switch (createForm.scoreLength) {
      case "short":
        return SHORT_MAX_SCORE;
      case "long":
        return LONG_MAX_SCORE;
      default:
        return MEDIUM_MAX_SCORE;
    }
  }, [createForm.scoreLength]);

  const createFormCostLimit = useMemo(
    () =>
      createForm.threatScale === "skirmish"
        ? SKIRMISH_THREAT_LIMIT
        : BATTLE_THREAT_LIMIT,
    [createForm.threatScale],
  );

  const createFormTurnTimeSeconds = useMemo(
    () =>
      createForm.turnPace === "immediate"
        ? IMMEDIATE_GAME_TURN_SECONDS
        : CORRESPONDENCE_GAME_TURN_SECONDS,
    [createForm.turnPace],
  );

  // const handleLeaveLobby = async (lobbyId: number) => {
  //   if (!isConnected) return;

  //   try {
  //     await leaveLobby(lobbyId);
  //   } catch (error) {
  //     console.error("Failed to leave lobby:", error);
  //   }
  // };

  const handleCreateFleet = async (lobbyId: number) => {
    if (!isConnected || selectedShips.length === 0) return;

    if (selectedShips.length > MAX_SHIPS_PER_FLEET) {
      toast.error(
        `A fleet can have at most ${MAX_SHIPS_PER_FLEET} ships for this map. Remove ships until you are at or below the limit.`,
      );
      return;
    }

    if (selectedFleetHasStaleCostsVersion) {
      toast.error(
        "Remove or update ships that are not on the current cost version (Manage Navy) before creating a fleet.",
      );
      return;
    }

    const currentLobby = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === lobbyId,
    );
    const totalCost = selectedShips.reduce((sum, shipId) => {
      const ship = ships.find((s) => s.id === shipId);
      return sum + (ship ? Number(ship.shipData.cost) : 0);
    }, 0);
    const costLimit = currentLobby
      ? Number(currentLobby.basic.costLimit)
      : 1000;
    const ninetyPercentThreshold = costLimit * 0.9;
    const isUnderNinetyPercent = totalCost < ninetyPercentThreshold;
    const isOverCostLimit = totalCost > costLimit;

    if (isOverCostLimit) {
      toast.error(
        `Fleet threat (${totalCost}) exceeds this lobby limit (${costLimit}). Remove ships or pick a different lobby.`,
      );
      return;
    }

    if (isUnderNinetyPercent) {
      setShowFleetConfirmation(true);
      return;
    }

    await createFleetWithConfirmation(lobbyId);
  };

  // Track the last fleet creation lobby ID to show toast when receipt is received
  const lastFleetCreationLobbyRef = React.useRef<number | null>(null);


  const createFleetWithConfirmation = async (lobbyId: number) => {
    if (!isConnected || selectedShips.length === 0) return;

    if (selectedShips.length > MAX_SHIPS_PER_FLEET) {
      toast.error(
        `A fleet can have at most ${MAX_SHIPS_PER_FLEET} ships for this map.`,
      );
      return;
    }

    if (selectedFleetHasStaleCostsVersion) {
      toast.error(
        "Remove or update ships that are not on the current cost version (Manage Navy) before creating a fleet.",
      );
      return;
    }

    const currentLobbyForCost = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === lobbyId,
    );
    const totalThreat = selectedShips.reduce((sum, shipId) => {
      const ship = ships.find((s) => s.id === shipId);
      return sum + (ship ? Number(ship.shipData.cost) : 0);
    }, 0);
    const lobbyCostLimit = currentLobbyForCost
      ? Number(currentLobbyForCost.basic.costLimit)
      : 1000;
    if (totalThreat > lobbyCostLimit) {
      toast.error(
        `Fleet threat (${totalThreat}) exceeds this lobby limit (${lobbyCostLimit}). Remove ships before confirming.`,
      );
      return;
    }

    setIsCreatingFleet(true);
    try {
      // Convert shipPositions to the format expected by the contract
      const startingPositions = shipPositions.map((pos) => ({
        row: pos.row,
        col: pos.col,
      }));

      const fleetResult = await createFleet(lobbyId, selectedShips, startingPositions);

      lastFleetCreationLobbyRef.current = null;
      setShowFleetView(false);
      setShowFleetConfirmation(false);
      refetchSelectedLobby();
      refetchGames();
      await loadLobbies();
      resetFleetSelectionModalState();

      if (fleetResult?.gameId) {
        toast.success("Both fleets ready — game starting!");
        navigateToGamesTab();
      } else {
        toast.success("Fleet submitted! Waiting for opponent to select their fleet.");
      }
    } catch (error) {
      console.error("Failed to create fleet:", error);
      lastFleetCreationLobbyRef.current = null;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Fleet creation failed: ${errorMessage}`);
      }
    } finally {
      setIsCreatingFleet(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // LobbyStatus.Open
        return "text-phosphor-green";
      case 1: // LobbyStatus.FleetSelection
        return "text-amber";
      case 2: // LobbyStatus.InGame
        return "text-warning-red";
      default:
        return "text-text-muted";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: // LobbyStatus.Open
        return "OPEN";
      case 1: // LobbyStatus.FleetSelection
        return "FLEET SELECTION";
      case 2: // LobbyStatus.InGame
        return "IN GAME";
      default:
        return "UNKNOWN";
    }
  };

  // NOTE: Early returns moved below to keep hook order stable across renders

  // Auto-fetch opponent fleet data for grid preview (cache immutable fleets)
  const opponentCacheKey = React.useMemo(() => {
    if (!selectedLobby) return null;
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === userId;
    const opponentFleetId = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return opponentFleetId && opponentFleetId > 0
      ? `fleet:${opponentFleetId.toString()}`
      : null;
  }, [selectedLobby, address, resolvedLobbyForSelected]);

  // Compute opponent fleetId for grid
  const opponentFleetIdForGrid = React.useMemo(() => {
    if (!selectedLobby) return null as number | null;
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === userId;
    const fid = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return fid && fid > 0 ? fid : null;
  }, [selectedLobby, address, resolvedLobbyForSelected]);

  const [opponentGridPositions, setOpponentGridPositions] = React.useState<
    Array<{ shipId: number; row: number; col: number }>
  >([]);
  const [opponentGridShips, setOpponentGridShips] = React.useState<Ship[]>([]);

  // Fetch opponent fleet ships + positions when their fleet ID becomes known
  const opponentGridPositionsFromHook = opponentGridPositions;
  const opponentGridShipsData = opponentGridShips;

  const lastFetchedOpponentFleetId = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!opponentFleetIdForGrid) {
      setOpponentGridPositions([]);
      setOpponentGridShips([]);
      lastFetchedOpponentFleetId.current = null;
      return;
    }
    // Skip if we already have this fleet loaded
    if (lastFetchedOpponentFleetId.current === opponentFleetIdForGrid) return;

    fetch(`/api/fleets/${opponentFleetIdForGrid}`)
      .then((r) => r.json())
      .then((data: { ships?: Ship[]; positions?: Array<{ shipId: number; row: number; col: number }> }) => {
        const ships = data.ships ?? [];
        const positions = data.positions ?? [];
        setOpponentGridPositions(positions);
        setOpponentGridShips(ships);
        if (ships.length > 0) cacheShipsData(ships);
        lastFetchedOpponentFleetId.current = opponentFleetIdForGrid;
      })
      .catch(() => {});
  }, [opponentFleetIdForGrid]);

  // Opponent grid ship IDs (used for flippedShipIds)
  const opponentGridShipIds = React.useMemo(
    () => opponentGridPositionsFromHook.map((p) => p.shipId),
    [opponentGridPositionsFromHook],
  );

  // Combine both fleets for grid view during selection
  const combinedPositions = React.useMemo(
    () => {
      const result = [
        ...shipPositions,
        ...(opponentGridPositionsFromHook.length > 0 ? opponentGridPositionsFromHook : []),
      ];
      return result;
    },
    [shipPositions, opponentGridPositionsFromHook],
  );

  const combinedShips = React.useMemo<Ship[]>(() => {
    const shipsArray = (ships as Ship[]) || [];
    const opponentShipsArray = ((opponentGridShipsData as Ship[]) ??
      []) as Ship[];
    const playerFleetShipsArray = playerFleetShips || [];

    // Combine all ships, avoiding duplicates by ship ID
    const shipMap = new Map<number, Ship>();

    // Add owned ships first
    shipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    // Add player's fleet ships (these may not be in owned ships if they're in a fleet)
    // These are critical for displaying existing fleet selections
    // Priority: player fleet ships override owned ships to ensure we have the latest data
    playerFleetShipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    // Add opponent ships
    opponentShipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    return Array.from(shipMap.values());
  }, [ships, opponentGridShipsData, playerFleetShips]);

  // Selection allowed only on current builder's ships
  const selectableShipIds = selectedShips;
  // Base sprite faces left. Flip creator's ships so they face right; joiner's ships stay unflipped (face left)
  const isCreatorViewer = !!(
    selectedLobby &&
    resolvedLobbyForSelected?.basic.creator === userId
  );
  // Use ship IDs actually on grid: when creator is viewing, creator's ships are in shipPositions
  const flippedShipIds = React.useMemo(
    () =>
      isCreatorViewer
        ? shipPositions.map((p) => p.shipId)
        : opponentGridShipIds,
    [isCreatorViewer, shipPositions, opponentGridShipIds],
  );

  // Apply cache-first and update state when data loads
  React.useEffect(() => {
    // Load from cache first
    if (opponentCacheKey && typeof window !== "undefined") {
      const cached = window.localStorage.getItem(opponentCacheKey);
      if (
        cached &&
        opponentGridPositions.length === 0 &&
        opponentGridShips.length === 0
      ) {
        try {
          const parsed = JSON.parse(cached);
          if (
            parsed?.positions &&
            Array.isArray(parsed.positions) &&
            parsed?.ships &&
            Array.isArray(parsed.ships)
          ) {
            setOpponentGridPositions(parsed.positions);
            const shipsFromCache: Ship[] = (parsed.ships as unknown[]).map(
              (raw) => {
                const s = raw as {
                  id: string;
                  traits: { serialNumber: string } & Ship["traits"];
                  shipData: { timestampDestroyed: string } & Ship["shipData"];
                };
                return {
                  ...(s as unknown as Ship),
                  id: Number(s.id),
                  traits: {
                    ...s.traits,
                    serialNumber: Number(s.traits.serialNumber),
                  },
                  shipData: {
                    ...s.shipData,
                    timestampDestroyed: Number(s.shipData.timestampDestroyed),
                  },
                };
              },
            );
            setOpponentGridShips(shipsFromCache);
          }
        } catch {
          // Ignore cache errors and fall back to fresh data
        }
      }
    }
  }, [
    opponentCacheKey,
    opponentGridPositions.length,
    opponentGridShips.length,
  ]);

  React.useEffect(() => {
    // Update from hook reads
    if (opponentGridPositionsFromHook.length > 0) {
      setOpponentGridPositions(opponentGridPositionsFromHook);
    }
    if (opponentGridShipsData && Array.isArray(opponentGridShipsData)) {
      setOpponentGridShips(opponentGridShipsData as Ship[]);
    }
    // Write-through to cache when we have both
    if (
      opponentCacheKey &&
      opponentGridPositionsFromHook.length > 0 &&
      opponentGridShipsData &&
      typeof window !== "undefined"
    ) {
      try {
        const shipsForCache = (opponentGridShipsData as Ship[]).map((ship) => ({
          ...ship,
          id: ship.id.toString(),
          traits: {
            ...ship.traits,
            serialNumber: ship.traits.serialNumber.toString(),
          },
          shipData: {
            ...ship.shipData,
            timestampDestroyed: ship.shipData.timestampDestroyed.toString(),
          },
        }));

        window.localStorage.setItem(
          opponentCacheKey,
          JSON.stringify({
            positions: opponentGridPositionsFromHook,
            ships: shipsForCache,
          }),
        );
      } catch {
        // Ignore cache write errors in UI flow
      }
    }
  }, [opponentCacheKey, opponentGridPositionsFromHook, opponentGridShipsData]);

  return (
    <div className="text-cyan font-mono">
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow:
            0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow:
            0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow:
            0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow:
            0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-webkit-slider-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-moz-range-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-webkit-slider-runnable-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .range-slider-container {
          position: relative;
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 10px;
        }
        .range-slider-track {
          position: absolute;
          top: 50%;
          left: 10px;
          right: 10px;
          height: 6px;
          background: #374151;
          border-radius: 3px;
          transform: translateY(-50%);
        }
        .range-slider-fill {
          position: absolute;
          top: 50%;
          left: 10px;
          height: 6px;
          background: linear-gradient(to right, #06b6d4, #0891b2);
          border-radius: 3px;
          transform: translateY(-50%);
          transition: all 0.2s ease;
        }
        .range-slider-thumb {
          position: absolute;
          top: 50%;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border: 3px solid #000;
          border-radius: 50%;
          cursor: pointer;
          transform: translate(-50%, -50%);
          box-shadow:
            0 2px 6px rgba(6, 182, 212, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
          z-index: 10;
        }
        .range-slider-thumb:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow:
            0 4px 12px rgba(6, 182, 212, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.6);
        }
        .range-slider-thumb:active {
          transform: translate(-50%, -50%) scale(1.05);
        }
      `}</style>
      <h3 className="mb-5 text-center text-xl font-bold tracking-wider sm:mb-6 sm:text-2xl">
        [CREATE AND JOIN NEW GAMES]
      </h3>

      {lobbyUiLoadingShips && (
        <div
          className="mb-8 flex flex-col items-center justify-center border border-cyan/50 bg-black/50 px-6 py-16 text-center"
          style={{ borderRadius: 0 }}
        >
          <p className="text-sm font-bold uppercase tracking-wider text-cyan/90">
            ACQUIRING DATA...
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Checking on-chain ship ownership
          </p>
        </div>
      )}

      {needsShipsForLobbyUi && (
        <div
          className="mb-8 border-2 border-cyan/35 bg-black/55 px-4 py-10 text-center sm:px-12 sm:py-12"
          style={{ borderRadius: 0 }}
        >
          <p
            className="text-xl font-black uppercase tracking-wide text-cyan sm:text-2xl"
            style={{
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            You must own at least {MIN_SHIPS_FOR_LOBBIES} ships to join a game
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
            Open Manage Navy to claim ships and grow your navy. You need at least{" "}
            {MIN_SHIPS_FOR_LOBBIES} hulls on chain, all constructed and ready,
            before lobbies appear here.
          </p>
          <button
            type="button"
            onClick={navigateToManageNavyForShips}
            className="mt-8 border-2 border-amber bg-amber/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-amber transition-colors hover:bg-amber/15"
            style={{ borderRadius: 0 }}
          >
            Click here to claim free ships
          </button>
        </div>
      )}

      {needsConstructForLobbyUi && (
        <div
          className="mb-8 border-2 border-amber/35 bg-black/55 px-4 py-10 text-center sm:px-12 sm:py-12"
          style={{ borderRadius: 0 }}
        >
          <p
            className="text-xl font-black uppercase tracking-wide text-amber sm:text-2xl"
            style={{
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            You must construct at least {MIN_SHIPS_FOR_LOBBIES} ships before you
            can join a game.
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
            You have at least {MIN_SHIPS_FOR_LOBBIES} hulls, but only{" "}
            {constructedReadyCount} constructed and ready. Open Manage Navy and
            finish construction until you have {MIN_SHIPS_FOR_LOBBIES} active
            ships.
          </p>
          <button
            type="button"
            onClick={navigateToManageNavyForShips}
            className="mt-8 border-2 border-cyan bg-cyan/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/15"
            style={{ borderRadius: 0 }}
          >
            Open Manage Navy
          </button>
        </div>
      )}

      {!lobbyUiLoadingShips &&
        !needsShipsForLobbyUi &&
        !needsConstructForLobbyUi && (
        <>
      {/* Player Status + create lobby */}
      {isConnected && (
        <div
          className="mb-6 border border-cyan bg-black/40 p-4"
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          <h4 className="mb-3 text-lg font-bold text-cyan">PLAYER STATUS</h4>
          <div className="grid grid-cols-2 gap-3 text-sm sm:gap-4">
            <div>
              <span className="text-text-muted">Active Lobbies:</span>
              <span className="ml-2">{activeLobbiesCount.toString()}</span>
            </div>
            <div>
              <span className="text-text-muted">Kick Count:</span>
              <span className="ml-2">
                {playerState?.kickCount?.toString() || "0"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Has Active Lobby:</span>
              <span
                className={`ml-2 ${
                  hasActiveLobby ? "text-phosphor-green" : "text-warning-red"
                }`}
              >
                {hasActiveLobby ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Free Games:</span>
              <span className="ml-2">
                {freeGamesPerAddress?.toString() || "0"}
              </span>
            </div>
            {!showCreateForm && (
              <div className="col-span-2 flex flex-col justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  disabled={!canCreateLobby || !!paused}
                  className="w-full border-2 border-cyan px-4 py-3 font-mono font-bold tracking-wider text-cyan transition-all duration-200 hover:border-cyan hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderRadius: 0,
                  }}
                >
                  {paused ? "LOBBIES PAUSED" : "CREATE LOBBY"}
                </button>
                {needsPaymentForLobby && additionalLobbyFee ? (
                  <p className="text-center text-xs text-amber font-mono">
                    // Free games used — lobby fee: {((additionalLobbyFee ?? 0) / 1e18).toFixed(4)} {getNativeTokenSymbol(chainId)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="mb-6 border border-amber/80 bg-black/40 p-4"
        style={{
          borderRadius: 0,
        }}
      >
        <p
          className="text-sm leading-relaxed text-amber/90"
          style={{
            fontFamily:
              "var(--font-jetbrains-mono), 'Courier New', monospace",
          }}
        >
          During alpha testing, we recommend coordinating games on Discord
          before creating a lobby.
        </p>
        <p
          className="mt-3 text-sm leading-relaxed text-amber/90"
          style={{
            fontFamily:
              "var(--font-jetbrains-mono), 'Courier New', monospace",
          }}
        >
          Click{" "}
          <a
            href={VOID_TACTICS_ALPHA_DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber underline decoration-amber/70 underline-offset-2 transition-colors hover:text-amber/80"
          >
            here
          </a>{" "}
          to request access.
        </p>
      </div>

      {/* Create Lobby Form */}
      {showCreateForm && (
        <div
          className="mb-6 p-4 border border-purple-400 bg-black/40"
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-lg font-bold text-purple tracking-widest">[CREATE LOBBY]</h4>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close create lobby form"
              className="px-3 py-1 border border-warning-red text-warning-red hover:bg-warning-red/20"
              style={{ borderRadius: 0 }}
            >
              X
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <span className="block text-sm text-text-muted mb-2">
                Fleet threat limit
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-none border border-gunmetal bg-black/40 p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.threatScale === "skirmish"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          threatScale: "skirmish",
                        }));
                      } else {
                        setCreateForm((prev) => ({
                          ...prev,
                          threatScale: "battle",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{
                      borderRadius: 0,
                    }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Skirmish
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      1000 threat per fleet
                    </span>
                  </span>
                </label>
                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-none border border-gunmetal bg-black/40 p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.threatScale === "battle"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          threatScale: "battle",
                        }));
                      } else {
                        setCreateForm((prev) => ({
                          ...prev,
                          threatScale: "skirmish",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{
                      borderRadius: 0,
                    }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Battle
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      2000 threat per fleet
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div>
              <span className="block text-sm text-text-muted mb-2">
                Turn timer
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-none border border-gunmetal bg-black/40 p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.turnPace === "immediate"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          turnPace: "immediate",
                        }));
                      } else {
                        setCreateForm((prev) => ({
                          ...prev,
                          turnPace: "correspondence",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{
                      borderRadius: 0,
                    }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Immediate game
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      5 minutes per turn
                    </span>
                  </span>
                </label>
                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-none border border-gunmetal bg-black/40 p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.turnPace === "correspondence"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          turnPace: "correspondence",
                        }));
                      } else {
                        setCreateForm((prev) => ({
                          ...prev,
                          turnPace: "immediate",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{
                      borderRadius: 0,
                    }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Correspondence game
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      24 hours per turn
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Map</label>
              <input
                type="number"
                value={createForm.selectedMapId}
                disabled
                readOnly
                className="w-full cursor-not-allowed rounded-none border border-gunmetal bg-black/60 px-3 py-2 text-text-muted"
                aria-readonly
              />
            </div>
            <div>
              <span className="block text-sm text-text-muted mb-2">
                Max score (points to win)
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-none border border-gunmetal bg-black/40 p-2.5 sm:gap-3 sm:p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.scoreLength === "short"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "short",
                        }));
                      } else if (createForm.scoreLength === "short") {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "medium",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{ borderRadius: 0 }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Short
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      50 points
                    </span>
                  </span>
                </label>
                <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-none border border-gunmetal bg-black/40 p-2.5 sm:gap-3 sm:p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.scoreLength === "medium"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "medium",
                        }));
                      } else if (createForm.scoreLength === "medium") {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "short",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{ borderRadius: 0 }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Medium
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      100 points
                    </span>
                  </span>
                </label>
                <label className="flex min-w-0 cursor-pointer items-start gap-2 rounded-none border border-gunmetal bg-black/40 p-2.5 sm:gap-3 sm:p-3 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan">
                  <input
                    type="checkbox"
                    checked={createForm.scoreLength === "long"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "long",
                        }));
                      } else if (createForm.scoreLength === "long") {
                        setCreateForm((prev) => ({
                          ...prev,
                          scoreLength: "medium",
                        }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                    style={{ borderRadius: 0 }}
                  />
                  <span>
                    <span className="block font-mono font-bold text-cyan">
                      Long
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      200 points
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">
                Reserve for Player (Optional)
              </label>
              <input
                type="text"
                value={createForm.reservedJoiner}
                onChange={(e) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    reservedJoiner: e.target.value,
                  }));
                }}
                className={`w-full px-3 py-2 bg-black/60 border rounded-none text-cyan ${
                  createForm.reservedJoiner.trim() &&
                  address &&
                  createForm.reservedJoiner.trim().toLowerCase() ===
                    address.toLowerCase()
                    ? "border-warning-red"
                    : "border-amber"
                }`}
                placeholder="0x0000... (leave empty for open lobby)"
              />
              {createForm.reservedJoiner.trim() &&
              address &&
              createForm.reservedJoiner.trim().toLowerCase() ===
                address.toLowerCase() ? (
                <p className="text-xs text-warning-red mt-1 font-bold">
                  [ERR] Cannot reserve a lobby for yourself! Please enter a
                  different player&apos;s address or leave empty for an open
                  lobby.
                </p>
              ) : createForm.reservedJoiner ? (
                <p className="text-xs text-amber mt-1">
                  // Requires 1 UTC to reserve game for this player
                </p>
              ) : (
                <p className="text-xs text-amber mt-1">
                  Leave empty to create an open lobby
                </p>
              )}
            </div>
            <div className="p-3 bg-steel/50 rounded-none border border-gunmetal">
              <p className="text-sm text-text-secondary">
                <span className="text-amber">// Turn Order:</span> The
                player who creates their fleet first will go first in the game.
              </p>
            </div>
            {/* Cost summary — always shown (lobby creation costs 1 UTC) */}
            <div className="border border-amber/60 bg-black/30 p-3 font-mono text-xs space-y-1">
              <p className="text-amber font-bold tracking-wider">// COST BREAKDOWN</p>
              <div className="flex justify-between gap-4">
                <span className="text-text-secondary">Lobby creation fee</span>
                <span className="text-amber font-bold shrink-0">1 UTC</span>
              </div>
              {needsPaymentForLobby && additionalLobbyFee ? (
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">Lobby fee (free games exhausted)</span>
                  <span className="text-amber font-bold shrink-0">
                    {((additionalLobbyFee ?? 0) / 1e18).toFixed(4)} {getNativeTokenSymbol(chainId)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-amber/30 pt-1 mt-1">
                <span className="text-text-muted">Your UTC balance</span>
                <span className={`font-bold shrink-0 ${utcBalance < 1 ? "text-warning-red" : "text-phosphor-green"}`}>
                  {utcBalance} UTC
                </span>
              </div>
              {utcBalance < 1 && (
                <p className="text-warning-red font-bold tracking-wider pt-1">[ERR] Insufficient UTC balance — visit the store to top up.</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <LobbyCreateButton
                costLimit={createFormCostLimit}
                turnTime={createFormTurnTimeSeconds}
                creatorGoesFirst={createForm.creatorGoesFirst}
                selectedMapId={Number(createForm.selectedMapId)}
                maxScore={createFormMaxScore}
                value={0}
                reservedJoiner={
                  createForm.reservedJoiner.trim()
                    ? (createForm.reservedJoiner.trim() as `0x${string}`)
                    : undefined
                }
                disabled={
                  utcBalance < 1 ||
                  !!(
                    createForm.reservedJoiner.trim() &&
                    address &&
                    createForm.reservedJoiner.trim().toLowerCase() ===
                      address.toLowerCase()
                  )
                }
                className="w-full flex-1 px-6 py-3 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent sm:w-auto"
                onSuccess={() => {
                  setShowCreateForm(false);
                  refetchUtcBalance();
                }}
                onError={(error) => {
                  console.error("Failed to create lobby:", error);
                }}
              >
                CREATE
              </LobbyCreateButton>
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full px-4 py-2 border border-warning-red text-warning-red hover:bg-warning-red/20 sm:w-auto"
                style={{
                  borderRadius: 0, // Square corners for industrial theme
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lobby List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-lg font-bold text-cyan">AVAILABLE LOBBIES</h4>
          <button
            onClick={() => loadLobbies()}
            className="w-full px-3 py-2 text-xs border border-cyan text-cyan hover:bg-cyan/10 sm:w-auto sm:py-1"
            style={{
              borderRadius: 0, // Square corners for industrial theme
            }}
          >
            REFRESH
          </button>
        </div>
        {lobbyList.isLoading ? (
          <div className="text-center text-text-muted">ACQUIRING DATA...</div>
        ) : lobbyList.error ? (
          <div className="text-center text-warning-red">
            [ERR]: {lobbyList.error}
          </div>
        ) : lobbyList.lobbies.length === 0 ? (
          <div className="text-center text-text-muted">
            [NO OPEN ENGAGEMENTS]
            {lobbyCount && lobbyCount > 0 ? (
              <div className="mt-2 text-sm">
                Total lobbies in system: {lobbyCount}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lobbyList.lobbies.map((lobby) => (
            <div
              key={lobby.basic.id.toString()}
              className={`overflow-hidden border ${
                address &&
                lobby.basic.creator === userId
                  ? "border-amber bg-amber/5"
                  : "border-cyan bg-black/30"
              }`}
              style={{ borderRadius: 0 }}
            >
              {/* ── Header bar ── */}
              <div
                className={`flex items-center justify-between px-4 py-2 border-b ${
                  address &&
                  lobby.basic.creator === userId
                    ? "border-amber/20 bg-amber/5"
                    : "border-cyan/15 bg-cyan/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <h5
                    className={`text-base font-black tracking-wider ${
                      address &&
                      lobby.basic.creator === userId
                        ? "text-amber"
                        : "text-cyan"
                    }`}
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                    }}
                  >
                    LOBBY #{lobby.basic.id.toString()}
                  </h5>
                  {userId === lobby.basic.creator && (
                      <span
                        className="text-[10px] font-bold tracking-widest text-amber/60"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                        }}
                      >
                        [YOURS]
                      </span>
                    )}
                </div>
                <span
                  className={`text-[11px] font-bold tracking-widest ${getStatusColor(lobby.state.status)}`}
                  style={{
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                  }}
                >
                  [{getStatusText(lobby.state.status)}]
                </span>
              </div>

              {/* ── Body ── */}
              <div className="px-4 pt-3 pb-2 space-y-2">
                {/* Creator: address left, W/L right */}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-sm font-bold ${
                      address &&
                      lobby.basic.creator === userId
                        ? "text-amber"
                        : "text-text-secondary"
                    }`}
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                    }}
                  >
                    {lobby.basic.creator.slice(0, 6)}…{lobby.basic.creator.slice(-4)}
                  </span>
                  <CreatorStats
                    address={lobby.basic.creator as `0x${string}`}
                    chainId={chainId}
                  />
                </div>

                {/* Joiner row */}
                {lobby.players.joiner !==
                  "0x0000000000000000000000000000000000000000" && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold tracking-widest text-text-muted"
                        style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
                      >
                        + JOINER
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          lobby.players.joiner === userId
                            ? "text-cyan"
                            : "text-text-secondary"
                        }`}
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                        }}
                      >
                        {lobby.players.joiner.slice(0, 6)}…{lobby.players.joiner.slice(-4)}
                      </span>
                    </div>
                    <CreatorStats
                      address={lobby.players.joiner as `0x${string}`}
                      chainId={chainId}
                    />
                  </div>
                )}

                {/* Reservation status */}
                {lobby.players.reservedJoiner &&
                  lobby.players.reservedJoiner !==
                    "0x0000000000000000000000000000000000000000" &&
                  typeof lobby.players.reservedJoiner === "string" && (
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-8 shrink-0 text-[10px] font-bold tracking-widest text-amber/70"
                        style={{
                          fontFamily: "var(--font-rajdhani), sans-serif",
                        }}
                      >
                        RESV
                      </span>
                      <span
                        className="text-sm text-amber"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                        }}
                      >
                        {lobby.players.reservedJoiner.slice(0, 6)}…{lobby.players.reservedJoiner.slice(-4)}
                      </span>
                      <span
                        className="ml-1 text-[10px] font-bold tracking-widest text-amber/50"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                        }}
                      >
                        [RESERVED]
                      </span>
                    </div>
                  )}

                {/* Stats: 2×2 stacked grid */}
                <div className="grid grid-cols-2 gap-px border border-gunmetal/40 mt-1">
                  {[
                    { label: "THREAT", value: formatThreatShort(lobby.basic.costLimit) },
                    { label: "TURN",   value: formatTurnShort(lobby.gameConfig.turnTime) },
                    { label: "MAP",    value: `#${lobby.gameConfig.selectedMapId.toString()}` },
                    { label: "SCORE",  value: formatScoreShort(lobby.gameConfig.maxScore) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5 px-3 py-2 bg-black/20">
                      <span
                        className="text-[9px] font-bold tracking-widest text-text-muted"
                        style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-xs font-bold text-cyan"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fleet indicators */}
                {(lobby.players.creatorFleetId > 0 ||
                  lobby.players.joinerFleetId > 0) && (
                  <div className="flex flex-wrap gap-2 border-t border-gunmetal/40 pt-2">
                    {lobby.players.creatorFleetId > 0 && (
                      <button
                        onClick={() => {
                          setViewingFleetId(lobby.players.creatorFleetId);
                          setViewingFleetOwner(lobby.basic.creator);
                          setShowFleetView(true);
                        }}
                        className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                          lobby.basic.creator === userId
                            ? "border-amber text-amber hover:bg-amber/10"
                            : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        CMDR FLEET #{lobby.players.creatorFleetId.toString()}
                      </button>
                    )}
                    {lobby.players.joinerFleetId > 0 && (
                      <button
                        onClick={() => {
                          setViewingFleetId(lobby.players.joinerFleetId);
                          setViewingFleetOwner(lobby.players.joiner);
                          setShowFleetView(true);
                        }}
                        className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                          lobby.players.joiner === userId
                            ? "border-cyan text-cyan hover:bg-cyan/10"
                            : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        JOIN FLEET #{lobby.players.joinerFleetId.toString()}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Action section ── */}
              <div className="border-t border-gunmetal/40 px-4 py-3">

              {lobby.state.status === LobbyStatus.Open &&
                lobby.basic.creator !== userId &&
                lobby.players.joiner !== userId && (
                  <div className="space-y-2">
                    {/* Check if lobby is reserved */}
                    {lobby.players.reservedJoiner &&
                    typeof lobby.players.reservedJoiner === "string" &&
                    lobby.players.reservedJoiner !==
                      "0x0000000000000000000000000000000000000000" ? (
                      // Reserved lobby
                      address &&
                      lobby.players.reservedJoiner.toLowerCase() ===
                        address.toLowerCase() ? (
                        // Reserved for current user - show accept/reject
                        <div className="space-y-2">
                          <p className="text-sm text-amber text-center font-mono">
                            [GAME RESERVED FOR YOU]
                          </p>
                          <div className="flex gap-2">
                            <LobbyAcceptButton
                              lobbyId={lobby.basic.id}
                              disabled={hasActiveLobby}
                              className="flex-1 px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              onSuccess={() => {
                                toast.success("Game accepted!");
                                loadLobbies();
                              }}
                              onError={(error) => {
                                console.error("Failed to accept game:", error);
                                const errorMessage = error.message || "";
                                if (
                                  errorMessage.includes("NotReservedJoiner") ||
                                  errorMessage.includes("LobbyNotReserved")
                                ) {
                                  toast.error(
                                    "This game is no longer reserved for you",
                                  );
                                } else {
                                  toast.error("Failed to accept game");
                                }
                              }}
                            >
                              ACCEPT
                            </LobbyAcceptButton>
                            <LobbyRejectButton
                              lobbyId={lobby.basic.id}
                              disabled={hasActiveLobby}
                              className="flex-1 px-6 py-3 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              onSuccess={() => {
                                toast.success(
                                  "Game rejected. Lobby is now open.",
                                );
                                loadLobbies();
                              }}
                              onError={(error) => {
                                console.error("Failed to reject game:", error);
                                toast.error("Failed to reject game");
                              }}
                            >
                              REJECT
                            </LobbyRejectButton>
                          </div>
                          {hasActiveLobby && (
                            <p className="text-xs text-amber text-center">
                              You already have an active lobby. Complete it
                              before accepting another.
                            </p>
                          )}
                        </div>
                      ) : (
                        // Reserved for someone else
                        <div className="text-center">
                          <p className="text-sm text-amber font-mono mb-2">
                            [RESERVED] This game is reserved for another player
                          </p>
                          <p className="text-xs text-text-muted">
                            Reserved for:{" "}
                            {lobby.players.reservedJoiner.slice(0, 6)}…{lobby.players.reservedJoiner.slice(-4)}
                          </p>
                        </div>
                      )
                    ) : (
                      // Open lobby - show join button
                      <>
                        <LobbyJoinButton
                          lobbyId={lobby.basic.id}
                          disabled={hasActiveLobby}
                          className="w-full px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onSuccess={() => {
                            toast.success("Joined lobby successfully!");
                            loadLobbies();
                          }}
                          onError={(error) => {
                            console.error("Failed to join lobby:", error);
                            const errorMessage = error.message || "";
                            if (errorMessage.includes("NotReservedJoiner")) {
                              toast.error(
                                "This game is reserved for another player",
                              );
                            } else {
                              toast.error("Failed to join lobby");
                            }
                          }}
                        >
                          JOIN LOBBY
                        </LobbyJoinButton>
                        {hasActiveLobby && (
                          <p className="text-xs text-amber text-center">
                            You already have an active lobby. Complete it before
                            joining another.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

              {/* Show action buttons for creator */}
              {lobby.basic.creator === userId && (
                <div className="flex flex-col gap-2">
                  {lobby.state.status === LobbyStatus.FleetSelection &&
                    lobby.players.creatorFleetId > 0 &&
                    lobby.players.joinerFleetId > 0 && (
                      <button
                        type="button"
                        onClick={closeFleetModalAndGoToGames}
                        className="w-full px-4 py-2.5 border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                      >
                        GO TO GAMES
                      </button>
                    )}
                  {lobby.state.status === LobbyStatus.FleetSelection && (
                      <button
                        onClick={() => setSelectedLobby(lobby.basic.id)}
                        className="w-full px-4 py-2.5 border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                      >
                        SELECT FLEET
                      </button>
                    )}
                  {lobby.state.status === LobbyStatus.FleetSelection &&
                    lobby.players.joinerFleetId === 0 && (
                      <button
                        type="button"
                        onClick={() => timeoutJoiner(lobby.basic.id)}
                        className="w-full px-4 py-2.5 border border-amber/60 text-amber/70 hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                        title={`Kick joiner if they haven\'t selected a fleet within ${lobby.gameConfig.turnTime}s of joining`}
                      >
                        TIMEOUT JOINER
                      </button>
                    )}
                  {lobby.state.status !== LobbyStatus.InGame && (
                    <LobbyLeaveButton
                      lobbyId={lobby.basic.id}
                      allowWhenOtherPending
                      className="w-full px-4 py-2.5 border border-warning-red/60 text-warning-red/70 hover:border-warning-red hover:text-warning-red hover:bg-warning-red/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                      onSuccess={() => {
                        if (selectedLobby === lobby.basic.id) {
                          resetFleetSelectionModalState();
                        }
                        loadLobbies();
                      }}
                      onError={(error) => {
                        console.error("Failed to leave lobby:", error);
                      }}
                    >
                      LEAVE LOBBY
                    </LobbyLeaveButton>
                  )}
                </div>
              )}

              {/* Show action buttons for joiner */}
              {lobby.players.joiner === userId && (
                <div className="flex flex-col gap-2">
                  {lobby.players.creatorFleetId > 0 &&
                    lobby.players.joinerFleetId > 0 && (
                      <button
                        type="button"
                        onClick={closeFleetModalAndGoToGames}
                        className="w-full px-4 py-2.5 border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                      >
                        GO TO GAMES
                      </button>
                    )}
                  {lobby.state.status === LobbyStatus.FleetSelection && (
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      className="w-full px-4 py-2.5 border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                      style={{ borderRadius: 0 }}
                    >
                      SELECT FLEET
                    </button>
                  )}
                  {lobby.state.status === LobbyStatus.FleetSelection &&
                    lobby.players.joinerFleetId > 0 &&
                    lobby.players.creatorFleetId === 0 && (
                      <button
                        type="button"
                        onClick={() => quitWithPenalty(lobby.basic.id)}
                        className="w-full px-4 py-2.5 border border-amber/60 text-amber/70 hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                        title={`Leave and penalize creator if they haven\'t selected a fleet within ${lobby.gameConfig.turnTime}s of you submitting yours`}
                      >
                        QUIT WITH PENALTY
                      </button>
                    )}
                  {lobby.state.status !== LobbyStatus.InGame && (
                    <LobbyLeaveButton
                      lobbyId={lobby.basic.id}
                      allowWhenOtherPending
                      className="w-full px-4 py-2.5 border border-warning-red/60 text-warning-red/70 hover:border-warning-red hover:text-warning-red hover:bg-warning-red/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                      onSuccess={() => {
                        if (selectedLobby === lobby.basic.id) {
                          resetFleetSelectionModalState();
                        }
                        loadLobbies();
                      }}
                      onError={(error) => {
                        console.error("Failed to leave lobby:", error);
                      }}
                    >
                      LEAVE LOBBY
                    </LobbyLeaveButton>
                  )}
                </div>
              )}

              {/* Show fleet selection phase message when both players are in lobby but haven't both selected fleets */}
              {lobby.state.status === LobbyStatus.FleetSelection &&
                lobby.players.joiner !==
                  "0x0000000000000000000000000000000000000000" &&
                (lobby.players.creatorFleetId === 0 ||
                  lobby.players.joinerFleetId === 0) && (
                  <div className="space-y-2">
                    <p className="text-sm text-amber">
                      Fleet selection phase - waiting for both players to select
                      fleets
                    </p>
                  </div>
                )}

              {lobby.state.status === LobbyStatus.InGame && (
                <div className="text-sm text-warning-red">Game in progress</div>
              )}
              </div>{/* close action section */}
            </div>
          ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Fleet Selection Modal */}
      {selectedLobby &&
        (() => {
          const currentLobby = resolvedLobbyForSelected;
          const isCreator = currentLobby
            ? currentLobby.basic.creator === userId
            : false;
          const isParticipant =
            currentLobby != null
              ? currentLobby.basic.creator === userId ||
                currentLobby.players.joiner === userId
              : false;
          const opponentHasFleet =
            currentLobby != null
              ? isCreator
                ? currentLobby.players.joinerFleetId > 0
                : currentLobby.players.creatorFleetId > 0
              : false;
          const participantHasFleet =
            currentLobby != null
              ? isCreator
                ? currentLobby.players.creatorFleetId > 0
                : currentLobby.players.joinerFleetId > 0
              : false;
          const bothPlayersHaveFleets =
            currentLobby != null
              ? currentLobby.players.creatorFleetId > 0 &&
                currentLobby.players.joinerFleetId > 0
              : false;
          const totalCost = selectedShips.reduce((sum, shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            return sum + (ship ? Number(ship.shipData.cost) : 0);
          }, 0);
          const costLimit = currentLobby
            ? Number(currentLobby.basic.costLimit)
            : 1000;
          const isOverLimit = totalCost > costLimit;
          const isUnder90Percent = totalCost < costLimit * 0.9;

          // Check if all ships are not in the default column
          // Creator default: column 0, Joiner default: column 24
          const hasMovedShip =
            shipPositions.length > 0 &&
            shipPositions.some((pos) => {
              if (isCreator) {
                // Creator: at least one ship must not be in column 0
                return pos.col !== 0;
              } else {
                // Joiner: at least one ship must not be in column 24
                return pos.col !== 24;
              }
            });

          const fleetExceedsMaxSize =
            selectedShips.length > MAX_SHIPS_PER_FLEET;

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[400]">
              <div className="bg-near-black border border-cyan rounded-none p-6 w-[100vw] h-[100vh] flex flex-col">
                <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
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

                  <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:justify-center">
                    {!participantHasFleet ? (
                      <>
                        <button
                          onClick={() => handleCreateFleet(selectedLobby)}
                          disabled={
                            selectedShips.length === 0 ||
                            isCreatingFleet ||
                            fleetExceedsMaxSize ||
                            isOverLimit ||
                            isUnder90Percent ||
                            !hasMovedShip ||
                            selectedFleetHasStaleCostsVersion
                          }
                          className="w-full px-4 py-2 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                        >
                          {isCreatingFleet
                            ? "CREATING FLEET..."
                            : fleetExceedsMaxSize
                              ? `MAX ${MAX_SHIPS_PER_FLEET} SHIPS (${selectedShips.length} SELECTED)`
                              : isOverLimit
                                ? `OVER ${costLimit} THREAT LIMIT`
                                : isUnder90Percent
                                  ? `NEED ${Math.round(costLimit * 0.9)} POINTS`
                                  : !hasMovedShip
                                    ? "MOVE AT LEAST ONE SHIP FORWARD"
                                    : selectedFleetHasStaleCostsVersion
                                      ? "COST VERSION OUT OF DATE (MANAGE NAVY)"
                                      : `CREATE FLEET (${selectedShips.length})`}
                        </button>
                        <button
                          onClick={() => {
                            if (isCreatingFleet) return;
                            closeFleetModalOnly();
                          }}
                          disabled={isCreatingFleet}
                          className="w-full px-4 py-2 border border-warning-red text-warning-red rounded-none hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                        >
                          CANCEL
                        </button>
                      </>
                    ) : isParticipant && bothPlayersHaveFleets ? (
                      <button
                        type="button"
                        onClick={closeFleetModalAndGoToGames}
                        className="w-full px-4 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 md:w-auto md:whitespace-nowrap"
                      >
                        GO TO GAMES
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="w-full cursor-not-allowed px-4 py-2 rounded-none border-2 border-gunmetal bg-near-black/40 text-text-muted font-mono font-bold text-sm tracking-wider md:w-auto md:whitespace-nowrap"
                      >
                        WAITING FOR OPPOSING ADMIRAL
                      </button>
                    )}
                  </div>

                  <div className="relative flex flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
                    {/* Filter Button */}
                    <button
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="px-2 py-1 text-xs font-bold text-cyan border border-cyan rounded-none hover:text-cyan/80 hover:border-cyan/80 transition-colors"
                    >
                      FILTERS ▼
                    </button>
                    {!participantHasFleet && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowLoadFleetMenu((prev) => !prev)}
                          disabled={savedFleetCompositions.length === 0}
                          className="px-2 py-1 text-xs font-bold text-cyan border border-cyan rounded-none hover:text-cyan/80 hover:border-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          LOAD FLEET
                        </button>
                        <button
                          type="button"
                          onClick={clearFleetDraftSelection}
                          disabled={isCreatingFleet}
                          className="px-2 py-1 text-xs font-bold text-text-muted border border-steel rounded-none hover:text-text-secondary hover:border-steel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          CLEAR FLEET SELECTION
                        </button>
                      </>
                    )}
                    {!participantHasFleet && showLoadFleetMenu && (
                      <div className="absolute right-0 top-full z-[450] mt-2 w-[28rem] max-w-[80vw] border border-cyan bg-near-black p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-bold tracking-wider text-cyan">
                            LOAD SAVED FLEET
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowLoadFleetMenu(false)}
                            className="px-2 py-0.5 text-[11px] border border-steel text-text-secondary hover:text-text-primary hover:border-steel"
                          >
                            CLOSE
                          </button>
                        </div>
                        <div className="max-h-56 overflow-auto space-y-2 pr-1">
                          {savedFleetCompositions.length === 0 ? (
                            <div className="text-xs text-text-muted">
                              No saved fleets found.
                            </div>
                          ) : (
                            savedFleetCompositions.map((fleet) => {
                              const summary = getSavedFleetSummary(fleet);
                              return (
                                <button
                                  key={fleet.id}
                                  type="button"
                                  onClick={() => handleRequestLoadSavedFleet(fleet)}
                                  className="w-full border border-cyan/40 bg-black/40 p-2 text-left hover:border-cyan hover:bg-cyan/5"
                                >
                                  <div className="text-sm font-bold text-cyan">
                                    {fleet.name}
                                  </div>
                                  <div className="mt-1 text-xs text-text-secondary">
                                    {summary.totalShips} ships | Threat{" "}
                                    {summary.totalThreat} | Available{" "}
                                    {summary.availableCount}
                                    {summary.unavailableCount > 0
                                      ? ` | Unavailable ${summary.unavailableCount}`
                                      : ""}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                    {/* Total Points Display */}
                    <div
                      className={`text-lg font-bold px-3 py-1 rounded-none ${
                        isOverLimit
                          ? "text-warning-red bg-warning-red/20 border border-warning-red/30"
                          : isUnder90Percent
                            ? "text-amber bg-amber/20 border border-amber/30"
                            : "text-phosphor-green bg-phosphor-green/20 border border-phosphor-green/30"
                      }`}
                    >
                      {totalCost}/{costLimit}
                    </div>
                    {/* Leave Lobby Button (in fleet selection modal) - only show if no fleet is selected */}
                    {!participantHasFleet && (
                      <LobbyLeaveButton
                        lobbyId={selectedLobby}
                        allowWhenOtherPending
                        className="px-3 py-1 text-sm font-bold text-warning-red border border-warning-red rounded-none hover:text-warning-red/80 hover:border-warning-red/80 transition-colors"
                        onSuccess={() => {
                          resetFleetSelectionModalState();
                          loadLobbies();
                        }}
                        onError={(error) => {
                          console.error("Failed to leave lobby:", error);
                        }}
                      >
                        LEAVE LOBBY
                      </LobbyLeaveButton>
                    )}
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={closeFleetModalOnly}
                      className="px-3 py-1 text-sm font-bold text-text-muted border border-gunmetal rounded-none hover:text-text-secondary hover:border-steel transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {pendingLoadFleet && (
                  <div className="mb-3 border border-amber/70 bg-amber/10 p-3">
                    <div className="text-sm font-bold text-amber">
                      Some ships from {pendingLoadFleet.fleet.name} are unavailable.
                    </div>
                    <div className="mt-1 text-xs text-amber/80">
                      {pendingLoadFleet.unavailableCount} ship
                      {pendingLoadFleet.unavailableCount === 1 ? "" : "s"} are
                      unavailable (already in a fleet, dead, or not constructed).
                      Load the remaining {pendingLoadFleet.availableShipIds.length}{" "}
                      ship
                      {pendingLoadFleet.availableShipIds.length === 1
                        ? ""
                        : "s"}
                      ?
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          applyLoadedFleetSelection(
                            pendingLoadFleet.availableShipIds,
                          );
                          setPendingLoadFleet(null);
                        }}
                        className="px-3 py-1 border border-amber text-amber/80 hover:bg-amber/20 text-xs font-bold"
                      >
                        LOAD AVAILABLE SHIPS
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingLoadFleet(null)}
                        className="px-3 py-1 border border-steel text-text-secondary hover:border-steel hover:text-text-primary text-xs font-bold"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
                {!playerFleetId && (
                  <p className="text-sm text-amber mb-4">
                    // Creating your fleet first will make you go first in the
                    game!
                  </p>
                )}

                {/* Filter Overlay */}
                {filtersExpanded && (
                  <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[410]"
                    onClick={() => setFiltersExpanded(false)}
                  >
                    <div
                      className="bg-near-black border border-cyan rounded-none p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-cyan">
                          FILTERS
                        </h3>
                        <button
                          onClick={() => setFiltersExpanded(false)}
                          className="text-text-muted hover:text-text-primary text-xl"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        {/* Rarity Filters */}
                        <div>
                          <label className="block text-text-muted mb-1">
                            Rarity
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showCommon}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showCommon: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-text-muted">Common</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showShiny}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showShiny: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-amber">Shiny ★</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showUnavailable}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showUnavailable: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-amber">
                                Show Unavailable
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Threat Range */}
                        <div>
                          <label className="block text-text-muted mb-1">
                            Threat Range
                          </label>
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="Min"
                              value={fleetFilters.minCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  minCost: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={fleetFilters.maxCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  maxCost: parseInt(e.target.value) || 10000,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
                            />
                          </div>
                        </div>

                        {/* Equipment Filters */}
                        <div>
                          <label className="block text-text-muted mb-1">
                            Equipment
                          </label>
                          <div className="space-y-1">
                            <select
                              value={fleetFilters.weaponType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  weaponType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
                            >
                              <option value="all">All Weapons</option>
                              <option value="laser">Laser</option>
                              <option value="cannon">Cannon</option>
                              <option value="plasma">Plasma</option>
                              <option value="missile">Missile</option>
                            </select>
                            <select
                              value={fleetFilters.defenseType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  defenseType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
                            >
                              <option value="all">All Defense</option>
                              <option value="shield">Shields</option>
                              <option value="armor">Armor</option>
                            </select>
                          </div>
                        </div>

                        {/* Trait Filters */}
                        <div>
                          <label className="block text-text-muted mb-2 font-medium">
                            Accuracy: {fleetFilters.minAccuracy} -{" "}
                            {fleetFilters.maxAccuracy}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxAccuracy -
                                    fleetFilters.minAccuracy) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minAccuracy")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxAccuracy")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-text-muted mt-2 px-2">
                            <span className="font-medium">Poor (0)</span>
                            <span className="font-medium">Average (1)</span>
                            <span className="font-medium">Excellent (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-text-muted mb-2 font-medium">
                            Hull: {fleetFilters.minHull} -{" "}
                            {fleetFilters.maxHull}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxHull -
                                    fleetFilters.minHull) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minHull")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxHull")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-text-muted mt-2 px-2">
                            <span className="font-medium">Weak (0)</span>
                            <span className="font-medium">Standard (1)</span>
                            <span className="font-medium">Reinforced (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-text-muted mb-2 font-medium">
                            Speed: {fleetFilters.minSpeed} -{" "}
                            {fleetFilters.maxSpeed}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxSpeed -
                                    fleetFilters.minSpeed) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minSpeed")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxSpeed")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-text-muted mt-2 px-2">
                            <span className="font-medium">Slow (0)</span>
                            <span className="font-medium">Normal (1)</span>
                            <span className="font-medium">Fast (2)</span>
                          </div>
                        </div>

                        {/* In-Game Properties Toggle */}
                        <div className="col-span-2 md:col-span-3">
                          <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showInGameProperties}
                              onChange={(e) =>
                                setShowInGameProperties(e.target.checked)
                              }
                              className="w-4 h-4 text-cyan bg-black/60 border-cyan rounded-none focus:ring-cyan focus:ring-2"
                            />
                            <span className="text-sm font-bold text-cyan">
                              IN-GAME PROPERTIES
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-xs">
                        <span className="text-text-muted">
                          Showing {filteredShips.length} of {ships.length} ships
                        </span>
                        <button
                          onClick={() =>
                            setFleetFilters({
                              showShiny: true,
                              showCommon: true,
                              showUnavailable: false,
                              minCost: 0,
                              maxCost: 10000,
                              minAccuracy: 0,
                              maxAccuracy: 2,
                              minHull: 0,
                              maxHull: 2,
                              minSpeed: 0,
                              maxSpeed: 2,
                              weaponType: "all",
                              defenseType: "all",
                              specialType: "all",
                            })
                          }
                          className="text-cyan hover:text-cyan/80 underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {shipsLoading ? (
                  <div className="text-center text-text-muted flex-1 flex items-center justify-center">
                    Loading ships...
                  </div>
                ) : (
                  <div className="flex gap-4 flex-1">
                    {isCreator ? (
                      <>
                        {/* Ship Selection Grid - 1/4 width */}
                        {!playerFleetId && (
                          <div className="w-1/4 h-full">
                            <div
                              className={`grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh] ${isDraggingOverList ? "ring-2 ring-inset ring-warning-red/50" : ""}`}
                              onDragOver={handleListDragOver}
                              onDragLeave={handleListDragLeave}
                              onDrop={handleListDrop}
                            >
                              {filteredShips
                                .sort((a, b) => {
                                  // Selected ships first
                                  const aSelected = selectedShips.includes(
                                    a.id,
                                  );
                                  const bSelected = selectedShips.includes(
                                    b.id,
                                  );

                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;

                                  // Within each group, sort by ship ID
                                  return Number(a.id - b.id);
                                })
                                .map((ship) => {
                                  const canSelect =
                                    !(ship.shipData.timestampDestroyed > 0) &&
                                    ship.shipData.constructed &&
                                    !ship.shipData.inFleet;

                                  const handleCardClick = () => handleListShipTap(ship.id, canSelect);
                                  const isPending = tapPendingShipId === ship.id;

                                  return (
                                    <div
                                      key={ship.id.toString()}
                                      draggable={canSelect && !isTouchDevice}
                                      onDragStart={(e) => {
                                        if (canSelect) {
                                          handleDragStart(ship.id);
                                          e.dataTransfer.effectAllowed = "move";
                                          e.dataTransfer.setData("text/plain", ship.id.toString());
                                        }
                                      }}
                                      onDragEnd={handleDragEnd}
                                      className={`${canSelect && !isTouchDevice ? "cursor-move" : ""} ${isPending ? "outline outline-2 outline-amber" : ""}`}
                                    >
                                      <ShipCard
                                        ship={ship}
                                        isStarred={false}
                                        onToggleStar={() => {}}
                                        isSelected={selectedShips.includes(
                                          ship.id,
                                        )}
                                        onToggleSelection={() => {
                                          if (canSelect) {
                                            handleCardClick();
                                          }
                                        }}
                                        onRecycleClick={() => {}}
                                        showInGameProperties={
                                          showInGameProperties
                                        }
                                        inGameAttributes={attributesMap.get(
                                          ship.id,
                                        )}
                                        attributesLoading={
                                          fleetSelectionAttributesLoading
                                        }
                                        selectionMode={true}
                                        hideRecycle={true}
                                        hideCheckbox={true}
                                        onCardClick={handleCardClick}
                                        canSelect={canSelect}
                                        flipShip={isCreator}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Map Display - 3/4 width */}
                        <div
                          className={`${
                            playerFleetId ? "w-full" : "w-3/4"
                          } h-full flex items-center justify-center`}
                        >
                          {/* Map Display */}
                          {currentLobby && (
                            <MapDisplay
                              mapId={Number(
                                currentLobby.gameConfig.selectedMapId,
                              )}
                              className="w-full h-full"
                              showPlayerOverlay={true}
                              showDeployZoneLabel={
                                !(showFleetView && viewingFleetId && viewingFleetOwner)
                              }
                              pendingPlacementShipId={
                                !playerFleetId && !(showFleetView && viewingFleetId && viewingFleetOwner)
                                  ? tapPendingShipId
                                  : null
                              }
                              isCreator={currentLobby.basic.creator === userId}
                              isCreatorViewer={
                                currentLobby.basic.creator === userId
                              }
                              shipPositions={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentPositions
                                  : combinedPositions
                              }
                              ships={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentShips
                                  : combinedShips
                              }
                              selectedShipId={selectedShipId}
                              onShipSelect={
                                playerFleetId ||
                                (showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner)
                                  ? undefined
                                  : handleShipSelect
                              }
                              onShipMove={
                                playerFleetId ||
                                (showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner)
                                  ? undefined
                                  : handleShipMove
                              }
                              allowSelection={
                                !playerFleetId &&
                                !(
                                  showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner
                                )
                              }
                              selectableShipIds={
                                playerFleetId ? undefined : selectableShipIds
                              }
                              flippedShipIds={flippedShipIds as number[]}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              dragOverPosition={dragOverPosition}
                            />
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Map Display - 3/4 width (left for joiner) */}
                        <div
                          className={`${
                            playerFleetId ? "w-full" : "w-3/4"
                          } h-full flex items-center justify-center`}
                        >
                          {/* Map Display */}
                          {currentLobby && (
                            <MapDisplay
                              mapId={Number(
                                currentLobby.gameConfig.selectedMapId,
                              )}
                              className="w-full h-full"
                              showPlayerOverlay={true}
                              showDeployZoneLabel={
                                !(showFleetView && viewingFleetId && viewingFleetOwner)
                              }
                              pendingPlacementShipId={
                                !playerFleetId && !(showFleetView && viewingFleetId && viewingFleetOwner)
                                  ? tapPendingShipId
                                  : null
                              }
                              isCreator={currentLobby.basic.creator === userId}
                              isCreatorViewer={
                                currentLobby.basic.creator === userId
                              }
                              shipPositions={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentPositions
                                  : combinedPositions
                              }
                              ships={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentShips
                                  : combinedShips
                              }
                              selectedShipId={selectedShipId}
                              onShipSelect={
                                playerFleetId ||
                                (showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner)
                                  ? undefined
                                  : handleShipSelect
                              }
                              onShipMove={
                                playerFleetId ||
                                (showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner)
                                  ? undefined
                                  : handleShipMove
                              }
                              allowSelection={
                                !playerFleetId &&
                                !(
                                  showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner
                                )
                              }
                              selectableShipIds={
                                playerFleetId ? undefined : selectableShipIds
                              }
                              flippedShipIds={flippedShipIds as number[]}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              dragOverPosition={dragOverPosition}
                            />
                          )}
                        </div>

                        {/* Ship Selection Grid - 1/4 width (right for joiner) */}
                        {!playerFleetId && (
                          <div className="w-1/4 h-full">
                            <div
                              className={`grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh] ${isDraggingOverList ? "ring-2 ring-inset ring-warning-red/50" : ""}`}
                              onDragOver={handleListDragOver}
                              onDragLeave={handleListDragLeave}
                              onDrop={handleListDrop}
                            >
                              {filteredShips
                                .sort((a, b) => {
                                  // Selected ships first
                                  const aSelected = selectedShips.includes(
                                    a.id,
                                  );
                                  const bSelected = selectedShips.includes(
                                    b.id,
                                  );

                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;

                                  // Within each group, sort by ship ID
                                  return Number(a.id - b.id);
                                })
                                .map((ship) => {
                                  const canSelect =
                                    !(ship.shipData.timestampDestroyed > 0) &&
                                    ship.shipData.constructed &&
                                    !ship.shipData.inFleet;

                                  const handleCardClick = () => handleListShipTap(ship.id, canSelect);
                                  const isPending = tapPendingShipId === ship.id;

                                  return (
                                    <div
                                      key={ship.id.toString()}
                                      draggable={canSelect && !isTouchDevice}
                                      onDragStart={(e) => {
                                        if (canSelect) {
                                          handleDragStart(ship.id);
                                          e.dataTransfer.effectAllowed = "move";
                                          e.dataTransfer.setData("text/plain", ship.id.toString());
                                        }
                                      }}
                                      onDragEnd={handleDragEnd}
                                      className={`${canSelect && !isTouchDevice ? "cursor-move" : ""} ${isPending ? "outline outline-2 outline-amber" : ""}`}
                                    >
                                      <ShipCard
                                        ship={ship}
                                        isStarred={false}
                                        onToggleStar={() => {}}
                                        isSelected={selectedShips.includes(
                                          ship.id,
                                        )}
                                        onToggleSelection={() => {
                                          if (canSelect) {
                                            handleCardClick();
                                          }
                                        }}
                                        onRecycleClick={() => {}}
                                        showInGameProperties={
                                          showInGameProperties
                                        }
                                        inGameAttributes={attributesMap.get(
                                          ship.id,
                                        )}
                                        attributesLoading={
                                          fleetSelectionAttributesLoading
                                        }
                                        selectionMode={true}
                                        hideRecycle={true}
                                        hideCheckbox={true}
                                        onCardClick={handleCardClick}
                                        canSelect={canSelect}
                                        flipShip={isCreator}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Fleet Threat Confirmation Dialog */}
      {showFleetConfirmation &&
        selectedLobby &&
        (() => {
          const currentLobby = lobbyList.lobbies.find(
            (lobby) => lobby.basic.id === selectedLobby,
          );
          const totalCost = selectedShips.reduce((sum, shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            return sum + (ship ? Number(ship.shipData.cost) : 0);
          }, 0);
          const costLimit = currentLobby
            ? Number(currentLobby.basic.costLimit)
            : 1000;
          const confirmationOverLimit = totalCost > costLimit;

          return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[420]">
              <div className="bg-near-black border border-amber rounded-none p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="text-amber text-2xl font-mono font-bold mb-4 tracking-widest">[!]</div>
                  <h3 className="text-xl font-bold text-amber mb-4">
                    FLEET THREAT WARNING
                  </h3>
                  <p className="text-text-secondary mb-6">
                    Your fleet threat ({totalCost}) is less than 90% of the
                    maximum ({costLimit}). You&apos;re only using{" "}
                    {Math.round((totalCost / costLimit) * 100)}% of your
                    available budget.
                  </p>
                  <p className="text-sm text-text-muted mb-6">
                    Consider adding more ships to maximize your fleet&apos;s
                    potential, or proceed with your current selection.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFleetConfirmation(false)}
                      className="flex-1 px-4 py-2 border border-gunmetal text-text-muted rounded-none hover:bg-steel/20"
                    >
                      GO BACK
                    </button>
                    <button
                      onClick={() => createFleetWithConfirmation(selectedLobby)}
                      disabled={
                        isCreatingFleet ||
                        confirmationOverLimit ||
                        selectedFleetHasStaleCostsVersion ||
                        selectedShips.length > MAX_SHIPS_PER_FLEET
                      }
                      className="flex-1 px-4 py-2 border border-amber text-amber rounded-none hover:bg-amber/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingFleet ? "CREATING..." : "CONFIRM FLEET"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Fleet View Modal */}
      {showFleetView && viewingFleetId && viewingFleetOwner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]">
          <div className="bg-near-black border border-cyan rounded-none p-6 max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-bold text-cyan">
                FLEET #{viewingFleetId.toString()}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowFleetView(false);
                    setViewingFleetId(null);
                    setViewingFleetOwner(null);
                  }}
                  className="px-4 py-2 border border-gunmetal text-text-muted rounded-none hover:bg-steel/20"
                >
                  CLOSE
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-black/40 border border-gunmetal rounded-none">
              <p className="text-sm text-text-secondary">
                <span className="text-cyan">Owner:</span>{" "}
                {viewingFleetOwner.slice(0, 6)}…{viewingFleetOwner.slice(-4)}
                {userId && viewingFleetOwner === userId && (
                    <span className="ml-2 text-cyan font-bold">(You)</span>
                  )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {fleetShipsLoading ? (
                <div className="py-8 font-mono text-xs text-text-muted tracking-widest animate-pulse text-center">
                  &gt;&gt; ACQUIRING FLEET DATA...
                </div>
              ) : viewingFleetShips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {viewingFleetShips.map((shipData: Ship, index: number) => {
                    return (
                      <div
                        key={shipData.id?.toString() || index}
                        className="border rounded-none p-4 bg-black/40 border-gunmetal"
                      >
                        {/* Ship Image */}
                        <div className="relative mb-3 h-32 w-full min-h-0 [container-type:size]">
                          <ShipImage
                            key={`fleet-${shipData.id?.toString() || index}-${
                              shipData.shipData?.constructed
                                ? "constructed"
                                : "unconstructed"
                            }`}
                            ship={shipData}
                            className="h-full w-full rounded-none border border-gunmetal"
                            showLoadingState={true}
                          />
                        </div>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm">
                              {shipData.name || `Ship #${shipData.id}`}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs px-2 py-1 rounded-none ${
                                shipData.shipData?.shiny
                                  ? "bg-amber/20 text-amber border border-amber/30"
                                  : "bg-steel/20 text-text-muted border border-gunmetal/30"
                              }`}
                            >
                              {shipData.shipData?.shiny ? "SHINY ★" : "COMMON"}
                            </span>
                            {/* Rank */}
                            {shipData.shipData?.constructed && (
                              <span
                                className={`text-xs px-2 py-1 rounded-none border ${getRankColor(
                                  calculateShipRank(shipData).rank,
                                )}`}
                              >
                                R{calculateShipRank(shipData).rank}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ship Stats */}
                        {shipData.shipData?.constructed ? (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="opacity-60">Acc:</span>
                              <span className="ml-2">
                                {shipData.traits?.accuracy || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Hull:</span>
                              <span className="ml-2">
                                {shipData.traits?.hull || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Speed:</span>
                              <span className="ml-2">
                                {shipData.traits?.speed || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Threat:</span>
                              <span className="ml-2">
                                {shipData.shipData?.cost || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Wpn:</span>
                              <span className="ml-2">
                                {getMainWeaponName(
                                  shipData.equipment?.mainWeapon || 0,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">
                                {shipData.equipment?.shields > 0
                                  ? "Shd:"
                                  : "Arm:"}
                              </span>
                              <span className="ml-2">
                                {shipData.equipment?.shields > 0
                                  ? getShieldName(shipData.equipment.shields)
                                  : getArmorName(
                                      shipData.equipment?.armor || 0,
                                    )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Spc:</span>
                              <span className="ml-2">
                                {getSpecialName(
                                  shipData.equipment?.special || 0,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="opacity-60">Status:</span>
                              <span className="ml-2 text-phosphor-green">READY</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-amber text-sm">
                            {shipData.shipData?.timestampDestroyed > 0
                              ? `DESTROYED ${formatDestroyedDate(shipData.shipData.timestampDestroyed)}`
                              : "UNDER CONSTRUCTION"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-text-muted py-8">
                  <p className="text-lg mb-2">No Ships Found</p>
                  <p className="text-sm">
                    This fleet appears to be empty or the data could not be
                    loaded.
                  </p>
                  <p className="text-xs mt-2 text-text-muted">
                    Fleet ID: {viewingFleetId?.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobbies;

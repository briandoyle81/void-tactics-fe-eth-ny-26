"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { useLobbies } from "../hooks/useLobbies";
import { useFleetPlacement } from "../hooks/useFleetPlacement";
import { useFleetShipAttributes } from "../hooks/useFleetShipAttributes";
import { buildFleetShipListItems } from "../utils/buildFleetShipListItems";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetsRead } from "../hooks/useFleetsContract";
import { useShipsRead } from "../hooks/useShipsContract";
import {
  Lobby,
  Ship,
  Attributes,
  MapMode,
} from "../types/types";
import { toast } from "react-hot-toast";
import { cacheShipsData } from "../hooks/useShipDataCache";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";
import { LobbyCard } from "./LobbyCard";
import { FleetViewModal } from "./FleetViewModal";
import { LoadFleetMenu } from "./LoadFleetMenu";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { LobbyCreateForm, LobbyTurnOrderNote } from "./LobbyCreateForm";
import { LobbyCreateSection } from "./LobbyCreateSection";
import { LobbyCreateButton } from "./LobbyCreateButton";
import { LobbyJoinButton } from "./LobbyJoinButton";
import { LobbyLeaveButton } from "./LobbyLeaveButton";
import { LobbyAcceptButton } from "./LobbyAcceptButton";
import { LobbyRejectButton } from "./LobbyRejectButton";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { useCurrentCostsVersion } from "../hooks/useShipAttributesContract";
import { MapDisplay } from "./MapDisplay";
import { useGetAllPresetMaps, useMapModes } from "../hooks/useMapsContract";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { useLobby } from "../hooks/useLobbiesContract";
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
  MIN_SHIPS_FOR_LOBBIES,
  MAX_SHIPS_PER_FLEET,
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormatters";
import { usePlayerStats } from "../hooks/usePlayerStats";
import { WinLossBadge } from "./WinLossBadge";
import { LobbyCardActions } from "./LobbyCardActions";
import { lobbyStatusColor, lobbyStatusLabel } from "../utils/lobbyStatusDisplay";

function CreatorStats({
  address,
  chainId,
}: {
  address: `0x${string}`;
  chainId: number;
}) {
  const stats = usePlayerStats(address, chainId);
  if (!stats) return null;
  return <WinLossBadge wins={Number(stats.wins)} losses={Number(stats.losses)} />;
}

const Lobbies: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const {
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,
    // leaveLobby,
    // timeoutJoiner,
    createFleet,
    // quitWithPenalty,
    loadLobbies,
    lastTransactionHash,
  } = useLobbies();

  // PvP map picker — Maps now has a PvP/PvE/Both mode (see
  // docs/Frontend_Update_Guide_Campaigns_Maps.md #2), enforced on-chain:
  // Lobbies.createLobby reverts InvalidMapId for a PvE-only map. Filter the
  // full preset list down to PvP-eligible maps (PvP or Both) here rather
  // than trusting whatever the form's default happened to be. Declared
  // early in the component (not near createForm below) so effects that
  // reference it aren't reading a not-yet-initialized value.
  const { data: allPresetMapsData } = useGetAllPresetMaps();
  const allPresetMapIds = useMemo(() => {
    const raw = allPresetMapsData as readonly [readonly bigint[], unknown, unknown] | undefined;
    return raw ? raw[0].map((id) => Number(id)) : [];
  }, [allPresetMapsData]);
  const { modeByMapId: lobbyMapModeById } = useMapModes(allPresetMapIds);
  const pvpEligibleMapIds = useMemo(
    () => allPresetMapIds.filter((id) => lobbyMapModeById.get(id) !== MapMode.PvE),
    [allPresetMapIds, lobbyMapModeById],
  );
  const pvpMapOptions = useMemo(
    () => pvpEligibleMapIds.map((id) => ({ id, label: `Map #${id}` })),
    [pvpEligibleMapIds],
  );

  // Wait for transaction receipt for fleet creation
  const { isSuccess: isFleetCreated, error: fleetCreationError } =
    useWaitForTransactionReceipt({
      hash: lastTransactionHash,
    });

  const { ships, isLoading: shipsLoading, shipCount } = useOwnedShips();

  const constructedReadyCount = useMemo(
    () =>
      ships.filter(
        (s) =>
          Boolean(s.shipData?.constructed) &&
          s.shipData?.timestampDestroyed === 0n,
      ).length,
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

  // Calculate player state from lobby list instead of blockchain
  const playerLobbies = lobbyList.lobbies.filter(
    (lobby) =>
      lobby.basic.creator === address || lobby.players.joiner === address,
  );
  const activeLobbiesCount = playerLobbies.length;
  const hasActiveLobby = activeLobbiesCount > 0;

  // Calculate lobby creation permissions
  const canCreateLobby = !paused && isConnected;
  const needsPaymentForLobby =
    activeLobbiesCount >= Number(freeGamesPerAddress || 0n);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingCreateLobbyHash, setPendingCreateLobbyHash] = useState<
    `0x${string}` | undefined
  >(undefined);

  // Navigate to Games tab (used by the Go to Games button elsewhere in this
  // file once a game actually exists to navigate to).
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

  const { isSuccess: isCreateLobbyConfirmed } =
    useWaitForTransactionReceipt({
      hash: pendingCreateLobbyHash,
      chainId,
      query: { enabled: !!pendingCreateLobbyHash },
    });

  React.useEffect(() => {
    if (!isCreateLobbyConfirmed || !pendingCreateLobbyHash) return;
    setPendingCreateLobbyHash(undefined);

    (async () => {
      // Wait for the new lobby to actually land in the list before closing
      // the create form — closing right on receipt confirmation (the old
      // behavior) could beat this refetch, so the form (and its "CREATING
      // ..." button state) would vanish a beat before the lobby the player
      // just created was visible anywhere, making it look like nothing
      // happened.
      await loadLobbies();
      setShowCreateForm(false);
      setCreateForm({
        threatScale: "skirmish",
        turnPace: "immediate",
        selectedMapId:
          pvpEligibleMapIds.length > 0 ? String(pvpEligibleMapIds[0]) : "1",
        scoreLength: "medium",
        creatorGoesFirst: false,
        reservedJoiner: "",
      });
    })();
  }, [isCreateLobbyConfirmed, pendingCreateLobbyHash, loadLobbies, pvpEligibleMapIds]);

  useEffect(() => {
    if ((needsShipsForLobbyUi || needsConstructForLobbyUi) && showCreateForm) {
      setShowCreateForm(false);
    }
  }, [needsShipsForLobbyUi, needsConstructForLobbyUi, showCreateForm]);
  const [selectedLobby, setSelectedLobby] = useState<bigint | null>(null);
  const selectedLobbyRef = useRef<bigint | null>(null);
  useEffect(() => {
    selectedLobbyRef.current = selectedLobby;
  }, [selectedLobby]);
  // selectedShips/shipPositions/selectedShipId/draggedShipId/dragOverPosition
  // now come from the shared useFleetPlacement hook (destructured as `fleet`
  // further down, once resolvedLobbyForSelected is available) — see there.
  const [showFleetConfirmation, setShowFleetConfirmation] = useState(false);

  // Track last drag over position to prevent excessive state updates
  const lastDragOverPositionRef = useRef<{ row: number; col: number } | null>(
    null,
  );

  // Tap-to-place state for touch devices
  const [tapPendingShipId, setTapPendingShipId] = useState<bigint | null>(null);
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
          (l.basic.creator === address || l.players.joiner === address),
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
  const [viewingFleetId, setViewingFleetId] = useState<bigint | null>(null);
  const [viewingFleetOwner, setViewingFleetOwner] = useState<string | null>(
    null,
  );

  const savedFleetCompositions = useMemo(() => {
    if (!chainId || !address) return [] as FleetComposition[];
    return readFleetCompositionPersisted(`${chainId}:${address.toLowerCase()}`).fleets;
  }, [chainId, address]);

  // Live lobby data for the currently selected lobby (avoids relying on lobby list refresh timing)
  const { lobby: selectedLobbyLive, refetch: refetchSelectedLobby } = useLobby(
    selectedLobby ?? 0n,
    {
      enabled: selectedLobby != null,
    },
  );

  // Fleet ship data fetching
  const { data: fleetShipIds, isLoading: fleetShipIdsLoading } = useFleetsRead(
    "getFleetShipIds",
    viewingFleetId ? [viewingFleetId] : undefined,
  );
  // Also fetch positions together when available
  const { data: fleetIdsAndPositions } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    viewingFleetId ? [viewingFleetId] : undefined,
  );

  const { data: fleetShips, isLoading: fleetShipsLoading } = useShipsRead(
    "getShipsByIds",
    fleetShipIds && Array.isArray(fleetShipIds) && fleetShipIds.length > 0
      ? [fleetShipIds]
      : undefined,
  );

  // Cache fleet ships data
  React.useEffect(() => {
    if (fleetShips && Array.isArray(fleetShips)) {
      const ships = fleetShips as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [fleetShips]);

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
      (L.players.creatorFleetId > 0n ? 1 : 0) +
      (L.players.joinerFleetId > 0n ? 1 : 0);
    const listN = fleetSlots(fromList);
    const liveN = fleetSlots(live);
    if (listN > liveN) return fromList;
    if (liveN > listN) return live;
    return live;
  }, [selectedLobby, selectedLobbyLive, lobbyList.lobbies]);

  // Shared fleet-picking core (selection state, drag/move handlers, cost
  // calculations) — same hook single-player's NodeMatchModal uses via
  // useNodeFleetSelection.ts, parameterized here for whichever side of
  // whichever lobby is currently selected. See feedback_no_parallel_
  // components memory: this used to be duplicated between the two flows.
  const isCreatorForSelected = resolvedLobbyForSelected?.basic.creator === address;
  const costLimitForSelected = resolvedLobbyForSelected
    ? Number(resolvedLobbyForSelected.basic.costLimit)
    : 1000;
  const fleet = useFleetPlacement({
    ships,
    costLimit: costLimitForSelected,
    costsVersion: globalCostsVersion,
    isCreatorSide: isCreatorForSelected,
  });
  const {
    selectedShips,
    setSelectedShips,
    shipPositions,
    setShipPositions,
    selectedShipId,
    setSelectedShipId,
    draggedShipId,
    setDraggedShipId,
    dragOverPosition,
    setDragOverPosition,
    filteredShips,
    hasStaleCostsVersion: selectedFleetHasStaleCostsVersion,
    fleetFilters,
    setFleetFilters,
    addShip: addShipToFleet,
    removeShip: removeShipFromFleet,
  } = fleet;

  // When viewing a lobby that is waiting for the other player's fleet, poll so both players see updates
  const currentLobbyForPolling = resolvedLobbyForSelected;
  const isWaitingForOtherFleet =
    currentLobbyForPolling &&
    (currentLobbyForPolling.players.creatorFleetId === 0n ||
      currentLobbyForPolling.players.joinerFleetId === 0n);

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
    if (!selectedLobby || !address) return null;
    const normalizedAddress = address.toLowerCase();
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const isCreator = lobby.basic.creator.toLowerCase() === normalizedAddress;
    return isCreator
      ? lobby.players.creatorFleetId > 0n
        ? lobby.players.creatorFleetId
        : null
      : lobby.players.joinerFleetId > 0n
        ? lobby.players.joinerFleetId
        : null;
  }, [selectedLobby, address, resolvedLobbyForSelected]);

  const selectedLobbyPlayerHasFleetOnChain = React.useMemo(() => {
    if (!resolvedLobbyForSelected || !address) return false;
    const normalizedAddress = address.toLowerCase();
    const isCreator =
      resolvedLobbyForSelected.basic.creator.toLowerCase() ===
      normalizedAddress;
    return isCreator
      ? resolvedLobbyForSelected.players.creatorFleetId > 0n
      : resolvedLobbyForSelected.players.joinerFleetId > 0n;
  }, [resolvedLobbyForSelected, address]);

  // Fetch the player's existing fleet data when viewing their own fleet
  const { data: playerFleetIdsAndPositions } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    playerFleetId ? [playerFleetId] : undefined,
    { query: { enabled: !!playerFleetId } },
  );

  // Extract player fleet ship IDs for fetching Ship objects
  const playerFleetShipIds = React.useMemo(() => {
    if (!playerFleetIdsAndPositions) return [];
    const tuple = playerFleetIdsAndPositions as [
      bigint[],
      Array<{ row: number; col: number }>,
    ];
    return (tuple?.[0] || []) as bigint[];
  }, [playerFleetIdsAndPositions]);

  // Fetch player's fleet Ship objects so they can be displayed on the grid
  const { data: playerFleetShipsData } = useShipsRead(
    "getShipsByIds",
    playerFleetShipIds.length > 0 ? [playerFleetShipIds] : undefined,
  );

  // Cache player fleet ships data
  React.useEffect(() => {
    if (playerFleetShipsData && Array.isArray(playerFleetShipsData)) {
      const ships = playerFleetShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [playerFleetShipsData]);

  // Normalize player fleet ships
  const playerFleetShips = React.useMemo(() => {
    const ships = (playerFleetShipsData as Ship[]) || [];
    // Ensure all ships have the required structure
    return ships.filter(
      (ship): ship is Ship =>
        !!ship &&
        !!ship.id &&
        !!ship.equipment &&
        !!ship.shipData &&
        !!ship.traits &&
        !!ship.owner,
    );
  }, [playerFleetShipsData]);

  const resolveFleetPickerShip = useCallback(
    (shipId: bigint): Ship | undefined =>
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
  }, [
    globalCostsVersion,
    ships,
    playerFleetShips,
    resolveFleetPickerShip,
    setSelectedShips,
    setShipPositions,
  ]);

  // Track the last loaded fleet ID to avoid reloading unnecessarily
  const lastLoadedFleetIdRef = useRef<bigint | null>(null);
  /** Avoid re-applying localStorage draft on every render while a lobby stays open. */
  const lastHydratedDraftLobbyRef = useRef<bigint | null>(null);
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

    const drafts = readFleetDrafts(chainId, address);
    const raw = drafts[selectedLobby.toString()];
    skipNextDraftPersistRef.current = true;
    if (raw?.shipIds?.length) {
      try {
        const ids = raw.shipIds.map((s) => BigInt(s));
        const pos = (raw.positions || []).map((p) => ({
          shipId: BigInt(p.shipId),
          row: p.row,
          col: p.col,
        }));
        setSelectedShips(ids);
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
    setSelectedShips,
    setShipPositions,
    setSelectedShipId,
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

  // Load player's existing fleet into selection state when modal opens
  useEffect(() => {
    if (
      selectedLobby &&
      playerFleetId &&
      playerFleetIdsAndPositions &&
      lastLoadedFleetIdRef.current !== playerFleetId
    ) {
      const tuple = playerFleetIdsAndPositions as [
        bigint[],
        Array<{ row: number; col: number }>,
      ];
      const ids: bigint[] = (tuple?.[0] || []) as bigint[];
      const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
        []) as Array<{ row: number; col: number }>;

      if (ids.length > 0) {
        setSelectedShips(ids);
        setShipPositions(
          ids.map((id, i) => ({
            shipId: id,
            row: positions?.[i]?.row ?? 0,
            col: positions?.[i]?.col ?? 0,
          })),
        );
        lastLoadedFleetIdRef.current = playerFleetId;
      }
    } else if (!selectedLobby || !playerFleetId) {
      // Clear the ref when modal closes or no fleet exists
      lastLoadedFleetIdRef.current = null;
    }
  }, [
    selectedLobby,
    playerFleetId,
    playerFleetIdsAndPositions,
    setSelectedShips,
    setShipPositions,
  ]);

  // Normalize opponent positions for MapDisplay when viewing a fleet
  const opponentPositions = React.useMemo(() => {
    if (!fleetIdsAndPositions)
      return [] as Array<{ shipId: bigint; row: number; col: number }>;
    const tuple = fleetIdsAndPositions as [
      bigint[],
      Array<{ row: number; col: number }>,
    ];
    const ids: bigint[] = (tuple?.[0] || []) as bigint[];
    const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
      []) as Array<{ row: number; col: number }>;
    return ids.map((id, i) => ({
      shipId: id,
      row: positions?.[i]?.row ?? 0,
      col: positions?.[i]?.col ?? 0,
    }));
  }, [fleetIdsAndPositions]);

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

  // fleetFilters/setFleetFilters now come from the shared fleet hook above.

  // In-game properties toggle
  const [showInGameProperties, setShowInGameProperties] = useState(true);

  // Get ship attributes for in-game properties (movement, weapon range,
  // etc.) — same source/calculation for creator and joiner.
  const shipIds = React.useMemo(() => ships.map((ship) => ship.id), [ships]);
  const {
    attributes: shipAttributes,
    attributesMap,
    attributesLoading: fleetSelectionAttributesLoading,
    isFromCache,
  } = useFleetShipAttributes(shipIds);

  // findNextPosition/addShipToFleet/removeShipFromFleet now live in the
  // shared useFleetPlacement hook (aliased from `fleet` above).

  // Function to handle ship selection on the grid
  const handleShipSelect = (shipId: bigint) => {
    setSelectedShipId(shipId);
    setTapPendingShipId(null);
  };

  // Function to handle ship movement on the grid — thin wrapper over the
  // shared fleet.moveShip (which owns the deployment-zone/occupancy rules)
  // that also clears touch tap-to-place state, a Lobbies-only concern.
  const handleShipMove = (shipId: bigint, row: number, col: number) => {
    fleet.moveShip(shipId, row, col);
    setTapPendingShipId(null);
  };

  // Ship-list drag start/end now handled inside buildFleetShipListItems
  // (setDraggedShipId/setDragOverPosition passed through directly).

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
      if (data) {
        try {
          shipIdToMove = BigInt(data);
        } catch (error) {
          console.error("Failed to parse ship ID from drag data:", error);
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

  // Ship list tap handling (desktop adds immediately, touch enters
  // pending-placement mode) now lives inside buildFleetShipListItems.

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
  }, [address, chainId, setSelectedShips, setShipPositions, setSelectedShipId, setFleetFilters]);

  useEffect(() => {
    const onChainChanged = () => {
      setShowCreateForm(false);
      setPendingCreateLobbyHash(undefined);
      resetFleetSelectionModalState();
      setShowFleetView(false);
      setIsCreatingFleet(false);
      setViewingFleetId(null);
      setViewingFleetOwner(null);
      setDraggedShipId(null);
      setDragOverPosition(null);
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(
        VOID_TACTICS_CHAIN_CHANGED_EVENT,
        onChainChanged,
      );
    };
  }, [resetFleetSelectionModalState, setDraggedShipId, setDragOverPosition]);

  /** Close the fleet modal but keep in-memory and saved draft selection. */
  const closeFleetModalOnly = useCallback(() => {
    setSelectedLobby(null);
    setFiltersExpanded(false);
    setShowFleetConfirmation(false);
    setShowLoadFleetMenu(false);
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
  }, [selectedLobby, address, chainId, setSelectedShips, setShipPositions, setSelectedShipId]);

  const applyLoadedFleetSelection = useCallback(
    (shipIdsToLoad: bigint[]) => {
      if (!selectedLobby) return;

      const placedShipIds: bigint[] = [];
      const nextPositions: Array<{ shipId: bigint; row: number; col: number }> = [];
      const existingPositions: Array<{ row: number; col: number }> = [];
      for (const shipId of shipIdsToLoad) {
        const position = fleet.findNextPosition(existingPositions);
        if (!position) break;
        placedShipIds.push(shipId);
        nextPositions.push({ shipId, row: position.row, col: position.col });
        existingPositions.push(position);
      }

      setSelectedShips(placedShipIds);
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
    },
    [selectedLobby, fleet, setSelectedShips, setShipPositions, setSelectedShipId],
  );

  const getFleetLoadPlan = useCallback(
    (fleet: FleetComposition) => {
      const availableShipIds: bigint[] = [];
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
        if (ship.shipData.timestampDestroyed > 0n) {
          unavailableCount++;
          continue;
        }
        if (ship.shipData.inFleet) {
          unavailableCount++;
          continue;
        }
        availableShipIds.push(ship.id);
      }

      return {
        availableCount: availableShipIds.length,
        unavailableCount,
        load: () => applyLoadedFleetSelection(availableShipIds),
      };
    },
    [ships, applyLoadedFleetSelection],
  );

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
          ship.shipData.timestampDestroyed === 0n &&
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

  // attributesMap/fleetSelectionAttributesLoading now come from
  // useFleetShipAttributes above.

  // Filter panel state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // filteredShips/selectedFleetHasStaleCostsVersion now come from the
  // shared fleet hook above.

  // Create lobby form state
  const [createForm, setCreateForm] = useState({
    threatScale: "skirmish" as "skirmish" | "battle",
    turnPace: "immediate" as "immediate" | "correspondence",
    selectedMapId: "1",
    scoreLength: "medium" as "short" | "medium" | "long",
    creatorGoesFirst: false,
    reservedJoiner: "", // Optional: address to reserve for (empty for open lobby)
  });

  // Once the eligible list loads, snap the form off the "1" placeholder
  // onto a map that's actually valid to submit, if it isn't already
  // (pvpEligibleMapIds/pvpMapOptions are declared earlier, near useLobbies).
  useEffect(() => {
    if (pvpEligibleMapIds.length === 0) return;
    setCreateForm((prev) =>
      pvpEligibleMapIds.includes(Number(prev.selectedMapId))
        ? prev
        : { ...prev, selectedMapId: String(pvpEligibleMapIds[0]) },
    );
  }, [pvpEligibleMapIds]);

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

  // const handleLeaveLobby = async (lobbyId: bigint) => {
  //   if (!isConnected) return;

  //   try {
  //     await leaveLobby(lobbyId);
  //   } catch (error) {
  //     console.error("Failed to leave lobby:", error);
  //   }
  // };

  const handleCreateFleet = async (lobbyId: bigint) => {
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

    // lobbyId is always selectedLobby (handleCreateFleet's one call site),
    // so fleet's own totalCost/isOverLimit/isUnder90Percent — already scoped
    // to selectedLobby's costLimit — apply directly here.
    if (fleet.isOverLimit) {
      toast.error(
        `Fleet threat (${fleet.totalCost}) exceeds this lobby limit (${costLimitForSelected}). Remove ships or pick a different lobby.`,
      );
      return;
    }

    if (fleet.isUnder90Percent) {
      setShowFleetConfirmation(true);
      return;
    }

    await createFleetWithConfirmation(lobbyId);
  };

  // Track the last fleet creation lobby ID to show toast when receipt is received
  const lastFleetCreationLobbyRef = React.useRef<bigint | null>(null);

  // Show toast and refresh lobby state when fleet creation receipt is received
  React.useEffect(() => {
    if (!isFleetCreated || !lastFleetCreationLobbyRef.current) return;
    lastFleetCreationLobbyRef.current = null;

    toast.success("Fleet created successfully!");
    setShowFleetView(false);
    setShowFleetConfirmation(false);

    // Refetch selected lobby and lobby list so UI shows updated fleet state immediately
    refetchGames();

    (async () => {
      // Only now — once fresh lobby data reflects the new fleet — is it
      // safe to say we're no longer "creating". Clearing isCreatingFleet
      // synchronously (right on receipt confirmation, before this refetch
      // resolves) left `participantHasFleet` momentarily stale-false, so
      // FleetSelectionModal would flash back to the pre-creation "CONFIRM
      // FLEET" UI for a beat before this same refetch caught up.
      await refetchSelectedLobby();
      setIsCreatingFleet(false);

      // Brief delay so chain state is updated before we refetch (helps joiner who selected second)
      await new Promise((r) => setTimeout(r, 1200));
      await loadLobbies();
      await refetchSelectedLobby();

      // Always leave fleet UI after this wallet's fleet tx confirms. List vs getLobby can disagree
      // for one block; the joiner already submitted a valid fleet, so switching to Games is correct.
      resetFleetSelectionModalState();
      navigateToGamesTab();
    })();
  }, [
    isFleetCreated,
    loadLobbies,
    navigateToGamesTab,
    resetFleetSelectionModalState,
    refetchSelectedLobby,
    refetchGames,
  ]);

  // Handle fleet creation errors
  React.useEffect(() => {
    if (fleetCreationError && lastFleetCreationLobbyRef.current) {
      const errorMessage = fleetCreationError.message || "Transaction failed";
      toast.error(`Fleet creation failed: ${errorMessage}`);
      lastFleetCreationLobbyRef.current = null;
      setIsCreatingFleet(false);
    }
  }, [fleetCreationError]);

  const createFleetWithConfirmation = async (lobbyId: bigint) => {
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

    // lobbyId is always selectedLobby (both call sites) — reuse fleet's own
    // totalCost/isOverLimit rather than re-deriving them.
    if (fleet.isOverLimit) {
      toast.error(
        `Fleet threat (${fleet.totalCost}) exceeds this lobby limit (${costLimitForSelected}). Remove ships before confirming.`,
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

      // Submit tx - store lobby ID to show toast when receipt is received.
      // isCreatingFleet stays true past this point — createFleet only
      // resolves once the wallet sends the tx, not once it's confirmed.
      // The busy state is cleared later, by the isFleetCreated/
      // fleetCreationError effects above, once we actually know the
      // outcome.
      lastFleetCreationLobbyRef.current = lobbyId;
      await createFleet(lobbyId, selectedShips, startingPositions);

      // Don't show toast here - wait for receipt (handled in useEffect above)
    } catch (error) {
      // Failed to even send the tx (e.g. rejected in wallet) — nothing to
      // wait for, so clear the busy state immediately.
      console.error("Failed to create fleet:", error);
      lastFleetCreationLobbyRef.current = null;
      setIsCreatingFleet(false);
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
    }
  };

  // NOTE: Early returns moved below to keep hook order stable across renders

  // Auto-fetch opponent fleet data for grid preview (cache immutable fleets)
  const opponentCacheKey = React.useMemo(() => {
    if (!selectedLobby) return null;
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === address;
    const opponentFleetId = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return opponentFleetId && opponentFleetId > 0n
      ? `fleet:${opponentFleetId.toString()}`
      : null;
  }, [selectedLobby, address, resolvedLobbyForSelected]);

  // Compute opponent fleetId for grid
  const opponentFleetIdForGrid = React.useMemo(() => {
    if (!selectedLobby) return null as bigint | null;
    const lobby = resolvedLobbyForSelected;
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === address;
    const fid = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return fid && fid > 0n ? fid : null;
  }, [selectedLobby, address, resolvedLobbyForSelected]);

  const [opponentGridPositions, setOpponentGridPositions] = React.useState<
    Array<{ shipId: bigint; row: number; col: number }>
  >([]);
  const [opponentGridShips, setOpponentGridShips] = React.useState<Ship[]>([]);

  // Hook read for ids+positions when opponent fleet exists
  const { data: oppIdsPos } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    opponentFleetIdForGrid ? [opponentFleetIdForGrid] : undefined,
    { query: { enabled: !!opponentFleetIdForGrid } },
  );

  // Normalize to positions and ids
  const opponentGridPositionsFromHook = React.useMemo(() => {
    if (!oppIdsPos)
      return [] as Array<{ shipId: bigint; row: number; col: number }>;
    const tuple = oppIdsPos as [bigint[], Array<{ row: number; col: number }>];
    const ids: bigint[] = (tuple?.[0] || []) as bigint[];
    const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
      []) as Array<{ row: number; col: number }>;
    return ids.map((id, i) => ({
      shipId: id,
      row: positions?.[i]?.row ?? 0,
      col: positions?.[i]?.col ?? 0,
    }));
  }, [oppIdsPos]);

  // Fetch opponent ships when we have ids
  const { data: opponentGridShipsData } = useShipsRead(
    "getShipsByIds",
    opponentGridPositionsFromHook.length > 0
      ? [opponentGridPositionsFromHook.map((p) => p.shipId)]
      : undefined,
  );

  // Cache opponent grid ships data
  React.useEffect(() => {
    if (opponentGridShipsData && Array.isArray(opponentGridShipsData)) {
      const ships = opponentGridShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [opponentGridShipsData]);

  // Opponent attributes (grid preview)
  const opponentGridShipIds = React.useMemo(
    () => opponentGridPositionsFromHook.map((p) => p.shipId),
    [opponentGridPositionsFromHook],
  );
  const { attributes: opponentGridAttributes } =
    useShipAttributesByIds(opponentGridShipIds);

  // Opponent attributes (modal view)
  const opponentViewShipIds = React.useMemo(
    () => opponentPositions.map((p) => p.shipId),
    [opponentPositions],
  );
  const { attributes: opponentViewAttributes } =
    useShipAttributesByIds(opponentViewShipIds);

  // Combine both fleets for grid view during selection
  const combinedPositions = React.useMemo(
    () => [
      ...shipPositions,
      ...(opponentGridPositionsFromHook.length > 0
        ? opponentGridPositionsFromHook
        : []),
    ],
    [shipPositions, opponentGridPositionsFromHook],
  );

  const combinedShips = React.useMemo<Ship[]>(() => {
    const shipsArray = (ships as Ship[]) || [];
    const opponentShipsArray = ((opponentGridShipsData as Ship[]) ??
      []) as Ship[];
    const playerFleetShipsArray = playerFleetShips || [];

    // Combine all ships, avoiding duplicates by ship ID
    const shipMap = new Map<bigint, Ship>();

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

  // Get attributes for player's fleet ships
  const { attributes: playerFleetAttributes } =
    useShipAttributesByIds(playerFleetShipIds);

  const combinedAttributes = React.useMemo(
    () => [
      ...(shipAttributes as Attributes[]),
      ...(((playerFleetAttributes as Attributes[]) ?? []) as Attributes[]),
      ...(((opponentGridAttributes as Attributes[]) ?? []) as Attributes[]),
    ],
    [shipAttributes, playerFleetAttributes, opponentGridAttributes],
  );

  // Selection allowed only on current builder's ships
  const selectableShipIds = selectedShips;
  // Base sprite faces left. Flip creator's ships so they face right; joiner's ships stay unflipped (face left)
  const isCreatorViewer = !!(
    selectedLobby &&
    resolvedLobbyForSelected?.basic.creator === address
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
            // Convert cached ship fields back from string to BigInt
            const shipsFromCache: Ship[] = (parsed.ships as unknown[]).map(
              (raw) => {
                const s = raw as {
                  id: string;
                  traits: { serialNumber: string } & Ship["traits"];
                  shipData: { timestampDestroyed: string } & Ship["shipData"];
                };
                return {
                  ...(s as unknown as Ship),
                  id: BigInt(s.id),
                  traits: {
                    ...s.traits,
                    serialNumber: BigInt(s.traits.serialNumber),
                  },
                  shipData: {
                    ...s.shipData,
                    timestampDestroyed: BigInt(
                      s.shipData.timestampDestroyed,
                    ),
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
      <LobbyCreateSection
        isSignedIn={isConnected}
        shipsLoading={lobbyUiLoadingShips}
        needsShips={needsShipsForLobbyUi}
        needsConstruct={needsConstructForLobbyUi}
        constructedReadyCount={constructedReadyCount}
        onNavigateToManageNavy={navigateToManageNavyForShips}
        activeLobbiesCount={activeLobbiesCount}
        kickCount={Number(playerState?.kickCount ?? 0n)}
        hasActiveLobby={hasActiveLobby}
        freeGames={Number(freeGamesPerAddress ?? 0n)}
        canCreateLobby={canCreateLobby}
        disabledLabel={paused ? "LOBBIES PAUSED" : null}
        showCreateForm={showCreateForm}
        onToggleCreateForm={() => setShowCreateForm(true)}
        createButtonHint={
          needsPaymentForLobby && additionalLobbyFee ? (
            <p className="text-center text-xs text-amber font-mono">
              {`// Free games used — lobby fee: ${formatEther(additionalLobbyFee as bigint)} ${getNativeTokenSymbol(chainId)}`}
            </p>
          ) : null
        }
        createFormElement={
          <LobbyCreateForm
            threatScale={createForm.threatScale}
            onThreatScaleChange={(v) => setCreateForm((prev) => ({ ...prev, threatScale: v }))}
            turnPace={createForm.turnPace}
            onTurnPaceChange={(v) => setCreateForm((prev) => ({ ...prev, turnPace: v }))}
            scoreLength={createForm.scoreLength}
            onScoreLengthChange={(v) => setCreateForm((prev) => ({ ...prev, scoreLength: v }))}
            mapIdLabel={createForm.selectedMapId}
            mapOptions={pvpMapOptions}
            onMapIdChange={(id) => setCreateForm((prev) => ({ ...prev, selectedMapId: id }))}
            onClose={() => setShowCreateForm(false)}
            extraFields={
              <>
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
                      {"// Requires 1 UTC to reserve game for this player"}
                    </p>
                  ) : (
                    <p className="text-xs text-amber mt-1">
                      Leave empty to create an open lobby
                    </p>
                  )}
                </div>
                <LobbyTurnOrderNote />
                {/* Cost summary — only shown when fees apply */}
                {(needsPaymentForLobby && additionalLobbyFee) ||
                (createForm.reservedJoiner.trim() &&
                  address &&
                  createForm.reservedJoiner.trim().toLowerCase() !==
                    address.toLowerCase()) ? (
                  <div className="border border-amber/60 bg-black/30 p-3 font-mono text-xs space-y-1">
                    <p className="text-amber font-bold tracking-wider">{"// COST BREAKDOWN"}</p>
                    {needsPaymentForLobby && additionalLobbyFee ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-text-secondary">Lobby fee (free games exhausted)</span>
                        <span className="text-amber font-bold shrink-0">
                          {formatEther(additionalLobbyFee as bigint)} {getNativeTokenSymbol(chainId)}
                        </span>
                      </div>
                    ) : null}
                    {createForm.reservedJoiner.trim() &&
                    address &&
                    createForm.reservedJoiner.trim().toLowerCase() !==
                      address.toLowerCase() ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-text-secondary">Reservation fee (private lobby)</span>
                        <span className="text-amber font-bold shrink-0">1 UTC</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            }
            footer={
              <div className="flex flex-col gap-2 sm:flex-row">
                <LobbyCreateButton
                  costLimit={BigInt(createFormCostLimit)}
                  turnTime={BigInt(createFormTurnTimeSeconds)}
                  creatorGoesFirst={createForm.creatorGoesFirst}
                  selectedMapId={BigInt(createForm.selectedMapId)}
                  maxScore={BigInt(createFormMaxScore)}
                  value={
                    needsPaymentForLobby
                      ? (additionalLobbyFee as bigint) || 0n
                      : 0n
                  }
                  reservedJoiner={
                    createForm.reservedJoiner.trim()
                      ? (createForm.reservedJoiner.trim() as `0x${string}`)
                      : undefined
                  }
                  disabled={
                    pvpEligibleMapIds.length === 0 ||
                    !!(
                      createForm.reservedJoiner.trim() &&
                      address &&
                      createForm.reservedJoiner.trim().toLowerCase() ===
                        address.toLowerCase()
                    )
                  }
                  className="w-full flex-1 px-6 py-3 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent sm:w-auto"
                  onTransactionSent={(hash) => {
                    setPendingCreateLobbyHash(hash);
                    // Form stays open (button shows "[CREATING...]" via
                    // TransactionButton's own pending state) until the
                    // isCreateLobbyConfirmed effect above closes it — once
                    // the new lobby is actually in the list, not just
                    // once the tx is sent.
                  }}
                  onSuccess={() => {}}
                  onError={(error) => {
                    setPendingCreateLobbyHash(undefined);
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
            }
          />
        }
      />

      {!lobbyUiLoadingShips && !needsShipsForLobbyUi && !needsConstructForLobbyUi && (
        <>
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
            {lobbyCount && typeof lobbyCount === "bigint" && lobbyCount > 0n ? (
              <div className="mt-2 text-sm">
                Total lobbies in system: {lobbyCount.toString()}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lobbyList.lobbies.map((lobby) => {
            const isCreatorMe = Boolean(
              address && lobby.basic.creator.toLowerCase() === address.toLowerCase(),
            );
            const isJoinerMe = Boolean(
              address && lobby.players.joiner.toLowerCase() === address.toLowerCase(),
            );
            const hasJoiner =
              lobby.players.joiner !== "0x0000000000000000000000000000000000000000";
            const hasReservedJoiner =
              lobby.players.reservedJoiner &&
              typeof lobby.players.reservedJoiner === "string" &&
              lobby.players.reservedJoiner !==
                "0x0000000000000000000000000000000000000000";
            return (
            <LobbyCard
              key={lobby.basic.id.toString()}
              lobbyIdLabel={lobby.basic.id.toString()}
              isCreatorMe={isCreatorMe}
              statusColorClass={lobbyStatusColor(lobby.state.status)}
              statusText={lobbyStatusLabel(lobby.state.status)}
              creatorLabel={`${lobby.basic.creator.slice(0, 6)}…${lobby.basic.creator.slice(-4)}`}
              creatorStats={
                <CreatorStats
                  address={lobby.basic.creator as `0x${string}`}
                  chainId={chainId}
                />
              }
              joinerLabel={
                hasJoiner
                  ? `${lobby.players.joiner.slice(0, 6)}…${lobby.players.joiner.slice(-4)}`
                  : null
              }
              isJoinerMe={isJoinerMe}
              joinerStats={
                hasJoiner ? (
                  <CreatorStats
                    address={lobby.players.joiner as `0x${string}`}
                    chainId={chainId}
                  />
                ) : undefined
              }
              reservedLabel={
                hasReservedJoiner
                  ? `${lobby.players.reservedJoiner.slice(0, 6)}…${lobby.players.reservedJoiner.slice(-4)}`
                  : null
              }
              threatLabel={formatThreatShort(lobby.basic.costLimit)}
              turnLabel={formatTurnShort(lobby.gameConfig.turnTime)}
              mapLabel={`#${lobby.gameConfig.selectedMapId.toString()}`}
              scoreLabel={formatScoreShort(lobby.gameConfig.maxScore)}
              creatorFleetButton={
                lobby.players.creatorFleetId > 0n ? (
                  <button
                    onClick={() => {
                      setViewingFleetId(lobby.players.creatorFleetId);
                      setViewingFleetOwner(lobby.basic.creator);
                      setShowFleetView(true);
                    }}
                    className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                      isCreatorMe
                        ? "border-amber text-amber hover:bg-amber/10"
                        : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    CMDR FLEET #{lobby.players.creatorFleetId.toString()}
                  </button>
                ) : undefined
              }
              joinerFleetButton={
                lobby.players.joinerFleetId > 0n ? (
                  <button
                    onClick={() => {
                      setViewingFleetId(lobby.players.joinerFleetId);
                      setViewingFleetOwner(lobby.players.joiner);
                      setShowFleetView(true);
                    }}
                    className={`px-2.5 py-0.5 text-xs border font-mono tracking-wider transition-colors ${
                      isJoinerMe
                        ? "border-cyan text-cyan hover:bg-cyan/10"
                        : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    JOIN FLEET #{lobby.players.joinerFleetId.toString()}
                  </button>
                ) : undefined
              }
              actions={
                <LobbyCardActions
                  status={lobby.state.status}
                  isCreatorMe={isCreatorMe}
                  isJoinerMe={isJoinerMe}
                  hasJoiner={hasJoiner}
                  hasReservedJoiner={!!hasReservedJoiner}
                  isReservedForMe={
                    !!address &&
                    !!hasReservedJoiner &&
                    lobby.players.reservedJoiner.toLowerCase() === address.toLowerCase()
                  }
                  reservedLabel={
                    hasReservedJoiner
                      ? `${lobby.players.reservedJoiner.slice(0, 6)}…${lobby.players.reservedJoiner.slice(-4)}`
                      : ""
                  }
                  hasActiveLobby={hasActiveLobby}
                  myFleetId={Number(
                    isCreatorMe ? lobby.players.creatorFleetId : lobby.players.joinerFleetId,
                  )}
                  opponentFleetId={Number(
                    isCreatorMe ? lobby.players.joinerFleetId : lobby.players.creatorFleetId,
                  )}
                  onGoToGames={closeFleetModalAndGoToGames}
                  onSelectFleet={() => setSelectedLobby(lobby.basic.id)}
                  joinButton={
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
                          toast.error("This game is reserved for another player");
                        } else {
                          toast.error("Failed to join lobby");
                        }
                      }}
                    >
                      JOIN LOBBY
                    </LobbyJoinButton>
                  }
                  acceptButton={
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
                          toast.error("This game is no longer reserved for you");
                        } else {
                          toast.error("Failed to accept game");
                        }
                      }}
                    >
                      ACCEPT
                    </LobbyAcceptButton>
                  }
                  rejectButton={
                    <LobbyRejectButton
                      lobbyId={lobby.basic.id}
                      disabled={hasActiveLobby}
                      className="flex-1 px-6 py-3 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onSuccess={() => {
                        toast.success("Game rejected. Lobby is now open.");
                        loadLobbies();
                      }}
                      onError={(error) => {
                        console.error("Failed to reject game:", error);
                        toast.error("Failed to reject game");
                      }}
                    >
                      REJECT
                    </LobbyRejectButton>
                  }
                  leaveButton={
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
                  }
                />
              }
            />
            );
          })}
          </div>
        )}
      </div>
        </>
      )}

      {/* Fleet Selection Modal */}
      {selectedLobby &&
        (() => {
          const currentLobby = resolvedLobbyForSelected;
          const normalizedAddress = address ? address.toLowerCase() : null;
          const isCreator = currentLobby
            ? normalizedAddress != null &&
              currentLobby.basic.creator.toLowerCase() === normalizedAddress
            : false;
          const opponentHasFleet =
            currentLobby != null
              ? isCreator
                ? currentLobby.players.joinerFleetId > 0n
                : currentLobby.players.creatorFleetId > 0n
              : false;
          const participantHasFleet =
            currentLobby != null
              ? isCreator
                ? currentLobby.players.creatorFleetId > 0n
                : currentLobby.players.joinerFleetId > 0n
              : false;
          // totalCost/costLimit/isOverLimit/isUnder90Percent/hasMovedShip
          // come from the shared fleet hook (already scoped to this same
          // selectedLobby/side) — see fleet.totalCost etc. below.
          const totalCost = fleet.totalCost;
          const costLimit = costLimitForSelected;
          const isOverLimit = fleet.isOverLimit;
          const isUnder90Percent = fleet.isUnder90Percent;
          const hasMovedShip = fleet.hasMovedShip;

          const shipListItems = buildFleetShipListItems({
            ships: filteredShips,
            selectedShips,
            addShip: addShipToFleet,
            removeShip: removeShipFromFleet,
            setDraggedShipId,
            setDragOverPosition,
            attributesMap,
            attributesLoading: fleetSelectionAttributesLoading,
            showInGameProperties,
            flipShips: isCreator,
            tapPendingShipId,
            setTapPendingShipId,
            isTouchDevice,
          });

          const mapDisplay = currentLobby && (
            <MapDisplay
              mapId={Number(currentLobby.gameConfig.selectedMapId)}
              className="w-full h-full"
              showPlayerOverlay={true}
              showDeployZoneLabel={!(showFleetView && viewingFleetId && viewingFleetOwner)}
              pendingPlacementShipId={
                !playerFleetId && !(showFleetView && viewingFleetId && viewingFleetOwner)
                  ? tapPendingShipId
                  : null
              }
              isCreator={currentLobby.basic.creator === address}
              isCreatorViewer={currentLobby.basic.creator === address}
              shipPositions={
                showFleetView && viewingFleetOwner && viewingFleetId
                  ? opponentPositions
                  : combinedPositions
              }
              ships={
                showFleetView && viewingFleetOwner && viewingFleetId
                  ? opponentShips
                  : combinedShips
              }
              selectedShipId={selectedShipId}
              onShipSelect={
                playerFleetId || (showFleetView && viewingFleetId && viewingFleetOwner)
                  ? undefined
                  : handleShipSelect
              }
              onShipMove={
                playerFleetId || (showFleetView && viewingFleetId && viewingFleetOwner)
                  ? undefined
                  : handleShipMove
              }
              allowSelection={
                !playerFleetId && !(showFleetView && viewingFleetId && viewingFleetOwner)
              }
              selectableShipIds={playerFleetId ? undefined : selectableShipIds}
              flippedShipIds={flippedShipIds as bigint[]}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragOverPosition={dragOverPosition}
            />
          );

          return (
            <FleetSelectionModal
              participantHasFleet={participantHasFleet}
              opponentHasFleet={opponentHasFleet}
              onGoToGames={closeFleetModalAndGoToGames}
              createButtonState={{
                isBusy: isCreatingFleet,
                busyLabel: "CREATING FLEET...",
                selectedCount: selectedShips.length,
                maxShips: MAX_SHIPS_PER_FLEET,
                isOverLimit,
                costLimit,
                isUnder90Percent,
                hasMovedShip,
                hasStaleCosts: selectedFleetHasStaleCostsVersion,
              }}
              onCreateFleet={() => handleCreateFleet(selectedLobby)}
              onCancel={closeFleetModalOnly}
              filtersExpanded={filtersExpanded}
              onToggleFilters={() => setFiltersExpanded(!filtersExpanded)}
              loadFleetMenu={
                <LoadFleetMenu
                  fleets={savedFleetCompositions}
                  isOpen={showLoadFleetMenu}
                  onToggleOpen={() => setShowLoadFleetMenu((prev) => !prev)}
                  onClose={() => setShowLoadFleetMenu(false)}
                  getSummary={getSavedFleetSummary}
                  getLoadPlan={getFleetLoadPlan}
                />
              }
              onClearFleetSelection={clearFleetDraftSelection}
              isBusy={isCreatingFleet}
              totalCost={totalCost}
              costLimit={costLimit}
              isOverLimit={isOverLimit}
              isUnder90Percent={isUnder90Percent}
              leaveButton={
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
              }
              onClose={closeFleetModalOnly}
              showFirstFleetHint={!playerFleetId}
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
              onDropShip={(shipId) => {
                try {
                  removeShipFromFleet(BigInt(shipId));
                } catch {
                  // Not a valid ship id (e.g. a drag originating outside this modal) — ignore.
                }
              }}
            />
          );
        })()}

      {/* Fleet Threat Confirmation Dialog */}
      {showFleetConfirmation &&
        selectedLobby &&
        (() => {
          const totalCost = fleet.totalCost;
          const costLimit = costLimitForSelected;
          const confirmationOverLimit = fleet.isOverLimit;

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
        <FleetViewModal
          fleetIdLabel={viewingFleetId.toString()}
          ownerLabel={`${viewingFleetOwner.slice(0, 6)}…${viewingFleetOwner.slice(-4)}`}
          isOwnerMe={!!address && viewingFleetOwner.toLowerCase() === address.toLowerCase()}
          onClose={() => {
            setShowFleetView(false);
            setViewingFleetId(null);
            setViewingFleetOwner(null);
          }}
          isLoading={fleetShipIdsLoading || fleetShipsLoading}
          shipCards={
            fleetShips && Array.isArray(fleetShips)
              ? (fleetShips as Ship[]).map((ship, index) => (
                  <ShipCard
                    key={ship.id?.toString() || index}
                    ship={toShipCardData(ship)}
                    shipImage={<ShipImage ship={ship} className="h-full w-full" />}
                    isStarred={false}
                    onToggleStar={() => {}}
                    isSelected={false}
                    onToggleSelection={() => {}}
                    onRecycleClick={() => {}}
                    showInGameProperties={false}
                    hideRecycle
                    hideCheckbox
                  />
                ))
              : []
          }
        />
      )}
    </div>
  );
};

export default Lobbies;

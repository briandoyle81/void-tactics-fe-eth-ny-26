"use client";

import React from "react";
import { usePublicClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import { parseEventLogs, type Abi } from "viem";
import { toast } from "react-hot-toast";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { MapDisplay } from "./MapDisplay";
import { useNodeFleetSelection } from "../hooks/useNodeFleetSelection";
import { useFleetShipAttributes } from "../hooks/useFleetShipAttributes";
import { buildFleetShipListItems } from "../utils/buildFleetShipListItems";
import { useSinglePlayerMatch } from "../hooks/useSinglePlayerMatch";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
} from "../hooks/useAIEncountersContract";
import type { AIShipConfig, Ship } from "../types/types";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { CONTRACT_ABIS } from "../config/contracts";
import type { CampaignGraphNode } from "../hooks/useNodeMap";

// AIShipConfig ids and the player's own owned-ship ids are separate
// namespaces on-chain and can collide (e.g. both could have id 3) — this
// modal renders both in the same MapDisplay, so enemy ship ids need to be
// pushed well clear of any real ship id before merging the two into one
// ships/shipPositions array. Rendering-only; never sent on-chain (the real
// tx only ever submits the player's own fleet.selectedShips).
const ENEMY_PREVIEW_ID_OFFSET = 100_000_000n;

interface NodeMatchModalProps {
  node: CampaignGraphNode;
  onClose: () => void;
  /** Fired once startNodeMatch confirms and the game exists — caller
   * navigates to the Games tab (see Lobbies.tsx's navigateToGamesTab for
   * the established pattern this should reuse). */
  onLaunched: () => void;
}

// Node-match counterpart to Lobbies.tsx's fleet-creation modal — same
// FleetSelectionModal chrome, but there's no lobby, no second party to wait
// on, and startNodeMatch both builds the fleet and starts the Game in one
// call. See useNodeFleetSelection.ts for the ship-picking state/handlers
// this wires up (a smaller, purpose-built port of Lobbies.tsx's logic, not
// a reuse of it directly — see the migration plan for why).
export function NodeMatchModal({ node, onClose, onLaunched }: NodeMatchModalProps) {
  const { startNodeMatch } = useSinglePlayerMatch();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  const costLimit = Number(node.costLimit);
  const fleet = useNodeFleetSelection(costLimit);

  // Enemy fleet placement is deterministic per-map data (unlike PvP, there's
  // no opponent to keep it secret from), so show it already on the board
  // while the player is deploying rather than only in the pre-launch
  // preview panel.
  const { data: enemyPlacements } = useGetMapPlacements(node.mapId);
  const { data: allEnemyConfigs } = useGetAllAIShipConfigs();
  const enemyConfigById = React.useMemo(() => {
    const map = new Map<string, AIShipConfig>();
    (allEnemyConfigs ?? []).forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [allEnemyConfigs]);
  const enemyShips = React.useMemo(() => {
    if (!enemyPlacements) return [];
    const placed: Array<{ ship: Ship; row: number; col: number }> = [];
    enemyPlacements.configIds.forEach((configId, i) => {
      const config = enemyConfigById.get(configId.toString());
      if (!config) return;
      placed.push({
        ship: aiConfigToPreviewShip(config, ENEMY_PREVIEW_ID_OFFSET + BigInt(i)),
        row: enemyPlacements.positions[i].row,
        col: enemyPlacements.positions[i].col,
      });
    });
    return placed;
  }, [enemyPlacements, enemyConfigById]);

  const shipIdsForAttributes = React.useMemo(
    () => fleet.ships.map((s) => s.id),
    [fleet.ships],
  );
  const {
    attributesMap,
    attributesLoading: attributesLoadingEffective,
    isFromCache: isAttributesFromCache,
    error: attributesError,
  } = useFleetShipAttributes(shipIdsForAttributes, baseSepolia.id);

  React.useEffect(() => {
    if (attributesError) {
      console.error("[NodeMatchModal] ship attributes fetch failed:", attributesError);
    }
  }, [attributesError]);

  const handleLaunch = async () => {
    if (selectedShipsInvalid()) return;
    setIsSubmitting(true);
    try {
      const positions = fleet.shipPositions.map((p) => ({ row: p.row, col: p.col }));
      const hash = await startNodeMatch(node.id, fleet.selectedShips, positions);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const logs = parseEventLogs({
          abi: CONTRACT_ABIS.SINGLE_PLAYER_MATCH as Abi,
          logs: receipt.logs,
          eventName: "NodeMatchStarted",
        });
        const gameId = (logs[0]?.args as { gameId?: bigint } | undefined)?.gameId;
        if (!gameId) {
          console.error("NodeMatchStarted event not found in receipt", receipt);
        }
      }
      toast.success("Mission launched!");
      fleet.clearSelection();
      onLaunched();
    } catch (error) {
      console.error("Failed to start node match:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("NodeNotUnlocked")) {
        toast.error("This mission isn't unlocked yet.");
      } else if (message.includes("NoAIPlacementsConfigured")) {
        toast.error("This mission has no enemy fleet configured yet.");
      } else if (message.includes("InvalidFleetCost")) {
        toast.error(`Fleet threat exceeds this mission's ${costLimit} limit.`);
      } else if (message.includes("User rejected") || message.includes("User denied")) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Failed to launch mission: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  function selectedShipsInvalid(): boolean {
    return (
      fleet.selectedShips.length === 0 ||
      fleet.selectedShips.length > fleet.maxShips ||
      fleet.isOverLimit ||
      fleet.isUnder90Percent ||
      !fleet.hasMovedShip ||
      fleet.hasStaleCostsVersion
    );
  }

  const shipListItems = buildFleetShipListItems({
    ships: fleet.filteredShips,
    selectedShips: fleet.selectedShips,
    addShip: fleet.addShip,
    removeShip: fleet.removeShip,
    setDraggedShipId: fleet.setDraggedShipId,
    setDragOverPosition: fleet.setDragOverPosition,
    attributesMap,
    attributesLoading: attributesLoadingEffective,
    showInGameProperties,
    flipShips: true,
  });

  const mapShips = React.useMemo(
    () => [...fleet.ships, ...enemyShips.map((e) => e.ship)],
    [fleet.ships, enemyShips],
  );
  const mapShipPositions = React.useMemo(
    () => [
      ...fleet.shipPositions,
      ...enemyShips.map((e) => ({ shipId: e.ship.id, row: e.row, col: e.col })),
    ],
    [fleet.shipPositions, enemyShips],
  );

  const mapDisplay = (
    <MapDisplay
      mapId={Number(node.mapId)}
      className="w-full h-full"
      showPlayerOverlay={true}
      isCreator={true}
      isCreatorViewer={true}
      shipPositions={mapShipPositions}
      ships={mapShips}
      selectedShipId={fleet.selectedShipId}
      onShipSelect={fleet.setSelectedShipId}
      onShipMove={fleet.moveShip}
      allowSelection={true}
      selectableShipIds={fleet.selectedShips}
      // Base sprite faces left; flip our own placed ships so they face right
      // (mirrors Lobbies.tsx's creator-viewer flip — see that file's
      // `flippedShipIds` for the source of this convention).
      flippedShipIds={fleet.shipPositions.map((p) => p.shipId)}
      onDragOver={(row, col, e) => {
        e.preventDefault();
        fleet.setDragOverPosition({ row, col });
      }}
      onDrop={(row, col, e) => {
        // Ships dragged from the list panel arrive via draggedShipId state
        // (see onDragStart below). Ships dragged directly on the grid to
        // reposition never touch that state — MapDisplayView's own
        // onDragStart only sets e.dataTransfer — so fall back to reading it
        // here, same as Lobbies.tsx's handleDrop.
        let shipIdToMove = fleet.draggedShipId;
        if (shipIdToMove == null && e) {
          const data = e.dataTransfer.getData("text/plain");
          if (data) {
            try {
              shipIdToMove = BigInt(data);
            } catch (error) {
              console.error("Failed to parse ship ID from drag data:", error);
            }
          }
        }
        if (shipIdToMove != null) {
          fleet.moveShip(shipIdToMove, row, col);
        }
        fleet.setDraggedShipId(null);
        fleet.setDragOverPosition(null);
      }}
      dragOverPosition={fleet.dragOverPosition}
      showDeployZoneLabel={true}
    />
  );

  return (
    <FleetSelectionModal
      participantHasFleet={false}
      opponentHasFleet={true}
      onGoToGames={onLaunched}
      createButtonState={{
        isBusy: isSubmitting,
        busyLabel: "LAUNCHING...",
        selectedCount: fleet.selectedShips.length,
        maxShips: fleet.maxShips,
        isOverLimit: fleet.isOverLimit,
        costLimit,
        isUnder90Percent: fleet.isUnder90Percent,
        hasMovedShip: fleet.hasMovedShip,
        hasStaleCosts: fleet.hasStaleCostsVersion,
        readyLabel: `LAUNCH MISSION (${fleet.selectedShips.length})`,
      }}
      onCreateFleet={() => void handleLaunch()}
      onCancel={onClose}
      filtersExpanded={filtersExpanded}
      onToggleFilters={() => setFiltersExpanded((v) => !v)}
      loadFleetMenu={null}
      onClearFleetSelection={fleet.clearSelection}
      isBusy={isSubmitting}
      totalCost={fleet.totalCost}
      costLimit={costLimit}
      isOverLimit={fleet.isOverLimit}
      isUnder90Percent={fleet.isUnder90Percent}
      onClose={onClose}
      showFirstFleetHint={false}
      fleetFilters={fleet.fleetFilters}
      onFleetFiltersChange={fleet.setFleetFilters}
      shownCount={fleet.filteredShips.length}
      totalCount={fleet.ships.length}
      showInGameProperties={showInGameProperties}
      onToggleInGameProperties={setShowInGameProperties}
      isAttributesFromCache={isAttributesFromCache}
      shipsLoading={fleet.shipsLoading}
      isCreator={true}
      shipListItems={shipListItems}
      mapDisplay={mapDisplay}
    />
  );
}

"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { MapDisplayWeb2 } from "./MapDisplayWeb2";
import { useNodeFleetSelectionWeb2 } from "../hooks/useNodeFleetSelectionWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { buildFleetShipListItemsWeb2 } from "../utils/buildFleetShipListItemsWeb2";
import { useStartCampaignNodeWeb2, type CampaignWeb2Node } from "../hooks/useCampaignWeb2";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";
import type { Web2Ship } from "../types/web2Ship";

interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
  config: AIShipConfigWeb2;
}

// Enemy-preview ids are pushed well clear of any real ship id, same
// namespace-collision guard as web3's NodeMatchModal.tsx.
const ENEMY_PREVIEW_ID_OFFSET = 100_000_000;

interface NodeMatchModalWeb2Props {
  node: CampaignWeb2Node;
  requiredVariant: number;
  onClose: () => void;
  onLaunched: () => void;
}

// Web2 counterpart to NodeMatchModal.tsx — the literal same
// FleetSelectionModal chrome and drag-and-drop MapDisplay*, number-native
// state (useNodeFleetSelectionWeb2) instead of bigint-native. No
// transaction-confirmation step to wait on, so this both builds the fleet
// and starts the Game in one call (POST /api/campaign/nodes/[id]/start).
export function NodeMatchModalWeb2({
  node,
  requiredVariant,
  onClose,
  onLaunched,
}: NodeMatchModalWeb2Props) {
  const { startNode } = useStartCampaignNodeWeb2();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  const fleet = useNodeFleetSelectionWeb2(node.costLimit, requiredVariant);

  const { data: placements } = useQuery({
    queryKey: ["ai-map-placements", node.mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/ai-map-placements?mapId=${node.mapId}`),
  });
  const enemyShips = React.useMemo(() => {
    if (!placements) return [];
    return placements.map((p, i) => ({
      ship: aiConfigToPreviewShipWeb2(p.config, ENEMY_PREVIEW_ID_OFFSET + i),
      row: p.row,
      col: p.col,
    }));
  }, [placements]);

  const shipIdsForAttributes = React.useMemo(() => fleet.ships.map((s) => s.id), [fleet.ships]);
  const {
    attributesByShipId,
    isLoading: attributesLoading,
    isFromCache: isAttributesFromCache,
  } = useShipAttributesByIdsWeb2(shipIdsForAttributes);

  const handleLaunch = async () => {
    if (selectedShipsInvalid()) return;
    setIsSubmitting(true);
    try {
      const startingPositions = fleet.shipPositions.map((p) => ({ row: p.row, col: p.col }));
      await startNode(node.id, fleet.selectedShips, startingPositions);
      await queryClient.invalidateQueries();
      toast.success("Mission launched!");
      fleet.clearSelection();
      onLaunched();
    } catch (error) {
      console.error("Failed to start node match:", error);
      toast.error(error instanceof Error ? error.message : "Failed to launch mission");
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
      !fleet.hasMovedShip
    );
  }

  const shipListItems = buildFleetShipListItemsWeb2({
    ships: fleet.filteredShips,
    selectedShips: fleet.selectedShips,
    addShip: fleet.addShip,
    removeShip: fleet.removeShip,
    setDraggedShipId: fleet.setDraggedShipId,
    setDragOverPosition: fleet.setDragOverPosition,
    attributesMap: attributesByShipId,
    attributesLoading,
    showInGameProperties,
    flipShips: true,
  });

  const mapShips: Web2Ship[] = React.useMemo(
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
    <MapDisplayWeb2
      mapId={node.mapId}
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
      flippedShipIds={fleet.shipPositions.map((p) => p.shipId)}
      onDragOver={(row, col, e) => {
        e.preventDefault();
        fleet.setDragOverPosition({ row, col });
      }}
      onDrop={(row, col, e) => {
        let shipIdToMove = fleet.draggedShipId;
        if (shipIdToMove == null && e) {
          const data = e.dataTransfer.getData("text/plain");
          if (data) {
            const parsed = Number(data);
            if (!Number.isNaN(parsed)) shipIdToMove = parsed;
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
        costLimit: node.costLimit,
        isUnder90Percent: fleet.isUnder90Percent,
        hasMovedShip: fleet.hasMovedShip,
        hasStaleCosts: false,
        readyLabel: `${node.completed ? "REPLAY MISSION" : "LAUNCH MISSION"} (${fleet.selectedShips.length})`,
      }}
      onCreateFleet={() => void handleLaunch()}
      onCancel={onClose}
      filtersExpanded={filtersExpanded}
      onToggleFilters={() => setFiltersExpanded((v) => !v)}
      loadFleetMenu={null}
      onClearFleetSelection={fleet.clearSelection}
      isBusy={isSubmitting}
      totalCost={fleet.totalCost}
      costLimit={node.costLimit}
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
      onDropShip={(shipId) => {
        const parsed = Number(shipId);
        if (!Number.isNaN(parsed)) fleet.removeShip(parsed);
      }}
    />
  );
}

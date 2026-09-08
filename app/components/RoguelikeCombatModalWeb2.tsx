"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { MapDisplayWeb2 } from "./MapDisplayWeb2";
import { useFleetPlacementWeb2 } from "../hooks/useFleetPlacementWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { buildFleetShipListItemsWeb2 } from "../utils/buildFleetShipListItemsWeb2";
import { useRoguelikeMatchWeb2, type RoguelikeRunWeb2, type RoguelikeNodeWeb2 } from "../hooks/useRoguelikeWeb2";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";
import type { Web2Ship } from "../types/web2Ship";

interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
  config: AIShipConfigWeb2;
}

const ENEMY_PREVIEW_ID_OFFSET = 100_000_000;

interface RoguelikeCombatModalWeb2Props {
  run: RoguelikeRunWeb2;
  targetNode: RoguelikeNodeWeb2;
  onClose: () => void;
  onLaunched: () => void;
}

// Web2 counterpart to RoguelikeCombatModal.tsx — same FleetSelectionModal
// chrome and drag-and-drop MapDisplay*, roster fixed to the run's
// already-committed roster (no per-mission squad selection — see
// RoguelikeCombatModal.tsx's own doc-comment), only positioning is left to
// the player.
export function RoguelikeCombatModalWeb2({
  run,
  targetNode,
  onClose,
  onLaunched,
}: RoguelikeCombatModalWeb2Props) {
  const { enterCombatNode } = useRoguelikeMatchWeb2();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);
  const seededRef = React.useRef(false);

  const rosterShips: Web2Ship[] = React.useMemo(() => run.roster.map((r) => r.ship), [run.roster]);

  const fleet = useFleetPlacementWeb2({
    ships: rosterShips,
    costLimit: Number.MAX_SAFE_INTEGER,
    costsVersion: null,
    isCreatorSide: true,
  });

  React.useEffect(() => {
    if (seededRef.current || rosterShips.length === 0) return;
    seededRef.current = true;
    rosterShips.forEach((s) => fleet.addShip(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterShips]);

  const { data: placements } = useQuery({
    queryKey: ["ai-map-placements", targetNode.mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/ai-map-placements?mapId=${targetNode.mapId}`),
    enabled: targetNode.mapId != null,
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
    if (fleet.selectedShips.length === 0 || !fleet.hasMovedShip) return;
    setIsSubmitting(true);
    try {
      const startingPositions = fleet.shipPositions.map((p) => ({ row: p.row, col: p.col }));
      await enterCombatNode(targetNode.id, startingPositions);
      await queryClient.invalidateQueries();
      toast.success("Mission launched!");
      onLaunched();
    } catch (error) {
      console.error("Failed to enter combat node:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already in progress")) {
        toast.error("A match is already in progress.");
      } else if (message.includes("reachable")) {
        toast.error("This node isn't reachable from your current position.");
      } else if (message.includes("already been cleared")) {
        toast.error("This node has already been cleared and can't be re-fought.");
      } else if (message.includes("no AI content")) {
        toast.error("This mission has no enemy fleet configured yet.");
      } else {
        toast.error(`Failed to launch mission: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
      mapId={targetNode.mapId ?? 0}
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
        maxShips: rosterShips.length,
        isOverLimit: false,
        costLimit: 0,
        isUnder90Percent: false,
        hasMovedShip: fleet.hasMovedShip,
        hasStaleCosts: false,
        readyLabel: `LAUNCH MISSION (${fleet.selectedShips.length})`,
      }}
      onCreateFleet={() => void handleLaunch()}
      onCancel={onClose}
      filtersExpanded={filtersExpanded}
      onToggleFilters={() => setFiltersExpanded((v) => !v)}
      loadFleetMenu={null}
      onClearFleetSelection={() => {}}
      isBusy={isSubmitting}
      totalCost={fleet.totalCost}
      costLimit={0}
      isOverLimit={false}
      isUnder90Percent={false}
      onClose={onClose}
      showFirstFleetHint={false}
      fleetFilters={fleet.fleetFilters}
      onFleetFiltersChange={fleet.setFleetFilters}
      shownCount={fleet.filteredShips.length}
      totalCount={fleet.ships.length}
      showInGameProperties={showInGameProperties}
      onToggleInGameProperties={setShowInGameProperties}
      isAttributesFromCache={isAttributesFromCache}
      shipsLoading={false}
      isCreator={true}
      shipListItems={shipListItems}
      mapDisplay={mapDisplay}
      onDropShip={() => {
        // Roster is fixed for combat entry — same as web3, only repositioning
        // via the grid is meaningful here.
      }}
    />
  );
}

"use client";

import React from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { parseEventLogs, type Abi } from "viem";
import { toast } from "react-hot-toast";
import { FleetSelectionModal } from "./FleetSelectionModal";
import { MapDisplay } from "./MapDisplay";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetPlacement } from "../hooks/useFleetPlacement";
import { useFleetShipAttributes } from "../hooks/useFleetShipAttributes";
import { buildFleetShipListItems } from "../utils/buildFleetShipListItems";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
} from "../hooks/useAIEncountersContract";
import type { AIShipConfig, Ship } from "../types/types";
import { RoguelikeRun, RoguelikeNode } from "../types/roguelike";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { CONTRACT_ABIS } from "../config/contracts";
import { navigateToGame } from "../utils/navigateToGame";

const ENEMY_PREVIEW_ID_OFFSET = 100_000_000n;

interface RoguelikeCombatModalProps {
  run: RoguelikeRun;
  targetNode: RoguelikeNode;
  onClose: () => void;
  onLaunched: () => void;
}

// Roguelike counterpart to NodeMatchModal.tsx — same FleetSelectionModal
// chrome and AIEncounters-driven enemy preview, but the roster isn't
// freely picked here: it's the run's already-committed rosterShipIds (no
// per-mission squad selection — see docs/update/Frontend_Update_Guide_Roguelike_Campaign.md
// §1), so every roster ship starts pre-selected and only positioning is
// left to the player. Submits via RoguelikeMatch.enterCombatNode, not
// startNodeMatch.
export function RoguelikeCombatModal({
  run,
  targetNode,
  onClose,
  onLaunched,
}: RoguelikeCombatModalProps) {
  const { enterCombatNode } = useRoguelikeMatch();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);
  const seededRef = React.useRef(false);

  const { ships: ownedShips, isLoading: shipsLoading } = useOwnedShips(baseSepolia.id);
  const rosterIdSet = React.useMemo(
    () => new Set(run.rosterShipIds.map((id) => id.toString())),
    [run.rosterShipIds],
  );
  const rosterShips = React.useMemo(
    () => ownedShips.filter((s) => rosterIdSet.has(s.id.toString())),
    [ownedShips, rosterIdSet],
  );

  // No cost-cap check here — the roster was already validated against the
  // run's cost cap when it was assembled (startRun / resupplyModifyRoster);
  // combat entry only needs positioning.
  const fleet = useFleetPlacement({
    ships: rosterShips,
    costLimit: Number.MAX_SAFE_INTEGER,
    costsVersion: null,
    isCreatorSide: true,
  });

  // Pre-select the entire roster on mount (once ships have loaded) — there
  // is no ship-selection step here, only placement.
  React.useEffect(() => {
    if (seededRef.current || rosterShips.length === 0) return;
    seededRef.current = true;
    rosterShips.forEach((s) => fleet.addShip(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterShips]);

  const { data: enemyPlacements } = useGetMapPlacements(targetNode.mapId);
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
  } = useFleetShipAttributes(shipIdsForAttributes, baseSepolia.id);

  const handleLaunch = async () => {
    if (fleet.selectedShips.length === 0 || !fleet.hasMovedShip) return;
    setIsSubmitting(true);
    try {
      const positions = fleet.shipPositions.map((p) => ({ row: p.row, col: p.col }));
      const hash = await enterCombatNode(targetNode.id, positions);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const logs = parseEventLogs({
          abi: CONTRACT_ABIS.ROGUELIKE_MATCH as Abi,
          logs: receipt.logs,
          eventName: "CombatNodeEntered",
        });
        const gameId = (logs[0]?.args as { gameId?: bigint } | undefined)?.gameId;
        if (!gameId) {
          console.error("CombatNodeEntered event not found in receipt", receipt);
        } else {
          await queryClient.invalidateQueries();
          navigateToGame(address, gameId);
        }
      }
      toast.success("Mission launched!");
      onLaunched();
    } catch (error) {
      console.error("Failed to enter combat node:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("CannotAdvance")) {
        toast.error("This node isn't reachable from your current position.");
      } else if (message.includes("NodeAlreadyDefeated")) {
        toast.error("This node has already been cleared and can't be re-fought.");
      } else if (message.includes("WrongNodeKind")) {
        toast.error("This node isn't a combat node.");
      } else if (message.includes("NoAIPlacementsConfigured")) {
        toast.error("This mission has no enemy fleet configured yet.");
      } else if (message.includes("User rejected") || message.includes("User denied")) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Failed to launch mission: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
      mapId={Number(targetNode.mapId)}
      className="w-full h-full"
      chainIdOverride={baseSepolia.id}
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
      shipsLoading={shipsLoading}
      isCreator={true}
      shipListItems={shipListItems}
      mapDisplay={mapDisplay}
      onDropShip={() => {
        // Roster is fixed for combat entry — dropping a ship back onto the
        // list doesn't remove it from the mission, only repositioning
        // (moveShip via the grid) is meaningful here.
      }}
    />
  );
}

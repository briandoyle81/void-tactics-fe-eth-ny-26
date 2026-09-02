"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { AIShipConfig, MapPosition } from "../types/types";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import { useGetMapPlacements, useMaxPlacementsPerMap } from "../hooks/useAIEncountersContract";
import { MapDisplay } from "./MapDisplay";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";
import { FleetShipListPanel, type FleetShipListItemData } from "./FleetShipListPanel";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";

interface WorkingPlacement {
  /** Synthetic, rendering-only id (never sent on-chain — only row/col/configId are) so MapDisplay can key/select each placed ship even when the same config appears more than once on a map. */
  shipId: bigint;
  configId: bigint;
  row: number;
  col: number;
}

// Rendering-only id namespace for placements being edited — distinct from
// real AIShipConfig ids (small numbers) so MapDisplay's ship-id-keyed maps
// never collide. Never sent on-chain: setMapPlacements only takes
// row/col/configId.
const PLACEMENT_ID_BASE = 500_000_000n;

// Extracted from AIEncountersAdminPanel.tsx (where it originally lived as a
// non-exported inner component) so the campaign map editor's node edit
// panels can launch it directly for a Combat node's mapId, without going
// through AIEncountersAdminPanel's own map-list-driven flow. No signature
// changes from the original — same {mapId, configs} props, same self-
// contained modal/drag-drop/save behavior built on MapDisplay/MapDisplayView.
export function MapPlacementsEditor({
  mapId,
  configs,
}: {
  mapId: bigint;
  configs: AIShipConfig[];
}) {
  const { setMapPlacements } = useAIEncountersAdmin();
  const { data: placementsData, refetch } = useGetMapPlacements(mapId);
  const { data: maxPlacementsData } = useMaxPlacementsPerMap();
  const maxPlacementsPerMap = Number(maxPlacementsData ?? 8n);

  const [placements, setPlacements] = useState<WorkingPlacement[]>([]);
  const seededMapIdRef = useRef<bigint | null>(null);
  const nextSyntheticIdRef = useRef(1);
  const freshShipId = () => PLACEMENT_ID_BASE + BigInt(nextSyntheticIdRef.current++);

  const seedFromChain = React.useCallback(() => {
    seededMapIdRef.current = mapId;
    setPlacements(
      (placementsData?.positions ?? []).map((p, i) => ({
        shipId: freshShipId(),
        configId: placementsData!.configIds[i],
        row: p.row,
        col: p.col,
      })),
    );
  }, [mapId, placementsData]);

  useEffect(() => {
    if (!placementsData) return;
    if (seededMapIdRef.current === mapId) return; // don't clobber in-progress edits on unrelated re-renders
    seedFromChain();
  }, [placementsData, mapId, seedFromChain]);

  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [draggedConfigId, setDraggedConfigId] = useState<bigint | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [pendingPlacementShipId, setPendingPlacementShipId] = useState<bigint | null>(null);
  const [armedConfigId, setArmedConfigId] = useState<bigint | null>(null);
  const pendingConfigForIdRef = useRef(new Map<string, bigint>());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const configById = useMemo(() => {
    const map = new Map<string, AIShipConfig>();
    configs.forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [configs]);

  const handleMove = (shipId: bigint, row: number, col: number) => {
    setPlacements((prev) => {
      const occupiedIdx = prev.findIndex((p) => p.row === row && p.col === col && p.shipId !== shipId);
      const next = occupiedIdx === -1 ? prev : prev.filter((_, i) => i !== occupiedIdx);

      const existingIdx = next.findIndex((p) => p.shipId === shipId);
      if (existingIdx !== -1) {
        return next.map((p) => (p.shipId === shipId ? { ...p, row, col } : p));
      }

      const configId = pendingConfigForIdRef.current.get(shipId.toString()) ?? draggedConfigId;
      pendingConfigForIdRef.current.delete(shipId.toString());
      if (configId == null) return next;
      if (next.length >= maxPlacementsPerMap) {
        toast.error(`This map already has the max ${maxPlacementsPerMap} enemy ships.`);
        return next;
      }
      return [...next, { shipId, configId, row, col }];
    });
    setIsDirty(true);
    setPendingPlacementShipId(null);
    setArmedConfigId(null);
  };

  const armRosterForTapToPlace = (configId: bigint) => {
    const id = freshShipId();
    pendingConfigForIdRef.current.set(id.toString(), configId);
    setPendingPlacementShipId(id);
    setArmedConfigId(configId);
  };

  const handleDrop = (row: number, col: number, e?: React.DragEvent) => {
    let shipIdToMove = draggedShipId;
    if (shipIdToMove == null && draggedConfigId == null && e) {
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
      handleMove(shipIdToMove, row, col);
    } else if (draggedConfigId != null) {
      handleMove(freshShipId(), row, col);
    }
    setDraggedShipId(null);
    setDraggedConfigId(null);
    setDragOverPosition(null);
  };

  const handleRemoveSelected = () => {
    if (selectedShipId == null) return;
    setPlacements((prev) => prev.filter((p) => p.shipId !== selectedShipId));
    setSelectedShipId(null);
    setIsDirty(true);
  };

  const handleReset = () => {
    seedFromChain();
    setSelectedShipId(null);
    setIsDirty(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const positions: MapPosition[] = placements.map((p) => ({ row: p.row, col: p.col }));
      const configIds = placements.map((p) => p.configId);
      const hash = await setMapPlacements(mapId, positions, configIds);
      await refetch();
      setIsDirty(false);
      toast.success(`Enemy fleet placements saved. (tx: ${hash.slice(0, 10)}…)`);
    } catch (error) {
      console.error("Failed to save map placements:", error);
      toast.error("Failed to save placements — see console.");
    } finally {
      setSaving(false);
    }
  };

  const mapShips = useMemo(
    () =>
      placements
        .map((p) => {
          const config = configById.get(p.configId.toString());
          return config ? aiConfigToPreviewShip(config, p.shipId) : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [placements, configById],
  );
  const mapShipPositions = useMemo(
    () => placements.map((p) => ({ shipId: p.shipId, row: p.row, col: p.col })),
    [placements],
  );
  const totalThreat = useMemo(
    () => mapShips.reduce((sum, s) => sum + s.shipData.cost, 0),
    [mapShips],
  );

  const [showEditor, setShowEditor] = useState(false);

  // 50 configs now (25 variant-1 + 25 variant-2, per docs/faction-2.md §8) —
  // a variant filter keeps the roster scannable when placing a fleet for a
  // specific faction.
  const [rosterVariantFilter, setRosterVariantFilter] = useState<"all" | number>("all");
  const filteredConfigs = useMemo(
    () =>
      rosterVariantFilter === "all"
        ? configs
        : configs.filter((c) => c.traits.variant === rosterVariantFilter),
    [configs, rosterVariantFilter],
  );

  const rosterItems: FleetShipListItemData[] = filteredConfigs.map((c) => ({
    key: c.id.toString(),
    canSelect: true,
    isPending: armedConfigId === c.id,
    isTouchDevice: false,
    onDragStart: () => setDraggedConfigId(c.id),
    onDragEnd: () => setDraggedConfigId(null),
    card: (
      <ShipCard
        ship={toShipCardData(aiConfigToPreviewShip(c))}
        shipImage={<ShipImage ship={aiConfigToPreviewShip(c)} className="h-full w-full" showLoadingState={false} />}
        isStarred={false}
        onToggleStar={() => {}}
        isSelected={false}
        onToggleSelection={() => armRosterForTapToPlace(c.id)}
        onRecycleClick={() => {}}
        showInGameProperties={false}
        selectionMode
        hideRecycle
        hideCheckbox
        onCardClick={() => armRosterForTapToPlace(c.id)}
        canSelect
      />
    ),
  }));

  return (
    <div className="space-y-2 border border-gunmetal bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {placements.length}/{maxPlacementsPerMap} ships placed — total threat {totalThreat}
        </span>
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="px-4 py-2 rounded-none font-mono text-xs border border-cyan text-cyan hover:bg-cyan/10"
        >
          [EDIT PLACEMENTS]
        </button>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[400]">
          <div className="bg-near-black border border-cyan rounded-none p-6 w-[100vw] h-[100vh] flex flex-col" style={{ borderRadius: 0 }}>
            <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <h4 className="text-lg font-bold text-cyan whitespace-nowrap">
                  MAP #{mapId.toString()} — ENEMY PLACEMENTS
                </h4>
                <span className="px-3 py-1 text-xs font-bold text-text-secondary bg-steel/40 border border-steel rounded-none whitespace-nowrap">
                  {placements.length}/{maxPlacementsPerMap} placed
                  {placements.length >= maxPlacementsPerMap && " (max)"}
                </span>
                <span className="px-3 py-1 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
                  TOTAL THREAT: {totalThreat}
                </span>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:justify-center">
                <button
                  type="button"
                  disabled={selectedShipId == null}
                  onClick={handleRemoveSelected}
                  className="w-full px-4 py-2 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/20 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  REMOVE SELECTED
                </button>
                <button
                  type="button"
                  disabled={!isDirty || saving}
                  onClick={handleReset}
                  className="w-full px-4 py-2 rounded-none border border-steel text-text-secondary hover:border-text-secondary font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  RESET
                </button>
                <button
                  type="button"
                  disabled={!isDirty || saving}
                  onClick={() => void handleSave()}
                  className="w-full px-4 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  {saving ? "SAVING..." : "SAVE PLACEMENTS"}
                </button>
              </div>

              <div className="flex items-center justify-start gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-3 py-1 text-sm font-bold text-text-muted border border-gunmetal rounded-none hover:text-text-secondary hover:border-steel transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="mb-4 text-xs text-text-muted">
              Drag a ship from the roster onto the highlighted zone, or click one then click a tile. Click a placed ship to select it (drag to move, or use Remove Selected above). Enemy placements are restricted to the map&apos;s joiner columns — the same zone AI ships occupy in a real match.
            </p>

            <div className="flex gap-4 flex-1 min-h-0">
              <div className="w-1/4 flex flex-col gap-2 min-h-0">
                <select
                  value={rosterVariantFilter}
                  onChange={(e) =>
                    setRosterVariantFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                  className="w-full border border-gunmetal bg-black/60 px-2 py-1 text-xs text-cyan"
                >
                  <option value="all">All factions</option>
                  <option value={1}>Faction 1</option>
                  <option value={2}>Faction 2</option>
                </select>
                <FleetShipListPanel widthClass="w-full" items={rosterItems} />
              </div>
              <div className="w-3/4 h-full flex items-center justify-center">
                <MapDisplay
                  mapId={Number(mapId)}
                  className="w-full h-full"
                  showPlayerOverlay
                  isCreator={false}
                  isCreatorViewer={false}
                  showDeployZoneLabel
                  ships={mapShips}
                  shipPositions={mapShipPositions}
                  selectedShipId={selectedShipId}
                  onShipSelect={setSelectedShipId}
                  onShipMove={handleMove}
                  allowSelection
                  selectableShipIds={mapShipPositions.map((p) => p.shipId)}
                  pendingPlacementShipId={pendingPlacementShipId}
                  onDragOver={(row, col, e) => {
                    e.preventDefault();
                    setDragOverPosition({ row, col });
                  }}
                  onDrop={handleDrop}
                  dragOverPosition={dragOverPosition}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

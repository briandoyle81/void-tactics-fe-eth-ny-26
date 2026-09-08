"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { MapDisplayWeb2 } from "./MapDisplayWeb2";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { FleetShipListPanel, type FleetShipListItemData } from "./FleetShipListPanel";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
}

interface WorkingPlacement {
  /** Synthetic, rendering-only id (never sent to the API — only row/col/configId are) so MapDisplayWeb2 can key/select each placed ship even when the same config appears more than once on a map. Mirrors web3's WorkingPlacement/PLACEMENT_ID_BASE scheme. */
  shipId: number;
  configId: number;
  row: number;
  col: number;
}

const PLACEMENT_ID_BASE = 500_000_000;
// Mirrors web3's useMaxPlacementsPerMap() ?? 8n fallback — a soft client-side
// cap on encounter design, not a consensus-critical value.
const MAX_PLACEMENTS_PER_MAP = 8;

// Extracted from AIEncountersAdminPanelWeb2.tsx (where it originally lived
// as a non-exported inner component) so the campaign map editor's node edit
// panels can launch it directly for a Combat node's mapId — mirrors the
// web3 extraction (MapPlacementsEditor.tsx), same {mapId, configs} shape,
// number-native instead of bigint-native. No signature changes from the
// original.
export function MapPlacementsEditorWeb2({
  mapId,
  configs,
}: {
  mapId: number;
  configs: AIShipConfigWeb2[];
}) {
  const queryClient = useQueryClient();
  const { data: placementsData } = useQuery({
    queryKey: ["ai-map-placements", mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/admin/ai-map-placements?mapId=${mapId}`),
  });

  const [placements, setPlacements] = useState<WorkingPlacement[]>([]);
  const seededMapIdRef = useRef<number | null>(null);
  const nextSyntheticIdRef = useRef(1);
  const freshShipId = () => PLACEMENT_ID_BASE + nextSyntheticIdRef.current++;

  const seedFromServer = React.useCallback(() => {
    seededMapIdRef.current = mapId;
    setPlacements(
      (placementsData ?? []).map((p) => ({
        shipId: freshShipId(),
        configId: p.configId,
        row: p.row,
        col: p.col,
      })),
    );
  }, [mapId, placementsData]);

  useEffect(() => {
    if (!placementsData) return;
    if (seededMapIdRef.current === mapId) return;
    seedFromServer();
  }, [placementsData, mapId, seedFromServer]);

  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);
  const [draggedConfigId, setDraggedConfigId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [pendingPlacementShipId, setPendingPlacementShipId] = useState<number | null>(null);
  const [armedConfigId, setArmedConfigId] = useState<number | null>(null);
  const pendingConfigForIdRef = useRef(new Map<number, number>());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const configById = useMemo(() => {
    const map = new Map<number, AIShipConfigWeb2>();
    configs.forEach((c) => map.set(c.id, c));
    return map;
  }, [configs]);

  const handleMove = (shipId: number, row: number, col: number) => {
    setPlacements((prev) => {
      const occupiedIdx = prev.findIndex((p) => p.row === row && p.col === col && p.shipId !== shipId);
      const next = occupiedIdx === -1 ? prev : prev.filter((_, i) => i !== occupiedIdx);

      const existingIdx = next.findIndex((p) => p.shipId === shipId);
      if (existingIdx !== -1) {
        return next.map((p) => (p.shipId === shipId ? { ...p, row, col } : p));
      }

      const configId = pendingConfigForIdRef.current.get(shipId) ?? draggedConfigId;
      pendingConfigForIdRef.current.delete(shipId);
      if (configId == null) return next;
      if (next.length >= MAX_PLACEMENTS_PER_MAP) {
        toast.error(`This map already has the max ${MAX_PLACEMENTS_PER_MAP} enemy ships.`);
        return next;
      }
      return [...next, { shipId, configId, row, col }];
    });
    setIsDirty(true);
    setPendingPlacementShipId(null);
    setArmedConfigId(null);
  };

  const armRosterForTapToPlace = (configId: number) => {
    const id = freshShipId();
    pendingConfigForIdRef.current.set(id, configId);
    setPendingPlacementShipId(id);
    setArmedConfigId(configId);
  };

  const handleDrop = (row: number, col: number, e?: React.DragEvent) => {
    let shipIdToMove = draggedShipId;
    if (shipIdToMove == null && draggedConfigId == null && e) {
      const data = e.dataTransfer.getData("text/plain");
      if (data) {
        const parsed = Number(data);
        if (!Number.isNaN(parsed)) shipIdToMove = parsed;
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
    seedFromServer();
    setSelectedShipId(null);
    setIsDirty(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiMutate("/api/admin/ai-map-placements", "POST", {
        mapId,
        placements: placements.map((p) => ({ row: p.row, col: p.col, configId: p.configId })),
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-map-placements", mapId] });
      setIsDirty(false);
      toast.success("Enemy fleet placements saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save placements");
    } finally {
      setSaving(false);
    }
  };

  const mapShips = useMemo(
    () =>
      placements
        .map((p) => {
          const config = configById.get(p.configId);
          return config ? aiConfigToPreviewShipWeb2(config, p.shipId) : null;
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
        ship={toShipCardDataWeb2(aiConfigToPreviewShipWeb2(c))}
        shipImage={<ShipImageWeb2 ship={aiConfigToPreviewShipWeb2(c)} className="h-full w-full" showLoadingState={false} />}
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
          {placements.length}/{MAX_PLACEMENTS_PER_MAP} ships placed — total threat {totalThreat}
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
                  MAP #{mapId} — ENEMY PLACEMENTS
                </h4>
                <span className="px-3 py-1 text-xs font-bold text-text-secondary bg-steel/40 border border-steel rounded-none whitespace-nowrap">
                  {placements.length}/{MAX_PLACEMENTS_PER_MAP} placed
                  {placements.length >= MAX_PLACEMENTS_PER_MAP && " (max)"}
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
                <MapDisplayWeb2
                  mapId={mapId}
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

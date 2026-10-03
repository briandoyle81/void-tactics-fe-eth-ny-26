"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { MapEditor } from "./MapEditor";
import { MapEditorHeader } from "./MapEditorHeader";
import { MapMode, type MapPosition, type ScoringPosition } from "../types/types";
import { parseZoneTiles } from "../utils/deploymentZone";

export interface MapEditScreenWeb2Map {
  id: number;
  name: string;
  mode: MapMode;
  blockedTiles: MapPosition[];
  impassableTiles: MapPosition[];
  scoringTiles: ScoringPosition[];
  /** Custom deployment zones (empty = default columns). Raw API JSON; parsed below. */
  creatorZone?: unknown;
  joinerZone?: unknown;
}

function Web2MapSaveButton({
  isEditing,
  mapId,
  name,
  mode,
  blockedPositions,
  impassablePositions,
  scoringPositions,
  creatorZonePositions,
  joinerZonePositions,
  validationError,
  onSuccess,
}: {
  creatorZonePositions: MapPosition[];
  joinerZonePositions: MapPosition[];
  isEditing: boolean;
  mapId?: number;
  name: string;
  mode: MapMode;
  blockedPositions: MapPosition[];
  impassablePositions: MapPosition[];
  scoringPositions: ScoringPosition[];
  validationError: string | null;
  onSuccess: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!name.trim()) {
      toast.error("Map name is required");
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing && mapId !== undefined) {
        await apiMutate(`/api/maps/${mapId}`, "PATCH", {
          name,
          blockedTiles: blockedPositions,
          impassableTiles: impassablePositions,
          scoringTiles: scoringPositions,
          creatorZone: creatorZonePositions,
          joinerZone: joinerZonePositions,
        });
      } else {
        await apiMutate("/api/maps", "POST", {
          name,
          mode,
          blockedTiles: blockedPositions,
          impassableTiles: impassablePositions,
          scoringTiles: scoringPositions,
          creatorZone: creatorZonePositions,
          joinerZone: joinerZonePositions,
        });
      }
      toast.success(isEditing ? "Map updated" : "Map created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save map");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
    >
      {isSaving ? "Saving…" : isEditing ? "Update Map" : "Create Map"}
    </button>
  );
}

interface MapEditScreenWeb2Props {
  /** Existing map to edit; omit to create a new map. */
  map?: MapEditScreenWeb2Map;
  /** Called after the map is saved. */
  onSaved: () => void;
  onCancel: () => void;
  /** Called after a mode change is saved (the screen stays open). */
  onMapChanged?: () => void;
}

// The web2 map create/edit screen (name + mode + grid editor + /api/maps
// save), shared by the web2 Maps tab (MapsWeb2.tsx) and the web2 node
// editors' map preview. Web3 counterpart: MapEditScreen.tsx.
export function MapEditScreenWeb2({ map, onSaved, onCancel, onMapChanged }: MapEditScreenWeb2Props) {
  const canEdit = useWeb2Admin();
  const isEditing = map !== undefined;
  const [name, setName] = useState(map?.name ?? "");
  // Mode for a map being created — Both by default, valid for every picker
  // until narrowed deliberately.
  const [createMode, setCreateMode] = useState<MapMode>(MapMode.Both);
  const [editingMode, setEditingMode] = useState<MapMode>(map?.mode ?? MapMode.Both);
  const [modePending, setModePending] = useState(false);
  // Parsed once per mount (the screen is keyed by map id) so MapEditor's
  // zone-loading effect doesn't re-seed and clobber in-progress zone edits.
  const [initialCreatorZone] = useState(() => parseZoneTiles(map?.creatorZone) ?? []);
  const [initialJoinerZone] = useState(() => parseZoneTiles(map?.joinerZone) ?? []);

  const handleReclassifyMode = async (mapId: number, mode: MapMode) => {
    setEditingMode(mode);
    setModePending(true);
    try {
      await apiMutate(`/api/maps/${mapId}`, "PATCH", { mode });
      onMapChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reclassify map mode");
    } finally {
      setModePending(false);
    }
  };

  return (
    <div className="space-y-4 -mx-1 -my-1 px-1 py-1">
      <MapEditorHeader
        title={isEditing ? `Edit Map ${map.id}` : "Create New Map"}
        onBack={onCancel}
        name={name}
        onNameChange={setName}
        nameDisabled={!canEdit}
      />
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-3 border border-gunmetal bg-black/40 p-3 font-mono text-sm">
          <span className="text-xs uppercase tracking-wider text-cyan">Mode</span>
          <select
            value={editingMode}
            disabled={modePending}
            onChange={(e) => void handleReclassifyMode(map.id, Number(e.target.value) as MapMode)}
            className="px-2 py-1 bg-near-black border text-cyan focus:outline-none disabled:opacity-50"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          >
            <option value={MapMode.PvP}>PvP</option>
            <option value={MapMode.PvE}>PvE</option>
            <option value={MapMode.Both}>Both</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border border-gunmetal bg-black/40 p-3 font-mono text-sm">
          <span className="text-xs uppercase tracking-wider text-cyan">Mode</span>
          <select
            value={createMode}
            onChange={(e) => setCreateMode(Number(e.target.value) as MapMode)}
            className="px-2 py-1 bg-near-black border text-cyan focus:outline-none"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          >
            <option value={MapMode.PvP}>PvP</option>
            <option value={MapMode.PvE}>PvE</option>
            <option value={MapMode.Both}>Both</option>
          </select>
          <span className="text-xs text-text-muted">
            PvP lobbies reject PvE-only maps; campaign nodes reject PvP-only maps.
          </span>
        </div>
      )}
      <MapEditor
        mapId={map?.id}
        initialBlockedPositions={map?.blockedTiles}
        initialImpassablePositions={map?.impassableTiles}
        initialScoringPositions={map?.scoringTiles}
        initialCreatorZonePositions={initialCreatorZone}
        initialJoinerZonePositions={initialJoinerZone}
        zoneEditing="editable"
        onSaveSuccess={onSaved}
        onCancel={onCancel}
        canEdit={canEdit}
        renderSaveButton={({
          blockedPositions,
          impassablePositions,
          scoringPositions,
          creatorZonePositions,
          joinerZonePositions,
          validationError,
          onSuccess,
        }) => (
          <Web2MapSaveButton
            creatorZonePositions={creatorZonePositions}
            joinerZonePositions={joinerZonePositions}
            isEditing={isEditing}
            mapId={map?.id}
            name={name}
            mode={createMode}
            blockedPositions={blockedPositions}
            impassablePositions={impassablePositions}
            scoringPositions={scoringPositions}
            validationError={validationError}
            onSuccess={onSuccess}
          />
        )}
      />
    </div>
  );
}

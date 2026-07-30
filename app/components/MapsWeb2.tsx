"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { MapEditor } from "./MapEditor";
import { MapEditorHeader } from "./MapEditorHeader";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapsListShell } from "./MapsListShell";
import { MapPosition, ScoringPosition } from "../types/types";
import { AIEncountersAdminPanelWeb2 } from "./AIEncountersAdminPanelWeb2";

interface Web2Map {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  blockedTiles: MapPosition[];
  scoringTiles: ScoringPosition[];
}

// Web2-mode counterpart to `Maps.tsx` — same layout, list/preview cards, and
// grid editor (shared via `MapEditor.tsx`'s data-source-agnostic props), but
// backed by `Map` rows in Postgres via `/api/maps` instead of the Maps
// contract, and gated on `useWeb2Admin()` (WEB2_ADMIN_EMAILS) instead of
// `MAP_ADMIN_ADDRESS`.
function Web2MapSaveButton({
  isEditing,
  mapId,
  name,
  blockedPositions,
  scoringPositions,
  validationError,
  onSuccess,
}: {
  isEditing: boolean;
  mapId?: number;
  name: string;
  blockedPositions: MapPosition[];
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
          scoringTiles: scoringPositions,
        });
      } else {
        await apiMutate("/api/maps", "POST", {
          name,
          blockedTiles: blockedPositions,
          scoringTiles: scoringPositions,
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

export default function MapsWeb2() {
  const canCreateMaps = useWeb2Admin();
  const { data: maps = [], refetch } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2Map[]>("/api/maps"),
  });
  const [showEditor, setShowEditor] = useState(false);
  const [editingMapId, setEditingMapId] = useState<number | undefined>(
    undefined,
  );
  const [editingName, setEditingName] = useState("");

  const editingMap = useMemo(
    () => maps.find((m) => m.id === editingMapId),
    [maps, editingMapId],
  );

  const handleCreateMap = () => {
    setEditingMapId(undefined);
    setEditingName("");
    setShowEditor(true);
  };

  const handleEditMap = (map: Web2Map) => {
    if (!canCreateMaps) {
      toast.error("You are not authorized to edit maps.");
      return;
    }
    setEditingMapId(map.id);
    setEditingName(map.name);
    setShowEditor(true);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
    refetch();
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
  };

  if (showEditor) {
    return (
      <div className="space-y-4 -mx-1 -my-1 px-1 py-1">
        <MapEditorHeader
          title={editingMapId ? `Edit Map ${editingMapId}` : "Create New Map"}
          onBack={handleEditorCancel}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Name:</label>
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            disabled={!canCreateMaps}
            className="w-64 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none disabled:opacity-50"
          />
        </div>
        <MapEditor
          mapId={editingMapId}
          initialBlockedPositions={editingMap?.blockedTiles}
          initialScoringPositions={editingMap?.scoringTiles}
          onSaveSuccess={handleEditorSave}
          onCancel={handleEditorCancel}
          canEdit={canCreateMaps}
          renderSaveButton={({
            blockedPositions,
            scoringPositions,
            validationError,
            onSuccess,
          }) => (
            <Web2MapSaveButton
              isEditing={editingMapId !== undefined}
              mapId={editingMapId}
              name={editingName}
              blockedPositions={blockedPositions}
              scoringPositions={scoringPositions}
              validationError={validationError}
              onSuccess={onSuccess}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MapsListShell
        canCreateMaps={canCreateMaps}
        onCreateMap={handleCreateMap}
        totalMaps={maps.length}
        restrictedMessage="[!] Map creation is currently restricted to authorized accounts only"
        isEmpty={maps.length === 0}
      >
        {maps.map((map) => (
          <MapPreviewCard
            key={map.id}
            map={{
              id: map.id,
              titleLabel: `Map #${map.id} — ${map.name}`,
              blockedPositions: map.blockedTiles,
              scoringPositions: map.scoringTiles,
            }}
            onEdit={() => handleEditMap(map)}
          />
        ))}
      </MapsListShell>
      <AIEncountersAdminPanelWeb2 mapIds={maps.map((m) => m.id)} />
    </div>
  );
}

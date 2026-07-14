"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { MapEditor } from "./MapEditor";
import { MapPosition, ScoringPosition, GRID_DIMENSIONS } from "../types/types";

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
        <div className="flex items-center gap-4">
          <button
            onClick={handleEditorCancel}
            className="px-4 py-2 bg-steel text-text-primary rounded-none font-mono hover:bg-gunmetal"
          >
            ← Back to Maps
          </button>
          <h2 className="text-xl font-mono text-white">
            {editingMapId ? `Edit Map ${editingMapId}` : "Create New Map"}
          </h2>
        </div>
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
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono text-white">Maps</h1>
        {canCreateMaps ? (
          <button
            onClick={handleCreateMap}
            className="px-4 py-2 border border-phosphor-green text-phosphor-green rounded-none font-mono hover:bg-phosphor-green/10"
          >
            Create New Map
          </button>
        ) : (
          <div className="px-4 py-2 bg-steel text-text-muted rounded-none font-mono cursor-not-allowed">
            Create New Map (Restricted)
          </div>
        )}
      </div>

      <div className="text-sm text-text-muted">
        Total maps: {maps.length}
        {!canCreateMaps && (
          <div className="mt-2 text-amber">
            [!] Map creation is currently restricted to authorized accounts only
          </div>
        )}
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>No maps found. Create your first map to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-steel rounded-none p-4 border border-gunmetal"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-mono text-white">
                  Map #{map.id} — {map.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMap(map)}
                    className="px-3 py-1 border border-cyan text-cyan rounded-none text-sm font-mono hover:bg-cyan/10"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple border border-gunmetal"></div>
                  <span>Blocked tiles: {map.blockedTiles.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-phosphor-green border border-gunmetal"></div>
                  <span>Scoring tiles: {map.scoringTiles.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber border border-gunmetal"></div>
                  <span>
                    Once-only tiles:{" "}
                    {map.scoringTiles.filter((p) => p.onlyOnce).length}
                  </span>
                </div>
              </div>

              {/* Mini preview */}
              <div className="mt-3 p-2 bg-near-black rounded-none">
                <div className="text-xs text-text-muted mb-1">
                  Preview ({GRID_DIMENSIONS.WIDTH}x{GRID_DIMENSIONS.HEIGHT}):
                </div>
                <div
                  className="grid gap-px w-full"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_DIMENSIONS.WIDTH}, 1fr)`,
                  }}
                >
                  {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) =>
                    Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
                      const isBlocked = map.blockedTiles.some(
                        (p) => p.row === row && p.col === col,
                      );
                      const scoringPos = map.scoringTiles.find(
                        (p) => p.row === row && p.col === col,
                      );
                      const isScoring = scoringPos !== undefined;
                      const isOnlyOnce = scoringPos?.onlyOnce || false;

                      let className = "aspect-square border border-gunmetal";
                      if (isBlocked && isScoring) {
                        className += " bg-warning-red";
                      } else if (isBlocked) {
                        className += " bg-purple";
                      } else if (isScoring) {
                        className += isOnlyOnce
                          ? " bg-amber"
                          : " bg-phosphor-green";
                      } else {
                        className += " bg-near-black";
                      }

                      return (
                        <div key={`${row}-${col}`} className={className} />
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGetAllPresetMaps, useMapCount } from "../hooks/useMapsContract";
import { MapEditor } from "./MapEditor";
import { PresetMap, GRID_DIMENSIONS } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";
import { MAP_ADMIN_EMAILS } from "../config/alpha";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function Maps() {
  const { email } = useCurrentUser();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: mapCount } = useMapCount();
  const [showEditor, setShowEditor] = useState(false);
  const [editingMapId, setEditingMapId] = useState<number | undefined>(
    undefined
  );

  const maps: PresetMap[] = allMapsData;

  const canCreateMaps = !!email && MAP_ADMIN_EMAILS.includes(email);

  useEffect(() => {
    const onChainChanged = () => {
      setShowEditor(false);
      setEditingMapId(undefined);
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    };
  }, []);

  const handleCreateMap = () => {
    setEditingMapId(undefined);
    setShowEditor(true);
  };

  const handleEditMap = (mapId: number) => {
    // Check if user is authorized to edit maps
    if (!canCreateMaps) {
      alert(
        "You are not authorized to edit maps. Only authorized addresses can edit maps."
      );
      return;
    }
    setEditingMapId(mapId);
    setShowEditor(true);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
    // Refresh maps list
    window.location.reload();
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
        <MapEditor
          mapId={editingMapId}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          canEdit={canCreateMaps}
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
        Total maps: {mapCount ?? 0}
        {!canCreateMaps && (
          <div className="mt-2 text-amber">
            [!] Map creation is currently restricted to authorized addresses only
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
                <h3 className="text-lg font-mono text-white">Map #{map.id}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMap(map.id)}
                    className="px-3 py-1 border border-cyan text-cyan rounded-none text-sm font-mono hover:bg-cyan/10"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple border border-gunmetal"></div>
                  <span>Blocked tiles: {map.blockedPositions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-phosphor-green border border-gunmetal"></div>
                  <span>Scoring tiles: {map.scoringPositions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber border border-gunmetal"></div>
                  <span>
                    Once-only tiles:{" "}
                    {map.scoringPositions.filter((p) => p.onlyOnce).length}
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
                      const isBlocked = map.blockedPositions.some(
                        (p) => p.row === row && p.col === col
                      );
                      const scoringPos = map.scoringPositions.find(
                        (p) => p.row === row && p.col === col
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
                    })
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

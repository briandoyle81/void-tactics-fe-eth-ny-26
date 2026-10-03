"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { MapEditScreenWeb2 } from "./MapEditScreenWeb2";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapsListShell } from "./MapsListShell";
import { MapPosition, ScoringPosition, MapMode } from "../types/types";
import { AIEncountersAdminPanelWeb2 } from "./AIEncountersAdminPanelWeb2";
import { LobbyAdminPanelWeb2 } from "./LobbyAdminPanelWeb2";
import { GameAdminPanelWeb2 } from "./GameAdminPanelWeb2";
import { PvPMatchAdminPanelWeb2 } from "./PvPMatchAdminPanelWeb2";
import { AdminSettingsExportWeb2 } from "./AdminSettingsExportWeb2";
import { parseZoneTiles } from "../utils/deploymentZone";

interface Web2Map {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  blockedTiles: MapPosition[];
  impassableTiles: MapPosition[];
  scoringTiles: ScoringPosition[];
  creatorZone?: unknown;
  joinerZone?: unknown;
  mode: MapMode;
}

// Web2-mode counterpart to `Maps.tsx` — same layout, list/preview cards, and
// grid editor (shared via `MapEditor.tsx`'s data-source-agnostic props), but
// backed by `Map` rows in Postgres via `/api/maps` instead of the Maps
// contract, and gated on `useWeb2Admin()` (WEB2_ADMIN_EMAILS) instead of
// `MAP_ADMIN_ADDRESS`.
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

  const editingMap = useMemo(
    () => maps.find((m) => m.id === editingMapId),
    [maps, editingMapId],
  );

  const handleCreateMap = () => {
    setEditingMapId(undefined);
    setShowEditor(true);
  };

  const handleEditMap = (map: Web2Map) => {
    if (!canCreateMaps) {
      toast.error("You are not authorized to edit maps.");
      return;
    }
    setEditingMapId(map.id);
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
      <MapEditScreenWeb2
        key={editingMapId ?? "new"}
        map={editingMap}
        onSaved={handleEditorSave}
        onCancel={handleEditorCancel}
        onMapChanged={() => void refetch()}
      />
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
              impassablePositions: map.impassableTiles,
              creatorZonePositions: parseZoneTiles(map.creatorZone) ?? [],
              joinerZonePositions: parseZoneTiles(map.joinerZone) ?? [],
            }}
            modeLabel={MapMode[map.mode]}
            onEdit={canCreateMaps ? () => handleEditMap(map) : undefined}
          />
        ))}
      </MapsListShell>
      <AIEncountersAdminPanelWeb2
        mapIds={maps.filter((m) => m.mode !== MapMode.PvP).map((m) => m.id)}
      />
      <LobbyAdminPanelWeb2 />
      <GameAdminPanelWeb2 />
      <PvPMatchAdminPanelWeb2 />
      <AdminSettingsExportWeb2 maps={maps} />
    </div>
  );
}

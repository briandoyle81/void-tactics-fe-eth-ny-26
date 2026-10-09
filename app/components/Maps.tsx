"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAllPresetMaps,
  useMapCount,
  useMapModes,
  useMapNames,
  mapTitleLabel,
  useMapsImpassablePositions,
  useMapsCreatorZonePositions,
  useMapsJoinerZonePositions,
  useMapsContract,
} from "../hooks/useMapsContract";
import { MapEditScreen } from "./MapEditScreen";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapsListShell } from "./MapsListShell";
import { PresetMap, MapMode } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";

export default function Maps() {
  const { address } = useAccount();
  const { data: allMapsData, refetch: refetchMaps } = useGetAllPresetMaps();
  const { data: mapCount, refetch: refetchMapCount } = useMapCount();
  const queryClient = useQueryClient();
  const { address: mapsAddress } = useMapsContract();
  const [showEditor, setShowEditor] = useState(false);
  const [editingMapId, setEditingMapId] = useState<number | undefined>(
    undefined
  );

  const maps = useMemo((): PresetMap[] => {
    if (!allMapsData || !Array.isArray(allMapsData) || allMapsData.length !== 3) {
      return [];
    }
    const [mapIds, blockedPositionsArray, scoringPositionsArray] = allMapsData;
    return mapIds.map((mapId: bigint, index: number) => ({
      id: Number(mapId),
      blockedPositions: blockedPositionsArray[index] || [],
      scoringPositions: scoringPositionsArray[index] || [],
    }));
  }, [allMapsData]);

  const { modeByMapId } = useMapModes(maps.map((m) => m.id));
  const { nameByMapId } = useMapNames(maps.map((m) => m.id));
  const { impassableByMapId } = useMapsImpassablePositions(maps.map((m) => m.id));
  const { creatorZoneByMapId } = useMapsCreatorZonePositions(maps.map((m) => m.id));
  const { joinerZoneByMapId } = useMapsJoinerZonePositions(maps.map((m) => m.id));

  const canCreateMaps =
    address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase();

  const editingMap = useMemo(
    () => maps.find((m) => m.id === editingMapId),
    [maps, editingMapId],
  );

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
    // Refetch every Maps contract read (list, modes, impassable tiles,
    // zones). Was a full page reload, which dropped the wallet session for
    // a while and showed the Ops Console as signed out.
    const mapsKey = mapsAddress.toLowerCase();
    void queryClient.invalidateQueries({
      predicate: (query) =>
        JSON.stringify(query.queryKey, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
          .toLowerCase()
          .includes(mapsKey),
    });
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
  };

  if (showEditor) {
    return (
      <MapEditScreen
        mapId={editingMapId}
        initialBlockedPositions={editingMap?.blockedPositions}
        initialScoringPositions={editingMap?.scoringPositions}
        onSaved={() => {
          void refetchMaps();
          void refetchMapCount();
          handleEditorSave();
        }}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <MapsListShell
        canCreateMaps={canCreateMaps}
        onCreateMap={handleCreateMap}
        totalMaps={mapCount ? Number(mapCount) : 0}
        restrictedMessage="[!] Map creation is currently restricted to authorized addresses only"
        isEmpty={maps.length === 0}
      >
        {maps.map((map) => (
          <MapPreviewCard
            key={map.id}
            map={{
              id: map.id,
              titleLabel: mapTitleLabel(map.id, nameByMapId),
              blockedPositions: map.blockedPositions,
              scoringPositions: map.scoringPositions,
              impassablePositions: impassableByMapId.get(map.id),
              creatorZonePositions: creatorZoneByMapId.get(map.id),
              joinerZonePositions: joinerZoneByMapId.get(map.id),
            }}
            modeLabel={MapMode[modeByMapId.get(map.id) ?? MapMode.Both]}
            onEdit={canCreateMaps ? () => handleEditMap(map.id) : undefined}
          />
        ))}
      </MapsListShell>
    </div>
  );
}

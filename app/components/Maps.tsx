"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import {
  useGetAllPresetMaps,
  useMapCount,
  useMapsContract,
} from "../hooks/useMapsContract";
import { MapEditor } from "./MapEditor";
import { MapEditorHeader } from "./MapEditorHeader";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapsListShell } from "./MapsListShell";
import { TransactionButton } from "./TransactionButton";
import { PresetMap } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";

export default function Maps() {
  const { address } = useAccount();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: mapCount } = useMapCount();
  const mapsContract = useMapsContract();
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
        <MapEditorHeader
          title={editingMapId ? `Edit Map ${editingMapId}` : "Create New Map"}
          onBack={handleEditorCancel}
        />
        <MapEditor
          mapId={editingMapId}
          initialBlockedPositions={editingMap?.blockedPositions}
          initialScoringPositions={editingMap?.scoringPositions}
          onSaveSuccess={handleEditorSave}
          onCancel={handleEditorCancel}
          canEdit={canCreateMaps}
          renderSaveButton={({
            blockedPositions,
            scoringPositions,
            validationError,
            onSuccess,
          }) => (
            <TransactionButton
              transactionId={`map-${editingMapId ? "update" : "create"}-${
                editingMapId ?? "new"
              }`}
              contractAddress={mapsContract.address}
              abi={mapsContract.abi}
              functionName={editingMapId ? "updatePresetMap" : "createPresetMap"}
              args={
                editingMapId
                  ? [BigInt(editingMapId), blockedPositions, scoringPositions]
                  : [blockedPositions, scoringPositions]
              }
              onSuccess={onSuccess}
              validateBeforeTransaction={() => validationError ?? true}
              className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
            >
              {editingMapId ? "Update Map" : "Create Map"}
            </TransactionButton>
          )}
        />
      </div>
    );
  }

  return (
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
            titleLabel: `Map #${map.id}`,
            blockedPositions: map.blockedPositions,
            scoringPositions: map.scoringPositions,
          }}
          onEdit={() => handleEditMap(map.id)}
        />
      ))}
    </MapsListShell>
  );
}

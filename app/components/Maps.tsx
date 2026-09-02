"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useWriteContract } from "wagmi";
import {
  useGetAllPresetMaps,
  useMapCount,
  useMapsContract,
  useMapModes,
} from "../hooks/useMapsContract";
import { MapEditor } from "./MapEditor";
import { MapEditorHeader } from "./MapEditorHeader";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapsListShell } from "./MapsListShell";
import { TransactionButton } from "./TransactionButton";
import { PresetMap, MapMode } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";
import { AIEncountersAdminPanel } from "./AIEncountersAdminPanel";
import { LobbyAdminPanel } from "./LobbyAdminPanel";
import { AdminSettingsExport } from "./AdminSettingsExport";

export default function Maps() {
  const { address } = useAccount();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: mapCount } = useMapCount();
  const mapsContract = useMapsContract();
  const mapsWrite = useWriteContract();
  const [showEditor, setShowEditor] = useState(false);
  const [editingMapId, setEditingMapId] = useState<number | undefined>(
    undefined
  );
  // Mode for a map being created — Both by default, since that's valid for
  // every picker (PvP lobbies and campaign nodes alike) until the admin
  // narrows it deliberately.
  const [createMode, setCreateMode] = useState<MapMode>(MapMode.Both);

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
    setCreateMode(MapMode.Both);
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
        {editingMapId ? (
          <div className="flex flex-wrap items-center gap-3 border border-gunmetal bg-black/40 p-3 font-mono text-sm">
            <span className="text-xs uppercase tracking-wider text-cyan">Mode</span>
            <select
              value={modeByMapId.get(editingMapId) ?? MapMode.Both}
              onChange={(e) => {
                const mode = Number(e.target.value) as MapMode;
                // Fire-and-forget reclassify — separate write from the
                // blocked/scoring tile save below, since setMapMode takes
                // no tile data.
                void (async () => {
                  try {
                    await mapsWrite.writeContractAsync({
                      address: mapsContract.address,
                      abi: mapsContract.abi,
                      functionName: "setMapMode",
                      args: [BigInt(editingMapId), mode],
                    });
                  } catch (error) {
                    console.error("Failed to reclassify map mode:", error);
                  }
                })();
              }}
              className="px-2 py-1 bg-near-black border text-cyan focus:outline-none"
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
                  : [blockedPositions, scoringPositions, createMode]
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
              titleLabel: `Map #${map.id}`,
              blockedPositions: map.blockedPositions,
              scoringPositions: map.scoringPositions,
            }}
            modeLabel={MapMode[modeByMapId.get(map.id) ?? MapMode.Both]}
            onEdit={() => handleEditMap(map.id)}
          />
        ))}
      </MapsListShell>
      <AIEncountersAdminPanel
        mapIds={maps
          .filter((m) => (modeByMapId.get(m.id) ?? MapMode.Both) !== MapMode.PvP)
          .map((m) => m.id)}
      />
      <LobbyAdminPanel />
      <AdminSettingsExport maps={maps} />
    </div>
  );
}

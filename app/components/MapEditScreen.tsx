"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  useCreatorZonePositions,
  useGetPresetMapImpassable,
  useJoinerZonePositions,
  useMapModes,
  useMapNames,
  useMapsContract,
} from "../hooks/useMapsContract";
import { MapEditor } from "./MapEditor";
import { MapEditorHeader } from "./MapEditorHeader";
import { MapMode, type MapPosition, type ScoringPosition } from "../types/types";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";

interface MapEditScreenProps {
  /** Existing map to edit; omit to create a new map. */
  mapId?: number;
  initialBlockedPositions?: MapPosition[];
  initialScoringPositions?: ScoringPosition[];
  /** Called after the map is saved on chain. */
  onSaved: () => void;
  onCancel: () => void;
}

// The web3 map create/edit screen (mode selector + grid editor + on-chain
// save), shared by the Maps tab (Maps.tsx) and the campaign/roguelike node
// editors' map preview. Web2 counterpart: MapEditScreenWeb2.tsx.
export function MapEditScreen({
  mapId,
  initialBlockedPositions,
  initialScoringPositions,
  onSaved,
  onCancel,
}: MapEditScreenProps) {
  const { address } = useAccount();
  const canEdit = address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase();
  const mapsContract = useMapsContract();
  const mapsWrite = useWriteContract();
  const isEditing = mapId !== undefined;
  // Mode for a map being created — Both by default, since that's valid for
  // every picker (PvP lobbies and campaign nodes alike) until the admin
  // narrows it deliberately.
  const [createMode, setCreateMode] = useState<MapMode>(MapMode.Both);
  const editorMapIds = useMemo(() => (isEditing ? [mapId] : []), [isEditing, mapId]);
  const { modeByMapId } = useMapModes(editorMapIds);
  // Names aren't on chain and aren't edited here: they ship in
  // app/data/content/mapNames.ts (edit that file to rename a map).
  const { nameByMapId } = useMapNames(editorMapIds);
  const name = isEditing ? (nameByMapId.get(mapId) ?? "") : "";
  const { data: impassableData } = useGetPresetMapImpassable(mapId ?? 0);
  const initialImpassablePositions = Array.isArray(impassableData)
    ? (impassableData as MapPosition[])
    : undefined;
  const { data: creatorZoneData } = useCreatorZonePositions(mapId ?? 0);
  const { data: joinerZoneData } = useJoinerZonePositions(mapId ?? 0);
  const initialCreatorZonePositions = Array.isArray(creatorZoneData)
    ? (creatorZoneData as MapPosition[])
    : undefined;
  const initialJoinerZonePositions = Array.isArray(joinerZoneData)
    ? (joinerZoneData as MapPosition[])
    : undefined;

  return (
    <div className="space-y-4 -mx-1 -my-1 px-1 py-1">
      <MapEditorHeader
        title={isEditing ? `Edit Map ${mapId}${name ? ` — ${name}` : ""}` : "Create New Map"}
        onBack={onCancel}
      />
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-3 border border-gunmetal bg-black/40 p-3 font-mono text-sm">
          <span className="text-xs uppercase tracking-wider text-cyan">Mode</span>
          <select
            value={modeByMapId.get(mapId) ?? MapMode.Both}
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
                    args: [BigInt(mapId), mode],
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
        mapName={name}
        mapId={mapId}
        initialBlockedPositions={initialBlockedPositions}
        initialImpassablePositions={initialImpassablePositions}
        initialCreatorZonePositions={initialCreatorZonePositions}
        initialJoinerZonePositions={initialJoinerZonePositions}
        zoneEditing={isEditing ? "editable" : "saveFirst"}
        initialScoringPositions={initialScoringPositions}
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
          <Web3MapSaveButton
            creatorZonePositions={creatorZonePositions}
            joinerZonePositions={joinerZonePositions}
            initialCreatorZonePositions={initialCreatorZonePositions ?? []}
            initialJoinerZonePositions={initialJoinerZonePositions ?? []}
            mapId={mapId}
            createMode={createMode}
            blockedPositions={blockedPositions}
            impassablePositions={impassablePositions}
            scoringPositions={scoringPositions}
            initialBlockedPositions={initialBlockedPositions ?? []}
            initialImpassablePositions={initialImpassablePositions ?? []}
            initialScoringPositions={initialScoringPositions ?? []}
            validationError={validationError}
            onSuccess={onSuccess}
          />
        )}
      />
    </div>
  );
}

const posKey = (p: { row: number; col: number }) => `${Number(p.row)},${Number(p.col)}`;
const sameTiles = (a: { row: number; col: number }[], b: { row: number; col: number }[]) =>
  a.length === b.length && a.map(posKey).sort().join("|") === b.map(posKey).sort().join("|");
const scoringKey = (p: ScoringPosition) => `${posKey(p)}:${Number(p.points)}:${p.onlyOnce}`;
const sameScoring = (a: ScoringPosition[], b: ScoringPosition[]) =>
  a.length === b.length && a.map(scoringKey).sort().join("|") === b.map(scoringKey).sort().join("|");

// Creating a map is one createFullPresetMap call. Editing sends only what
// changed: updatePresetMap for blocked + scoring tiles,
// updatePresetMapImpassable for impassable tiles, setCreatorZone /
// setJoinerZone for deployment zones. Names aren't on chain or edited here
// (app/data/content/mapNames.ts).
function Web3MapSaveButton({
  mapId,
  createMode,
  blockedPositions,
  impassablePositions,
  scoringPositions,
  initialBlockedPositions,
  initialImpassablePositions,
  initialScoringPositions,
  creatorZonePositions,
  joinerZonePositions,
  initialCreatorZonePositions,
  initialJoinerZonePositions,
  validationError,
  onSuccess,
}: {
  mapId?: number;
  createMode: MapMode;
  blockedPositions: MapPosition[];
  impassablePositions: MapPosition[];
  scoringPositions: ScoringPosition[];
  initialBlockedPositions: MapPosition[];
  initialImpassablePositions: MapPosition[];
  initialScoringPositions: ScoringPosition[];
  creatorZonePositions: MapPosition[];
  joinerZonePositions: MapPosition[];
  initialCreatorZonePositions: MapPosition[];
  initialJoinerZonePositions: MapPosition[];
  validationError: string | null;
  onSuccess: () => void;
}) {
  const mapsContract = useMapsContract();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = mapId !== undefined;

  const send = async (functionName: string, args: readonly unknown[]) => {
    const hash = await writeContractAsync({
      address: mapsContract.address,
      abi: mapsContract.abi,
      chainId: mapsContract.chainId,
      functionName,
      args,
    } as Parameters<typeof writeContractAsync>[0]);
    await publicClient!.waitForTransactionReceipt({ hash });
  };

  const handleClick = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsSaving(true);
    try {
      if (!isEditing) {
        await send("createFullPresetMap", [
          blockedPositions,
          impassablePositions,
          scoringPositions,
          createMode,
        ]);
        toast.success("Map created");
      } else {
        const tilesChanged =
          !sameTiles(blockedPositions, initialBlockedPositions) ||
          !sameScoring(scoringPositions, initialScoringPositions);
        const impassableChanged = !sameTiles(impassablePositions, initialImpassablePositions);
        const creatorZoneChanged = !sameTiles(creatorZonePositions, initialCreatorZonePositions);
        const joinerZoneChanged = !sameTiles(joinerZonePositions, initialJoinerZonePositions);
        if (
          !tilesChanged &&
          !impassableChanged &&
          !creatorZoneChanged &&
          !joinerZoneChanged
        ) {
          toast("No changes to save");
          return;
        }
        if (tilesChanged) {
          await send("updatePresetMap", [BigInt(mapId), blockedPositions, scoringPositions]);
        }
        if (impassableChanged) {
          await send("updatePresetMapImpassable", [BigInt(mapId), impassablePositions]);
        }
        if (creatorZoneChanged) {
          await send("setCreatorZone", [BigInt(mapId), creatorZonePositions]);
        }
        if (joinerZoneChanged) {
          await send("setJoinerZone", [BigInt(mapId), joinerZonePositions]);
        }
        toast.success("Map updated");
      }
      onSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(
        message.includes("User rejected") || message.includes("User denied")
          ? "Transaction declined"
          : `Failed to save map: ${message}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSaving}
        className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
      >
        {isSaving ? "Saving…" : isEditing ? "Update Map" : "Create Map"}
      </button>
      <p className="max-w-[16rem] text-xs text-text-muted">
        Saving can take multiple transactions. Confirm each one.
      </p>
    </div>
  );
}

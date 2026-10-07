"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import type { AIShipConfig } from "../types/types";
import {
  AIShipConfigEditor,
  type AIShipConfigFormValues,
  type AIShipConfigSummary,
} from "./AIShipConfigEditor";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import { useGetAllAIShipConfigs } from "../hooks/useAIEncountersContract";
import { useMapNames, mapTitleLabel } from "../hooks/useMapsContract";
import { MapPlacementsEditor } from "./MapPlacementsEditor";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

interface Props {
  mapIds: number[];
}

function toConfigSummary(c: AIShipConfig): AIShipConfigSummary {
  return {
    id: c.id.toString(),
    values: {
      name: c.name,
      mainWeapon: Number(c.equipment.mainWeapon),
      armor: Number(c.equipment.armor),
      shields: Number(c.equipment.shields),
      special: Number(c.equipment.special),
      variant: Number(c.traits.variant),
      accuracy: Number(c.traits.accuracy),
      hull: Number(c.traits.hull),
      speed: Number(c.traits.speed),
      archetype: c.archetype,
    },
  };
}

/** Gated on AIEncounters.isEncounterEditor — separate permission domain from MAP_ADMIN_ADDRESS. */
export function AIEncountersAdminPanel({ mapIds }: Props) {
  const { isEditor, isLoading } = useIsEncounterEditor();
  const admin = useAIEncountersAdmin();
  const { data: configs, refetch: refetchConfigs } = useGetAllAIShipConfigs();
  const { nameByMapId } = useMapNames(mapIds);
  const [selectedMapId, setSelectedMapId] = useState<number | undefined>(mapIds[0]);
  const [editorAddress, setEditorAddress] = useState("");
  const [editorPending, setEditorPending] = useState(false);

  // mapIds is [] on first render (useGetAllPresetMaps hasn't resolved yet in
  // the caller) — useState(mapIds[0]) only reads that initial value once, so
  // without this, selectedMapId stays stuck at undefined forever once the
  // real map list arrives.
  useEffect(() => {
    if (selectedMapId == null && mapIds.length > 0) {
      setSelectedMapId(mapIds[0]);
    }
  }, [mapIds, selectedMapId]);

  const configList = useMemo(() => configs ?? [], [configs]);
  const configSummaries = useMemo(() => configList.map(toConfigSummary), [configList]);

  if (isLoading || !isEditor) return null;

  const handleCreateConfig = async (v: AIShipConfigFormValues) => {
    try {
      await admin.createAIShipConfig(
        v.name,
        { mainWeapon: v.mainWeapon, armor: v.armor, shields: v.shields, special: v.special },
        {
          serialNumber: 0n,
          colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0, h3: 0, s3: 0, l3: 0 },
          variant: v.variant,
          accuracy: v.accuracy,
          hull: v.hull,
          speed: v.speed,
        },
        v.archetype,
      );
      await refetchConfigs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create AI ship config");
      throw error;
    }
  };

  const handleUpdateConfig = async (id: string, v: AIShipConfigFormValues) => {
    const existing = configList.find((c) => c.id.toString() === id);
    if (!existing) return;
    try {
      await admin.updateAIShipConfig(
        existing.id,
        v.name,
        { mainWeapon: v.mainWeapon, armor: v.armor, shields: v.shields, special: v.special },
        // Keep the config's serial number and colors; only the form's fields change.
        { ...existing.traits, variant: v.variant, accuracy: v.accuracy, hull: v.hull, speed: v.speed },
        v.archetype,
      );
      await refetchConfigs();
      toast.success("Ship config saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI ship config");
      throw error;
    }
  };

  const handleSetEditor = async (allowed: boolean) => {
    const addr = editorAddress.trim();
    if (!addr.startsWith("0x")) return;
    setEditorPending(true);
    try {
      await admin.setEncounterEditor(addr as `0x${string}`, allowed);
      setEditorAddress("");
    } catch (error) {
      console.error("Failed to update encounter editor:", error);
    } finally {
      setEditorPending(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[AI ENCOUNTERS]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Ship Configs</h5>
        <AIShipConfigEditor
          configs={configSummaries}
          onCreate={handleCreateConfig}
          onUpdate={handleUpdateConfig}
        />
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Map Placements</h5>
        {mapIds.length === 0 ? (
          <p className="text-xs text-text-muted">No preset maps available.</p>
        ) : (
          <>
            <select
              value={selectedMapId ?? ""}
              onChange={(e) => setSelectedMapId(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {mapIds.map((id) => (
                <option key={id} value={id}>{mapTitleLabel(id, nameByMapId)}</option>
              ))}
            </select>
            {selectedMapId != null && configList.length > 0 ? (
              <MapPlacementsEditor mapId={BigInt(selectedMapId)} configs={configList} />
            ) : selectedMapId != null ? (
              <p className="text-xs text-text-muted">Create a ship config first to place it on a map.</p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Editor Permissions</h5>
        <p className="text-xs text-text-muted">
          No on-chain list of current editors is exposed — this can only add/revoke by address.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={editorAddress}
            onChange={(e) => setEditorAddress(e.target.value)}
            placeholder="0x0000..."
            className={`${inputClass} sm:flex-1`}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(true)}
            className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grant
          </button>
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(false)}
            className="px-4 py-2 rounded-none font-mono border border-warning-red text-warning-red hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

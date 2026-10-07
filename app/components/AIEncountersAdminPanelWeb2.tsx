"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import {
  AIShipConfigEditor,
  type AIShipConfigFormValues,
  type AIShipConfigSummary,
} from "./AIShipConfigEditor";
import { MapPlacementsEditorWeb2 } from "./MapPlacementsEditorWeb2";
import type { AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

// Web2 counterpart to AIEncountersAdminPanel.tsx (web3) — same layout/flow,
// backed by AIShipConfig/AIMapPlacement rows via /api/admin/ai-ship-configs
// and /api/admin/ai-map-placements instead of the AIEncounters contract, and
// gated on useWeb2Admin() instead of on-chain isEncounterEditor. Traits here
// use the plain 6-field ShipColors shape (web2 ships have no h3/s3/l3 —
// that's a web3-only Colors field, see AIEncountersColors in types.ts).

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;
const DEFAULT_COLORS = { h1: 220, s1: 10, l1: 20, h2: 35, s2: 70, l2: 50 };

interface Props {
  mapIds: number[];
}

export function AIEncountersAdminPanelWeb2({ mapIds }: Props) {
  const isAdmin = useWeb2Admin();
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ["ai-ship-configs"],
    queryFn: () => apiFetch<AIShipConfigWeb2[]>("/api/admin/ai-ship-configs"),
    enabled: isAdmin,
  });
  const [selectedMapId, setSelectedMapId] = useState<number | undefined>(mapIds[0]);

  const configList = useMemo(() => configs, [configs]);
  const configSummaries = useMemo(
    () =>
      configList.map(
        (c): AIShipConfigSummary => ({
          id: String(c.id),
          values: {
            name: c.name,
            ...c.equipment,
            variant: c.traits.variant,
            accuracy: c.traits.accuracy,
            hull: c.traits.hull,
            speed: c.traits.speed,
            archetype: c.archetype,
          },
        }),
      ),
    [configList],
  );

  if (!isAdmin) return null;

  const handleCreateConfig = async (v: AIShipConfigFormValues) => {
    try {
      await apiMutate("/api/admin/ai-ship-configs", "POST", {
        name: v.name,
        equipment: { mainWeapon: v.mainWeapon, armor: v.armor, shields: v.shields, special: v.special },
        traits: {
          serialNumber: 0,
          colors: DEFAULT_COLORS,
          variant: v.variant,
          accuracy: v.accuracy,
          hull: v.hull,
          speed: v.speed,
        },
        archetype: v.archetype,
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-ship-configs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create AI ship config");
      throw e;
    }
  };

  const handleUpdateConfig = async (id: string, v: AIShipConfigFormValues) => {
    const existing = configList.find((c) => String(c.id) === id);
    if (!existing) return;
    try {
      await apiMutate(`/api/admin/ai-ship-configs/${existing.id}`, "PUT", {
        name: v.name,
        equipment: { mainWeapon: v.mainWeapon, armor: v.armor, shields: v.shields, special: v.special },
        // Keep the config's serial number and colors; only the form's fields change.
        traits: { ...existing.traits, variant: v.variant, accuracy: v.accuracy, hull: v.hull, speed: v.speed },
        archetype: v.archetype,
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-ship-configs"] });
      toast.success("Ship config saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save AI ship config");
      throw e;
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
          <p className="text-xs text-text-muted">No maps available.</p>
        ) : (
          <>
            <select
              value={selectedMapId ?? ""}
              onChange={(e) => setSelectedMapId(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {mapIds.map((id) => (
                <option key={id} value={id}>Map #{id}</option>
              ))}
            </select>
            {selectedMapId != null && configList.length > 0 ? (
              <MapPlacementsEditorWeb2 mapId={selectedMapId} configs={configList} />
            ) : selectedMapId != null ? (
              <p className="text-xs text-text-muted">Create a ship config first to place it on a map.</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import {
  MAIN_WEAPON_NAMES,
  ARMOR_NAMES,
  SHIELD_NAMES,
  SPECIAL_NAMES,
  SPECIAL_NAMES_V2,
  Archetype,
} from "../types/types";
import { MapPlacementsEditorWeb2 } from "./MapPlacementsEditorWeb2";
import type { AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

// Web2 counterpart to AIEncountersAdminPanel.tsx (web3) — same layout/flow,
// backed by AIShipConfig/AIMapPlacement rows via /api/admin/ai-ship-configs
// and /api/admin/ai-map-placements instead of the AIEncounters contract, and
// gated on useWeb2Admin() instead of on-chain isEncounterEditor. Traits here
// use the plain 6-field ShipColors shape (web2 ships have no h3/s3/l3 —
// that's a web3-only Colors field, see AIEncountersColors in types.ts).

const ARCHETYPE_NAMES: Record<Archetype, string> = {
  [Archetype.Grunt]: "Grunt",
  [Archetype.Aggressor]: "Aggressor",
  [Archetype.Sniper]: "Sniper",
  [Archetype.Support]: "Support",
  [Archetype.Turtle]: "Turtle",
  [Archetype.Rammer]: "Rammer",
};

const numberOptions = (count: number) => Array.from({ length: count }, (_, i) => i);
const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;
const DEFAULT_COLORS = { h1: 220, s1: 10, l1: 20, h2: 35, s2: 70, l2: 50 };

function ShipConfigForm({
  onSubmit,
  pending,
}: {
  onSubmit: (args: {
    name: string;
    mainWeapon: number;
    armor: number;
    shields: number;
    special: number;
    variant: number;
    accuracy: number;
    hull: number;
    speed: number;
    archetype: Archetype;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [mainWeapon, setMainWeapon] = useState(0);
  const [armor, setArmor] = useState(0);
  const [shields, setShields] = useState(0);
  const [special, setSpecial] = useState(0);
  const [variant, setVariant] = useState(1);
  const [accuracy, setAccuracy] = useState(1);
  const [hull, setHull] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [archetype, setArchetype] = useState<Archetype>(Archetype.Grunt);

  return (
    <div className="space-y-3 border border-gunmetal bg-black/40 p-3">
      <div>
        <label className="block text-xs text-cyan mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="AI ship config name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-cyan mb-1">Weapon</label>
          <select value={mainWeapon} onChange={(e) => setMainWeapon(Number(e.target.value))} className={inputClass} style={inputStyle}>
            {Object.entries(MAIN_WEAPON_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Armor</label>
          <select
            value={armor}
            onChange={(e) => { const v = Number(e.target.value); setArmor(v); if (v > 0) setShields(0); }}
            className={inputClass}
            style={inputStyle}
          >
            {Object.entries(ARMOR_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Shields</label>
          <select
            value={shields}
            onChange={(e) => { const v = Number(e.target.value); setShields(v); if (v > 0) setArmor(0); }}
            className={inputClass}
            style={inputStyle}
          >
            {Object.entries(SHIELD_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Special</label>
          <select value={special} onChange={(e) => setSpecial(Number(e.target.value))} className={inputClass} style={inputStyle}>
            {Object.entries(variant === 2 ? SPECIAL_NAMES_V2 : SPECIAL_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-cyan mb-1">Variant (faction)</label>
          <input
            type="number"
            min={1}
            value={variant}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value));
              setVariant(v);
              // Special values are variant-scoped (docs/faction-2.md §6) —
              // reset rather than carry over a value meaningless for the
              // new variant.
              setSpecial(0);
            }}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        {(
          [
            ["Accuracy", accuracy, setAccuracy],
            ["Hull", hull, setHull],
            ["Speed", speed, setSpeed],
          ] as const
        ).map(([label, value, setValue]) => (
          <div key={label}>
            <label className="block text-xs text-cyan mb-1">{label} (0-2)</label>
            <select
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {numberOptions(3).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs text-cyan mb-1">Archetype</label>
        <select
          value={archetype}
          onChange={(e) => setArchetype(Number(e.target.value) as Archetype)}
          className={inputClass}
          style={inputStyle}
        >
          {Object.entries(ARCHETYPE_NAMES).map(([v, n]) => (
            <option key={v} value={v}>{n}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={pending || !name.trim()}
        onClick={() =>
          onSubmit({ name: name.trim(), mainWeapon, armor, shields, special, variant, accuracy, hull, speed, archetype })
        }
        className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Creating..." : "Create Ship Config"}
      </button>
    </div>
  );
}

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
  const [creating, setCreating] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<number | undefined>(mapIds[0]);

  const configList = useMemo(() => configs, [configs]);

  if (!isAdmin) return null;

  const handleCreateConfig: React.ComponentProps<typeof ShipConfigForm>["onSubmit"] = async ({
    name,
    mainWeapon,
    armor,
    shields,
    special,
    variant,
    accuracy,
    hull,
    speed,
    archetype,
  }) => {
    setCreating(true);
    try {
      await apiMutate("/api/admin/ai-ship-configs", "POST", {
        name,
        equipment: { mainWeapon, armor, shields, special },
        traits: { serialNumber: 0, colors: DEFAULT_COLORS, variant, accuracy, hull, speed },
        archetype,
      });
      await queryClient.invalidateQueries({ queryKey: ["ai-ship-configs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create AI ship config");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[AI ENCOUNTERS]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Ship Configs</h5>
        <div className="space-y-1">
          {configList.length === 0 ? (
            <p className="text-xs text-text-muted">No AI ship configs yet.</p>
          ) : (
            configList.map((c) => (
              <div key={c.id} className="flex justify-between text-xs text-text-secondary">
                <span>{c.name}</span>
                <span className="text-cyan">{ARCHETYPE_NAMES[c.archetype]}</span>
              </div>
            ))
          )}
        </div>
        <ShipConfigForm onSubmit={handleCreateConfig} pending={creating} />
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

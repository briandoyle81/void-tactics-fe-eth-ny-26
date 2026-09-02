"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MAIN_WEAPON_NAMES,
  ARMOR_NAMES,
  SHIELD_NAMES,
  SPECIAL_NAMES,
  SPECIAL_NAMES_V2,
  Archetype,
} from "../types/types";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import { useGetAllAIShipConfigs } from "../hooks/useAIEncountersContract";
import { MapPlacementsEditor } from "./MapPlacementsEditor";

const ARCHETYPE_NAMES: Record<Archetype, string> = {
  [Archetype.Grunt]: "Grunt",
  [Archetype.Aggressor]: "Aggressor",
  [Archetype.Sniper]: "Sniper",
  [Archetype.Support]: "Support",
  [Archetype.Turtle]: "Turtle",
  [Archetype.Rammer]: "Rammer",
};

const numberOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => i);

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

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
          <label className="block text-xs text-cyan mb-1">Variant (faction, &gt;0)</label>
          <input
            type="number"
            min={1}
            value={variant}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value));
              setVariant(v);
              // Special values are variant-scoped (docs/faction-2.md §6) — a
              // value valid for the old variant is meaningless for the new
              // one, so reset rather than carry it over.
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

/** Gated on AIEncounters.isEncounterEditor — separate permission domain from MAP_ADMIN_ADDRESS. */
export function AIEncountersAdminPanel({ mapIds }: Props) {
  const { isEditor, isLoading } = useIsEncounterEditor();
  const admin = useAIEncountersAdmin();
  const { data: configs, refetch: refetchConfigs } = useGetAllAIShipConfigs();
  const [creating, setCreating] = useState(false);
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

  if (isLoading || !isEditor) return null;

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
      await admin.createAIShipConfig(
        name,
        { mainWeapon, armor, shields, special },
        {
          serialNumber: 0n,
          colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0, h3: 0, s3: 0, l3: 0 },
          variant,
          accuracy,
          hull,
          speed,
        },
        archetype,
      );
      await refetchConfigs();
    } catch (error) {
      console.error("Failed to create AI ship config:", error);
    } finally {
      setCreating(false);
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
        <div className="space-y-1">
          {configList.length === 0 ? (
            <p className="text-xs text-text-muted">No AI ship configs yet.</p>
          ) : (
            configList.map((c) => (
              <div key={c.id.toString()} className="flex justify-between text-xs text-text-secondary">
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
                <option key={id} value={id}>Map #{id}</option>
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

"use client";

import React, { useState } from "react";
import {
  MAIN_WEAPON_NAMES,
  ARMOR_NAMES,
  SHIELD_NAMES,
  SPECIAL_NAMES,
  SPECIAL_NAMES_V2,
  Archetype,
} from "../types/types";

// AI ship config list + create/edit form, shared by AIEncountersAdminPanel
// (web3, AIEncounters contract) and AIEncountersAdminPanelWeb2 (web2,
// /api/admin/ai-ship-configs). Number-native: each panel adapts its own
// config shape to AIShipConfigSummary and handles saving.

export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  [Archetype.Grunt]: "Grunt",
  [Archetype.Aggressor]: "Aggressor",
  [Archetype.Sniper]: "Sniper",
  [Archetype.Support]: "Support",
  [Archetype.Turtle]: "Turtle",
  [Archetype.Rammer]: "Rammer",
};

/** The editable properties of an AI ship config. */
export interface AIShipConfigFormValues {
  name: string;
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
  /** Faction (1 or 2). */
  variant: number;
  /** Trait tiers, 0-2. */
  accuracy: number;
  hull: number;
  speed: number;
  archetype: Archetype;
}

/** One config in the list. `id` is a string so web3 bigint ids and web2 number ids fit. */
export interface AIShipConfigSummary {
  id: string;
  values: AIShipConfigFormValues;
}

const numberOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => i);

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

const NEW_CONFIG_DEFAULTS: AIShipConfigFormValues = {
  name: "",
  mainWeapon: 0,
  armor: 0,
  shields: 0,
  special: 0,
  variant: 1,
  accuracy: 1,
  hull: 1,
  speed: 1,
  archetype: Archetype.Grunt,
};

function ShipConfigForm({
  initial = NEW_CONFIG_DEFAULTS,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
  pendingLabel,
}: {
  /** Starting values — an existing config's when editing. Remount (key) to load another. */
  initial?: AIShipConfigFormValues;
  onSubmit: (values: AIShipConfigFormValues) => void;
  onCancel?: () => void;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [name, setName] = useState(initial.name);
  const [mainWeapon, setMainWeapon] = useState(initial.mainWeapon);
  const [armor, setArmor] = useState(initial.armor);
  const [shields, setShields] = useState(initial.shields);
  const [special, setSpecial] = useState(initial.special);
  const [variant, setVariant] = useState(initial.variant);
  const [accuracy, setAccuracy] = useState(initial.accuracy);
  const [hull, setHull] = useState(initial.hull);
  const [speed, setSpeed] = useState(initial.speed);
  const [archetype, setArchetype] = useState<Archetype>(initial.archetype);

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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={() =>
            onSubmit({ name: name.trim(), mainWeapon, armor, shields, special, variant, accuracy, hull, speed, archetype })
          }
          className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="px-4 py-2 rounded-none font-mono border border-gunmetal text-text-secondary hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Lists every config. Clicking one opens its properties in a modal for
 * editing (Save changes / Cancel); "+ New Ship Config" opens the same modal
 * empty to create one. Changes to a config apply everywhere it's placed.
 */
export function AIShipConfigEditor({
  configs,
  onCreate,
  onUpdate,
}: {
  configs: AIShipConfigSummary[];
  /** Resolve when saved (the list should refresh); throw to keep the form open. */
  onCreate: (values: AIShipConfigFormValues) => Promise<void>;
  onUpdate: (id: string, values: AIShipConfigFormValues) => Promise<void>;
}) {
  // null = closed, "new" = creating, otherwise the id being edited.
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editing = openId && openId !== "new" ? (configs.find((c) => c.id === openId) ?? null) : null;
  const isOpen = openId === "new" || editing != null;

  const close = React.useCallback(() => {
    if (!pending) setOpenId(null);
  }, [pending]);

  // Escape closes the modal (unless a save is in flight).
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const save = async (action: () => Promise<void>) => {
    setPending(true);
    try {
      await action();
      setOpenId(null);
    } catch (error) {
      console.error("Failed to save AI ship config:", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {configs.length === 0 ? (
          <p className="text-xs text-text-muted">No AI ship configs yet.</p>
        ) : (
          configs.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className="flex w-full justify-between border border-transparent px-2 py-1 text-left text-xs text-text-secondary transition-colors hover:border-gunmetal hover:bg-white/5"
              style={{ borderRadius: 0 }}
            >
              <span>
                <span className="text-text-muted">#{c.id}</span> {c.values.name}
              </span>
              <span className="text-cyan">{ARCHETYPE_NAMES[c.values.archetype]}</span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpenId("new")}
        className="px-4 py-2 rounded-none font-mono text-sm border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
      >
        + New Ship Config
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4"
          onClick={close}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-[90%] overflow-y-auto border-2 border-purple-400 bg-near-black p-5 font-mono"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? `Edit ship config ${editing.values.name}` : "New ship config"}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h5 className="text-lg font-bold uppercase tracking-widest text-purple">
                  {editing ? `Edit #${editing.id} · ${editing.values.name}` : "New Ship Config"}
                </h5>
                {editing && (
                  <p className="mt-1 text-[11px] text-text-muted">
                    Changes apply everywhere this config is placed, including missions that share its map.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Close"
                className="border border-gunmetal px-2 py-0.5 text-xs text-text-muted hover:text-white disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                ✕
              </button>
            </div>
            <ShipConfigForm
              key={openId}
              initial={editing?.values}
              pending={pending}
              submitLabel={editing ? "Save Changes" : "Create Ship Config"}
              pendingLabel={editing ? "Saving..." : "Creating..."}
              onSubmit={(values) =>
                void save(() => (editing ? onUpdate(editing.id, values) : onCreate(values)))
              }
              onCancel={close}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DEFAULT_COSTS, type CostsConfig } from "../lib/shipCosts";

interface AdminStats {
  total: number;
  staleCount: number;
}

function NumberInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min) onChange(v);
      }}
      className="w-16 bg-near-black border border-gunmetal text-cyan font-mono text-sm px-2 py-1 text-right focus:outline-none focus:border-cyan"
    />
  );
}

function ArrayEditor({
  label,
  values,
  onChange,
  labels,
}: {
  label: string;
  values: number[];
  onChange: (v: number[]) => void;
  labels?: string[];
}) {
  return (
    <div className="mb-4">
      <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-3">
        {values.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {labels && (
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wide">
                {labels[i] ?? i}
              </span>
            )}
            <NumberInput
              value={v}
              onChange={(n) => {
                const next = [...values];
                next[i] = n;
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const WEAPON_LABELS  = ["Laser", "Railgun", "Missile", "Plasma"];
const ARMOR_LABELS   = ["None", "Light", "Medium", "Heavy"];
const SHIELD_LABELS  = ["None", "Light", "Medium", "Heavy"];
const SPECIAL_LABELS = ["None", "EMP", "Repair", "Flak"];
const TRAIT_LABELS   = ["T0", "T1", "T2"];

export default function ShipAttributes() {
  const [costs, setCosts] = useState<CostsConfig>(DEFAULT_COSTS);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ updated?: number; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ship-costs");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { costs: CostsConfig; stats: AdminStats };
      setCosts(data.costs);
      setStats(data.stats);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ship-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costs }),
      });
      const data = await res.json() as { costs?: CostsConfig; updated?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.costs) setCosts(data.costs);
      setResult({ updated: data.updated });
      await load();
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const recalculate = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/recalculate-costs", { method: "POST" });
      const data = await res.json() as { updated?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Recalculate failed");
      setResult({ updated: data.updated });
      await load();
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="font-mono text-sm text-text-muted p-8 text-center tracking-widest">
        LOADING COST CONFIG...
      </div>
    );
  }

  return (
    <div className="font-mono max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] text-text-muted tracking-widest mb-1">// ADMIN PANEL //</div>
        <h2 className="text-cyan text-xl font-bold tracking-widest uppercase">Ship Cost Config</h2>
        <div className="text-text-muted text-xs mt-1">
          Version: <span className="text-phosphor-green">{costs.version}</span>
          {" · "}Saving increments version and recalculates all ships.
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-6 mb-6 p-4 border border-gunmetal bg-slate">
          <div>
            <div className="text-[10px] text-text-muted tracking-widest">TOTAL SHIPS</div>
            <div className="text-cyan text-lg font-bold">{stats.total}</div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted tracking-widest">STALE (outdated cost)</div>
            <div className={`text-lg font-bold ${stats.staleCount > 0 ? "text-warning-red" : "text-phosphor-green"}`}>
              {stats.staleCount}
            </div>
          </div>
        </div>
      )}

      {/* Cost tables */}
      <div className="border border-gunmetal bg-slate p-5 mb-4">
        <div className="text-[10px] text-text-muted tracking-widest mb-4">COST TABLES</div>

        <div className="mb-4 flex items-center gap-4">
          <span className="text-xs text-text-muted w-28">Base Cost</span>
          <NumberInput
            value={costs.baseCost}
            onChange={(v) => setCosts((c) => ({ ...c, baseCost: v }))}
          />
        </div>

        <ArrayEditor
          label="Accuracy Trait (T0–T2)"
          values={costs.accuracy}
          labels={TRAIT_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, accuracy: v }))}
        />
        <ArrayEditor
          label="Hull Trait (T0–T2)"
          values={costs.hull}
          labels={TRAIT_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, hull: v }))}
        />
        <ArrayEditor
          label="Speed Trait (T0–T2)"
          values={costs.speed}
          labels={TRAIT_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, speed: v }))}
        />
        <ArrayEditor
          label="Main Weapon"
          values={costs.mainWeapon}
          labels={WEAPON_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, mainWeapon: v }))}
        />
        <ArrayEditor
          label="Armor"
          values={costs.armor}
          labels={ARMOR_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, armor: v }))}
        />
        <ArrayEditor
          label="Shields"
          values={costs.shields}
          labels={SHIELD_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, shields: v }))}
        />
        <ArrayEditor
          label="Special"
          values={costs.special}
          labels={SPECIAL_LABELS}
          onChange={(v) => setCosts((c) => ({ ...c, special: v }))}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-cyan/10 border-2 border-cyan text-cyan font-bold text-sm uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "SAVING..." : "SAVE & RECALCULATE ALL SHIPS"}
        </button>
        <button
          onClick={recalculate}
          disabled={saving}
          className="px-6 py-2.5 bg-transparent border-2 border-gunmetal text-text-secondary font-bold text-sm uppercase tracking-widest hover:border-steel hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          RECALCULATE ONLY (no cost change)
        </button>
        <button
          onClick={() => { setCosts(DEFAULT_COSTS); setResult(null); }}
          disabled={saving}
          className="px-4 py-2.5 bg-transparent border border-gunmetal text-text-muted text-xs uppercase tracking-widest hover:text-text-secondary transition-colors"
        >
          RESET TO DEFAULTS
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-3 border text-sm font-mono ${result.error ? "border-warning-red text-warning-red" : "border-phosphor-green text-phosphor-green"}`}>
          {result.error
            ? `ERROR: ${result.error}`
            : `✓ Updated ${result.updated} ships — version ${costs.version}`}
        </div>
      )}
    </div>
  );
}

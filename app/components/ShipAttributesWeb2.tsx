"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { DEFAULT_COSTS_BY_VARIANT, type CostsConfig } from "../lib/shipCosts";
import {
  DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT,
  type ShipAttributeTables,
  type GunStats,
  type DefenseStats,
} from "../lib/shipAttributeTables";
import { getMainWeaponName, getArmorName, getShieldName } from "../types/types";

// Web2-mode counterpart to `ShipAttributes.tsx` — admin edit of the
// DB-backed ship_costs / ship_attribute_tables Config rows instead of the
// ShipAttributes contract's Costs/GunData/ArmorData/ShieldData. Gated on
// `useWeb2Admin()` (WEB2_ADMIN_EMAILS) instead of contract ownership.
// As of the 2026-09-20/21 redesign, both are per-variant — the picker here
// drives both sections, same as web3's ShipAttributes.tsx.
// The attribute tables (unlike costs) feed live combat resolution
// (gameEngineWeb2.ts) — editing them is a gameplay balance change.

type CostsArrayField = Exclude<keyof CostsConfig, "version" | "baseCost">;

const NUM_ARRAY_FIELDS: CostsArrayField[] = [
  "accuracy",
  "hull",
  "speed",
  "mainWeapon",
  "armor",
  "shields",
  "special",
];

const inputClass =
  "w-20 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none text-sm";
const sectionClass = "bg-steel rounded-none p-4 border border-gunmetal space-y-3";
const saveBtnClass =
  "px-4 py-2 rounded-none border-2 text-cyan font-mono font-bold text-sm tracking-wider transition-colors hover:bg-cyan/10 disabled:opacity-50";

interface ShipCostStats {
  total: number;
  staleCount: number;
}

function CostsSection({ variant }: { variant: number }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "ship-costs", variant],
    queryFn: () =>
      apiFetch<{ variant: number; costs: CostsConfig; stats: ShipCostStats }>(
        `/api/admin/ship-costs?variant=${variant}`,
      ),
  });
  const [draft, setDraft] = useState<CostsConfig>(DEFAULT_COSTS_BY_VARIANT[variant] ?? DEFAULT_COSTS_BY_VARIANT[1]!);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsDirty(false);
  }, [variant]);

  useEffect(() => {
    if (data && !isDirty) setDraft(data.costs);
  }, [data, isDirty]);

  const updateArray = (field: (typeof NUM_ARRAY_FIELDS)[number], index: number, value: number) => {
    setIsDirty(true);
    setDraft((prev) => {
      const next = [...prev[field]];
      next[index] = value;
      return { ...prev, [field]: next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Server assigns the new version — whatever we send here is ignored.
      await apiMutate(`/api/admin/ship-costs?variant=${variant}`, "PUT", draft);
      toast.success(`Variant ${variant} ship costs updated`);
      setIsDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update costs");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (data) setDraft(data.costs);
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div className={sectionClass}>
        <p className="text-text-muted text-sm font-mono">Loading…</p>
      </div>
    );
  }

  const stats = data?.stats;
  const fieldLabel = (field: CostsArrayField, i: number): string => {
    switch (field) {
      case "mainWeapon":
        return getMainWeaponName(i, variant);
      case "armor":
        return getArmorName(i);
      case "shields":
        return getShieldName(i);
      default:
        return `${field}[${i}]`;
    }
  };

  return (
    <div className={sectionClass}>
      <h3 className="text-lg font-mono text-text-primary">
        Ship costs — variant {variant}{" "}
        <span className="text-text-muted text-sm">(version {draft.version})</span>
      </h3>
      <p className="text-sm text-text-muted">
        Per-trait/equipment cost contributions used when constructing this variant&apos;s
        ships. Saving increments this variant&apos;s own version — its ships are recalculated
        lazily, the next time each owner loads their ship list (see recalcStaleShips.ts), not
        all at once.
      </p>
      {stats && (
        <div className="flex gap-6 border border-gunmetal bg-near-black p-3">
          <div>
            <div className="text-[10px] text-text-muted tracking-widest">TOTAL SHIPS (variant {variant})</div>
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
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">Base cost:</label>
        <input
          type="number"
          min={0}
          value={draft.baseCost}
          onChange={(e) => {
            setIsDirty(true);
            setDraft((prev) => ({ ...prev, baseCost: Number(e.target.value) || 0 }));
          }}
          className={inputClass}
        />
      </div>
      {NUM_ARRAY_FIELDS.map((field) => (
        <div key={field} className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-text-secondary w-32 shrink-0">{field}:</label>
          {draft[field].map((v, i) => (
            <input
              key={i}
              type="number"
              value={v}
              onChange={(e) => updateArray(field, i, Number(e.target.value) || 0)}
              className={inputClass}
              title={fieldLabel(field, i)}
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={saveBtnClass}
          style={{ borderColor: "var(--color-cyan)" }}
        >
          {isSaving ? "[SAVING…]" : "[SAVE COSTS]"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving || !isDirty}
          className={saveBtnClass}
          style={{ borderColor: "var(--color-steel)", color: "var(--color-text-secondary)" }}
        >
          [RESET]
        </button>
      </div>
    </div>
  );
}

function AttributeTablesSection({ variant }: { variant: number }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "ship-attribute-tables", variant],
    queryFn: () => apiFetch<ShipAttributeTables>(`/api/admin/ship-attribute-tables?variant=${variant}`),
  });
  const [draft, setDraft] = useState<ShipAttributeTables>(
    DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT[variant] ?? DEFAULT_ATTRIBUTE_TABLES_BY_VARIANT[1]!,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsDirty(false);
  }, [variant]);

  useEffect(() => {
    if (data && !isDirty) setDraft(data);
  }, [data, isDirty]);

  const updateNumberArray = (
    field: "foreAccuracy" | "hullBonus" | "engineSpeeds" | "rankThresholds" | "rankBonusPct",
    index: number,
    value: number,
  ) => {
    setIsDirty(true);
    setDraft((prev) => {
      const next = [...prev[field]];
      next[index] = value;
      return { ...prev, [field]: next };
    });
  };

  const updateGun = (index: number, patch: Partial<GunStats>) => {
    setIsDirty(true);
    setDraft((prev) => ({
      ...prev,
      guns: prev.guns.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
  };

  const updateDefense = (
    field: "armors" | "shields",
    index: number,
    patch: Partial<DefenseStats>,
  ) => {
    setIsDirty(true);
    setDraft((prev) => ({
      ...prev,
      [field]: prev[field].map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  };

  const validationErrors: string[] = [];
  if (draft.rankThresholds.length !== 5) {
    validationErrors.push("rankThresholds must have exactly 5 entries.");
  } else {
    if (draft.rankThresholds[0]! <= 0) validationErrors.push("The first rank threshold must be > 0.");
    for (let i = 1; i < draft.rankThresholds.length; i++) {
      if (draft.rankThresholds[i]! <= draft.rankThresholds[i - 1]!) {
        validationErrors.push("Rank thresholds must be strictly ascending.");
        break;
      }
    }
  }
  if (draft.rankBonusPct.length !== 6) {
    validationErrors.push("rankBonusPct must have exactly 6 entries.");
  } else if (draft.rankBonusPct.some((p) => p > 100)) {
    validationErrors.push("Every rank bonus % must be ≤ 100.");
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Server assigns the new version — whatever we send here is ignored.
      await apiMutate(`/api/admin/ship-attribute-tables?variant=${variant}`, "PUT", draft);
      toast.success(`Variant ${variant} attribute tables updated`);
      setIsDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tables");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (data) setDraft(data);
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div className={sectionClass}>
        <p className="text-text-muted text-sm font-mono">Loading…</p>
      </div>
    );
  }

  const gunLabel = (i: number) => getMainWeaponName(i, variant);
  const defenseLabel = (i: number, kind: "armor" | "shield") =>
    kind === "armor" ? getArmorName(i) : getShieldName(i);

  return (
    <div className={sectionClass}>
      <h3 className="text-lg font-mono text-text-primary">
        Attribute tables — variant {variant}{" "}
        <span className="text-warning-red text-xs">(affects live combat)</span>
      </h3>
      <p className="text-sm text-text-muted">
        Base hull/speed, per-trait bonuses, per-equipment gun/armor/shield stats, and rank
        thresholds/bonuses — all scoped to this variant only.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Base hull:</label>
          <input
            type="number"
            value={draft.baseHull}
            onChange={(e) => {
              setIsDirty(true);
              setDraft((prev) => ({ ...prev, baseHull: Number(e.target.value) || 0 }));
            }}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Base speed:</label>
          <input
            type="number"
            value={draft.baseSpeed}
            onChange={(e) => {
              setIsDirty(true);
              setDraft((prev) => ({ ...prev, baseSpeed: Number(e.target.value) || 0 }));
            }}
            className={inputClass}
          />
        </div>
      </div>

      {(["foreAccuracy", "hullBonus", "engineSpeeds"] as const).map((field) => (
        <div key={field} className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-text-secondary w-28 shrink-0">{field}:</label>
          {draft[field].map((v, i) => (
            <input
              key={i}
              type="number"
              value={v}
              onChange={(e) => updateNumberArray(field, i, Number(e.target.value) || 0)}
              className={inputClass}
              title={`${field}[${i}]`}
            />
          ))}
        </div>
      ))}

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono text-left border-collapse">
          <thead>
            <tr className="border-b border-gunmetal text-text-muted">
              <th className="py-2 pr-4">Gun (mainWeapon idx)</th>
              <th className="py-2 pr-4">Range</th>
              <th className="py-2 pr-4">Damage</th>
              <th className="py-2">Movement</th>
            </tr>
          </thead>
          <tbody>
            {draft.guns.map((g, i) => (
              <tr key={i} className="border-b border-gunmetal/80">
                <td className="py-2 pr-4 text-cyan">
                  {i}: {gunLabel(i)}
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    value={g.range}
                    onChange={(e) => updateGun(i, { range: Number(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    value={g.damage}
                    onChange={(e) => updateGun(i, { damage: Number(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    value={g.movement}
                    onChange={(e) => updateGun(i, { movement: Number(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(["armors", "shields"] as const).map((field) => (
        <div key={field} className="overflow-x-auto">
          <table className="w-full text-sm font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-gunmetal text-text-muted">
                <th className="py-2 pr-4">{field} idx</th>
                <th className="py-2 pr-4">Damage reduction</th>
                <th className="py-2">Movement</th>
              </tr>
            </thead>
            <tbody>
              {draft[field].map((d, i) => (
                <tr key={i} className="border-b border-gunmetal/80">
                  <td className="py-2 pr-4 text-cyan">
                    {i}: {defenseLabel(i, field === "armors" ? "armor" : "shield")}
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      value={d.damageReduction}
                      onChange={(e) =>
                        updateDefense(field, i, { damageReduction: Number(e.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={d.movement}
                      onChange={(e) =>
                        updateDefense(field, i, { movement: Number(e.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-text-secondary w-40 shrink-0">
            Rank thresholds (ranks 2-6):
          </label>
          {draft.rankThresholds.map((v, i) => (
            <input
              key={i}
              type="number"
              value={v}
              onChange={(e) => updateNumberArray("rankThresholds", i, Number(e.target.value) || 0)}
              className={inputClass}
              title={`Rank ${i + 2}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-text-secondary w-40 shrink-0">
            Rank bonus % (ranks 1-6):
          </label>
          {draft.rankBonusPct.map((v, i) => (
            <input
              key={i}
              type="number"
              value={v}
              onChange={(e) => updateNumberArray("rankBonusPct", i, Number(e.target.value) || 0)}
              className={inputClass}
              title={`Rank ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="text-warning-red text-xs font-mono space-y-0.5">
          {validationErrors.map((e, i) => (
            <p key={i}>⚠ {e}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty || validationErrors.length > 0}
          className={saveBtnClass}
          style={{ borderColor: "var(--color-cyan)" }}
        >
          {isSaving ? "[SAVING…]" : "[SAVE ATTRIBUTE TABLES]"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving || !isDirty}
          className={saveBtnClass}
          style={{ borderColor: "var(--color-steel)", color: "var(--color-text-secondary)" }}
        >
          [RESET]
        </button>
      </div>
    </div>
  );
}

const ShipAttributesWeb2: React.FC = () => {
  const canEdit = useWeb2Admin();
  const [variant, setVariant] = useState(1);

  if (!canEdit) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-warning-red">
          Access denied. Only authorized accounts can view this admin tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={sectionClass}>
        <h3 className="text-lg font-mono text-text-primary mb-2">Faction Variant</h3>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={variant}
            onChange={(e) => setVariant(Number(e.target.value))}
            className="px-2 py-1 bg-near-black text-white border border-gunmetal rounded-none font-mono"
          >
            <option value={1}>Variant 1</option>
            <option value={2}>Variant 2</option>
          </select>
          <span className="text-text-muted text-xs">
            Costs and attribute tables below are for this variant.
          </span>
        </div>
      </div>
      <CostsSection variant={variant} />
      <AttributeTablesSection variant={variant} />
    </div>
  );
};

export default ShipAttributesWeb2;

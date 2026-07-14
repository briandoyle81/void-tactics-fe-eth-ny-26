"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { DEFAULT_COSTS, type CostsConfig } from "../lib/shipCosts";
import {
  DEFAULT_ATTRIBUTE_TABLES,
  type ShipAttributeTables,
  type GunStats,
  type DefenseStats,
} from "../lib/shipAttributeTables";

// Web2-mode counterpart to `ShipAttributes.tsx` — admin edit of the
// DB-backed ship_costs / ship_attribute_tables Config rows instead of the
// ShipAttributes contract's Costs/GunData/ArmorData/ShieldData. Gated on
// `useWeb2Admin()` (WEB2_ADMIN_EMAILS) instead of contract ownership.
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

function CostsSection() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "ship-costs"],
    queryFn: () => apiFetch<{ costs: CostsConfig; stats: ShipCostStats }>("/api/admin/ship-costs"),
  });
  const [draft, setDraft] = useState<CostsConfig>(DEFAULT_COSTS);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      await apiMutate("/api/admin/ship-costs", "PUT", draft);
      toast.success("Ship costs updated");
      setIsDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update costs");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={sectionClass}>
        <p className="text-text-muted text-sm font-mono">Loading…</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className={sectionClass}>
      <h3 className="text-lg font-mono text-text-primary">
        Ship costs <span className="text-text-muted text-sm">(version {draft.version})</span>
      </h3>
      <p className="text-sm text-text-muted">
        Per-trait/equipment cost contributions used when constructing ships. Saving increments
        the version — ships are recalculated lazily, the next time each owner loads their ship
        list (see recalcStaleShips.ts), not all at once.
      </p>
      {stats && (
        <div className="flex gap-6 border border-gunmetal bg-near-black p-3">
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
          <label className="text-sm text-text-secondary w-24 shrink-0">{field}:</label>
          {draft[field].map((v, i) => (
            <input
              key={i}
              type="number"
              value={v}
              onChange={(e) => updateArray(field, i, Number(e.target.value) || 0)}
              className={inputClass}
              title={`${field}[${i}]`}
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !isDirty}
        className={saveBtnClass}
        style={{ borderColor: "var(--color-cyan)" }}
      >
        {isSaving ? "[SAVING…]" : "[SAVE COSTS]"}
      </button>
    </div>
  );
}

function AttributeTablesSection() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "ship-attribute-tables"],
    queryFn: () => apiFetch<ShipAttributeTables>("/api/admin/ship-attribute-tables"),
  });
  const [draft, setDraft] = useState<ShipAttributeTables>(DEFAULT_ATTRIBUTE_TABLES);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data && !isDirty) setDraft(data);
  }, [data, isDirty]);

  const updateNumberArray = (
    field: "foreAccuracy" | "hullBonus" | "engineSpeeds",
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Server assigns the new version — whatever we send here is ignored.
      await apiMutate("/api/admin/ship-attribute-tables", "PUT", draft);
      toast.success("Ship attribute tables updated");
      setIsDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tables");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={sectionClass}>
        <p className="text-text-muted text-sm font-mono">Loading…</p>
      </div>
    );
  }

  const gunLabels = ["Laser", "Railgun", "MissileLauncher", "PlasmaCannon"];
  const defenseLabels = ["None", "Light", "Medium", "Heavy"];

  return (
    <div className={sectionClass}>
      <h3 className="text-lg font-mono text-text-primary">
        Attribute tables{" "}
        <span className="text-warning-red text-xs">(affects live combat)</span>
      </h3>
      <p className="text-sm text-text-muted">
        Base hull/speed, per-trait bonuses, and per-equipment gun/armor/shield stats.
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
                  {i}: {gunLabels[i] ?? ""}
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
                    {i}: {defenseLabels[i] ?? ""}
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

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !isDirty}
        className={saveBtnClass}
        style={{ borderColor: "var(--color-cyan)" }}
      >
        {isSaving ? "[SAVING…]" : "[SAVE ATTRIBUTE TABLES]"}
      </button>
    </div>
  );
}

const ShipAttributesWeb2: React.FC = () => {
  const canEdit = useWeb2Admin();

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
      <CostsSection />
      <AttributeTablesSection />
    </div>
  );
};

export default ShipAttributesWeb2;

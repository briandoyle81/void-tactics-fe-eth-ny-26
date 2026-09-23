"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import {
  useShipAttributesOwner,
  useCurrentAttributesVersion,
  useLatestAttributesVersion,
  useVariantAttributes,
  useCurrentCostsVersion,
  useChainVariant,
  useMaxVariant,
  useCosts,
  GunData,
  ArmorData,
  ShieldData,
  SpecialData,
  VariantAttributeData,
  Costs,
} from "../hooks/useShipAttributesContract";
import {
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

type CostArrayKey = Exclude<keyof Costs, "version" | "baseCost">;

// Array shapes the contract enforces (InvalidArrayLength/InvalidRankConfig
// otherwise) — see docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §1.4/§2.
const TIER_ARRAY_LENGTH = 3;
const EQUIPMENT_ARRAY_LENGTH = 8;
const RANK_THRESHOLDS_LENGTH = 5;
const RANK_BONUS_LENGTH = 6;
const COST_TIER_LENGTH = 3;
const COST_EQUIPMENT_LENGTH = 8;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// Custom errors ShipAttributes writes can revert with (docs/eth-global-remote/
// frontend-handoff-attributes-costs-and-ai-2026-09-21.md §1.3/§8). viem
// decodes these into the thrown error's message when the ABI has them
// (it does, via CONTRACT_ABIS.SHIP_ATTRIBUTES) — this just picks the
// specific name back out so the toast says something more useful than a
// generic "failed" message.
const SHIP_ATTRIBUTES_ERROR_NAMES = [
  "VariantNotConfigured",
  "InvalidArrayLength",
  "InvalidRankConfig",
  "InvalidAttributesVersion",
  "InvalidCostsVersion",
] as const;

function contractErrorReason(error: Error): string {
  const match = SHIP_ATTRIBUTES_ERROR_NAMES.find((name) =>
    error.message.includes(name),
  );
  if (match) return match;
  return error.message.split("\n")[0];
}

function SavedOnChainValue({
  show,
  children,
  title,
}: {
  show: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  if (!show) return null;
  return (
    <span
      className="text-amber/90 font-mono text-xs tabular-nums text-right min-w-[2.75rem] shrink-0 border-l border-gunmetal pl-2"
      title={title ?? "Onchain (live) until you submit"}
    >
      {children}
    </span>
  );
}

function NumberField({
  value,
  onChange,
  min,
  max,
  liveValue,
  editing,
  width = "w-[4.25rem]",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  liveValue?: number;
  editing: boolean;
  width?: string;
}) {
  if (!editing) {
    return <span className="text-white ml-auto">{value}</span>;
  }
  return (
    <div className="flex items-center gap-2 ml-auto shrink-0">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className={`min-w-0 ${width} px-1 py-0.5 bg-slate text-white rounded-none text-xs`}
      />
      {liveValue !== undefined && (
        <SavedOnChainValue show>{liveValue}</SavedOnChainValue>
      )}
    </div>
  );
}

function CostsArrayCard({
  title,
  field,
  costs,
  newCosts,
  setNewCosts,
  editing,
  getLabel,
}: {
  title: string;
  field: CostArrayKey;
  costs: Costs;
  newCosts: Partial<Costs>;
  setNewCosts: React.Dispatch<React.SetStateAction<Partial<Costs>>>;
  editing: boolean;
  getLabel: (index: number) => string;
}) {
  const values =
    (newCosts[field] as number[] | undefined) ?? (costs[field] as number[]);

  return (
    <div className="bg-steel rounded-none p-3">
      <h4 className="text-white font-mono mb-2">{title}</h4>
      <div className="space-y-1 text-sm">
        {values.map((cost, index) => (
          <div
            key={index}
            className="flex justify-between items-center gap-2 min-h-[2rem]"
          >
            <span className="text-text-muted shrink-0">{getLabel(index)}:</span>
            <NumberField
              value={cost}
              min={0}
              max={255}
              editing={editing}
              liveValue={(costs[field] as number[])[index]}
              width="w-[5.5rem]"
              onChange={(v) => {
                setNewCosts((prev) => {
                  const base =
                    (prev[field] as number[] | undefined)?.slice() ??
                    [...(costs[field] as number[])];
                  base[index] = v;
                  return { ...prev, [field]: base };
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Slots 0-3 of guns/armors/shields/specials are the real, nameable
// equipment; 4-7 are inert `future*` filler (zero stats, never equippable)
// on every variant today.
function slotLabel(
  kind: "gun" | "armor" | "shield" | "special",
  index: number,
  variant: number,
): string {
  if (index >= 4) return `Future ${index} (unused)`;
  switch (kind) {
    case "gun":
      return getMainWeaponName(index, variant);
    case "armor":
      return getArmorName(index);
    case "shield":
      return getShieldName(index);
    case "special":
      return getSpecialName(index, variant);
  }
}

function GunSlotCard({
  index,
  variant,
  live,
  draft,
  editing,
  onChange,
}: {
  index: number;
  variant: number;
  live: GunData;
  draft: GunData;
  editing: boolean;
  onChange: (next: GunData) => void;
}) {
  return (
    <div
      className={`bg-gunmetal rounded-none p-2 ${index >= 4 ? "opacity-60" : ""}`}
    >
      <h5 className="text-white font-mono text-sm mb-2">
        {slotLabel("gun", index, variant)}
      </h5>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Range:</span>
          <NumberField
            value={draft.range}
            min={0}
            max={255}
            editing={editing}
            liveValue={live.range}
            onChange={(range) => onChange({ ...draft, range })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Damage:</span>
          <NumberField
            value={draft.damage}
            min={0}
            max={255}
            editing={editing}
            liveValue={live.damage}
            onChange={(damage) => onChange({ ...draft, damage })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Movement:</span>
          <NumberField
            value={draft.movement}
            min={-128}
            max={127}
            editing={editing}
            liveValue={live.movement}
            onChange={(movement) => onChange({ ...draft, movement })}
          />
        </div>
      </div>
    </div>
  );
}

function ArmorOrShieldSlotCard({
  kind,
  index,
  live,
  draft,
  editing,
  onChange,
}: {
  kind: "armor" | "shield";
  index: number;
  live: ArmorData | ShieldData;
  draft: ArmorData | ShieldData;
  editing: boolean;
  onChange: (next: ArmorData | ShieldData) => void;
}) {
  return (
    <div
      className={`bg-gunmetal rounded-none p-2 ${index >= 4 ? "opacity-60" : ""}`}
    >
      <h5 className="text-white font-mono text-sm mb-2">
        {slotLabel(kind, index, 1)}
      </h5>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">DR:</span>
          <NumberField
            value={draft.damageReduction}
            min={0}
            max={255}
            editing={editing}
            liveValue={live.damageReduction}
            onChange={(damageReduction) =>
              onChange({ ...draft, damageReduction })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Movement:</span>
          <NumberField
            value={draft.movement}
            min={-128}
            max={127}
            editing={editing}
            liveValue={live.movement}
            onChange={(movement) => onChange({ ...draft, movement })}
          />
        </div>
      </div>
      {index === 0 && (
        <p className="text-text-muted text-[10px] mt-1 leading-tight">
          {kind === "armor"
            ? "Once-only no-gear bonus (applies only when neither armor nor shields are equipped)."
            : "Movement here is never read by the contract."}
        </p>
      )}
    </div>
  );
}

function SpecialSlotCard({
  index,
  variant,
  live,
  draft,
  editing,
  onChange,
}: {
  index: number;
  variant: number;
  live: SpecialData;
  draft: SpecialData;
  editing: boolean;
  onChange: (next: SpecialData) => void;
}) {
  return (
    <div
      className={`bg-gunmetal rounded-none p-2 ${index >= 4 ? "opacity-60" : ""}`}
    >
      <h5 className="text-white font-mono text-sm mb-2">
        {slotLabel("special", index, variant)}
      </h5>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Range:</span>
          <NumberField
            value={draft.range}
            min={0}
            max={255}
            editing={editing}
            liveValue={live.range}
            onChange={(range) => onChange({ ...draft, range })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Strength:</span>
          <NumberField
            value={draft.strength}
            min={0}
            max={255}
            editing={editing}
            liveValue={live.strength}
            onChange={(strength) => onChange({ ...draft, strength })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted shrink-0">Movement:</span>
          <NumberField
            value={draft.movement}
            min={-128}
            max={127}
            editing={editing}
            liveValue={live.movement}
            onChange={(movement) => onChange({ ...draft, movement })}
          />
        </div>
      </div>
    </div>
  );
}

function TierArrayCard({
  title,
  values,
  liveValues,
  editing,
  getLabel,
  onChange,
}: {
  title: string;
  values: number[];
  liveValues: number[];
  editing: boolean;
  getLabel: (i: number) => string;
  onChange: (index: number, v: number) => void;
}) {
  return (
    <div className="bg-steel rounded-none p-3">
      <h4 className="text-white font-mono mb-2">{title}</h4>
      <div className="space-y-1 text-sm">
        {values.map((v, i) => (
          <div key={i} className="flex justify-between items-center gap-2 min-h-[2rem]">
            <span className="text-text-muted shrink-0">{getLabel(i)}:</span>
            <NumberField
              value={v}
              min={0}
              max={255}
              editing={editing}
              liveValue={liveValues[i]}
              onChange={(next) => onChange(i, next)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function validateDraft(draft: VariantAttributeData): string[] {
  const errors: string[] = [];
  if (draft.rankThresholds.length !== RANK_THRESHOLDS_LENGTH) {
    errors.push(`rankThresholds must have exactly ${RANK_THRESHOLDS_LENGTH} entries.`);
  } else {
    if (draft.rankThresholds[0] <= 0) {
      errors.push("The first rank threshold must be greater than 0.");
    }
    for (let i = 1; i < draft.rankThresholds.length; i++) {
      if (draft.rankThresholds[i] <= draft.rankThresholds[i - 1]) {
        errors.push("Rank thresholds must be strictly ascending.");
        break;
      }
    }
  }
  if (draft.rankBonusPct.length !== RANK_BONUS_LENGTH) {
    errors.push(`rankBonusPct must have exactly ${RANK_BONUS_LENGTH} entries.`);
  } else if (draft.rankBonusPct.some((p) => p > 100)) {
    errors.push("Every rank bonus % must be ≤ 100.");
  }
  return errors;
}

const ShipAttributes: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { owner, isOwner } = useShipAttributesOwner();

  // Costs and attributes are stored per ship variant (faction); the picker
  // drives both panels below.
  const chainVariant = useChainVariant();
  const [pickedVariant, setPickedVariant] = useState<number | null>(null);
  const variant = pickedVariant ?? chainVariant;
  const { data: maxVariantData } = useMaxVariant();
  const maxVariant = Math.max(Number(maxVariantData ?? 0), variant, 2);
  const variantOptions = Array.from({ length: maxVariant }, (_, i) => i + 1);
  const otherVariant = variant === 1 ? 2 : 1;

  // --- Costs (per-variant version; model unchanged, only validation added) ---
  const { data: currentCostsVersion } = useCurrentCostsVersion(undefined, variant);
  const { data: costsData, error: costsError } = useCosts(variant);
  const costs =
    Array.isArray(costsData) && costsData.length > 1
      ? (costsData[1] as Costs)
      : undefined;

  // --- Attributes (versioned per variant; no global version any more) ---
  const { data: currentAttributesVersion, error: currentVersionError } =
    useCurrentAttributesVersion(variant);
  const { data: latestAttributesVersion } = useLatestAttributesVersion(variant);
  const isConfigured = Number(currentAttributesVersion ?? 0) > 0;
  const { data: liveAttributes, error: liveAttributesError } =
    useVariantAttributes(variant, 0);
  // Only fetched to offer "seed from the other variant" when unconfigured.
  const { data: otherVariantAttributes } = useVariantAttributes(otherVariant, 0);

  // State for editing
  const [editingCosts, setEditingCosts] = useState(false);
  const [newCosts, setNewCosts] = useState<Partial<Costs>>({});
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [draft, setDraft] = useState<VariantAttributeData | null>(null);

  // Version history / rollback
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersion, setHistoryVersion] = useState<number | null>(null);
  const { data: historyAttributes } = useVariantAttributes(
    variant,
    historyVersion ?? 0,
  );

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">
          Please connect your wallet to view ship attributes.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <p className="text-warning-red">
          Access denied. Only the contract owner can edit ship attributes.
        </p>
        <p className="text-text-muted text-sm mt-2">Owner: {owner}</p>
        <p className="text-text-muted text-sm">Your address: {address}</p>
      </div>
    );
  }

  const startEditing = () => {
    if (liveAttributes) {
      setDraft(structuredClone(liveAttributes as VariantAttributeData));
      setEditingAttributes(true);
    }
  };

  const seedFromOtherVariant = () => {
    if (otherVariantAttributes) {
      setDraft(structuredClone(otherVariantAttributes as VariantAttributeData));
      setEditingAttributes(true);
    }
  };

  const seedBlank = () => {
    const blankGun: GunData = { range: 0, damage: 0, movement: 0 };
    const blankArmorOrShield: ArmorData = { damageReduction: 0, movement: 0 };
    const blankSpecial: SpecialData = { range: 0, strength: 0, movement: 0 };
    setDraft({
      baseHull: 0,
      baseSpeed: 0,
      foreAccuracy: new Array(TIER_ARRAY_LENGTH).fill(0),
      hull: new Array(TIER_ARRAY_LENGTH).fill(0),
      engineSpeeds: new Array(TIER_ARRAY_LENGTH).fill(0),
      guns: new Array(EQUIPMENT_ARRAY_LENGTH).fill(null).map(() => ({ ...blankGun })),
      armors: new Array(EQUIPMENT_ARRAY_LENGTH).fill(null).map(() => ({ ...blankArmorOrShield })),
      shields: new Array(EQUIPMENT_ARRAY_LENGTH).fill(null).map(() => ({ ...blankArmorOrShield })),
      specials: new Array(EQUIPMENT_ARRAY_LENGTH).fill(null).map(() => ({ ...blankSpecial })),
      rankThresholds: [10, 30, 100, 300, 1000],
      rankBonusPct: [0, 10, 20, 30, 40, 50],
    });
    setEditingAttributes(true);
  };

  const cancelEditingAttributes = () => {
    setEditingAttributes(false);
    setDraft(null);
  };

  const validationErrors = draft ? validateDraft(draft) : [];

  return (
    <div className="space-y-6">
      <div className="bg-near-black rounded-none p-4 border border-gunmetal">
        <h2 className="text-xl font-mono text-white mb-4">
          Ship Attributes Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-steel rounded-none p-3">
            <h3 className="text-white font-mono mb-2">Faction Variant</h3>
            <div className="flex items-center gap-2 text-sm">
              <select
                value={variant}
                disabled={editingCosts || editingAttributes}
                onChange={(e) => setPickedVariant(Number(e.target.value))}
                className="px-2 py-1 bg-near-black text-white border border-gunmetal rounded-none font-mono disabled:opacity-50"
              >
                {variantOptions.map((v) => (
                  <option key={v} value={v}>
                    Variant {v}
                  </option>
                ))}
              </select>
              <span className="text-text-muted text-xs">
                Costs and attributes below are for this variant.
              </span>
            </div>
          </div>
          <div className="bg-steel rounded-none p-3">
            <h3 className="text-white font-mono mb-2">Current Versions</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Attributes:</span>
                <span className="text-white">
                  {currentVersionError
                    ? "read failed"
                    : isConfigured
                      ? `v${currentAttributesVersion} (latest v${latestAttributesVersion ?? "?"})`
                      : "not configured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Costs Version:</span>
                <span className="text-white">
                  {currentCostsVersion?.toString() || "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-steel rounded-none p-3">
            <h3 className="text-white font-mono mb-2">Contract Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Owner:</span>
                <span className="text-white font-mono text-xs">{owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Your Address:</span>
                <span className="text-white font-mono text-xs">{address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Costs Management */}
      <div className="bg-near-black rounded-none p-4 border border-gunmetal">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-mono text-white">Costs Management</h3>
          <button
            onClick={() => {
              if (editingCosts) {
                setNewCosts({});
              }
              setEditingCosts(!editingCosts);
            }}
            className="px-4 py-2 border border-cyan text-cyan rounded-none font-mono hover:bg-cyan/10 transition-colors"
          >
            {editingCosts ? "Cancel" : "Edit Costs"}
          </button>
        </div>

        {costs && (
          <div className="space-y-4">
            {editingCosts && (
              <p className="text-xs text-text-muted font-mono">
                Right column: onchain value until Update Costs succeeds.
                Publishing bumps this variant&apos;s costs version, which
                makes every existing ship of this variant stale until synced
                (Manage Navy shows a per-ship sync button).
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-steel rounded-none p-3">
                <h4 className="text-white font-mono mb-2">Base Cost</h4>
                <div className="flex items-center gap-2">
                  <NumberField
                    value={newCosts.baseCost ?? costs.baseCost}
                    min={0}
                    max={255}
                    editing={editingCosts}
                    liveValue={editingCosts ? costs.baseCost : undefined}
                    onChange={(v) => setNewCosts((prev) => ({ ...prev, baseCost: v }))}
                  />
                </div>
              </div>

              <CostsArrayCard
                title="Accuracy Costs"
                field="accuracy"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => `Level ${i}`}
              />

              <CostsArrayCard
                title="Hull Costs"
                field="hull"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => `Level ${i}`}
              />

              <CostsArrayCard
                title="Speed Costs"
                field="speed"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => `Level ${i}`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CostsArrayCard
                title="Main Weapon Costs"
                field="mainWeapon"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => slotLabel("gun", i, variant)}
              />

              <CostsArrayCard
                title="Armor Costs"
                field="armor"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => slotLabel("armor", i, variant)}
              />

              <CostsArrayCard
                title="Shield Costs"
                field="shields"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => slotLabel("shield", i, variant)}
              />

              <CostsArrayCard
                title="Special Costs"
                field="special"
                costs={costs}
                newCosts={newCosts}
                setNewCosts={setNewCosts}
                editing={editingCosts}
                getLabel={(i) => slotLabel("special", i, variant)}
              />
            </div>

            {editingCosts &&
              (() => {
                const merged: Costs = { ...costs, ...newCosts };
                const costErrors: string[] = [];
                if (merged.accuracy.length !== COST_TIER_LENGTH) costErrors.push("accuracy must have 3 entries.");
                if (merged.hull.length !== COST_TIER_LENGTH) costErrors.push("hull must have 3 entries.");
                if (merged.speed.length !== COST_TIER_LENGTH) costErrors.push("speed must have 3 entries.");
                if (merged.mainWeapon.length !== COST_EQUIPMENT_LENGTH) costErrors.push("mainWeapon must have 8 entries.");
                if (merged.armor.length !== COST_EQUIPMENT_LENGTH) costErrors.push("armor must have 8 entries.");
                if (merged.shields.length !== COST_EQUIPMENT_LENGTH) costErrors.push("shields must have 8 entries.");
                if (merged.special.length !== COST_EQUIPMENT_LENGTH) costErrors.push("special must have 8 entries.");
                return (
                  <div className="space-y-2">
                    {costErrors.length > 0 && (
                      <div className="text-warning-red text-xs font-mono space-y-0.5">
                        {costErrors.map((e, i) => (
                          <p key={i}>⚠ {e}</p>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingCosts(false);
                          setNewCosts({});
                        }}
                        className="px-4 py-2 bg-gunmetal text-white rounded-none font-mono hover:bg-steel transition-colors"
                      >
                        Cancel
                      </button>
                      <TransactionButton
                        transactionId="update-costs"
                        contractAddress={CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`}
                        abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                        functionName="setCosts"
                        disabled={costErrors.length > 0}
                        args={[
                          variant,
                          {
                            ...merged,
                            // Contract ignores this and bumps the stored version itself.
                            version: costs.version,
                          },
                        ]}
                        className="px-4 py-2 border border-phosphor-green text-phosphor-green rounded-none font-mono hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
                        onSuccess={() => {
                          toast.success("Costs updated successfully!");
                          setEditingCosts(false);
                          setNewCosts({});
                        }}
                        onError={(error) => {
                          console.error("Failed to update costs:", error);
                          toast.error(`Failed to update costs: ${contractErrorReason(error)}`);
                        }}
                      >
                        Update Costs
                      </TransactionButton>
                    </div>
                  </div>
                );
              })()}
          </div>
        )}
        {!costs && (
          <p className="text-sm text-warning-red font-mono">
            Could not read costs for variant {variant}
            {costsError
              ? costsError.message.includes("InvalidCostsVersion")
                ? ": costs have never been set for this variant."
                : `: ${costsError.message.split("\n")[0]}`
              : "."}
          </p>
        )}
      </div>

      {/* Attributes Management */}
      <div className="bg-near-black rounded-none p-4 border border-gunmetal">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-mono text-white">Attributes Management</h3>
          {isConfigured && !editingAttributes && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory((s) => !s)}
                className="px-3 py-2 border border-gunmetal text-text-muted rounded-none font-mono hover:bg-steel transition-colors text-sm"
              >
                {showHistory ? "Hide History" : "History"}
              </button>
              <button
                onClick={startEditing}
                disabled={!liveAttributes}
                className="px-4 py-2 border border-cyan text-cyan rounded-none font-mono hover:bg-cyan/10 transition-colors disabled:opacity-50"
              >
                Edit Attributes
              </button>
            </div>
          )}
          {editingAttributes && (
            <button
              onClick={cancelEditingAttributes}
              className="px-4 py-2 border border-cyan text-cyan rounded-none font-mono hover:bg-cyan/10 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {!isConfigured && !editingAttributes && (
          <div className="space-y-3">
            <p className="text-sm text-warning-red font-mono">
              Variant {variant} has never been configured
              {liveAttributesError && !liveAttributesError.message.includes("VariantNotConfigured")
                ? `: ${liveAttributesError.message.split("\n")[0]}`
                : "."}{" "}
              Publishing is the only way to make it live — there is no
              separate &quot;start version&quot; step.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={seedFromOtherVariant}
                disabled={!otherVariantAttributes}
                className="px-4 py-2 border border-cyan text-cyan rounded-none font-mono hover:bg-cyan/10 transition-colors disabled:opacity-50"
              >
                Copy from Variant {otherVariant} to start
              </button>
              <button
                onClick={seedBlank}
                className="px-4 py-2 border border-gunmetal text-text-muted rounded-none font-mono hover:bg-steel transition-colors"
              >
                Start blank (all zeros)
              </button>
            </div>
          </div>
        )}

        {showHistory && isConfigured && !editingAttributes && (
          <div className="bg-steel rounded-none p-3 mb-4 space-y-2">
            <h4 className="text-white font-mono mb-1">Version History</h4>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <select
                value={historyVersion ?? Number(currentAttributesVersion) ?? 1}
                onChange={(e) => setHistoryVersion(Number(e.target.value))}
                className="px-2 py-1 bg-near-black text-white border border-gunmetal rounded-none font-mono"
              >
                {Array.from(
                  { length: Number(latestAttributesVersion ?? 0) },
                  (_, i) => i + 1,
                ).map((v) => (
                  <option key={v} value={v}>
                    v{v}
                    {v === Number(currentAttributesVersion) ? " (live)" : ""}
                  </option>
                ))}
              </select>
              {!!historyAttributes && (
                <span className="text-text-muted text-xs font-mono">
                  Base Hull {(historyAttributes as VariantAttributeData).baseHull} · Base
                  Speed {(historyAttributes as VariantAttributeData).baseSpeed}
                </span>
              )}
              {historyVersion != null &&
                historyVersion !== Number(currentAttributesVersion) && (
                  <TransactionButton
                    transactionId="rollback-attributes-version"
                    contractAddress={CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`}
                    abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                    functionName="setCurrentAttributesVersion"
                    args={[variant, historyVersion]}
                    className="px-3 py-1.5 border border-amber text-amber rounded-none font-mono hover:bg-amber/10 transition-colors text-sm"
                    onSuccess={() => {
                      toast.success(`Variant ${variant} rolled back to v${historyVersion}`);
                    }}
                    onError={(error) => {
                      console.error("Failed to roll back attributes version:", error);
                      toast.error(`Failed to roll back: ${contractErrorReason(error)}`);
                    }}
                  >
                    Rollback to v{historyVersion}
                  </TransactionButton>
                )}
            </div>
            <p className="text-text-muted text-[10px] font-mono">
              Rollback only changes what NEW calculations use — no version is
              ever deleted, and in-flight games keep the version pinned when
              they started.
            </p>
          </div>
        )}

        {editingAttributes && draft && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted font-mono">
              Right column: the live table until you publish. Publishing
              overwrites variant {variant}&apos;s data as a brand-new version
              (latest + 1) and makes it live immediately — every field below
              is a full table, not a delta.
            </p>

            {/* Base Attributes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-steel rounded-none p-3">
                <h4 className="text-white font-mono mb-2">Base Attributes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-text-muted">Base Hull:</span>
                    <NumberField
                      value={draft.baseHull}
                      min={0}
                      max={255}
                      editing
                      liveValue={(liveAttributes as VariantAttributeData | undefined)?.baseHull}
                      onChange={(baseHull) => setDraft({ ...draft, baseHull })}
                    />
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-text-muted">Base Speed:</span>
                    <NumberField
                      value={draft.baseSpeed}
                      min={0}
                      max={255}
                      editing
                      liveValue={(liveAttributes as VariantAttributeData | undefined)?.baseSpeed}
                      onChange={(baseSpeed) => setDraft({ ...draft, baseSpeed })}
                    />
                  </div>
                </div>
              </div>

              <TierArrayCard
                title="Fore Accuracy % (tier 0-2)"
                values={draft.foreAccuracy}
                liveValues={(liveAttributes as VariantAttributeData | undefined)?.foreAccuracy ?? []}
                editing
                getLabel={(i) => `Tier ${i}`}
                onChange={(i, v) => {
                  const next = [...draft.foreAccuracy];
                  next[i] = v;
                  setDraft({ ...draft, foreAccuracy: next });
                }}
              />

              <TierArrayCard
                title="Hull Bonus (tier 0-2)"
                values={draft.hull}
                liveValues={(liveAttributes as VariantAttributeData | undefined)?.hull ?? []}
                editing
                getLabel={(i) => `Tier ${i}`}
                onChange={(i, v) => {
                  const next = [...draft.hull];
                  next[i] = v;
                  setDraft({ ...draft, hull: next });
                }}
              />

              <TierArrayCard
                title="Engine Speeds (tier 0-2)"
                values={draft.engineSpeeds}
                liveValues={(liveAttributes as VariantAttributeData | undefined)?.engineSpeeds ?? []}
                editing
                getLabel={(i) => `Tier ${i}`}
                onChange={(i, v) => {
                  const next = [...draft.engineSpeeds];
                  next[i] = v;
                  setDraft({ ...draft, engineSpeeds: next });
                }}
              />
            </div>

            {/* Gun Data */}
            <div className="bg-steel rounded-none p-3">
              <h4 className="text-white font-mono mb-2">Gun Data (8 slots)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {draft.guns.map((g, i) => (
                  <GunSlotCard
                    key={i}
                    index={i}
                    variant={variant}
                    live={(liveAttributes as VariantAttributeData | undefined)?.guns[i] ?? g}
                    draft={g}
                    editing
                    onChange={(next) => {
                      const guns = [...draft.guns];
                      guns[i] = next;
                      setDraft({ ...draft, guns });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Armor Data */}
            <div className="bg-steel rounded-none p-3">
              <h4 className="text-white font-mono mb-2">Armor Data (8 slots)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {draft.armors.map((a, i) => (
                  <ArmorOrShieldSlotCard
                    key={i}
                    kind="armor"
                    index={i}
                    live={(liveAttributes as VariantAttributeData | undefined)?.armors[i] ?? a}
                    draft={a}
                    editing
                    onChange={(next) => {
                      const armors = [...draft.armors];
                      armors[i] = next as ArmorData;
                      setDraft({ ...draft, armors });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Shield Data */}
            <div className="bg-steel rounded-none p-3">
              <h4 className="text-white font-mono mb-2">Shield Data (8 slots)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {draft.shields.map((s, i) => (
                  <ArmorOrShieldSlotCard
                    key={i}
                    kind="shield"
                    index={i}
                    live={(liveAttributes as VariantAttributeData | undefined)?.shields[i] ?? s}
                    draft={s}
                    editing
                    onChange={(next) => {
                      const shields = [...draft.shields];
                      shields[i] = next as ShieldData;
                      setDraft({ ...draft, shields });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Special Data */}
            <div className="bg-steel rounded-none p-3">
              <h4 className="text-white font-mono mb-2">Special Data (8 slots)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {draft.specials.map((s, i) => (
                  <SpecialSlotCard
                    key={i}
                    index={i}
                    variant={variant}
                    live={(liveAttributes as VariantAttributeData | undefined)?.specials[i] ?? s}
                    draft={s}
                    editing
                    onChange={(next) => {
                      const specials = [...draft.specials];
                      specials[i] = next;
                      setDraft({ ...draft, specials });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Rank Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TierArrayCard
                title="Rank Thresholds (kills for ranks 2-6)"
                values={draft.rankThresholds}
                liveValues={(liveAttributes as VariantAttributeData | undefined)?.rankThresholds ?? []}
                editing
                getLabel={(i) => `Rank ${i + 2}`}
                onChange={(i, v) => {
                  const next = [...draft.rankThresholds];
                  next[i] = v;
                  setDraft({ ...draft, rankThresholds: next });
                }}
              />
              <TierArrayCard
                title="Rank Bonus % (ranks 1-6)"
                values={draft.rankBonusPct}
                liveValues={(liveAttributes as VariantAttributeData | undefined)?.rankBonusPct ?? []}
                editing
                getLabel={(i) => `Rank ${i + 1}`}
                onChange={(i, v) => {
                  const next = [...draft.rankBonusPct];
                  next[i] = v;
                  setDraft({ ...draft, rankBonusPct: next });
                }}
              />
            </div>

            {validationErrors.length > 0 && (
              <div className="text-warning-red text-xs font-mono space-y-0.5">
                {validationErrors.map((e, i) => (
                  <p key={i}>⚠ {e}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelEditingAttributes}
                className="px-4 py-2 bg-gunmetal text-white rounded-none font-mono hover:bg-steel transition-colors"
              >
                Cancel
              </button>
              <TransactionButton
                transactionId="publish-attributes"
                contractAddress={CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`}
                abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                functionName="setVariantAttributes"
                disabled={validationErrors.length > 0}
                args={[{ variant, ...draft }]}
                className="px-4 py-2 border border-phosphor-green text-phosphor-green rounded-none font-mono hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
                onSuccess={() => {
                  toast.success(`Variant ${variant} attributes published!`);
                  setEditingAttributes(false);
                  setDraft(null);
                }}
                onError={(error) => {
                  console.error("Failed to publish attributes:", error);
                  toast.error(`Failed to publish attributes: ${contractErrorReason(error)}`);
                }}
              >
                Publish (new version)
              </TransactionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipAttributes;

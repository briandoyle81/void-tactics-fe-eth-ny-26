"use client";

import React from "react";
import { useVariantPurchaseGate } from "../hooks/useVariantPurchaseGate";

interface VariantPickerProps {
  selectedVariant: number;
  onSelect: (variant: number) => void;
  className?: string;
}

const FACTIONS: { variant: number; label: string; description: string }[] = [
  { variant: 1, label: "Faction 1", description: "Ram — evicts a downed enemy ship." },
  { variant: 2, label: "Faction 2 — Shattered Hive", description: "Repair — heals a nearby friendly ship." },
];

/**
 * Faction/variant picker for purchase and free-claim flows. Both ship
 * bundle purchases and free claims take an explicit `_variant` per
 * transaction (docs/faction-2.md §5) — this makes that choice user-facing
 * instead of implicit, gating variant 2 on the Shattered Hive medal.
 */
export function VariantPicker({ selectedVariant, onSelect, className = "" }: VariantPickerProps) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      {FACTIONS.map((faction) => (
        <VariantCard
          key={faction.variant}
          faction={faction}
          isSelected={selectedVariant === faction.variant}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function VariantCard({
  faction,
  isSelected,
  onSelect,
}: {
  faction: (typeof FACTIONS)[number];
  isSelected: boolean;
  onSelect: (variant: number) => void;
}) {
  const { isGated, isUnlocked, isLoading } = useVariantPurchaseGate(faction.variant);
  const locked = isGated && !isUnlocked;

  return (
    <button
      type="button"
      disabled={locked || isLoading}
      onClick={() => onSelect(faction.variant)}
      className={`relative min-h-0 px-4 py-4 rounded-none border-2 font-mono tracking-wider text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected ? "border-cyan text-cyan bg-cyan/10" : "border-gunmetal text-text-secondary hover:border-steel"
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-extrabold uppercase tracking-widest">{faction.label}</div>
        <div className="text-[11px] opacity-80">{faction.description}</div>
        {locked && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-warning-red">
            [Requires Shattered Hive medal]
          </div>
        )}
      </div>
    </button>
  );
}

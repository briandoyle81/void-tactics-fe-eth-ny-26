"use client";

import React, { useEffect, useState } from "react";
import { WIN_EFFECT_KEYS, WIN_EFFECT_LABELS, IMPLEMENTED_WIN_EFFECT_KEYS, type WinEffectKey } from "../lib/winEffectsCatalog";

interface WinEffectsPickerWeb2Props {
  currentEffects: string[] | undefined;
  onSave: (effects: WinEffectKey[]) => Promise<void>;
  saveLabel?: string;
}

// Web2 counterpart to WinEffectsPicker.tsx — same checkbox-list + save
// shape, backed by a plain PUT instead of setWinEffects(address[]). Used by
// PvPMatchAdminPanelWeb2, TournamentWinEffectsAdminPanelWeb2, and
// RoguelikeNodeEditPanelWeb2 (per-node). HEAL_ABOVE_FLOOR_WIN_EFFECT is
// shown disabled — applyWinEffects() doesn't act on it yet, see
// winEffectsWeb2.ts's module doc.
export function WinEffectsPickerWeb2({ currentEffects, onSave, saveLabel = "[SAVE WIN EFFECTS]" }: WinEffectsPickerWeb2Props) {
  const [selected, setSelected] = useState<WinEffectKey[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected((currentEffects ?? []).filter((e): e is WinEffectKey => WIN_EFFECT_KEYS.includes(e as WinEffectKey)));
  }, [currentEffects]);

  const toggle = (key: WinEffectKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {WIN_EFFECT_KEYS.map((key) => {
        const implemented = (IMPLEMENTED_WIN_EFFECT_KEYS as readonly string[]).includes(key);
        const checked = selected.includes(key);
        return (
          <label key={key} className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={checked}
              disabled={!implemented}
              onChange={() => toggle(key)}
            />
            {WIN_EFFECT_LABELS[key]}
            {!implemented && <span className="text-warning-red">(not yet implemented)</span>}
          </label>
        );
      })}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="self-start px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "[SAVING...]" : saveLabel}
      </button>
    </div>
  );
}

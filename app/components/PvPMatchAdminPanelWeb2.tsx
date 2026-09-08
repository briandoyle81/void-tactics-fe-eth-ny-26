"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useWinEffectsAdminWeb2 } from "../hooks/useWinEffectsAdminWeb2";
import { WinEffectsPickerWeb2 } from "./WinEffectsPickerWeb2";
import type { WinEffectKey } from "../lib/winEffectsWeb2";

// Web2 counterpart to PvPMatchAdminPanel.tsx — assigns which win effects
// fire for the winner of a plain PvP game (not AI, campaign, roguelike, or
// tournament — see resolvePvpWinEffectsIfApplicable.ts), gated on
// useWeb2Admin() instead of PvPMatch's Ownable.owner().
export function PvPMatchAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const { settings, update } = useWinEffectsAdminWeb2();

  if (!isAdmin) return null;

  const handleSave = async (effects: WinEffectKey[]) => {
    try {
      await update({ pvpWinEffects: effects });
      toast.success("PvP win effects updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update PvP win effects");
    }
  };

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">[PVP WIN EFFECTS]</h4>
      <p className="text-xs text-text-muted">
        Fires for the winner of every plain PvP game (not AI, campaign, roguelike, or
        tournament matches — those have their own effect config). Empty by default.
      </p>
      <WinEffectsPickerWeb2 currentEffects={settings?.pvpWinEffects} onSave={handleSave} />
    </div>
  );
}

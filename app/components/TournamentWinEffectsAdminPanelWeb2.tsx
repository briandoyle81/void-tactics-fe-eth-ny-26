"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useWinEffectsAdminWeb2 } from "../hooks/useWinEffectsAdminWeb2";
import { WinEffectsPickerWeb2 } from "./WinEffectsPickerWeb2";
import type { WinEffectKey } from "../lib/winEffectsCatalog";

// Web2 counterpart to TournamentWinEffectsAdminPanel.tsx — fires for the
// champion of every finalized tournament (see the finalize route), gated on
// useWeb2Admin() instead of Tournament's Ownable.owner().
export function TournamentWinEffectsAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const { settings, update } = useWinEffectsAdminWeb2();

  if (!isAdmin) return null;

  const handleSave = async (effects: WinEffectKey[]) => {
    try {
      await update({ tournamentWinEffects: effects });
      toast.success("Tournament win effects updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tournament win effects");
    }
  };

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">
        [TOURNAMENT WIN EFFECTS]
      </h4>
      <p className="text-xs text-text-muted">
        Fires for the champion of every finalized tournament. Empty by default.
      </p>
      <WinEffectsPickerWeb2 currentEffects={settings?.tournamentWinEffects} onSave={handleSave} />
    </div>
  );
}

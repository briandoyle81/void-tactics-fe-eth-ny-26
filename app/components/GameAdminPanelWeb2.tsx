"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useWinEffectsAdminWeb2 } from "../hooks/useWinEffectsAdminWeb2";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

// Web2 counterpart to GameAdminPanel.tsx — same global heal cap, gated on
// useWeb2Admin() instead of Ownable's owner(). Backed by
// win_effects_settings' healCapPercent field instead of
// Game.setHealCapPercent.
export function GameAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const { settings, isLoading, update } = useWinEffectsAdminWeb2();
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings != null) setPercent(settings.healCapPercent.toString());
  }, [settings]);

  if (!isAdmin) return null;

  const parsedPercent = Number(percent);
  const valid =
    percent.trim() !== "" && Number.isInteger(parsedPercent) && parsedPercent >= 0 && parsedPercent <= 100;

  const handleSet = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await update({ healCapPercent: parsedPercent });
      toast.success("Heal cap updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update heal cap");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">[GAME SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Current heal cap:{" "}
        {isLoading || settings == null ? "…" : `${settings.healCapPercent}%`}. Caps any heal
        effect (Repair special, win-effect heals, etc.), in every mode, at this percentage of a
        ship&apos;s max HP.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-cyan mb-1">Heal cap (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => void handleSet()}
          className="px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "[SAVING...]" : "[SET HEAL CAP]"}
        </button>
      </div>
    </div>
  );
}

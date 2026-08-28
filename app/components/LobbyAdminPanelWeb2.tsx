"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useLobbySettingsAdminWeb2 } from "../hooks/useLobbyPauseAdminWeb2";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

// Web2 counterpart to LobbyAdminPanel.tsx — same "stale-lobby threshold"
// control, gated on useWeb2Admin() instead of the Lobbies contract's
// Ownable.owner(). Backed by app/lib/lobbySettings.ts's Config-table row
// instead of Lobbies.sol's setStaleLobbyThreshold.
export function LobbyAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const { settings, isLoading, setStaleLobbyThresholdDays } = useLobbySettingsAdminWeb2();
  const [days, setDays] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings != null) {
      setDays(settings.staleLobbyThresholdDays.toString());
    }
  }, [settings]);

  if (!isAdmin) return null;

  const parsedDays = Number(days);
  const valid = days.trim() !== "" && Number.isFinite(parsedDays) && parsedDays > 0;

  const handleSet = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await setStaleLobbyThresholdDays(parsedDays);
      toast.success("Stale-lobby threshold updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update threshold");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">[LOBBY SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Current stale-lobby threshold:{" "}
        {isLoading || settings == null ? "…" : `${settings.staleLobbyThresholdDays} day(s)`}
        . An open, unjoined lobby older than this can be pruned from the browse list (still
        joinable directly by id).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-cyan mb-1">Threshold (days)</label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
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
          {saving ? "[SAVING...]" : "[SET THRESHOLD]"}
        </button>
      </div>
    </div>
  );
}

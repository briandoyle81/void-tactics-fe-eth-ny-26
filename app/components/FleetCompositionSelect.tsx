"use client";

import type { FleetComposition } from "../utils/fleetCompositionStorage";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "Fleets" preset dropdown, ported verbatim from ManageNavy.tsx's
// `fleetCompositionSelectControl`.
interface FleetCompositionSelectProps {
  fleetCompositions: FleetComposition[];
  selectedId: string | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function FleetCompositionSelect({
  fleetCompositions,
  selectedId,
  onChange,
}: FleetCompositionSelectProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1 md:w-auto">
      <label
        className="text-[10px] font-bold uppercase tracking-wider opacity-70"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-cyan)",
        }}
      >
        Fleets
      </label>
      <select
        value={selectedId ?? ""}
        onChange={onChange}
        className="w-full min-w-0 max-w-full px-3 py-2 text-sm font-semibold uppercase tracking-wider sm:min-w-[12rem] sm:max-w-[16rem]"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundColor: "var(--color-near-black)",
          color: "var(--color-text-primary)",
          border: "2px solid var(--color-gunmetal)",
          borderRadius: 0,
        }}
      >
        <option value="">Manage Fleets</option>
        <option value="__create__">+ Create new fleet</option>
        {fleetCompositions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}

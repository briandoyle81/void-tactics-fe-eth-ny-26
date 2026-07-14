"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import type { FleetComposition } from "../utils/fleetCompositionStorage";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// "LOAD FLEET" saved-composition menu inside the Fleet Selection Modal,
// ported from Lobbies.tsx. `fleetCompositionStorage.ts`/`FleetComposition`
// are already string-id-native and shared (see that file's doc comment),
// so only the availability check (which ships from a saved composition are
// still selectable right now) and the actual load action are caller-
// specific — provided via `getLoadPlan`, since that's where the bigint
// (web3) vs number (web2) ship-id lookup happens.
export interface FleetLoadSummary {
  totalShips: number;
  totalThreat: number;
  availableCount: number;
  unavailableCount: number;
}

export interface FleetLoadPlan {
  availableCount: number;
  unavailableCount: number;
  load: () => void;
}

interface LoadFleetMenuProps {
  fleets: FleetComposition[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  getSummary: (fleet: FleetComposition) => FleetLoadSummary;
  getLoadPlan: (fleet: FleetComposition) => FleetLoadPlan;
}

export function LoadFleetMenu({ fleets, isOpen, onToggleOpen, onClose, getSummary, getLoadPlan }: LoadFleetMenuProps) {
  const [pending, setPending] = useState<{ fleetName: string; plan: FleetLoadPlan } | null>(null);

  const handleSelectFleet = (fleet: FleetComposition) => {
    const plan = getLoadPlan(fleet);
    if (plan.availableCount === 0) {
      toast.error("No available ships from that saved fleet can be loaded.");
      return;
    }
    if (plan.unavailableCount > 0) {
      onClose();
      setPending({ fleetName: fleet.name, plan });
      return;
    }
    plan.load();
    onClose();
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        disabled={fleets.length === 0}
        className="px-2 py-1 text-xs font-bold text-cyan border border-cyan rounded-none hover:text-cyan/80 hover:border-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        LOAD FLEET
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[450] mt-2 w-[28rem] max-w-[80vw] border border-cyan bg-near-black p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold tracking-wider text-cyan">LOAD SAVED FLEET</div>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 text-[11px] border border-steel text-text-secondary hover:text-text-primary hover:border-steel"
            >
              CLOSE
            </button>
          </div>
          <div className="max-h-56 overflow-auto space-y-2 pr-1">
            {fleets.length === 0 ? (
              <div className="text-xs text-text-muted">No saved fleets found.</div>
            ) : (
              fleets.map((fleet) => {
                const summary = getSummary(fleet);
                return (
                  <button
                    key={fleet.id}
                    type="button"
                    onClick={() => handleSelectFleet(fleet)}
                    className="w-full border border-cyan/40 bg-black/40 p-2 text-left hover:border-cyan hover:bg-cyan/5"
                  >
                    <div className="text-sm font-bold text-cyan">{fleet.name}</div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {summary.totalShips} ships | Threat {summary.totalThreat} | Available {summary.availableCount}
                      {summary.unavailableCount > 0 ? ` | Unavailable ${summary.unavailableCount}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {pending && (
        <div className="mb-3 border border-amber/70 bg-amber/10 p-3">
          <div className="text-sm font-bold text-amber">
            Some ships from {pending.fleetName} are unavailable.
          </div>
          <div className="mt-1 text-xs text-amber/80">
            {pending.plan.unavailableCount} ship{pending.plan.unavailableCount === 1 ? "" : "s"} are unavailable
            (already in a fleet, dead, or not constructed). Load the remaining {pending.plan.availableCount} ship
            {pending.plan.availableCount === 1 ? "" : "s"}?
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                pending.plan.load();
                setPending(null);
              }}
              className="px-3 py-1 border border-amber text-amber/80 hover:bg-amber/20 text-xs font-bold"
            >
              LOAD AVAILABLE SHIPS
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-3 py-1 border border-steel text-text-secondary hover:border-steel hover:text-text-primary text-xs font-bold"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </>
  );
}

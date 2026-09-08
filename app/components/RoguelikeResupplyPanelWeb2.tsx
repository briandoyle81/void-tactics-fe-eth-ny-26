"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { useRoguelikeResupplyWeb2 } from "../hooks/useRoguelikeResupplyWeb2";
import type { RoguelikeRunWeb2, RoguelikeNodeWeb2 } from "../hooks/useRoguelikeWeb2";
import ShipCard from "./ShipCard";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";

interface RoguelikeResupplyPanelWeb2Props {
  run: RoguelikeRunWeb2;
  node: RoguelikeNodeWeb2;
  onDone: () => void;
}

// Web2 counterpart to RoguelikeResupplyPanel.tsx — same per-ship repair
// selection (not a single repair-all action — the backend already supports
// a shipIds subset, see /api/roguelike/run/resupply/repair's doc comment),
// roster HP display (RoguelikeRosterShip.hp stores damage taken, 0 = fully
// healed), and add/remove roster controls. No token-approve step is needed
// here (creditBalance is a plain ledger column, not an ERC20 allowance) —
// that's the one legitimate mechanism difference from web3's UTC approve +
// resupplyRepair two-step TransactionButton flow.
export function RoguelikeResupplyPanelWeb2({ run, node, onDone }: RoguelikeResupplyPanelWeb2Props) {
  const { resupplyRepair, resupplyModifyRoster } = useRoguelikeResupplyWeb2();
  const { ships: ownedShips } = useOwnedShipsWeb2();
  const { data: repairCost } = useQuery({
    queryKey: ["roguelike", "repair-cost", "web2"],
    queryFn: () => apiFetch<{ repairCostPerHp: number }>("/api/roguelike/repair-cost"),
  });
  const { attributesByShipId } = useShipAttributesByIdsWeb2(run.roster.map((r) => r.shipId));
  const [selectedForRepair, setSelectedForRepair] = React.useState<Set<number>>(new Set());
  const [isRepairing, setIsRepairing] = React.useState(false);
  const [rosterPending, setRosterPending] = React.useState<number | null>(null);

  const missingHPFor = (shipId: number) => run.roster.find((r) => r.shipId === shipId)?.hp ?? 0;

  const totalMissingHP = React.useMemo(
    () => Array.from(selectedForRepair).reduce((sum, id) => sum + missingHPFor(id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedForRepair, run.roster],
  );
  const previewCost = totalMissingHP * (repairCost?.repairCostPerHp ?? 0);

  const toggleRepairSelection = (shipId: number) => {
    setSelectedForRepair((prev) => {
      const next = new Set(prev);
      if (next.has(shipId)) next.delete(shipId);
      else if (missingHPFor(shipId) > 0) next.add(shipId);
      return next;
    });
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await resupplyRepair(Array.from(selectedForRepair));
      setSelectedForRepair(new Set());
      toast.success(`Repaired ${result.repaired.length} ship(s) for ${result.cost} UTC.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to repair");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRemove = async (shipId: number) => {
    setRosterPending(shipId);
    try {
      await resupplyModifyRoster([], [shipId]);
      toast.success("Ship removed from roster.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to modify roster");
    } finally {
      setRosterPending(null);
    }
  };

  const handleAdd = async (shipId: number) => {
    setRosterPending(shipId);
    try {
      await resupplyModifyRoster([shipId], []);
      toast.success("Ship added to roster.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to modify roster");
    } finally {
      setRosterPending(null);
    }
  };

  const rosterShipIds = new Set(run.roster.map((r) => r.shipId));
  const rosterVariant = run.roster[0]?.ship.traits.variant;
  const availableShips = ownedShips.filter(
    (s) =>
      s.shipData.constructed &&
      s.shipData.timestampDestroyed === 0 &&
      !s.shipData.inFleet &&
      !rosterShipIds.has(s.id) &&
      (rosterVariant != null ? s.traits.variant === rosterVariant : true),
  );

  return (
    <div className="flex flex-col gap-6 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan">[RESUPPLY — NODE #{node.id}]</h3>
        <button
          type="button"
          onClick={onDone}
          className="border-2 border-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10"
          style={{ borderRadius: 0 }}
        >
          [CONTINUE]
        </button>
      </div>

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">Repair Roster</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {run.roster.map((entry) => {
            const max = attributesByShipId.get(entry.shipId)?.maxHullPoints ?? 0;
            const missing = entry.hp;
            const current = max - missing;
            const isSelected = selectedForRepair.has(entry.shipId);
            return (
              <button
                key={entry.id}
                type="button"
                disabled={missing === 0}
                onClick={() => toggleRepairSelection(entry.shipId)}
                className={`flex flex-col gap-1 border-2 p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected ? "border-cyan bg-cyan/10" : "border-gunmetal"
                }`}
                style={{ borderRadius: 0 }}
              >
                <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: "var(--color-slate)" }}>
                  <ShipImageWeb2 ship={entry.ship} className="h-full w-full" showLoadingState={false} />
                </div>
                <span className="truncate text-[10px] uppercase tracking-wider text-text-secondary">
                  {entry.ship.name || `Ship #${entry.shipId}`}
                </span>
                <span className={`text-[10px] ${missing > 0 ? "text-warning-red" : "text-phosphor-green"}`}>
                  HP {current}/{max}
                </span>
              </button>
            );
          })}
        </div>

        {totalMissingHP > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border border-cyan/40 bg-cyan/10 p-3 text-xs">
            <span className="text-cyan">
              Repair cost: {previewCost} UTC ({totalMissingHP} HP)
            </span>
            <button
              type="button"
              disabled={isRepairing}
              onClick={() => void handleRepair()}
              className="border-2 border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {isRepairing ? "[REPAIRING...]" : `[REPAIR ${totalMissingHP} HP]`}
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">
          Roster ({run.roster.length}) — cost cap {run.currentCostCap}
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {run.roster.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1">
              <div
                className="aspect-square w-full overflow-hidden border border-gunmetal"
                style={{ backgroundColor: "var(--color-slate)" }}
              >
                <ShipImageWeb2 ship={entry.ship} className="h-full w-full" showLoadingState={false} />
              </div>
              <button
                type="button"
                disabled={rosterPending === entry.shipId}
                onClick={() => void handleRemove(entry.shipId)}
                className="border border-warning-red px-1 py-0.5 text-[9px] uppercase tracking-wider text-warning-red hover:bg-warning-red/10 disabled:opacity-50"
              >
                [REMOVE]
              </button>
            </div>
          ))}
        </div>
      </div>

      {availableShips.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-text-muted">Add to Roster</h4>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableShips.map((ship) => (
              <div key={ship.id} className="relative">
                <ShipCard
                  ship={toShipCardDataWeb2(ship)}
                  shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
                  isStarred={false}
                  onToggleStar={() => {}}
                  isSelected={false}
                  onToggleSelection={() => {}}
                  onRecycleClick={() => {}}
                  showInGameProperties={false}
                  hideRecycle
                  hideCheckbox
                />
                <button
                  type="button"
                  disabled={rosterPending === ship.id}
                  onClick={() => void handleAdd(ship.id)}
                  className="mt-1 w-full border border-phosphor-green px-2 py-1 text-[10px] uppercase tracking-wider text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  [ADD]
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

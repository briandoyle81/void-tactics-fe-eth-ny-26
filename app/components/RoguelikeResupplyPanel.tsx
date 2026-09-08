"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { TransactionButton } from "./TransactionButton";
import ShipCard from "./ShipCard";
import { ShipImage } from "./ShipImage";
import { toShipCardData } from "../utils/toShipCardData";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetShipAttributes } from "../hooks/useFleetShipAttributes";
import { useRoguelikeRosterHP } from "../hooks/useRoguelikeRun";
import { useRepairCostPerHP, useRoguelikeResupply, ROGUELIKE_RESUPPLY_ADDRESS } from "../hooks/useRoguelikeResupply";
import { RoguelikeRun, RoguelikeNode } from "../types/roguelike";

const UTC_APPROVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface RoguelikeResupplyPanelProps {
  run: RoguelikeRun;
  node: RoguelikeNode;
  onDone: () => void;
}

export function RoguelikeResupplyPanel({ run, node, onDone }: RoguelikeResupplyPanelProps) {
  const { address } = useAccount();
  const { ships: ownedShips, isLoading: shipsLoading, refetch: refetchOwnedShips } = useOwnedShips(
    baseSepolia.id,
  );
  const { resupplyModifyRoster } = useRoguelikeResupply();
  const { data: repairCostPerHP } = useRepairCostPerHP();
  const [selectedForRepair, setSelectedForRepair] = React.useState<Set<string>>(new Set());
  const [isModifyingRoster, setIsModifyingRoster] = React.useState(false);

  const rosterIdSet = React.useMemo(
    () => new Set(run.rosterShipIds.map((id) => id.toString())),
    [run.rosterShipIds],
  );
  const rosterShips = React.useMemo(
    () => ownedShips.filter((s) => rosterIdSet.has(s.id.toString())),
    [ownedShips, rosterIdSet],
  );
  const availableShips = React.useMemo(
    () =>
      ownedShips.filter(
        (s) =>
          !rosterIdSet.has(s.id.toString()) &&
          s.shipData.constructed &&
          s.shipData.timestampDestroyed === 0n &&
          !s.shipData.inFleet &&
          (rosterShips[0] ? s.traits.variant === rosterShips[0].traits.variant : true),
      ),
    [ownedShips, rosterIdSet, rosterShips],
  );

  const { attributesMap } = useFleetShipAttributes(
    rosterShips.map((s) => s.id),
    baseSepolia.id,
  );
  const { hpByShipId, refetch: refetchHP } = useRoguelikeRosterHP(
    address,
    run.rosterShipIds,
  );

  const shipEffectiveHP = React.useCallback(
    (shipId: bigint): { current: number; max: number } => {
      const max = attributesMap.get(shipId)?.maxHullPoints ?? 0;
      const raw = hpByShipId.get(shipId.toString()) ?? 0;
      // 0 means "not yet damaged this run" — fresh at max, not literally 0.
      const current = raw === 0 ? max : raw;
      return { current, max };
    },
    [attributesMap, hpByShipId],
  );

  const missingHPFor = (shipId: bigint) => {
    const { current, max } = shipEffectiveHP(shipId);
    return Math.max(0, max - current);
  };

  const totalMissingHP = React.useMemo(
    () =>
      Array.from(selectedForRepair).reduce(
        (sum, idStr) => sum + missingHPFor(BigInt(idStr)),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedForRepair, hpByShipId, attributesMap],
  );
  const repairCost = (repairCostPerHP ?? 0n) * BigInt(totalMissingHP);

  const contractAddresses = getContractAddresses(baseSepolia.id);
  const { data: utcBalance } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });
  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "allowance",
    args: address ? [address, ROGUELIKE_RESUPPLY_ADDRESS] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });
  const utcApproved = (utcAllowance as bigint | undefined) != null && (utcAllowance as bigint) >= repairCost;

  const toggleRepairSelection = (shipId: bigint) => {
    setSelectedForRepair((prev) => {
      const next = new Set(prev);
      const key = shipId.toString();
      if (next.has(key)) next.delete(key);
      else if (missingHPFor(shipId) > 0) next.add(key);
      return next;
    });
  };

  const handleAddShip = async (shipId: bigint) => {
    setIsModifyingRoster(true);
    try {
      await resupplyModifyRoster([shipId], []);
      toast.success("Ship added to roster");
      void refetchOwnedShips();
    } catch (error) {
      console.error("Failed to add ship to roster:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("InvalidFleetCost")) {
        toast.error(`Adding this ship exceeds the run's ${run.currentCostCap.toString()} cost cap.`);
      } else if (message.includes("ShipAlreadyInFleet") || message.includes("ShipNotOwned")) {
        toast.error("That ship can't be added right now.");
      } else if (message.includes("WrongCampaignVariant")) {
        toast.error("That ship's faction doesn't match this run's roster.");
      } else {
        toast.error(`Failed to add ship: ${message}`);
      }
    } finally {
      setIsModifyingRoster(false);
    }
  };

  const handleRemoveShip = async (shipId: bigint) => {
    setIsModifyingRoster(true);
    try {
      await resupplyModifyRoster([], [shipId]);
      toast.success("Ship removed from roster");
      void refetchOwnedShips();
    } catch (error) {
      console.error("Failed to remove ship from roster:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ShipNotInRoster")) {
        toast.error("That ship isn't in your current roster.");
      } else {
        toast.error(`Failed to remove ship: ${message}`);
      }
    } finally {
      setIsModifyingRoster(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan">[RESUPPLY — NODE #{node.id.toString()}]</h3>
        <button
          type="button"
          onClick={onDone}
          className="border-2 border-steel px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-cyan hover:text-cyan"
          style={{ borderRadius: 0 }}
        >
          [CONTINUE]
        </button>
      </div>

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">Repair Roster</h4>
        {shipsLoading ? (
          <p className="text-sm text-text-muted">Loading roster…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rosterShips.map((ship) => {
              const { current, max } = shipEffectiveHP(ship.id);
              const missing = Math.max(0, max - current);
              const isSelected = selectedForRepair.has(ship.id.toString());
              return (
                <button
                  key={ship.id.toString()}
                  type="button"
                  disabled={missing === 0}
                  onClick={() => toggleRepairSelection(ship.id)}
                  className={`flex flex-col gap-1 border-2 p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected ? "border-cyan bg-cyan/10" : "border-gunmetal"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: "var(--color-slate)" }}>
                    <ShipImage ship={ship} className="h-full w-full" showLoadingState={false} />
                  </div>
                  <span className="truncate text-[10px] uppercase tracking-wider text-text-secondary">
                    {ship.name || `Ship #${ship.id}`}
                  </span>
                  <span className={`text-[10px] ${missing > 0 ? "text-warning-red" : "text-phosphor-green"}`}>
                    HP {current}/{max}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {totalMissingHP > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border border-cyan/40 bg-cyan/10 p-3 text-xs">
            <span className="text-cyan">
              Repair cost: {formatEther(repairCost)} UTC ({totalMissingHP} HP)
            </span>
            {!utcApproved ? (
              <TransactionButton
                transactionId={`approve-utc-roguelike-repair-${address}`}
                contractAddress={contractAddresses.UNIVERSAL_CREDITS as `0x${string}`}
                abi={UTC_APPROVE_ABI as Abi}
                functionName="approve"
                args={[ROGUELIKE_RESUPPLY_ADDRESS, repairCost]}
                className="border-2 border-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  (utcBalance as bigint | undefined) == null ||
                  (utcBalance as bigint) < repairCost
                }
                loadingText="[APPROVING...]"
                errorText="[ERROR APPROVING]"
                onSuccess={() => {
                  refetchAllowance();
                  toast.success("UTC approved!");
                }}
                onError={(error) => {
                  console.error("Failed to approve UTC:", error);
                  toast.error("Failed to approve UTC transfer");
                }}
                validateBeforeTransaction={() => {
                  if (!address) return "Please connect your wallet";
                  if ((utcBalance as bigint | undefined) == null || (utcBalance as bigint) < repairCost) {
                    return "Insufficient UTC balance";
                  }
                  return true;
                }}
              >
                [APPROVE {formatEther(repairCost)} UTC]
              </TransactionButton>
            ) : (
              <TransactionButton
                transactionId={`repair-roguelike-roster-${address}`}
                contractAddress={ROGUELIKE_RESUPPLY_ADDRESS}
                abi={CONTRACT_ABIS.ROGUELIKE_RESUPPLY as Abi}
                functionName="resupplyRepair"
                args={[Array.from(selectedForRepair).map((id) => BigInt(id))]}
                className="border-2 border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-50"
                loadingText="[REPAIRING...]"
                errorText="[ERROR REPAIRING]"
                onSuccess={() => {
                  setSelectedForRepair(new Set());
                  void refetchHP();
                  toast.success("Repair complete!");
                }}
                onError={(error) => {
                  console.error("Failed to repair roster:", error);
                  toast.error("Failed to repair roster");
                }}
              >
                [REPAIR {totalMissingHP} HP]
              </TransactionButton>
            )}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">
          Roster ({rosterShips.length}) — cost cap {run.currentCostCap.toString()}
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rosterShips.map((ship) => (
            <div key={ship.id.toString()} className="flex flex-col gap-1">
              <div
                className="aspect-square w-full overflow-hidden border border-gunmetal"
                style={{ backgroundColor: "var(--color-slate)" }}
              >
                <ShipImage ship={ship} className="h-full w-full" showLoadingState={false} />
              </div>
              <button
                type="button"
                disabled={isModifyingRoster}
                onClick={() => void handleRemoveShip(ship.id)}
                className="border border-warning-red px-1 py-0.5 text-[9px] uppercase tracking-wider text-warning-red hover:bg-warning-red/10 disabled:opacity-50"
              >
                [REMOVE]
              </button>
            </div>
          ))}
        </div>

        {availableShips.length > 0 && (
          <>
            <h4 className="mb-2 mt-4 text-xs uppercase tracking-wider text-text-muted">
              Available Ships
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {availableShips.map((ship) => (
                <div key={ship.id.toString()} className="flex flex-col gap-1">
                  <ShipCard
                    ship={toShipCardData(ship)}
                    shipImage={<ShipImage ship={ship} className="h-full w-full" showLoadingState={false} />}
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
                    disabled={isModifyingRoster}
                    onClick={() => void handleAddShip(ship.id)}
                    className="border border-phosphor-green px-1 py-0.5 text-[9px] uppercase tracking-wider text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
                  >
                    [ADD]
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

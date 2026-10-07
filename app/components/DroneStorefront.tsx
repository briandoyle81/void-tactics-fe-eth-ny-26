"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Abi } from "viem";
import { formatEther } from "viem";
import { formatDec } from "../utils/formatDec";
import { toast } from "react-hot-toast";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ABIS } from "../config/contracts";
import { useDroneStorefront } from "../hooks/useDroneStorefront";

/**
 * DroneStorefront (docs/faction-2.md §3): turn in DEC for a permanent,
 * cumulative bonus to the number of free ships granted per 28-day claim.
 * Tier ladder, not a flat exchange rate — must read `tierCoreCost` for the
 * exact next-tier cost rather than guessing.
 */
const DroneStorefront: React.FC = () => {
  const { address } = useAccount();
  const {
    isDeployed,
    droneStorefrontAddress,
    droneEnergyCoresAddress,
    currentTier,
    nextTier,
    nextTierCost,
    maxTierReached,
    isLoadingTier,
    isLoadingNextTierCost,
    decBalance,
    decAllowance,
    refetchAll,
  } = useDroneStorefront();

  const [decApproved, setDecApproved] = useState(false);

  useEffect(() => {
    if (nextTierCost !== undefined && decAllowance !== undefined) {
      setDecApproved(decAllowance >= nextTierCost);
    } else {
      setDecApproved(false);
    }
  }, [nextTierCost, decAllowance]);

  const insufficientBalance =
    nextTierCost !== undefined &&
    decBalance !== undefined &&
    decBalance < nextTierCost;

  const nextTierCostFormatted =
    nextTierCost !== undefined ? formatDec(Number(formatEther(nextTierCost)), "up") : null;
  const decBalanceFormatted =
    decBalance !== undefined ? formatDec(Number(formatEther(decBalance))) : "0";

  return (
    <div className="w-full max-w-xl">

        <div className="mb-5 p-4 bg-cyan/10 border border-cyan/40 rounded-none">
          <div className="flex justify-between items-center mb-2">
            <p className="text-cyan/80 text-sm font-mono">Drone Energy Cores</p>
            <p className="text-cyan text-sm font-mono font-bold">
              {decBalanceFormatted} DEC
            </p>
          </div>
          <p className="text-cyan/85 text-xs font-mono leading-relaxed">
            DEC comes from destroying AI-owned ships. Turn it in here for a
            permanent, cumulative bonus to how many free ships you get from
            each 28-day claim — the bonus never resets once earned.
          </p>
        </div>

        {!isDeployed ? (
          <p className="text-center text-warning-red font-mono py-6">
            DroneStorefront is not deployed on this network.
          </p>
        ) : !address ? (
          <p className="text-center text-text-muted font-mono py-6">
            Connect your wallet to view your tier.
          </p>
        ) : isLoadingTier ? (
          <p className="text-center text-text-muted font-mono py-6">
            Loading your tier…
          </p>
        ) : (
          <>
            <div className="mb-5 p-4 border border-cyan/25">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-text-secondary mb-1">
                <span>Current tier</span>
                <span>Current bonus</span>
              </div>
              <div className="flex justify-between text-lg font-mono font-bold text-cyan">
                <span>{currentTier}</span>
                <span>+{currentTier} ships / claim</span>
              </div>
            </div>

            {maxTierReached ? (
              <p className="text-center text-phosphor-green font-mono py-6">
                Max tier reached — no further tiers configured.
              </p>
            ) : isLoadingNextTierCost ? (
              <p className="text-center text-text-muted font-mono py-6">
                Loading next tier cost…
              </p>
            ) : nextTierCost === undefined ? (
              <p className="text-center text-warning-red font-mono py-6">
                Couldn&apos;t read the next tier cost.
              </p>
            ) : (
              <div className="border border-cyan/40 p-4">
                <div className="flex justify-between text-sm font-mono text-text-secondary mb-3">
                  <span>Next tier ({nextTier})</span>
                  <span>Bonus +{nextTier} ships / claim</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2 mb-4">
                  <div className="border border-solid border-cyan/30 bg-black/20 px-2 py-1.5">
                    <div className="opacity-75 text-[10px] uppercase tracking-wide text-cyan">
                      Cost
                    </div>
                    <div className="font-bold text-cyan font-mono">
                      {nextTierCostFormatted} DEC
                    </div>
                  </div>
                  <div className="border border-solid border-cyan/30 bg-black/20 px-2 py-1.5">
                    <div className="opacity-75 text-[10px] uppercase tracking-wide text-cyan">
                      Your balance
                    </div>
                    <div className="font-bold text-cyan font-mono">
                      {decBalanceFormatted} DEC
                    </div>
                  </div>
                </div>

                {!decApproved ? (
                  <TransactionButton
                    transactionId={`approve-dec-drone-storefront-${nextTier}-${address}`}
                    contractAddress={droneEnergyCoresAddress as `0x${string}`}
                    abi={CONTRACT_ABIS.DRONE_ENERGY_CORES as Abi}
                    functionName="approve"
                    args={[droneStorefrontAddress as `0x${string}`, nextTierCost]}
                    className="w-full px-4 py-3 rounded-none border-2 border-cyan text-cyan hover:text-cyan hover:bg-cyan/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={insufficientBalance}
                    loadingText={`[APPROVING ${nextTierCostFormatted} DEC...]`}
                    errorText="[ERROR APPROVING]"
                    onSuccess={async () => {
                      await refetchAll();
                      toast.success("DEC approved successfully!");
                    }}
                    onError={(error) => {
                      console.error("Failed to approve DEC:", error);
                      toast.error("Failed to approve DEC transfer");
                    }}
                    validateBeforeTransaction={() => {
                      if (!address) return "Please connect your wallet";
                      if (insufficientBalance) return "Insufficient DEC balance";
                      return true;
                    }}
                  >
                    [APPROVE {nextTierCostFormatted} DEC]
                  </TransactionButton>
                ) : (
                  <TransactionButton
                    transactionId={`turn-in-dec-drone-storefront-${nextTier}-${address}`}
                    contractAddress={droneStorefrontAddress as `0x${string}`}
                    abi={CONTRACT_ABIS.DRONE_STOREFRONT as Abi}
                    functionName="turnInCores"
                    args={[nextTierCost]}
                    className="w-full px-4 py-3 rounded-none border-2 border-cyan text-cyan hover:text-cyan hover:bg-cyan/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={insufficientBalance}
                    loadingText="[TURNING IN...]"
                    errorText="[ERROR TURNING IN]"
                    onSuccess={async () => {
                      await refetchAll();
                      toast.success(`Tier ${nextTier} unlocked!`);
                    }}
                    onError={(error) => {
                      console.error("Failed to turn in DEC:", error);
                      toast.error("Failed to turn in DEC");
                    }}
                    validateBeforeTransaction={() => {
                      if (!address) return "Please connect your wallet";
                      if (insufficientBalance) return "Insufficient DEC balance";
                      return true;
                    }}
                  >
                    [TURN IN {nextTierCostFormatted} DEC]
                  </TransactionButton>
                )}
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default DroneStorefront;

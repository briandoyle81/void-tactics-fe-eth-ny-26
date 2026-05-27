"use client";

import React from "react";
import { useAccount } from "../hooks/useAccount";
import { UTCPurchaseButton } from "./UTCPurchaseButton";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";

interface UTCPurchaseModalProps {
  onClose: () => void;
}

const UTCPurchaseModal: React.FC<UTCPurchaseModalProps> = ({ onClose }) => {
  const { address } = useAccount();
  const nativeTokenSymbol = "FLOW"; // chain selection removed in REST architecture

  const {
    tiers,
    pricesWei,
    tierCount,
    isLoading: isLoadingTiers,
    purchaserDeployed,
  } = useShipPurchaserPurchaseInfo();

  const utcBalance = undefined;
  const refetchUTCBalance = async () => {};

  const getTierColors = (tier: number) => {
    switch (tier) {
      case 0:
        return {
          border: "border-amber",
          text: "text-amber",
          hoverBorder: "hover:border-amber",
          hoverText: "hover:text-amber",
          hoverBg: "hover:bg-amber/10",
        };
      case 1:
        return {
          border: "border-text-muted",
          text: "text-text-muted",
          hoverBorder: "hover:border-text-secondary",
          hoverText: "hover:text-text-secondary",
          hoverBg: "hover:bg-text-muted/10",
        };
      case 2:
        return {
          border: "border-phosphor-green",
          text: "text-phosphor-green",
          hoverBorder: "hover:border-phosphor-green",
          hoverText: "hover:text-phosphor-green",
          hoverBg: "hover:bg-phosphor-green/10",
        };
      case 3:
        return {
          border: "border-cyan",
          text: "text-cyan",
          hoverBorder: "hover:border-cyan",
          hoverText: "hover:text-cyan",
          hoverBg: "hover:bg-cyan/10",
        };
      case 4:
        return {
          border: "border-purple",
          text: "text-purple",
          hoverBorder: "hover:border-purple",
          hoverText: "hover:text-purple",
          hoverBg: "hover:bg-purple/10",
        };
      default:
        return {
          border: "border-amber",
          text: "text-amber",
          hoverBorder: "hover:border-amber",
          hoverText: "hover:text-amber",
          hoverBg: "hover:bg-amber/10",
        };
    }
  };

  const handlePurchaseSuccess = () => {
    refetchUTCBalance();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-near-black border-2 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-none" style={{ borderColor: "var(--color-cyan)" }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan font-mono tracking-wider">
            [PURCHASE UTC]
          </h2>
          <button
            onClick={onClose}
            className="text-cyan hover:text-cyan/80 transition-all duration-200 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-5 p-4 bg-cyan/10 border border-cyan/40 rounded-none">
          <div className="flex justify-between items-center mb-2">
            <p className="text-cyan/80 text-sm font-mono">Current UTC balance</p>
            <p className="text-cyan text-sm font-mono font-bold">
              0.00 UTC
            </p>
          </div>
          <p className="text-cyan/85 text-xs font-mono leading-relaxed">
            Universal Credits (UTC) are the in-game balance token. Buy UTC with
            TOKENS at a 1:1 rate, then spend UTC when you reserve games or
            check out ship packs elsewhere. This purchase only adds UTC to your
            wallet.
          </p>
        </div>

        <header className="mb-5 border-b border-cyan/25 pb-4">
          <h3
            className="text-lg font-black uppercase tracking-[0.1em] text-cyan sm:text-xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            Choose an amount
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-secondary font-mono">
            Each option is a fixed {nativeTokenSymbol} payment. You receive the
            same amount in UTC. Larger options are for convenience only, not a
            different product.
          </p>
        </header>

        {!purchaserDeployed ? (
          <p className="text-center text-warning-red font-mono py-6">
            ShipPurchaser is not deployed on this network.
          </p>
        ) : isLoadingTiers && tierCount === 0 ? (
          <p className="text-center text-text-muted font-mono py-6">
            Loading UTC purchase options…
          </p>
        ) : tierCount === 0 ? (
          <p className="text-center text-warning-red font-mono py-6">
            No UTC purchase tiers from ShipPurchaser.
          </p>
        ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => {
            const flowCost = pricesWei[index] ?? 0;
            const flowCostFormatted = (Number(flowCost) / 1e18).toFixed(4);
            const colors = getTierColors(tier);
            const utcDisplay = flowCostFormatted;

            return (
              <UTCPurchaseButton
                key={index}
                tier={tier}
                flowCost={flowCost}
                utcAmount={flowCostFormatted}
                className={`relative min-h-0 px-4 py-4 rounded-none border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                refetch={refetchUTCBalance}
                onSuccess={handlePurchaseSuccess}
              >
                <div className="flex flex-col gap-3">
                  <div className="text-base font-extrabold leading-tight">
                    {utcDisplay} UTC
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
                      <div className="opacity-75 text-[10px] uppercase tracking-wide">
                        You pay
                      </div>
                      <div className="font-bold">
                        {flowCostFormatted} {nativeTokenSymbol}
                      </div>
                    </div>
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
                      <div className="opacity-75 text-[10px] uppercase tracking-wide">
                        You receive
                      </div>
                      <div className="font-bold">{utcDisplay} UTC</div>
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.08em] opacity-80">
                    [Click to buy with {nativeTokenSymbol}]
                  </div>
                </div>
              </UTCPurchaseButton>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

export default UTCPurchaseModal;

"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { UTCPurchaseButton } from "./UTCPurchaseButton";
import { UTCPurchaseModalShell } from "./UTCPurchaseModalShell";
import { UTCPurchaseTierCardContent } from "./UTCPurchaseTierCardContent";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { getNativeTokenSymbol, getSelectedChainId } from "../config/networks";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import type { Abi } from "viem";
import { formatEther } from "viem";

interface UTCPurchaseModalProps {
  onClose: () => void;
}

const UTCPurchaseModal: React.FC<UTCPurchaseModalProps> = ({ onClose }) => {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const nativeTokenSymbol = getNativeTokenSymbol(activeChainId);

  const {
    tiers,
    pricesWei,
    tierCount,
    isLoading: isLoadingTiers,
    purchaserDeployed,
  } = useShipPurchaserPurchaseInfo();

  // purchaseUTCWithFlow now mints UTC 1:1 with the FLOW price paid (see
  // docs/update/Frontend_Update_Guide.md — ShipPurchaser no longer bases
  // the mint on tierShips * Ships.recycleReward()).

  const { data: utcBalance, refetch: refetchUTCBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

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
    <UTCPurchaseModalShell
      onClose={onClose}
      balanceValueLabel={
        utcBalance ? `${formatEther(utcBalance as bigint)} UTC` : "0.00 UTC"
      }
      balanceDescription={
        <>
          Universal Credits (UTC) are the in-game balance token. Buy UTC with
          TOKENS, then spend UTC when you reserve games or check out ship
          packs elsewhere. This purchase only adds UTC to your wallet.
        </>
      }
      chooseAmountDescription={
        <>
          Each option is a fixed {nativeTokenSymbol} payment, minted as UTC
          1:1 with the {nativeTokenSymbol} paid. Larger options are for
          convenience only, not a different product.
        </>
      }
    >
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
            const flowCost = pricesWei[index] ?? 0n;
            const flowCostFormatted = formatEther(flowCost);
            const colors = getTierColors(tier);
            // 1:1 mint with the FLOW price paid — see docs/update/Frontend_Update_Guide.md.
            const utcDisplay = flowCostFormatted;

            return (
              <UTCPurchaseButton
                key={index}
                tier={tier}
                flowCost={flowCost}
                utcAmount={utcDisplay}
                className={`relative min-h-0 px-4 py-4 rounded-none border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                refetch={refetchUTCBalance}
                onSuccess={handlePurchaseSuccess}
              >
                <UTCPurchaseTierCardContent
                  utcAmountLabel={`${utcDisplay} UTC`}
                  payLabel={`${flowCostFormatted} ${nativeTokenSymbol}`}
                  footerLabel={`[Click to buy with ${nativeTokenSymbol}]`}
                />
              </UTCPurchaseButton>
            );
          })}
        </div>
        )}
    </UTCPurchaseModalShell>
  );
};

export default UTCPurchaseModal;

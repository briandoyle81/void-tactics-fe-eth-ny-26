"use client";

import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useShipsPurchaseInfo } from "../hooks/useShipsPurchaseInfo";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import { ShipPurchaseButton } from "./ShipPurchaseButton";
import { FlowPaymentButton } from "./FlowPaymentButton";
import { ShipImage } from "./ShipImage";
import { ShipPurchaseTierCard } from "./ShipPurchaseTierCard";
import { ShipPurchaseShell } from "./ShipPurchaseShell";
import {
  getTierColors,
  getTierCallout,
  getTierBadge,
  getGuaranteedRanksDisplay,
} from "../utils/shipPurchaseTierDisplay";
import {
  getPreviewShipSpecsForTier,
  PREVIEW_SHIP_ID_OFFSET,
  type ShipPreviewSpec,
} from "../utils/shipPreviewSpec";
import type { Ship } from "../types/types";
import { formatEther } from "viem";
import { getSelectedChainId } from "../config/networks";
import { FLOW_USD_TIERS } from "../config/flowPayment";

interface ShipPurchaseInterfaceProps {
  onClose: () => void;
  paymentMethod?: "FLOW" | "UTC" | "USD";
  onPaymentMethodChange?: (method: "FLOW" | "UTC" | "USD") => void;
}

const ShipPurchaseInterface: React.FC<ShipPurchaseInterfaceProps> = ({
  paymentMethod: externalPaymentMethod,
  onClose,
}) => {
  const shipsPack = useShipsPurchaseInfo();
  const utcPack = useShipPurchaserPurchaseInfo();
  const { refetch } = useOwnedShips();
  const { chainId: walletChainId } = useAccount();
  const activeGameChainId = walletChainId ?? getSelectedChainId();
  const previewSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);

  const paymentMethod = externalPaymentMethod ?? "FLOW";
  const paymentMethodLabel = paymentMethod === "FLOW" ? "TOKENS" : "UTC";

  if (paymentMethod === "UTC" && !utcPack.purchaserDeployed) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-warning-red font-mono">
          UTC ship packs are not available on this network (ShipPurchaser not
          deployed).
        </p>
      </div>
    );
  }

  // USD uses the same tier structure as FLOW (ship counts, ranks, previews)
  const pack = paymentMethod === "UTC" ? utcPack : shipsPack;
  const {
    tiers,
    shipsPerTier: maxPerTier,
    pricesWei: prices,
    isLoading,
    tierCount,
  } = pack;

  const toPreviewShip = (spec: ShipPreviewSpec): Ship => ({
    name: `Preview ${spec.seed}`,
    id: BigInt(PREVIEW_SHIP_ID_OFFSET + spec.seed),
    equipment: spec.equipment,
    traits: {
      serialNumber: BigInt(PREVIEW_SHIP_ID_OFFSET + spec.seed),
      colors: spec.colors,
      variant: spec.variant,
      accuracy: spec.accuracy,
      hull: spec.hull,
      speed: spec.speed,
    },
    shipData: {
      shipsDestroyed: spec.shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny: spec.shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0n,
    },
    owner: "0x0000000000000000000000000000000000000000",
  });

  const shipsDestroyedForRank = (rank: number): number => {
    switch (Math.min(5, rank)) {
      case 5:
        return 350;
      case 4:
        return 120;
      case 3:
        return 45;
      case 2:
        return 15;
      default:
        return 5;
    }
  };

  const getPreviewShipsForTier = (tier: number): Ship[] =>
    getPreviewShipSpecsForTier(previewSeed, tier, maxPerTier[tier] ?? 1, shipsDestroyedForRank).map(
      toPreviewShip,
    );

  if (isLoading && tierCount === 0) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-text-muted font-mono">Loading pack configuration…</p>
      </div>
    );
  }

  if (tierCount === 0) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-warning-red font-mono">
          No purchase tiers returned from the contract.
        </p>
      </div>
    );
  }

  const tierCards = tiers.map((tier: number, index: number) => {
    const price = prices[index];
    const shipsCount = maxPerTier[index];
    const priceFormatted = price ? formatEther(price) : "0";
    const colors = getTierColors(tier);
    const guaranteedRanksDisplay = getGuaranteedRanksDisplay(tier, shipsCount ?? 1);
    const tierCallout = getTierCallout(tier);
    const badge = getTierBadge(tier, tierCount);
    const previewShips = getPreviewShipsForTier(tier);

    if (paymentMethod === "USD") {
      const flowTier = FLOW_USD_TIERS[index] ?? FLOW_USD_TIERS[0]!;
      return (
        <FlowPaymentButton
          key={index}
          tier={tier}
          gameChainId={activeGameChainId}
          flowTier={flowTier}
          shipsCount={shipsCount ?? 0}
          tierCallout={tierCallout}
          badge={badge}
          previewShips={previewShips}
          colors={colors}
          onSuccess={() => { refetch(); onClose(); }}
        />
      );
    }

    return (
      <ShipPurchaseButton
        key={index}
        tier={tier}
        price={price ?? BigInt(0)}
        paymentMethod={paymentMethod}
        className={`relative min-h-[420px] px-4 py-3 border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        refetch={refetch}
      >
        <ShipPurchaseTierCard
          tierCallout={tierCallout}
          badge={badge}
          priceLabel={`${priceFormatted} ${paymentMethodLabel}`}
          shipsCount={shipsCount ?? 0}
          guaranteedRanksDisplay={guaranteedRanksDisplay}
          previewShipImages={previewShips.map((ship, idx) => (
            <ShipImage
              key={ship.id.toString()}
              ship={ship}
              showLoadingState={false}
              rankStarsSize={idx === 0 ? "large" : "default"}
            />
          ))}
        />
      </ShipPurchaseButton>
    );
  });

  const footerPaymentNote =
    paymentMethod === "UTC"
      ? "Click to approve UTC. After approval, click to purchase."
      : paymentMethod === "USD"
        ? "Pay with any token from any chain. Powered by Fireblocks Flow."
        : "Click to purchase.";

  return <ShipPurchaseShell tierCards={tierCards} footerPaymentNote={footerPaymentNote} />;
};

export default ShipPurchaseInterface;

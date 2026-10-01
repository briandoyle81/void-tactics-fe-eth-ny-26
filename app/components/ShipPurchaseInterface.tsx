"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { VariantPicker } from "./VariantPicker";
import { useShipsPurchaseInfo } from "../hooks/useShipsPurchaseInfo";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import { ShipPurchaseButton } from "./ShipPurchaseButton";
import { FlowPaymentButton } from "./FlowPaymentButton";
import { PurchaseConfirmModal } from "./PurchaseConfirmModal";
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

// How often the demo/preview ships shown on the tier cards reroll — matched
// to HeroShipShowcase's default rotation cadence on the Info page (10s) so the
// two "living" ship displays feel consistent.
const PREVIEW_REFRESH_INTERVAL_MS = 10000;

// Truncates (not rounds) a decimal string to at most 8 fractional digits,
// dropping any resulting trailing zeros so a whole-number price stays clean.
function truncateTo8Decimals(value: string): string {
  const [whole, frac] = value.split(".");
  if (!frac) return whole!;
  const truncated = frac.slice(0, 8).replace(/0+$/, "");
  return truncated ? `${whole}.${truncated}` : whole!;
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
  const [previewSeed, setPreviewSeed] = useState(() =>
    Math.floor(Math.random() * 1_000_000),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewSeed(Math.floor(Math.random() * 1_000_000));
    }, PREVIEW_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Faction/variant to mint. Variant 2 (Shattered Hive) is gated on the medal
  // NFT — VariantPicker shows it grayed out and blocks selecting it without
  // the NFT. Default to variant 1 (ungated).
  const [selectedVariant, setSelectedVariant] = useState(1);

  // Which tier the FLOW/UTC confirm modal is open for (null = closed). USD has
  // its own checkout flow (FlowPaymentModal) and skips this.
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

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
    getPreviewShipSpecsForTier(
      previewSeed,
      tier,
      maxPerTier[tier] ?? 1,
      shipsDestroyedForRank,
      selectedVariant,
    ).map(toPreviewShip);

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

  // Per-tier data computed once so the grid card and the confirm modal render
  // from the same source (the modal shows the exact card that was clicked).
  const tierData = tiers.map((tier: number, index: number) => {
    const price = prices[index];
    const shipsCount = maxPerTier[index];
    const priceFormatted = price ? truncateTo8Decimals(formatEther(price)) : "0";
    const colors = getTierColors(tier);
    const guaranteedRanksDisplay = getGuaranteedRanksDisplay(tier, shipsCount ?? 1);
    const tierCallout = getTierCallout(tier);
    const badge = getTierBadge(tier, tierCount);
    const previewShips = getPreviewShipsForTier(tier);
    const flowTier = FLOW_USD_TIERS[index] ?? FLOW_USD_TIERS[0]!;
    return {
      tier,
      index,
      price,
      shipsCount,
      priceFormatted,
      colors,
      guaranteedRanksDisplay,
      tierCallout,
      badge,
      previewShips,
      flowTier,
    };
  });

  type TierDatum = (typeof tierData)[number];

  const renderTierCard = (d: TierDatum) => (
    <ShipPurchaseTierCard
      tierCallout={d.tierCallout}
      badge={d.badge}
      priceLabel={`${d.priceFormatted} ${paymentMethodLabel}`}
      shipsCount={d.shipsCount ?? 0}
      guaranteedRanksDisplay={d.guaranteedRanksDisplay}
      previewShipImages={d.previewShips.map((ship, idx) => (
        <ShipImage
          key={ship.id.toString()}
          ship={ship}
          showLoadingState={false}
          rankStarsSize={idx === 0 ? "large" : "default"}
        />
      ))}
    />
  );

  const tierCards = tierData.map((d) => {
    if (paymentMethod === "USD") {
      return (
        <FlowPaymentButton
          key={d.index}
          tier={d.tier}
          gameChainId={activeGameChainId}
          flowTier={d.flowTier}
          shipsCount={d.shipsCount ?? 0}
          tierCallout={d.tierCallout}
          badge={d.badge}
          previewShips={d.previewShips}
          colors={d.colors}
          variant={selectedVariant}
          onSuccess={async () => {
            await refetch();
            onClose();
          }}
        />
      );
    }

    // FLOW / UTC: clicking a tier now opens a confirmation modal instead of
    // firing the wallet transaction immediately.
    return (
      <button
        key={d.index}
        type="button"
        onClick={() => setConfirmIndex(d.index)}
        className={`relative min-h-[420px] px-4 py-3 border-2 text-left ${d.colors.border} ${d.colors.text} ${d.colors.hoverBorder} ${d.colors.hoverText} ${d.colors.hoverBg} font-mono tracking-wider transition-all duration-200`}
      >
        {renderTierCard(d)}
      </button>
    );
  });

  const footerPaymentNote =
    paymentMethod === "UTC"
      ? "Click a pack to review, then approve and confirm."
      : paymentMethod === "USD"
        ? "Pay with any token from any chain. Powered by Fireblocks Flow."
        : "Click a pack to review, then confirm.";

  const confirmData =
    confirmIndex !== null && paymentMethod !== "USD" ? tierData[confirmIndex] : null;

  return (
    <>
      <ShipPurchaseShell
        tierCards={tierCards}
        footerPaymentNote={footerPaymentNote}
        topContent={
          <div className="space-y-2">
            <div
              className="text-[11px] uppercase tracking-[0.12em] text-text-muted"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              Choose faction
            </div>
            <VariantPicker
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
              className="max-w-2xl"
            />
          </div>
        }
      />

      {confirmData && (
        <PurchaseConfirmModal
          show
          card={renderTierCard(confirmData)}
          tokenPriceLabel={`${confirmData.priceFormatted} ${paymentMethodLabel}`}
          usdApproxLabel={`≈ $${confirmData.flowTier.displayPrice} USD`}
          onCancel={() => setConfirmIndex(null)}
          confirmButton={
            <ShipPurchaseButton
              tier={confirmData.tier}
              price={confirmData.price ?? BigInt(0)}
              paymentMethod={paymentMethod as "FLOW" | "UTC"}
              variant={selectedVariant}
              className="border-2 border-phosphor-green px-6 py-2 font-mono font-bold tracking-wider text-phosphor-green transition-all duration-200 hover:bg-phosphor-green/10"
              refetch={refetch}
              onSuccess={async () => {
                setConfirmIndex(null);
              }}
            >
              CONFIRM PURCHASE
            </ShipPurchaseButton>
          }
        />
      )}
    </>
  );
};

export default ShipPurchaseInterface;

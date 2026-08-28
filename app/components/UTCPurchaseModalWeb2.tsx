"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useUserBalanceWeb2 } from "../hooks/useUserBalanceWeb2";
import {
  useUtcPurchaseTiersWeb2,
  useUtcPurchaseWeb2,
  type UtcPurchaseTierPreview,
} from "../hooks/useUtcPurchaseWeb2";
import { MockPurchaseConfirmModal } from "./MockPurchaseConfirmModal";
import { UTCPurchaseModalShell } from "./UTCPurchaseModalShell";
import { UTCPurchaseTierCardContent } from "./UTCPurchaseTierCardContent";
import { getTierColors } from "../utils/shipPurchaseTierDisplay";

interface UTCPurchaseModalWeb2Props {
  onClose: () => void;
}

// Web2-mode counterpart to `UTCPurchaseModal.tsx` — same layout/copy
// structure and tier-card look, but buys UTC directly via
// `/api/utc/purchase` instead of an on-chain token purchase. Tiers/prices
// come from the same ship-pack tier list (`usePurchaseTiersWeb2`, via
// `/api/utc/purchase`'s server-side preview) so pricing never drifts from
// the ship-purchase flow; the UTC payout per tier is what recycling that
// tier's ships would earn, not the ship-purchase-with-UTC price. Tier
// colors come from `shipPurchaseTierDisplay.ts` (shared with
// ShipPurchaseInterfaceWeb2.tsx) rather than being ported from
// UTCPurchaseModal.tsx, so low-to-high tier order matches the ship
// purchase flow's colors, not web3's UTC-purchase-specific ordering.

function TierButton({
  tierPreview,
  disabled,
  isPurchasing,
  onClick,
}: {
  tierPreview: UtcPurchaseTierPreview;
  disabled: boolean;
  isPurchasing: boolean;
  onClick: () => void;
}) {
  const colors = getTierColors(tierPreview.tier);
  const priceLabel = `$${(tierPreview.priceUsdCents / 100).toFixed(2)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-0 px-4 py-4 rounded-none border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
    >
      <UTCPurchaseTierCardContent
        utcAmountLabel={`${tierPreview.utcAmount} UTC`}
        payLabel={priceLabel}
        footerLabel={isPurchasing ? "[Purchasing…]" : "[Click to buy]"}
      />
    </button>
  );
}

const UTCPurchaseModalWeb2: React.FC<UTCPurchaseModalWeb2Props> = ({ onClose }) => {
  const { creditBalance } = useUserBalanceWeb2();
  const { tiers, isLoading, error } = useUtcPurchaseTiersWeb2(true);
  const { purchase } = useUtcPurchaseWeb2();
  const [purchasingTier, setPurchasingTier] = useState<number | null>(null);
  // No real payment gate behind this route (mock checkout) — confirmation
  // step happens here, one level up from the actual purchase call.
  const [pendingTier, setPendingTier] = useState<UtcPurchaseTierPreview | null>(null);

  const handleRequestPurchase = (tierPreview: UtcPurchaseTierPreview) => {
    setPendingTier(tierPreview);
  };

  const handleConfirmPurchase = async () => {
    if (!pendingTier) return;
    setPurchasingTier(pendingTier.tier);
    try {
      const result = await purchase(pendingTier.tier);
      toast.success(`Purchased ${result.utcEarned} UTC`);
      setPendingTier(null);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setPurchasingTier(null);
    }
  };

  return (
    <UTCPurchaseModalShell
      onClose={onClose}
      balanceValueLabel={`${creditBalance} UTC`}
      balanceDescription={
        <>
          Universal Credits (UTC) are the in-game balance token. Each pack below is priced the
          same as the matching ship pack, and pays out the UTC you&apos;d earn from buying that
          pack&apos;s ships and recycling all of them — but adds UTC straight to your balance
          with no ships involved.
        </>
      }
      chooseAmountDescription={
        <>
          Prices match the ship-pack tiers. Larger options are for convenience only, not a
          different product.
        </>
      }
      extraOverlay={
        <MockPurchaseConfirmModal
          show={pendingTier !== null}
          title="CONFIRM UTC PURCHASE"
          lineItems={pendingTier ? [{ label: "UTC pack", value: `${pendingTier.utcAmount} UTC` }] : []}
          totalLabel={pendingTier ? `$${(pendingTier.priceUsdCents / 100).toFixed(2)}` : ""}
          paymentMethod="usd"
          isProcessing={purchasingTier !== null}
          onCancel={() => setPendingTier(null)}
          onConfirm={() => void handleConfirmPurchase()}
        />
      }
    >
      {isLoading && tiers.length === 0 ? (
        <p className="text-center text-text-muted font-mono py-6">
          Loading UTC purchase options…
        </p>
      ) : error ? (
        <p className="text-center text-warning-red font-mono py-6">{error}</p>
      ) : tiers.length === 0 ? (
        <p className="text-center text-warning-red font-mono py-6">
          No UTC purchase tiers available.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tierPreview) => (
            <TierButton
              key={tierPreview.tier}
              tierPreview={tierPreview}
              disabled={purchasingTier !== null}
              isPurchasing={purchasingTier === tierPreview.tier}
              onClick={() => handleRequestPurchase(tierPreview)}
            />
          ))}
        </div>
      )}
    </UTCPurchaseModalShell>
  );
};

export default UTCPurchaseModalWeb2;

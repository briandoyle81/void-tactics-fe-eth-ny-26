"use client";

import React, { useMemo } from "react";
import { getKillsForRank } from "../lib/purchaseTiers";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import { Web2Ship } from "../types/web2Ship";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { ShipPurchaseTierCard } from "./ShipPurchaseTierCard";
import { ShipPurchaseShell } from "./ShipPurchaseShell";
import {
  getTierColors,
  getTierCallout,
  getTierBadge,
  getGuaranteedRanksDisplay,
  getPreviewDisplayRanks,
} from "../utils/shipPurchaseTierDisplay";

// Web2-mode counterpart to ShipPurchaseInterface.tsx — same tier-card
// layout/copy (via the shared ShipPurchaseTierCard/shipPurchaseTierDisplay
// pieces), minus the FLOW/Fireblocks-Flow payment tab, which is inherently
// wallet-only and has no web2 equivalent. Web2 has its own real "USD" route
// (`/api/ships/purchase/usd`, currently a placeholder with no payment gate
// — see ManageNavyWeb2.tsx's doc comment), so USD here is a REST purchase,
// not the cross-chain wallet flow web3's "USD" tab uses.
interface ShipPurchaseInterfaceWeb2Props {
  paymentMethod: "usd" | "utc";
  onPurchase: (tier: number, currency: "usd" | "utc") => void;
  busy: boolean;
}

function createPreviewShip(seed: number, shipsDestroyed: number): Web2Ship {
  return {
    name: `Preview ${seed}`,
    id: 900000 + seed,
    equipment: {
      mainWeapon: seed % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: (seed + 1) % 4,
    },
    traits: {
      serialNumber: 900000 + seed,
      colors: {
        h1: (seed * 47) % 360,
        s1: 70,
        l1: 52,
        h2: (seed * 47 + 68) % 360,
        s2: 62,
        l2: 46,
      },
      variant: 1,
      accuracy: seed % 3,
      hull: (seed + 1) % 3,
      speed: (seed + 2) % 3,
    },
    shipData: {
      shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny: seed % 7 === 0,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0,
      modifiedCount: 0,
      isFree: false,
    },
    owner: "",
  };
}

export function ShipPurchaseInterfaceWeb2({
  paymentMethod,
  onPurchase,
  busy,
}: ShipPurchaseInterfaceWeb2Props) {
  const previewSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const { tiers } = usePurchaseTiersWeb2();

  const getPreviewShipsForTier = (tier: number, shipCount: number): Web2Ship[] => {
    const base = previewSeed + tier * 20 + 1;
    const ranksToShow = getPreviewDisplayRanks(tier, shipCount);
    return ranksToShow.map((rank, idx) => createPreviewShip(base + idx, getKillsForRank(rank)));
  };

  const tierCards = tiers.map((t) => {
    const colors = getTierColors(t.tier);
    const guaranteedRanksDisplay = getGuaranteedRanksDisplay(t.tier, t.shipCount);
    const tierCallout = getTierCallout(t.tier);
    const badge = getTierBadge(t.tier, tiers.length);
    const previewShips = getPreviewShipsForTier(t.tier, t.shipCount);
    const priceLabel =
      paymentMethod === "usd"
        ? `$${(t.priceUsdCents / 100).toFixed(2)}`
        : `${t.priceUtc} UTC`;

    return (
      <button
        key={t.tier}
        type="button"
        onClick={() => onPurchase(t.tier, paymentMethod)}
        disabled={busy}
        className={`relative min-h-[420px] px-4 py-3 border-2 text-left ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <ShipPurchaseTierCard
          tierCallout={tierCallout}
          badge={badge}
          priceLabel={priceLabel}
          shipsCount={t.shipCount}
          guaranteedRanksDisplay={guaranteedRanksDisplay}
          previewShipImages={previewShips.map((ship, idx) => (
            <ShipImageWeb2
              key={ship.id}
              ship={ship}
              showLoadingState={false}
              rankStarsSize={idx === 0 ? "large" : "default"}
            />
          ))}
        />
      </button>
    );
  });

  const footerPaymentNote =
    paymentMethod === "utc" ? "Click to purchase with UTC." : "Click to purchase.";

  return <ShipPurchaseShell tierCards={tierCards} footerPaymentNote={footerPaymentNote} />;
}

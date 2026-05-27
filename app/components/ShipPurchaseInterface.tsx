"use client";

import React, { useMemo } from "react";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useShipsPurchaseInfo } from "../hooks/useShipsPurchaseInfo";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import { ShipPurchaseButton } from "./ShipPurchaseButton";
import { ShipImage } from "./ShipImage";
import type { Ship } from "../types/types";

interface ShipPurchaseInterfaceProps {
  onClose: () => void;
  paymentMethod?: "USD" | "UTC";
  onPaymentMethodChange?: (method: "USD" | "UTC") => void;
}

const TIER_COLOR_SCHEMES = [
  {
    border: "border-text-muted",
    text: "text-text-muted",
    hoverBorder: "hover:border-text-secondary",
    hoverText: "hover:text-text-secondary",
    hoverBg: "hover:bg-text-muted/10",
  },
  {
    border: "border-phosphor-green",
    text: "text-phosphor-green",
    hoverBorder: "hover:border-phosphor-green",
    hoverText: "hover:text-phosphor-green",
    hoverBg: "hover:bg-phosphor-green/10",
  },
  {
    border: "border-cyan",
    text: "text-cyan",
    hoverBorder: "hover:border-cyan",
    hoverText: "hover:text-cyan",
    hoverBg: "hover:bg-cyan/10",
  },
  {
    border: "border-purple",
    text: "text-purple",
    hoverBorder: "hover:border-purple",
    hoverText: "hover:text-purple",
    hoverBg: "hover:bg-purple/10",
  },
  {
    border: "border-amber",
    text: "text-amber",
    hoverBorder: "hover:border-amber",
    hoverText: "hover:text-amber",
    hoverBg: "hover:bg-amber/10",
  },
] as const;

const TIER_CALLOUTS = [
  "ENTRY PACK",
  "STARTER BOOST",
  "BALANCED VALUE",
  "VETERAN CORE",
  "FLAGSHIP PACK",
] as const;

const ShipPurchaseInterface: React.FC<ShipPurchaseInterfaceProps> = ({
  paymentMethod: externalPaymentMethod,
}) => {
  const shipsPack = useShipsPurchaseInfo();
  const utcPack = useShipPurchaserPurchaseInfo();
  const { refetch } = useOwnedShips();
  const previewSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);

  const paymentMethod = externalPaymentMethod ?? "USD";

  const pack = paymentMethod === "USD" ? shipsPack : utcPack;
  const {
    tiers,
    shipsPerTier: maxPerTier,
    isLoading,
    tierCount,
  } = pack;
  const prices = paymentMethod === "USD"
    ? (shipsPack as ReturnType<typeof useShipsPurchaseInfo>).pricesUsdCents
    : (utcPack as ReturnType<typeof useShipPurchaserPurchaseInfo>).pricesUtc;

  const getTierColors = (tier: number) =>
    TIER_COLOR_SCHEMES[tier % TIER_COLOR_SCHEMES.length]!;

  const getGuaranteedRanks = (tier: number): string[] => {
    const n = maxPerTier[tier] ?? 1;
    const startRank = Math.min(tier + 1, 5);
    return Array.from({ length: n }, (_, i) => {
      const r = startRank - i;
      return `R${Math.max(1, r)}`;
    });
  };

  const getGuaranteedRankNumbers = (tier: number): number[] =>
    getGuaranteedRanks(tier).map(
      (label) => parseInt(label.replace(/\D/g, ""), 10) || 1,
    );

  const getTierCallout = (tier: number): string =>
    TIER_CALLOUTS[tier] ?? `TIER ${tier} PACK`;

  const getTierBadge = (tier: number): string | null => {
    if (tierCount <= 0) return null;
    if (tier === tierCount - 1) return "BEST VALUE";
    if (tierCount >= 2 && tier === tierCount - 2) return "MOST POPULAR";
    return null;
  };

  const createPreviewShip = (seed: number, shipsDestroyed: number): Ship => ({
    name: `Preview ${seed}`,
    id: Number(900000 + seed),
    equipment: {
      mainWeapon: seed % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: (seed + 1) % 4,
    },
    traits: {
      serialNumber: Number(900000 + seed),
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
    owner: "0x0000000000000000000000000000000000000000",
  });

  const shipsDestroyedForRank = (rank: number): number => {
    switch (rank) {
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

  /**
   * Pack preview art only (not full fleet count). Entry pack: single R1. Other
   * tiers: veterans only (rank greater than 1), no R1 filler in the strip.
   */
  const getPreviewDisplayRanks = (tier: number): number[] => {
    const ranks = getGuaranteedRankNumbers(tier);
    if (tier === 0) {
      return [1];
    }
    return ranks.filter((r) => r > 1);
  };

  const getPreviewShipsForTier = (tier: number): Ship[] => {
    const base = previewSeed + tier * 20 + 1;
    const ranksToShow = getPreviewDisplayRanks(tier);
    return ranksToShow.map((rank, idx) =>
      createPreviewShip(
        base + idx,
        shipsDestroyedForRank(Math.min(5, rank)),
      ),
    );
  };

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

  return (
    <div className="w-full">
      <header className="mb-6 border-b border-cyan/25 pb-5">
        <h3
          className="text-xl font-black uppercase tracking-[0.12em] text-cyan sm:text-2xl"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          Expand your fleet
        </h3>
        <p
          className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          }}
        >
          Each pack mints a full roster at once. Larger packs stack more
          guaranteed veteran slots so your navy hits the field ready for combat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier: number, index: number) => {
          const price = prices[index];
          const shipsCount = maxPerTier[index];
          const priceFormatted = paymentMethod === "USD"
            ? `$${((price ?? 0) / 100).toFixed(2)}`
            : `${price ?? 0} UTC`;
          const colors = getTierColors(tier);
          const guaranteedRanksDisplay = getGuaranteedRankNumbers(tier)
            .filter((r) => r > 1)
            .map((r) => `R${r}`);
          const tierCallout = getTierCallout(tier);
          const badge = getTierBadge(tier);
          const previewShips = getPreviewShipsForTier(tier);
          const previewSingleColumn = previewShips.length <= 1;

          return (
            <ShipPurchaseButton
              key={index}
              tier={tier}
              price={Number(price ?? 0)}
              paymentMethod={paymentMethod}
              className={`relative min-h-[420px] px-4 py-3 border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              refetch={refetch}
            >
              <div className="flex h-full flex-col gap-2 text-left">
                {badge && (
                  <div className="absolute right-2 top-2 border border-solid border-cyan bg-cyan/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-cyan">
                    {badge}
                  </div>
                )}
                <div className="pr-20">
                  <div className="text-lg font-extrabold leading-tight">
                    {tierCallout}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
                    <div className="opacity-75">PRICE</div>
                    <div className="font-bold">
                      {priceFormatted}
                    </div>
                  </div>
                  <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
                    <div className="opacity-75">FLEET SIZE</div>
                    <div className="font-bold">{shipsCount} SHIPS</div>
                  </div>
                </div>

                <div className="border border-solid border-current/35 bg-black/20 p-2">
                  <div className="mb-1 text-[10px] opacity-75">
                    Pack preview
                  </div>
                  {previewShips.length === 0 ? (
                    <div className="py-6 text-center text-[10px] opacity-60">
                      No veteran preview for this pack.
                    </div>
                  ) : previewSingleColumn ? (
                    <div className="flex justify-center">
                      <div className="h-64 w-64 shrink-0">
                        <ShipImage
                          ship={previewShips[0]!}
                          showLoadingState={false}
                          rankStarsSize="large"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end justify-center gap-2">
                      <div className="h-64 w-64 shrink-0">
                        <ShipImage
                          ship={previewShips[0]!}
                          showLoadingState={false}
                          rankStarsSize="large"
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-start justify-end gap-0.5 pb-0.5">
                        {previewShips.slice(1).map((ship) => (
                          <div
                            key={ship.id.toString()}
                            className="h-16 w-16 shrink-0"
                          >
                            <ShipImage ship={ship} showLoadingState={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] leading-tight opacity-90">
                  Guaranteed ranks:{" "}
                  {guaranteedRanksDisplay.length > 0
                    ? guaranteedRanksDisplay.join(" + ")
                    : "—"}
                </div>
              </div>
            </ShipPurchaseButton>
          );
        })}

        <aside
          className="flex min-h-[420px] flex-col justify-center gap-5 border-2 border-solid border-cyan/45 bg-black/25 px-5 py-5 text-left"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          <h4 className="text-2xl font-bold leading-tight tracking-wide text-cyan sm:text-3xl">
            One mint.{" "}
            <span className="font-semibold text-amber">Full fleet</span>.
          </h4>
          <p className="text-base font-medium leading-snug text-text-primary sm:text-lg">
            Higher tiers stack more{" "}
            <span className="font-semibold text-amber">
              guaranteed veterans
            </span>{" "}
            and a bigger fleet in one mint.
          </p>
          <p className="text-sm font-medium leading-relaxed text-cyan/90 sm:text-base">
            <span className="md:hidden">Tap the tier you want</span>
            <span className="hidden md:inline">Click the tier you want</span>
            {" and mint the whole roster."}
          </p>
        </aside>
      </div>
      <p
        className="mt-4 text-[11px] uppercase tracking-[0.08em] text-text-muted"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        {paymentMethod === "UTC"
          ? "UTC will be deducted from your in-game balance."
          : "Ships are added to your fleet immediately."}
      </p>
      <p
        className="mt-1 text-[11px] uppercase tracking-[0.08em] text-text-muted"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        Preview ships are examples only. Final minted ships may differ in loadout
        and visuals.
      </p>
    </div>
  );
};

export default ShipPurchaseInterface;

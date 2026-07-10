"use client";

// Shared between ShipPurchaseInterface.tsx (web3) and
// ShipPurchaseInterfaceWeb2.tsx (web2) — the inner content of a purchase
// tier card (badge, callout, price/fleet-size box, preview art, guaranteed
// ranks line), ported verbatim from ShipPurchaseInterface.tsx. Callers
// supply pre-rendered preview images (`ShipImage` vs `ShipImageWeb2`, render-
// prop pattern per the number-native-shared-components rule) and wrap this
// in whatever clickable button their purchase flow needs.
interface ShipPurchaseTierCardProps {
  tierCallout: string;
  badge: string | null;
  priceLabel: string;
  shipsCount: number;
  guaranteedRanksDisplay: string[];
  previewShipImages: React.ReactNode[];
}

export function ShipPurchaseTierCard({
  tierCallout,
  badge,
  priceLabel,
  shipsCount,
  guaranteedRanksDisplay,
  previewShipImages,
}: ShipPurchaseTierCardProps) {
  const previewSingleColumn = previewShipImages.length <= 1;

  return (
    <div className="flex h-full flex-col gap-2 text-left">
      {badge && (
        <div className="absolute right-2 top-2 border border-solid border-cyan bg-cyan/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-cyan">
          {badge}
        </div>
      )}
      <div className="pr-20">
        <div className="text-lg font-extrabold leading-tight">{tierCallout}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
          <div className="opacity-75">PRICE</div>
          <div className="font-bold">{priceLabel}</div>
        </div>
        <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
          <div className="opacity-75">FLEET SIZE</div>
          <div className="font-bold">{shipsCount} SHIPS</div>
        </div>
      </div>

      <div className="border border-solid border-current/35 bg-black/20 p-2">
        <div className="mb-1 text-[10px] opacity-75">Pack preview</div>
        {previewShipImages.length === 0 ? (
          <div className="py-6 text-center text-[10px] opacity-60">
            No veteran preview for this pack.
          </div>
        ) : previewSingleColumn ? (
          <div className="flex justify-center">
            <div className="h-64 w-64 shrink-0">{previewShipImages[0]}</div>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2">
            <div className="h-64 w-64 shrink-0">{previewShipImages[0]}</div>
            <div className="flex shrink-0 flex-col items-start justify-end gap-0.5 pb-0.5">
              {previewShipImages.slice(1).map((node, i) => (
                <div key={i} className="h-16 w-16 shrink-0">
                  {node}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] leading-tight opacity-90">
        Guaranteed ranks:{" "}
        {guaranteedRanksDisplay.length > 0 ? guaranteedRanksDisplay.join(" + ") : "—"}
      </div>
    </div>
  );
}

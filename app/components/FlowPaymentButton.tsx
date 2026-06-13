"use client";

import { useFlowPaymentModal } from "../hooks/useFlowPaymentModal";
import { FlowPaymentModal } from "./FlowPaymentModal";
import { ShipImage } from "./ShipImage";
import type { Ship } from "../types/types";
import type { FlowTier } from "../config/flowPayment";

interface FlowPaymentButtonProps {
  tier: number;
  gameChainId: number;
  flowTier: FlowTier;
  shipsCount: number;
  tierCallout: string;
  badge: string | null;
  previewShips: Ship[];
  colors: {
    border: string;
    text: string;
    hoverBorder: string;
    hoverText: string;
    hoverBg: string;
  };
  onSuccess: () => void;
}

export function FlowPaymentButton({
  tier,
  gameChainId,
  flowTier,
  shipsCount,
  tierCallout,
  badge,
  previewShips,
  colors,
  onSuccess,
}: FlowPaymentButtonProps) {
  const modal = useFlowPaymentModal({ onSuccess });
  const previewSingleColumn = previewShips.length <= 1;

  return (
    <>
      <button
        onClick={() => void modal.open(tier, gameChainId)}
        className={`relative min-h-[420px] px-4 py-3 border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 text-left`}
      >
        <div className="flex h-full flex-col gap-2">
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
              <div className="font-bold">${flowTier.displayPrice} USD</div>
            </div>
            <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
              <div className="opacity-75">FLEET SIZE</div>
              <div className="font-bold">{shipsCount} SHIPS</div>
            </div>
          </div>

          <div className="border border-solid border-current/35 bg-black/20 p-2">
            <div className="mb-1 text-[10px] opacity-75">Pack preview</div>
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
                    <div key={ship.id.toString()} className="h-16 w-16 shrink-0">
                      <ShipImage ship={ship} showLoadingState={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] uppercase tracking-[0.08em] opacity-80 mt-auto">
            [Pay with USD]
          </div>
        </div>
      </button>

      <FlowPaymentModal modal={modal} flowTier={flowTier} />
    </>
  );
}

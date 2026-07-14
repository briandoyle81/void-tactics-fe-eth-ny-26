"use client";

import React from "react";
import { STYLE_LABEL } from "../styles/fontStyles";

// Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) —
// the "FLEET DETAILS" modal (full `ShipCard` grid, 2 columns: my fleet /
// enemy fleet), ported verbatim from GameDisplay.tsx. Ship-card building
// stays caller-side (web3: `toShipCardData`/`ShipImage`; web2:
// `toShipCardDataWeb2`/`ShipImageWeb2`) since that's a real data
// difference — this component only owns the modal shell and the two
// fleet-column layout.
interface GameFleetDetailsModalProps {
  show: boolean;
  onClose: () => void;
  myFleetLabel: string;
  enemyFleetLabel: string;
  myFleetCards: React.ReactNode[];
  enemyFleetCards: React.ReactNode[];
  /** Web3-only: name-block height-equalization measurement target. */
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function GameFleetDetailsModal({
  show,
  onClose,
  myFleetLabel,
  enemyFleetLabel,
  myFleetCards,
  enemyFleetCards,
  containerRef,
}: GameFleetDetailsModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(12, 17, 23, 0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-[90%] my-4 border border-solid p-4"
        style={{
          backgroundColor: "var(--color-slate)",
          borderColor: "var(--color-gunmetal)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center border border-solid"
          style={{
            color: "var(--color-warning-red)",
            borderColor: "var(--color-warning-red)",
            backgroundColor: "var(--color-near-black)",
            borderRadius: 0,
            fontSize: 14,
            lineHeight: 1,
          }}
          aria-label="Close fleet details"
        >
          ✕
        </button>
        <div className="mb-4">
          <span
            className="uppercase tracking-wider font-bold"
            style={{ ...STYLE_LABEL, fontSize: 14, color: "var(--color-text-secondary)" }}
          >
            FLEET DETAILS
          </span>
        </div>
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{ ...STYLE_LABEL, color: "var(--color-cyan)", fontSize: "18px" }}
            >
              {myFleetLabel}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{myFleetCards}</div>
          </div>
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{ ...STYLE_LABEL, color: "var(--color-warning-red)", fontSize: "18px" }}
            >
              {enemyFleetLabel}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{enemyFleetCards}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

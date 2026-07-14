"use client";

import React from "react";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// "FLEET #N" roster viewer opened from a lobby card's "CMDR FLEET #N" /
// "JOIN FLEET #N" buttons. Ported from Lobbies.tsx's original hand-built
// stat-row modal, now rendering `ShipCard`s the caller builds (web3:
// `toShipCardData`/`ShipImage`; web2: `toShipCardDataWeb2`/`ShipImageWeb2`)
// — same convergence as Phase 6.2's `GameFleetDetailsModal`, but for a
// single fleet instead of a my-fleet/enemy-fleet pair.
interface FleetViewModalProps {
  fleetIdLabel: string;
  ownerLabel: string;
  isOwnerMe: boolean;
  onClose: () => void;
  isLoading: boolean;
  shipCards: React.ReactNode[];
}

export function FleetViewModal({
  fleetIdLabel,
  ownerLabel,
  isOwnerMe,
  onClose,
  isLoading,
  shipCards,
}: FleetViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]">
      <div className="bg-near-black border border-cyan rounded-none p-6 max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-lg font-bold text-cyan">FLEET #{fleetIdLabel}</h4>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gunmetal text-text-muted rounded-none hover:bg-steel/20"
            >
              CLOSE
            </button>
          </div>
        </div>

        <div className="mb-4 p-3 bg-black/40 border border-gunmetal rounded-none">
          <p className="text-sm text-text-secondary">
            <span className="text-cyan">Owner:</span> {ownerLabel}
            {isOwnerMe && <span className="ml-2 text-cyan font-bold">(You)</span>}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 font-mono text-xs text-text-muted tracking-widest animate-pulse text-center">
              &gt;&gt; ACQUIRING FLEET DATA...
            </div>
          ) : shipCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shipCards}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8">
              <p className="text-lg mb-2">No Ships Found</p>
              <p className="text-sm">
                This fleet appears to be empty or the data could not be loaded.
              </p>
              <p className="text-xs mt-2 text-text-muted">Fleet ID: {fleetIdLabel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// single-ship recycle confirmation modal, ported verbatim from
// ManageNavy.tsx. `confirmButton` is caller-supplied (web3: a
// `TransactionButton` calling `Ships.shipBreaker`; web2: a REST call to
// `DELETE /api/ships/[id]`) since the actual destroy action is a real
// data/action difference. `rewardLabel` is a pre-formatted string (web3:
// `formatEther(recycleReward)` UTC; web2: the plain-number
// `economy.recycleRewardUtc`), so this component never touches bigint.
interface RecycleConfirmModalProps {
  show: boolean;
  shipName: string;
  canRecycle: boolean;
  purchasedCount: number;
  threshold: number;
  rewardLabel: string;
  onCancel: () => void;
  confirmButton: React.ReactNode;
}

export function RecycleConfirmModal({
  show,
  shipName,
  canRecycle,
  purchasedCount,
  threshold,
  rewardLabel,
  onCancel,
  confirmButton,
}: RecycleConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-near-black border border-warning-red rounded-none p-6 max-w-md mx-4">
        <div className="text-center">
          <div className="text-warning-red text-2xl font-mono font-bold mb-4 tracking-widest">[✕]</div>
          {canRecycle ? (
            <>
              <h3 className="text-xl font-bold text-warning-red mb-4">
                DESTROY SHIP PERMANENTLY?
              </h3>
              <div className="text-primary mb-4">
                <p className="font-bold">{shipName}</p>
                <p className="text-sm opacity-80 mt-2">This action will:</p>
                <ul className="text-sm text-left mt-2 space-y-1">
                  <li>
                    • <span className="text-warning-red">Permanently destroy</span> this ship
                  </li>
                  <li>
                    •{" "}
                    <span className="text-cyan">
                      Pay out {rewardLabel} UTC
                    </span>{" "}
                    per ship recycled
                  </li>
                  <li>
                    • <span className="text-warning-red">Cannot be reversed</span> - this is
                    permanent
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-amber mb-4">
                INSUFFICIENT PURCHASES
              </h3>
              <div className="text-primary mb-4">
                <p className="font-bold">{shipName}</p>
                <p className="text-sm opacity-80 mt-2">
                  You must purchase at least {threshold} ships before you can recycle any
                  ships.
                </p>
                <p className="text-sm text-amber mt-2 font-bold">
                  Current purchases: {purchasedCount} / {threshold} required
                </p>
              </div>
            </>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-steel text-muted hover:border-secondary hover:text-secondary hover:bg-steel/10 rounded-none font-mono font-bold transition-all duration-200"
            >
              CANCEL
            </button>
            {canRecycle && confirmButton}
          </div>
        </div>
      </div>
    </div>
  );
}

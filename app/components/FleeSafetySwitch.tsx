"use client";

import React, { useState } from "react";
import { apiMutate } from "../lib/apiMutate";
import { toast } from "react-hot-toast";

interface FleeSafetySwitchProps {
  gameId: number;
  onFlee?: () => void;
  /** When true, lever cannot be toggled (e.g. tutorial). */
  locked?: boolean;
}

export function FleeSafetySwitch({
  gameId,
  onFlee,
  locked = false,
}: FleeSafetySwitchProps) {
  const [isLeverOpen, setIsLeverOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFleeing, setIsFleeing] = useState(false);

  const handleLeverToggle = () => {
    if (locked) return;
    setIsLeverOpen(!isLeverOpen);
    if (isLeverOpen) {
      setShowConfirmModal(false);
    }
  };

  const handleFleeClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmFlee = async () => {
    if (isFleeing) return;
    setIsFleeing(true);
    try {
      await apiMutate(`/api/games/${gameId}/flee`, "POST");
      setShowConfirmModal(false);
      setIsLeverOpen(false);
      onFlee?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Retreat failed: ${message}`);
    } finally {
      setIsFleeing(false);
    }
  };

  const handleCancelFlee = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="hazard-border">
      <div className="flex h-full min-h-0 w-full min-w-0 items-stretch gap-4 bg-near-black px-4 py-4">
        {/* Safety lever */}
        <div className="flex min-h-0 min-w-0 shrink-0 flex-col items-center justify-between self-stretch leading-none">
          <button
            type="button"
            onClick={handleLeverToggle}
            disabled={locked}
            className={`relative flex h-5 w-10 shrink-0 items-center overflow-hidden rounded-none border-2 transition-all duration-300 ${
              locked
                ? "cursor-not-allowed border-gunmetal bg-steel opacity-80"
                : isLeverOpen
                  ? "border-warning-red bg-warning-red"
                  : "border-steel bg-steel hover:border-gunmetal"
            }`}
            title={
              locked
                ? "Disengage disabled in training"
                : isLeverOpen
                  ? "Re-engage safety"
                  : "Release safety"
            }
          >
            <div
              className={`h-3 w-3 rounded-none transition-all duration-300 ${
                isLeverOpen
                  ? "translate-x-5 bg-warning-red"
                  : "translate-x-0.5 bg-text-muted"
              }`}
            />
          </button>
          <span className="text-[9px] font-mono uppercase tracking-tight text-text-muted">
            {isLeverOpen ? "ARMED" : "SAFE"}
          </span>
        </div>

        {/* Disengage button */}
        <button
          type="button"
          onClick={isLeverOpen ? handleFleeClick : undefined}
          disabled={!isLeverOpen}
          className={`min-h-0 shrink-0 px-3 py-2 text-xs font-mono font-bold uppercase leading-none tracking-wider rounded-none border-2 border-solid transition-all duration-200 ${
            isLeverOpen
              ? "cursor-pointer border-warning-red bg-warning-red/20 text-white hover:bg-warning-red/30"
              : "cursor-not-allowed border-steel bg-steel text-text-muted"
          }`}
        >
          RETREAT
        </button>

        {/* Confirm modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="hazard-border max-w-md mx-4 w-full">
              <div className="bg-near-black p-6">
                <div className="text-center mb-1">
                  <span className="text-[10px] font-mono text-text-muted tracking-widest">// CONFIRMATION REQUIRED //</span>
                </div>
                <h2 className="text-warning-red font-mono text-xl font-bold mb-4 text-center tracking-widest">
                  [RETREAT]
                </h2>
                <p className="text-text-secondary font-mono text-sm mb-2 text-center">
                  Tactical withdrawal from active engagement.
                </p>
                <p className="text-text-muted font-mono text-xs mb-6 text-center">
                  This action is irreversible. The engagement will be recorded as a loss.
                </p>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleCancelFlee}
                    disabled={isFleeing}
                    className="flex-1 px-4 py-2 bg-steel hover:bg-gunmetal text-white font-mono rounded-none border border-gunmetal transition-colors tracking-wider"
                  >
                    STAND DOWN
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmFlee}
                    disabled={isFleeing}
                    className="flex-1 px-4 py-2 bg-warning-red/20 hover:bg-warning-red/30 text-white font-mono font-bold rounded-none border border-warning-red transition-colors tracking-wider"
                  >
                    {isFleeing ? "RETREATING..." : "CONFIRM"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

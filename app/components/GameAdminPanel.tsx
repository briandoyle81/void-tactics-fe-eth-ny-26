"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { TransactionButton } from "./TransactionButton";
import { useGameContract, useGameOwner, useHealCapPercent } from "../hooks/useGameContract";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

// Owner-only Game admin control, gated on Ownable's owner() directly
// (same pattern as LobbyAdminPanel.tsx). Currently just the global heal
// cap (Game.setHealCapPercent / SpecialEffectsLib) — caps any heal effect,
// in any mode, at a % of a ship's max HP.
export function GameAdminPanel() {
  const { address } = useAccount();
  const { data: owner, isLoading: ownerLoading } = useGameOwner();
  const { address: gameAddress, abi } = useGameContract();
  const { data: healCapPercent, isLoading: capLoading, refetch } = useHealCapPercent();

  const [percent, setPercent] = useState("");

  useEffect(() => {
    if (healCapPercent != null) {
      setPercent(healCapPercent.toString());
    }
  }, [healCapPercent]);

  const isOwner =
    !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  if (ownerLoading || !isOwner) return null;

  const parsedPercent = Number(percent);
  const valid =
    percent.trim() !== "" &&
    Number.isInteger(parsedPercent) &&
    parsedPercent >= 0 &&
    parsedPercent <= 100;

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">[GAME SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Current heal cap:{" "}
        {capLoading || healCapPercent == null ? "…" : `${healCapPercent}%`}. Caps
        any heal effect (RepairDrones, faction Repair, win-effect heals, etc.),
        in every mode, at this percentage of a ship&apos;s max HP.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-cyan mb-1">Heal cap (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <TransactionButton
          transactionId="game-set-heal-cap-percent"
          contractAddress={gameAddress}
          abi={abi}
          functionName="setHealCapPercent"
          args={valid ? [parsedPercent] : []}
          disabled={!valid}
          validateBeforeTransaction={() => valid || "Enter a whole number 0-100"}
          onSuccess={() => {
            void refetch();
          }}
          className="px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [SET HEAL CAP]
        </TransactionButton>
      </div>
    </div>
  );
}

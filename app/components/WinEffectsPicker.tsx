"use client";

import React, { useEffect, useState } from "react";
import type { Abi, Address } from "viem";
import { TransactionButton } from "./TransactionButton";
import { WIN_EFFECT_CATALOG, useWinEffectAddresses } from "../hooks/useWinEffects";

interface WinEffectsPickerProps {
  transactionId: string;
  contractAddress: Address;
  abi: Abi;
  currentEffects: Address[] | undefined;
  onSaved: () => void;
}

// Shared checkbox-list + save control for assigning a subset of
// WIN_EFFECT_CATALOG to a setWinEffects(address[]) caller. Used by both
// PvPMatchAdminPanel and TournamentWinEffectsAdminPanel — identical shape,
// different owner-gated contract underneath — so this is factored out
// rather than duplicated (see RoguelikeNodeEditPanel.tsx for the
// per-node equivalent, which predates this shared extraction).
export function WinEffectsPicker({
  transactionId,
  contractAddress,
  abi,
  currentEffects,
  onSaved,
}: WinEffectsPickerProps) {
  const winEffectAddresses = useWinEffectAddresses();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected((currentEffects ?? []).map((a) => a.toLowerCase()));
  }, [currentEffects]);

  const toggle = (address: Address) => {
    const lower = address.toLowerCase();
    setSelected((prev) =>
      prev.includes(lower) ? prev.filter((a) => a !== lower) : [...prev, lower],
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {WIN_EFFECT_CATALOG.map(({ key, label }) => {
        const address = winEffectAddresses[key];
        const checked = !!address && selected.includes(address.toLowerCase());
        return (
          <label
            key={key}
            className="flex items-center gap-2 text-xs text-text-secondary"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!address}
              onChange={() => address && toggle(address)}
            />
            {label}
            {!address && (
              <span className="text-warning-red">(not deployed on this chain)</span>
            )}
          </label>
        );
      })}
      <TransactionButton
        transactionId={transactionId}
        contractAddress={contractAddress}
        abi={abi}
        functionName="setWinEffects"
        args={[selected as `0x${string}`[]]}
        onSuccess={onSaved}
        className="self-start px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        [SAVE WIN EFFECTS]
      </TransactionButton>
    </div>
  );
}

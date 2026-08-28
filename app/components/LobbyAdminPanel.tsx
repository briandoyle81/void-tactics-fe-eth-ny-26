"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { TransactionButton } from "./TransactionButton";
import {
  useLobbiesChainParams,
  useLobbiesOwner,
  useLobbySettings,
} from "../hooks/useLobbiesContract";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

const SECONDS_PER_DAY = 86400;

// Owner-only Lobbies admin control — first one of these to exist, gated on
// Ownable's owner() directly (unlike MAP_ADMIN_ADDRESS/isNodeEditor-style
// gates elsewhere, since Lobbies already exposes a real owner). Currently
// just the stale-lobby-pruning threshold (setStaleLobbyThreshold), added
// alongside pruneStaleLobby — see docs/update/Frontend_Updates_2026-08-27.md §4.
export function LobbyAdminPanel() {
  const { address } = useAccount();
  const { data: owner, isLoading: ownerLoading } = useLobbiesOwner();
  const { address: lobbiesAddress, abi } = useLobbiesChainParams();
  const {
    staleLobbyThreshold,
    isLoading: settingsLoading,
    refetchStaleLobbyThreshold,
  } = useLobbySettings();

  const [days, setDays] = useState("");

  useEffect(() => {
    if (staleLobbyThreshold != null) {
      setDays((Number(staleLobbyThreshold) / SECONDS_PER_DAY).toString());
    }
  }, [staleLobbyThreshold]);

  const isOwner =
    !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  if (ownerLoading || !isOwner) return null;

  const parsedDays = Number(days);
  const valid = days.trim() !== "" && Number.isFinite(parsedDays) && parsedDays > 0;

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">[LOBBY SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Current stale-lobby threshold:{" "}
        {settingsLoading || staleLobbyThreshold == null
          ? "…"
          : `${Number(staleLobbyThreshold) / SECONDS_PER_DAY} day(s)`}
        . An open, unjoined lobby older than this can be permissionlessly
        pruned from the browse list (still joinable directly by id).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-cyan mb-1">Threshold (days)</label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <TransactionButton
          transactionId="lobbies-set-stale-threshold"
          contractAddress={lobbiesAddress}
          abi={abi}
          functionName="setStaleLobbyThreshold"
          args={valid ? [BigInt(Math.floor(parsedDays * SECONDS_PER_DAY))] : []}
          disabled={!valid}
          validateBeforeTransaction={() => valid || "Enter a threshold in days"}
          onSuccess={() => {
            void refetchStaleLobbyThreshold();
          }}
          className="px-4 py-2 border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [SET THRESHOLD]
        </TransactionButton>
      </div>
    </div>
  );
}

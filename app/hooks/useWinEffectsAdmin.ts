"use client";

import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

// Owner-only config setters for the three concrete win-effect resolvers
// (see contracts/IWinEffect.sol and useWinEffects.ts's WIN_EFFECT_CATALOG)
// — each targets a different singleton contract, not RoguelikeNodeMap, so
// kept separate from useRoguelikeNodeMapAdmin.ts (which owns node/campaign
// config on RoguelikeNodeMap itself).
const CHAIN_ID = baseSepolia.id;

export function useWinEffectsAdmin() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const setDecBonusAmount = useCallback(
    async (amount: bigint) => {
      const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
        .DEC_BONUS_WIN_EFFECT as Address;
      const hash = await writeContractAsync({
        address,
        abi: CONTRACT_ABIS.DEC_BONUS_WIN_EFFECT as Abi,
        chainId: CHAIN_ID,
        functionName: "setBonusAmount",
        args: [amount],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const setHealAboveFloorPercent = useCallback(
    async (percent: number) => {
      const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
        .HEAL_ABOVE_FLOOR_WIN_EFFECT as Address;
      const hash = await writeContractAsync({
        address,
        abi: CONTRACT_ABIS.HEAL_ABOVE_FLOOR_WIN_EFFECT as Abi,
        chainId: CHAIN_ID,
        functionName: "setHealToPercent",
        args: [percent],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  const setShipGrantConfig = useCallback(
    async (variant: number, tier: number) => {
      const address = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
        .SHIP_GRANT_WIN_EFFECT as Address;
      const hash = await writeContractAsync({
        address,
        abi: CONTRACT_ABIS.SHIP_GRANT_WIN_EFFECT as Abi,
        chainId: CHAIN_ID,
        functionName: "setShipConfig",
        args: [variant, tier],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [writeContractAsync, publicClient],
  );

  return { setDecBonusAmount, setHealAboveFloorPercent, setShipGrantConfig };
}

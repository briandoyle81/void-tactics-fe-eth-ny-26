"use client";

import { useCallback } from "react";
import { useConfig, usePublicClient, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "./useSwitchToSelectedChainIfNeeded";
import type { Ship } from "../types/types";

const RANDOM_MANAGER_ABI = CONTRACT_ABIS.RANDOM_MANAGER as Abi;

// Base's prevrandao source (relayed from L1) only refreshes roughly every 6
// L2 blocks (~12s) — see docs/update/Frontend_Updates_2026-08-26.md. Poll
// the free `canReveal` view until it flips true rather than guessing a wait.
const CAN_REVEAL_POLL_INTERVAL_MS = 1500;
const CAN_REVEAL_TIMEOUT_MS = 20000;

export function useRandomManagerContract() {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  return {
    address: contractAddresses.RANDOM_MANAGER as `0x${string}`,
    abi: RANDOM_MANAGER_ABI,
    chainId: activeChainId,
  };
}

// Reveals the serial numbers of every not-yet-constructed ship in `ships`,
// one player-signed transaction each (RandomManager has no batch reveal).
// Per CLAUDE.md's "No Backend Services in Place of Contract Functions" rule,
// this is player-signed rather than a keeper — revealRandomness has no
// access control, so there's no privileged-credential reason for a backend
// service to do it instead.
export function useRevealRandomness() {
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const publicClient = usePublicClient({ chainId: activeChainId });

  // Resolves once a serial number's randomness is revealable, or throws
  // TooSoonToReveal if it never flips true within the timeout — callers
  // should surface that as "still waiting on-chain, try again shortly"
  // rather than retry-submitting paid transactions in a loop.
  const waitUntilRevealable = useCallback(
    async (serialNumber: bigint) => {
      if (!publicClient) throw new Error("No RPC client available");
      const address = contractAddresses.RANDOM_MANAGER as `0x${string}`;
      const deadline = Date.now() + CAN_REVEAL_TIMEOUT_MS;
      for (;;) {
        const ready = await publicClient.readContract({
          address,
          abi: RANDOM_MANAGER_ABI,
          functionName: "canReveal",
          args: [serialNumber],
        });
        if (ready) return;
        if (Date.now() > deadline) {
          throw new Error("TooSoonToReveal");
        }
        await new Promise((resolve) =>
          setTimeout(resolve, CAN_REVEAL_POLL_INTERVAL_MS),
        );
      }
    },
    [publicClient, contractAddresses],
  );

  // Reveals a single serial number. AlreadyRevealed is treated as success
  // (a concurrent reveal — retry, another tab — already did the work).
  const revealOne = useCallback(
    async (serialNumber: bigint) => {
      if (!publicClient) throw new Error("No RPC client available");
      await waitUntilRevealable(serialNumber);
      try {
        const hash = await writeContractAsync({
          address: contractAddresses.RANDOM_MANAGER as `0x${string}`,
          abi: RANDOM_MANAGER_ABI,
          functionName: "revealRandomness",
          args: [serialNumber],
          chainId: activeChainId,
          ...(await getLegacyGasPriceOverridesForWrite(
            activeChainId,
            publicClient,
          )),
        });
        await waitForTransactionReceipt(config, {
          hash,
          chainId: activeChainId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("AlreadyRevealed")) throw err;
      }
    },
    [
      writeContractAsync,
      config,
      activeChainId,
      contractAddresses,
      publicClient,
      waitUntilRevealable,
    ],
  );

  // Reveals every ship in `ships` that isn't constructed yet, sequentially
  // (one wallet signature each) — call before constructShip/
  // constructAllMyShips/constructShips, which now revert NotYetRevealed
  // otherwise.
  const revealAllForShips = useCallback(
    async (ships: Ship[]) => {
      await switchToSelectedChainIfNeeded();
      const unconstructed = ships.filter((s) => !s.shipData.constructed);
      for (const ship of unconstructed) {
        await revealOne(ship.traits.serialNumber);
      }
    },
    [revealOne, switchToSelectedChainIfNeeded],
  );

  return { revealOne, revealAllForShips };
}

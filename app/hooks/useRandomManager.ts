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
// the free `canRevealBatch` view until it flips true rather than guessing a wait.
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

// Reveals the serial numbers of every not-yet-constructed ship in `ships` in
// a SINGLE player-signed transaction via RandomManager.revealRandomnessBatch.
// Per CLAUDE.md's "No Backend Services in Place of Contract Functions" rule,
// this is player-signed rather than a keeper — revealRandomness has no
// access control, so there's no privileged-credential reason for a backend
// service to do it instead.
//
// Why one batch tx and not one tx per serial: with an embedded/WaaS wallet
// (Dynamic), every transaction is signed through an MPC `signMessage` HTTP
// call. Revealing a whole pack one serial at a time fires a burst of those
// calls and trips Dynamic's rate limiter (HTTP 429, long retry-after), which
// breaks construct-and-reveal for anything more than a couple of ships. The
// batch collapses N signatures into 1.
export function useRevealRandomness() {
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const publicClient = usePublicClient({ chainId: activeChainId });

  // Resolves once every serial number in the batch is revealable, or throws
  // TooSoonToReveal if they don't all flip true within the timeout — callers
  // should surface that as "still waiting on-chain, try again shortly"
  // rather than retry-submitting paid transactions in a loop. canRevealBatch
  // returns true only when ALL requests are ready (already-revealed ones
  // count as ready), so this also handles mixed already/not-yet-revealed sets.
  const waitUntilRevealable = useCallback(
    async (serialNumbers: bigint[]) => {
      if (!publicClient) throw new Error("No RPC client available");
      if (serialNumbers.length === 0) return;
      const address = contractAddresses.RANDOM_MANAGER as `0x${string}`;
      const deadline = Date.now() + CAN_REVEAL_TIMEOUT_MS;
      for (;;) {
        const ready = await publicClient.readContract({
          address,
          abi: RANDOM_MANAGER_ABI,
          functionName: "canRevealBatch",
          args: [serialNumbers],
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

  // Reveals every ship in `ships` that isn't constructed yet in one batch
  // transaction (a single wallet signature) — call before constructShip/
  // constructAllMyShips/constructShips, which now revert NotYetRevealed
  // otherwise. Already-revealed serials (e.g. a prior attempt revealed but
  // didn't construct) are skipped so we never submit an empty/pointless tx.
  const revealAllForShips = useCallback(
    async (ships: Ship[]) => {
      if (!publicClient) throw new Error("No RPC client available");
      await switchToSelectedChainIfNeeded();
      const address = contractAddresses.RANDOM_MANAGER as `0x${string}`;

      const serials = ships
        .filter((s) => !s.shipData.constructed)
        .map((s) => s.traits.serialNumber);
      if (serials.length === 0) return;

      // Drop serials that are already revealed — reads hit the public RPC,
      // not the wallet, so this costs no signatures.
      const revealedFlags = await Promise.all(
        serials.map(async (serial) => {
          const [, , revealed] = (await publicClient.readContract({
            address,
            abi: RANDOM_MANAGER_ABI,
            functionName: "requests",
            args: [serial],
          })) as [bigint, bigint, boolean, bigint];
          return revealed;
        }),
      );
      const toReveal = serials.filter((_, i) => !revealedFlags[i]);
      if (toReveal.length === 0) return;

      await waitUntilRevealable(toReveal);

      const hash = await writeContractAsync({
        address,
        abi: RANDOM_MANAGER_ABI,
        functionName: "revealRandomnessBatch",
        args: [toReveal],
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
    },
    [
      writeContractAsync,
      config,
      activeChainId,
      contractAddresses,
      publicClient,
      switchToSelectedChainIfNeeded,
      waitUntilRevealable,
    ],
  );

  return { revealAllForShips };
}

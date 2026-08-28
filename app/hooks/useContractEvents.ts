"use client";

import { useAccount, useWatchContractEvent } from "wagmi";
import type { Abi, Log } from "viem";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { usePlayerGames } from "./usePlayerGames";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useCallback, useMemo } from "react";
import { getSelectedChainId } from "../config/networks";
import { baseSepolia } from "viem/chains";
import { SINGLE_PLAYER_MATCH_ADDRESS } from "./useSinglePlayerMatch";

const SHIP_TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
    ],
  },
] as const;

const GAME_UPDATE_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "GameUpdate",
    type: "event",
  },
] as const;

const AI_TURN_TAKEN_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "gameId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "shipId", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "actionType", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "targetShipId", type: "uint256" },
    ],
    name: "AITurnTaken",
    type: "event",
  },
] as const;

// Global refetch functions for individual game data
export const globalGameRefetchFunctions: Map<number, () => void> = new Map();

// Function to register a game refetch function
export function registerGameRefetch(gameId: number, refetchFn: () => void) {
  globalGameRefetchFunctions.set(gameId, refetchFn);
}

// Function to unregister a game refetch function
export function unregisterGameRefetch(gameId: number) {
  globalGameRefetchFunctions.delete(gameId);
}

export function useContractEvents() {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const { refetch: refetchShips } = useOwnedShips();
  const { refetch: refetchGames } = usePlayerGames();

  // Only set up watchers if address is available
  const shouldWatch = !!address;

  const handleShipTransferLogs = useCallback(
    (logs: unknown[]) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Check if any of the events involve our address
        const relevantLogs = logs.filter((log) => {
          if (!log || typeof log !== "object") return false;
          const args = (log as { args?: { to?: string; from?: string } }).args;
          if (!args) return false;
          return args.to === address || args.from === address;
        });

        if (relevantLogs.length > 0) {
          refetchShips();
        }
      } catch (error) {
        console.error("Error processing ship transfer logs:", error);
      }
    },
    [address, refetchShips]
  );

  const handleGameUpdateLogs = useCallback(
    (logs: unknown[]) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Extract game IDs from the events
        const gameIds = new Set<number>();
        logs.forEach((log) => {
          const args = (log as { args?: { gameId?: bigint } }).args;
          if (args && typeof args.gameId === "bigint") {
            gameIds.add(Number(args.gameId));
          }
        });

        if (gameIds.size === 0) return;

        // Add 1 second delay to allow RPC to index the state change
        setTimeout(() => {
          refetchGames();

          // Also refetch individual game data for all registered games
          // Pass gameIds so each game can check if the event was for them
          globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
            if (gameIds.has(gameId)) {
              // This event was for this game - call the refetch function
              refetchFn();
            }
          });
        }, 1000);
      } catch (error) {
        console.error("Error processing game update logs:", error);
      }
    },
    [refetchGames]
  );

  // Fired once per SinglePlayerMatch.takeAITurn call. takeAITurn already
  // routes through Game's own move logic (which emits GameUpdate, handled
  // above), so this is a secondary/defensive refetch trigger — not the
  // primary sync mechanism.
  const handleAITurnTakenLogs = useCallback(
    (logs: unknown[]) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        const gameIds = new Set<number>();
        logs.forEach((log) => {
          const args = (log as { args?: { gameId?: bigint } }).args;
          if (args && typeof args.gameId === "bigint") {
            gameIds.add(Number(args.gameId));
          }
        });

        if (gameIds.size === 0) return;

        globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
          if (gameIds.has(gameId)) {
            refetchFn();
          }
        });
      } catch (error) {
        console.error("Error processing AI turn logs:", error);
      }
    },
    [],
  );

  // Reservation notification: fired wherever useContractEvents() is
  // mounted (ManageNavy/Games/GameDisplay), so a player finds out a lobby
  // was reserved for them even while they aren't looking at the Lobbies
  // tab — Lobbies.tsx's own polling handles the list-view refresh once
  // they get there, this is purely the ambient toast.
  //
  // GameAccepted/GameRejected deliberately aren't watched here: the only
  // useful recipient for those is the lobby's *creator*, but the event log
  // only carries `lobbyId`/`joiner` — no creator address — so notifying
  // correctly would need an extra lobby lookup per event. The actor who
  // just accepted/rejected already gets their own toast from the
  // accept/reject button in Lobbies.tsx, so a naive `joiner === address`
  // filter here would just re-notify them about their own action.
  const handleGameReservedLogs = useCallback(
    (logs: Log[]) => {
      if (!address) return;
      logs.forEach((log) => {
        const args = (log as unknown as { args?: { reservedJoiner?: string } }).args;
        if (args?.reservedJoiner?.toLowerCase() === address.toLowerCase()) {
          toast.success("A game has been reserved for you!");
        }
      });
    },
    [address],
  );

  const shipEventConfig = useMemo(
    () => ({
      chainId: activeChainId,
      address: contractAddresses.SHIPS as `0x${string}`,
      abi: SHIP_TRANSFER_EVENT_ABI,
      eventName: "Transfer" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleShipTransferLogs,
    }),
    [activeChainId, contractAddresses.SHIPS, handleShipTransferLogs, shouldWatch]
  );

  const gameEventConfig = useMemo(
    () => ({
      chainId: activeChainId,
      address: contractAddresses.GAME as `0x${string}`,
      abi: GAME_UPDATE_EVENT_ABI,
      eventName: "GameUpdate" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleGameUpdateLogs,
    }),
    [activeChainId, contractAddresses.GAME, handleGameUpdateLogs, shouldWatch]
  );

  const aiTurnEventConfig = useMemo(
    () => ({
      chainId: activeChainId,
      address: SINGLE_PLAYER_MATCH_ADDRESS,
      abi: AI_TURN_TAKEN_EVENT_ABI,
      eventName: "AITurnTaken" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch && activeChainId === baseSepolia.id,
      onLogs: handleAITurnTakenLogs,
    }),
    [activeChainId, handleAITurnTakenLogs, shouldWatch]
  );

  const gameReservedEventConfig = useMemo(
    () => ({
      chainId: activeChainId,
      address: contractAddresses.LOBBIES as `0x${string}`,
      abi: CONTRACT_ABIS.LOBBIES as Abi,
      eventName: "GameReserved" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleGameReservedLogs,
    }),
    [activeChainId, contractAddresses.LOBBIES, handleGameReservedLogs, shouldWatch]
  );

  // Watch ship transfer events (only when address is available)
  useWatchContractEvent(shipEventConfig);

  // Watch game update events
  useWatchContractEvent(gameEventConfig);

  // Watch AI turn events (single-player, Base Sepolia only)
  useWatchContractEvent(aiTurnEventConfig);

  // Watch lobby reservation events (notify the reserved player)
  useWatchContractEvent(gameReservedEventConfig);

  return {
    isListening: !!address,
  };
}

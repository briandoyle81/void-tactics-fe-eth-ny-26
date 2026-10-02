"use client";

import { useAccount, useWatchContractEvent } from "wagmi";
import type { Abi, Log } from "viem";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { usePlayerGames } from "./usePlayerGames";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Game.sol emits this once per new game with both players' addresses, so a
// player can learn about a game the *other* side started without polling.
const GAME_STARTED_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "gameId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "lobbyId", type: "uint256" },
      { indexed: false, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "address", name: "joiner", type: "address" },
    ],
    name: "GameStarted",
    type: "event",
  },
] as const;

// Games live on Base Sepolia only while multi-chain is disabled; usePlayerGames
// is pinned there, so the game watchers must be too or a wallet on another
// chain would watch the wrong contract and the list would never refresh.
const GAMES_CHAIN_ID = baseSepolia.id;

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

let pendingGameUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
const pendingGameUpdateIds = new Set<number>();
let pendingGamesListRefetch: (() => void) | null = null;

function scheduleGameUpdateRefetch(gameIds: Set<number>, refetchGames: () => void) {
  for (const id of gameIds) pendingGameUpdateIds.add(id);
  pendingGamesListRefetch = refetchGames;
  if (pendingGameUpdateTimeout) return;
  pendingGameUpdateTimeout = setTimeout(() => {
    pendingGameUpdateTimeout = null;
    const ids = new Set(pendingGameUpdateIds);
    pendingGameUpdateIds.clear();
    const refetchList = pendingGamesListRefetch;
    pendingGamesListRefetch = null;
    let needsListRefetch = false;
    for (const gameId of ids) {
      const liveRefetch = globalGameRefetchFunctions.get(gameId);
      if (liveRefetch) {
        liveRefetch();
      } else {
        needsListRefetch = true;
      }
    }
    // The open match already refetches itself. Pulling getGamesForPlayer on
    // every move re-rendered Home + Games for a list the player cannot see.
    if (needsListRefetch) refetchList?.();
  }, 1000);
}

// Single app-wide watcher. Games + GameDisplay + ManageNavy used to each
// call this hook, which doubled useOwnedShips/usePlayerGames while a match
// was open even after event polling was locked to one instance.
export function ContractEventsHost() {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const shouldWatch = !!address;
  // Transfer / GameReserved are list-tab concerns. Keep GameUpdate + AITurnTaken
  // while a match is open so the board still live-refetches, but drop the extra
  // 5s getLogs pollers that cannot affect the open game view.
  const [matchViewOpen, setMatchViewOpen] = useState(false);
  useEffect(() => {
    const onDetail = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setMatchViewOpen(Boolean(custom.detail?.active));
    };
    window.addEventListener("void-tactics-games-detail-active", onDetail);
    return () =>
      window.removeEventListener("void-tactics-games-detail-active", onDetail);
  }, []);
  const watchListEvents = shouldWatch && !matchViewOpen;
  const { refetch: refetchShips } = useOwnedShips(undefined, {
    enabled: watchListEvents,
  });
  const { games: playerGames, refetch: refetchGames } = usePlayerGames({
    enabled: watchListEvents,
  });
  // GameUpdate carries only a gameId and fires for every match on the
  // contract. Only this player's games may refetch their list; new games
  // arrive through GameStarted below. Disabled queries still return cached
  // data, so this stays populated while a match is open.
  const knownGameIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    knownGameIdsRef.current = new Set(
      playerGames.map((g) => Number(g.metadata.gameId)),
    );
  }, [playerGames]);
  const gamesContractAddress = getContractAddresses(GAMES_CHAIN_ID)
    .GAME as `0x${string}`;

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
        // Keep only this player's games: the open match (registered live
        // refetch) or one already in their list. Other players' moves are noise.
        const gameIds = new Set<number>();
        logs.forEach((log) => {
          const args = (log as { args?: { gameId?: bigint } }).args;
          if (args && typeof args.gameId === "bigint") {
            const id = Number(args.gameId);
            if (
              globalGameRefetchFunctions.has(id) ||
              knownGameIdsRef.current.has(id)
            ) {
              gameIds.add(id);
            }
          }
        });

        if (gameIds.size === 0) return;

        // Coalesce overlapping GameUpdate batches (Games + GameDisplay both
        // mount this hook) so we do not stack 1s refetch timeouts.
        scheduleGameUpdateRefetch(gameIds, refetchGames);
      } catch (error) {
        console.error("Error processing game update logs:", error);
      }
    },
    [refetchGames]
  );

  const handleGameStartedLogs = useCallback(
    (logs: Log[]) => {
      if (!address) return;
      const me = address.toLowerCase();
      const involvesMe = logs.some((log) => {
        const args = (log as unknown as {
          args?: { creator?: string; joiner?: string };
        }).args;
        return (
          args?.creator?.toLowerCase() === me ||
          args?.joiner?.toLowerCase() === me
        );
      });
      if (involvesMe) void refetchGames();
    },
    [address, refetchGames],
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

  // Reservation toast: mounted once from Providers so a player finds out a
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
      enabled: watchListEvents,
      onLogs: handleShipTransferLogs,
    }),
    [activeChainId, contractAddresses.SHIPS, handleShipTransferLogs, watchListEvents]
  );

  const gameEventConfig = useMemo(
    () => ({
      chainId: GAMES_CHAIN_ID,
      address: gamesContractAddress,
      abi: GAME_UPDATE_EVENT_ABI,
      eventName: "GameUpdate" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleGameUpdateLogs,
    }),
    [gamesContractAddress, handleGameUpdateLogs, shouldWatch]
  );

  const gameStartedEventConfig = useMemo(
    () => ({
      chainId: GAMES_CHAIN_ID,
      address: gamesContractAddress,
      abi: GAME_STARTED_EVENT_ABI,
      eventName: "GameStarted" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleGameStartedLogs,
    }),
    [gamesContractAddress, handleGameStartedLogs, shouldWatch]
  );

  const aiTurnEventConfig = useMemo(
    () => ({
      chainId: GAMES_CHAIN_ID,
      address: SINGLE_PLAYER_MATCH_ADDRESS,
      abi: AI_TURN_TAKEN_EVENT_ABI,
      eventName: "AITurnTaken" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch && matchViewOpen,
      onLogs: handleAITurnTakenLogs,
    }),
    [handleAITurnTakenLogs, shouldWatch, matchViewOpen]
  );

  const gameReservedEventConfig = useMemo(
    () => ({
      chainId: activeChainId,
      address: contractAddresses.LOBBIES as `0x${string}`,
      abi: CONTRACT_ABIS.LOBBIES as Abi,
      eventName: "GameReserved" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: watchListEvents,
      onLogs: handleGameReservedLogs,
    }),
    [activeChainId, contractAddresses.LOBBIES, handleGameReservedLogs, watchListEvents]
  );

  // Watch ship transfer events (only when address is available)
  useWatchContractEvent(shipEventConfig);

  // Watch game update events
  useWatchContractEvent(gameEventConfig);

  // Watch new games involving this player (including ones the opponent started)
  useWatchContractEvent(gameStartedEventConfig);

  // Watch AI turn events (single-player, Base Sepolia only)
  useWatchContractEvent(aiTurnEventConfig);

  // Watch lobby reservation events (notify the reserved player)
  useWatchContractEvent(gameReservedEventConfig);

  return null;
}

export function useContractEvents() {
  const { address } = useAccount();
  return {
    isListening: !!address,
  };
}

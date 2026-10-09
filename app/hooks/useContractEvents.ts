"use client";

import { useAccount } from "wagmi";
import type { Abi, Log } from "viem";
import { eventAbi, useCombinedEventWatch } from "./useCombinedEventWatch";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { usePlayerGames } from "./usePlayerGames";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSelectedChainId } from "../config/networks";
import { baseSepolia } from "viem/chains";
import { SINGLE_PLAYER_MATCH_ADDRESS } from "./useSinglePlayerMatch";
import { ROGUELIKE_MATCH_ADDRESS } from "./useRoguelikeMatch";
import { usePageVisible, useWindowFocused } from "./usePageVisible";
import {
  groupLogsByEvent,
  isFastEventPollingRequested,
  isHiddenTurnWatchRequested,
  subscribeFastEventPolling,
} from "../utils/contractEventRouting";

// Games live on Base Sepolia only while multi-chain is disabled; usePlayerGames
// is pinned there, so the game watchers must be too or a wallet on another
// chain would watch the wrong contract and the list would never refresh.
const GAMES_CHAIN_ID = baseSepolia.id;

// Event ABIs come from the deployed artifacts so decoding always matches
// the contracts (hand-copied ABIs drifted: GameStarted's indexed fields
// changed at the 2026-10-08 redeploy and Transfer's tokenId is indexed).
const TRANSFER_EVENT = eventAbi(CONTRACT_ABIS.SHIPS as Abi, "Transfer");
const GAME_UPDATE_EVENT = eventAbi(CONTRACT_ABIS.GAME as Abi, "GameUpdate");
const GAME_STARTED_EVENT = eventAbi(CONTRACT_ABIS.GAME as Abi, "GameStarted");
// SinglePlayerMatch and RoguelikeMatch emit the same AITurnTaken.
const AI_TURN_TAKEN_EVENT = eventAbi(CONTRACT_ABIS.SINGLE_PLAYER_MATCH as Abi, "AITurnTaken");
const GAME_RESERVED_EVENT = eventAbi(CONTRACT_ABIS.LOBBIES as Abi, "GameReserved");

const GAME_CHAIN_EVENTS = [GAME_UPDATE_EVENT, GAME_STARTED_EVENT, AI_TURN_TAKEN_EVENT] as const;
const PICKER_CHAIN_EVENTS = [TRANSFER_EVENT, GAME_RESERVED_EVENT] as const;
const ALL_EVENTS = [...GAME_CHAIN_EVENTS, ...PICKER_CHAIN_EVENTS] as const;

// Poll cadence: fast while a match is open or a screen is waiting on the
// other player, slow otherwise; nothing while the tab is hidden.
const FAST_POLL_MS = 4000;
const SLOW_POLL_MS = 20_000;
// Window visible but unfocused (another app in front).
const BLURRED_POLL_MS = 60_000;
// Hidden tab with a PvP match waiting on the opponent (setHiddenTurnWatch).
// Browsers throttle hidden-tab timers to about once a minute anyway.
const HIDDEN_TURN_POLL_MS = 60_000;

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
  // A match view (Games detail) switches polling to the fast cadence and
  // skips the list-only events below.
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

  // Transfer / GameReserved are list concerns: skipped while a match is
  // open (the board refetches itself through GameUpdate / AITurnTaken).
  const matchViewOpenRef = useRef(matchViewOpen);
  matchViewOpenRef.current = matchViewOpen;
  const handleLogs = useCallback(
    (logs: Log[]) => {
      const groups = groupLogsByEvent(logs as (Log & { eventName?: string })[]);
      if (groups.GameUpdate) handleGameUpdateLogs(groups.GameUpdate);
      if (groups.GameStarted) handleGameStartedLogs(groups.GameStarted);
      if (groups.AITurnTaken) handleAITurnTakenLogs(groups.AITurnTaken);
      if (!matchViewOpenRef.current) {
        if (groups.Transfer) handleShipTransferLogs(groups.Transfer);
        if (groups.GameReserved) handleGameReservedLogs(groups.GameReserved);
      }
    },
    [handleGameUpdateLogs, handleGameStartedLogs, handleAITurnTakenLogs, handleShipTransferLogs, handleGameReservedLogs],
  );

  // Hidden tabs don't poll and unfocused windows poll slowly; becoming
  // active again catches up with one refetch.
  const isPageVisible = usePageVisible();
  const isWindowFocused = useWindowFocused();
  const isActive = isPageVisible && isWindowFocused;
  const wasActiveRef = useRef(isActive);
  useEffect(() => {
    if (isActive && !wasActiveRef.current && shouldWatch) {
      void refetchGames();
      if (!matchViewOpenRef.current) void refetchShips();
      globalGameRefetchFunctions.forEach((refetchFn) => refetchFn());
    }
    wasActiveRef.current = isActive;
  }, [isActive, shouldWatch, refetchGames, refetchShips]);

  const [fastRequested, setFastRequested] = useState(isFastEventPollingRequested);
  const [hiddenTurnWatch, setHiddenTurnWatch] = useState(isHiddenTurnWatchRequested);
  useEffect(
    () =>
      subscribeFastEventPolling(() => {
        setFastRequested(isFastEventPollingRequested());
        setHiddenTurnWatch(isHiddenTurnWatchRequested());
      }),
    [],
  );
  let pollingInterval = matchViewOpen || fastRequested ? FAST_POLL_MS : SLOW_POLL_MS;
  if (!isWindowFocused) pollingInterval = BLURRED_POLL_MS;
  if (!isPageVisible) pollingInterval = HIDDEN_TURN_POLL_MS;
  const watching = shouldWatch && (isPageVisible || hiddenTurnWatch);

  // Game, both match contracts (AITurnTaken), and — when the picker is on
  // the games chain, which is the normal case — Ships and Lobbies too: one
  // log poll for everything.
  const pickerOnGamesChain = activeChainId === GAMES_CHAIN_ID;
  const gamesChainAddresses = useMemo(
    () =>
      [
        gamesContractAddress,
        SINGLE_PLAYER_MATCH_ADDRESS,
        ROGUELIKE_MATCH_ADDRESS,
        ...(pickerOnGamesChain
          ? [contractAddresses.SHIPS as `0x${string}`, contractAddresses.LOBBIES as `0x${string}`]
          : []),
      ].filter(Boolean),
    [gamesContractAddress, pickerOnGamesChain, contractAddresses.SHIPS, contractAddresses.LOBBIES],
  );
  const pickerChainAddresses = useMemo(
    () => [contractAddresses.SHIPS as `0x${string}`, contractAddresses.LOBBIES as `0x${string}`],
    [contractAddresses.SHIPS, contractAddresses.LOBBIES],
  );

  useCombinedEventWatch({
    chainId: GAMES_CHAIN_ID,
    addresses: gamesChainAddresses,
    events: pickerOnGamesChain ? ALL_EVENTS : GAME_CHAIN_EVENTS,
    enabled: watching,
    pollingInterval,
    onLogs: handleLogs,
  });
  // Only when the picker is on another chain.
  useCombinedEventWatch({
    chainId: activeChainId,
    addresses: pickerChainAddresses,
    events: PICKER_CHAIN_EVENTS,
    enabled: watching && !pickerOnGamesChain && !matchViewOpen,
    pollingInterval: isWindowFocused ? SLOW_POLL_MS : BLURRED_POLL_MS,
    onLogs: handleLogs,
  });

  return null;
}

export function useContractEvents() {
  const { address } = useAccount();
  return {
    isListening: !!address,
  };
}

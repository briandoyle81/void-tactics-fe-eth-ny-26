"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { usePlayerGames } from "../hooks/usePlayerGames";
import GameDisplay from "./GameDisplay";
import { GameLogCard } from "./GameLogCard";
import { GamesListShell } from "./GamesListShell";
import { GameDataView } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";

const Games: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [selectedGame, setSelectedGame] = useState<GameDataView | null>(null);
  const { games, isLoading, isFetching, error, refetch } = usePlayerGames({
    enabled: !selectedGame,
  });
  const queryClient = useQueryClient();
  const [isResettingCache, setIsResettingCache] = useState(false);

  // Debug affordance: the games list is read through wagmi/TanStack Query,
  // which caches by (address, chainId, args) and only refetches in the
  // background — so a stale/empty cached result can keep showing even after
  // the underlying chain state has changed. This forces every cached read
  // (not just this one) to be thrown out and refetched, to rule caching in
  // or out when a game unexpectedly isn't appearing.
  const handleResetCache = async () => {
    setIsResettingCache(true);
    try {
      queryClient.clear();
      await refetch();
    } finally {
      setIsResettingCache(false);
    }
  };
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const TIE_ADDRESS = "0x0000000000000000000000000000000000000001";

  // Track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  // Ticker to update countdown timers (list view only).
  const [, setTick] = useState(0);

  // Update ticker every second to refresh countdown timers. Pause while a
  // match is open so this parent clock does not re-render GameDisplay at 1Hz.
  useEffect(() => {
    if (selectedGame) return;
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedGame]);

  // Helper function to calculate time remaining for a game
  const calculateTimeRemaining = (game: GameDataView): number => {
    const turnTimeSec = Number(game.turnState.turnTime || 0n);
    const turnStartSec = Number(game.turnState.turnStartTime || 0n);
    if (!turnTimeSec || !turnStartSec) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, nowSec - turnStartSec);
    return Math.max(0, turnTimeSec - elapsed);
  };

  const sortedGames = useMemo(() => {
    const copy = [...games];
    copy.sort((a, b) => {
      const aInProgress = a.metadata.winner === ZERO_ADDRESS ? 1 : 0;
      const bInProgress = b.metadata.winner === ZERO_ADDRESS ? 1 : 0;
      if (aInProgress !== bInProgress) return bInProgress - aInProgress;
      const aStarted = Number(a.metadata.startedAt || 0n);
      const bStarted = Number(b.metadata.startedAt || 0n);
      return bStarted - aStarted;
    });
    return copy;
  }, [games]);

  // Persist selectedGame to localStorage
  const storageKey = useMemo(
    () => `selectedGameId-${address || "anonymous"}`,
    [address]
  );

  // Persist view mode (list | detail) to avoid unintended restores
  const viewModeKey = useMemo(
    () => `gamesViewMode-${address || "anonymous"}`,
    [address]
  );

  // Mark component as mounted after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Restore selectedGame from localStorage once wallet is connected and games are loaded
  // Only restore after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (
      isMounted &&
      typeof window !== "undefined" &&
      isConnected &&
      address &&
      !selectedGame &&
      games.length > 0
    ) {
      // Only restore if the last view mode was 'detail'
      const viewMode = localStorage.getItem(viewModeKey);
      if (viewMode !== "detail") return;

      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const gameId = saved;
          const gameToRestore = games.find(
            (game) => game.metadata.gameId.toString() === gameId
          );
          if (gameToRestore) {
            setSelectedGame(gameToRestore);
          }
          // Do not delete the seeded id just because this snapshot does not
          // include it yet. GO TO GAMES writes the new gameId before this
          // tab's list has refetched, and wiping it left joiners on an empty
          // or stale list until a hard refresh.
        } catch (error) {
          console.warn("Failed to restore selectedGame:", error);
        }
      }
    }
  }, [
    isMounted,
    games,
    isLoading,
    selectedGame,
    address,
    storageKey,
    viewModeKey,
    isConnected,
  ]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const stableListRefetch = useCallback(() => {
    void refetchRef.current();
  }, []);

  const [mountRefetchDone, setMountRefetchDone] = useState(false);
  useEffect(() => {
    if (!isMounted || !isConnected) return;
    let cancelled = false;
    void refetchRef.current().finally(() => {
      if (!cancelled) setMountRefetchDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isMounted, isConnected]);

  const waitingForSeededGame = (() => {
    if (!isMounted || typeof window === "undefined" || selectedGame) {
      return false;
    }
    if (localStorage.getItem(viewModeKey) !== "detail") return false;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    return !games.some((game) => game.metadata.gameId.toString() === saved);
  })();
  const showGamesLoading =
    isLoading ||
    (waitingForSeededGame && (!mountRefetchDone || isFetching));

  // Validate restored game - ensure user is still part of it
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      address &&
      selectedGame &&
      games.length > 0
    ) {
      const game = games.find(
        (g) =>
          g.metadata.gameId.toString() ===
          selectedGame.metadata.gameId.toString()
      );
      if (!game) {
        // Game no longer exists, clear it
        setSelectedGame(null);
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedGame, address, storageKey, games]);

  // Track previous selectedGame to detect explicit clears
  const prevSelectedGameRef = useRef<GameDataView | null>(null);

  // Save selectedGame to localStorage when it changes
  // Only save after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && address) {
      if (selectedGame) {
        const gameId = selectedGame.metadata.gameId.toString();
        localStorage.setItem(storageKey, gameId);
        localStorage.setItem(viewModeKey, "detail");
      } else if (prevSelectedGameRef.current) {
        // Only clear if selectedGame was previously set (explicit clear)
        // Don't clear on initial mount when it's null
        localStorage.removeItem(storageKey);
        localStorage.setItem(viewModeKey, "list");
        void refetchRef.current();
      }
      prevSelectedGameRef.current = selectedGame;
    }
  }, [isMounted, selectedGame, address, storageKey, viewModeKey]);

  // Clear selected game only when address becomes null (explicit disconnect)
  // Don't clear on temporary disconnects during page refresh
  const prevAddressRef = useRef<string | undefined>(address);
  useEffect(() => {
    // If address changes from something to null/undefined, it's an explicit disconnect
    if (prevAddressRef.current && !address) {
      setSelectedGame(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
    }
    prevAddressRef.current = address;
  }, [address, storageKey]);

  // Notify Home layout when a game detail is open so global chrome
  // (header/tabs) can be hidden consistently.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("void-tactics-games-detail-active", {
        detail: { active: Boolean(selectedGame) },
      }),
    );
  }, [selectedGame]);

  // Ensure we clear the signal on unmount.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("void-tactics-games-detail-active", {
          detail: { active: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    const onChainChanged = () => {
      setSelectedGame(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedGameId");
      }
      void refetchRef.current();
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    };
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedGame(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
      localStorage.setItem(viewModeKey, "list");
    }
  }, [storageKey, viewModeKey]);

  // If a game is selected, show the game display
  if (selectedGame) {
    return (
      <GameDisplay
        game={selectedGame}
        onBack={handleBackToList}
        refetch={stableListRefetch}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleResetCache()}
        disabled={isResettingCache}
        className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border disabled:opacity-50"
        style={{
          color: "var(--color-cyan)",
          borderColor: "var(--color-cyan)",
          backgroundColor: "var(--color-near-black)",
        }}
      >
        {isResettingCache ? "[RESETTING CACHE...]" : "[DEBUG: RESET CACHE]"}
      </button>
      <GamesListShell
        isAuthenticated={isConnected}
        authRequiredMessage="Please connect your wallet to view your games."
        isLoading={showGamesLoading}
        error={error}
        count={sortedGames.length}
      >
        {sortedGames.map((game) => {
        const isFinished = game.metadata.winner !== ZERO_ADDRESS;
        const isDraw = isFinished && game.metadata.winner === TIE_ADDRESS;
        const isVictory = isFinished && !isDraw && game.metadata.winner === address;
        const remaining = isFinished ? 0 : calculateTimeRemaining(game);
        return (
          <GameLogCard
            key={game.metadata.gameId.toString()}
            gameIdLabel={game.metadata.gameId.toString()}
            isFinished={isFinished}
            isDraw={isDraw}
            isVictory={isVictory}
            lobbyIdLabel={game.metadata.lobbyId.toString()}
            identityRows={
              <>
                <div className="data-readout">
                  <span className="data-readout-label">Creator</span>
                  <span className="font-mono text-xs">
                    {game.metadata.creator.slice(0, 6)}…{game.metadata.creator.slice(-4)}
                  </span>
                </div>
                <div className="data-readout">
                  <span className="data-readout-label">Joiner</span>
                  <span className="font-mono text-xs">
                    {game.metadata.joiner.slice(0, 6)}…{game.metadata.joiner.slice(-4)}
                  </span>
                </div>
              </>
            }
            dateLabel={new Date(Number(game.metadata.startedAt) * 1000).toLocaleDateString()}
            creatorScore={Number(game.creatorScore)}
            joinerScore={Number(game.joinerScore)}
            maxScore={Number(game.maxScore)}
            isMyTurn={game.turnState.currentTurn === address}
            turnSecondsRemaining={remaining}
            onSelect={() => setSelectedGame(game)}
          />
        );
      })}
      </GamesListShell>
    </div>
  );
};

export default Games;

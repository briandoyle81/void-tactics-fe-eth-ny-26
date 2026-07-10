"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { useContractEvents } from "../hooks/useContractEvents";
import GameDisplay from "./GameDisplay";
import { GameLogCard } from "./GameLogCard";
import { GameDataView } from "../types/types";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";

const Games: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { games, isLoading, error, refetch } = usePlayerGames();
  const [selectedGame, setSelectedGame] = useState<GameDataView | null>(null);
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const TIE_ADDRESS = "0x0000000000000000000000000000000000000001";

  // Track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  // Ticker to update countdown timers
  const [, setTick] = useState(0);

  // Enable real-time event listening for game updates
  useContractEvents();

  // Update ticker every second to refresh countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Track if we've attempted restoration
  const hasAttemptedRestore = useRef(false);

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
      !isLoading &&
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
          } else if (!hasAttemptedRestore.current) {
            // Game not found, clear the saved ID (only once)
            localStorage.removeItem(storageKey);
            hasAttemptedRestore.current = true;
          }
        } catch (error) {
          console.warn("Failed to restore selectedGame:", error);
          if (!hasAttemptedRestore.current) {
            localStorage.removeItem(storageKey);
            hasAttemptedRestore.current = true;
          }
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

  // Reset restoration flag when address changes
  useEffect(() => {
    hasAttemptedRestore.current = false;
  }, [address]);

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
      void refetch();
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    };
  }, [refetch]);

  // If a game is selected, show the game display
  if (selectedGame) {
    return (
      <GameDisplay
        game={selectedGame}
        onBack={() => {
          setSelectedGame(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(storageKey);
            localStorage.setItem(viewModeKey, "list");
          }
        }}
        refetch={refetch}
      />
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-text-muted">
          Please connect your wallet to view your games.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>
        <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse">&gt;&gt; ACQUIRING ENGAGEMENT DATA...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>
        <p className="text-warning-red font-mono text-sm">[ERR] Data acquisition failure: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-mono text-white">[ENGAGEMENT LOG]</h1>

      {sortedGames.length === 0 ? (
        <div className="py-8 text-text-muted font-mono text-sm">
          <span className="tracking-widest">[NO ENGAGEMENTS ON RECORD] — Deploy a fleet and enter the fray.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="font-mono text-xs text-text-muted tracking-widest">
            {"// "}{sortedGames.length} ENGAGEMENT{sortedGames.length !== 1 ? "S" : ""} ON RECORD
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;

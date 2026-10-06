"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePlayerGamesWeb2 } from "../hooks/usePlayerGamesWeb2";
import { useMapNameWeb2 } from "../hooks/useMapNameWeb2";
import type { Web2GameDataView } from "../types/web2Game";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import GameDisplayWeb2 from "./GameDisplayWeb2";
import { GameLogCard } from "./GameLogCard";
import { GamesListShell } from "./GamesListShell";
import { AI_USER_ID } from "../config/aiUser";
import { useShowPveGames } from "../hooks/useShowPveGames";

// Web2-mode counterpart to `Games.tsx` — same list/detail navigation pattern
// and card layout, backed by `usePlayerGamesWeb2`/session user id instead of
// `usePlayerGames`/wallet address. Genuinely parallel component (not a
// branch inside `Games.tsx`) — same rationale as `ManageNavyWeb2`/
// `LobbiesWeb2`: hooks can't be called conditionally, and mode-specific
// logic belongs in its own file.
const GamesWeb2: React.FC = () => {
  const { userId, isLoggedIn } = useCurrentUser();
  const [selectedGame, setSelectedGame] = useState<Web2GameDataView | null>(null);
  const { games, isLoading, error, refetch } = usePlayerGamesWeb2({
    pausePolling: Boolean(selectedGame),
  });
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const [isMounted, setIsMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (selectedGame) return;
    const interval = setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [selectedGame]);

  const calculateTimeRemaining = (game: Web2GameDataView): number => {
    const turnTimeSec = game.turnState.turnTime || 0;
    const turnStartSec = Math.floor((game.turnState.turnStartTime || 0) / 1000);
    if (!turnTimeSec || !turnStartSec) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, nowSec - turnStartSec);
    return Math.max(0, turnTimeSec - elapsed);
  };

  const sortedGames = useMemo(() => {
    const copy = [...games];
    copy.sort((a, b) => {
      const aInProgress = a.metadata.winner === "" ? 1 : 0;
      const bInProgress = b.metadata.winner === "" ? 1 : 0;
      if (aInProgress !== bInProgress) return bInProgress - aInProgress;
      return b.metadata.startedAt - a.metadata.startedAt;
    });
    return copy;
  }, [games]);

  // PvE = vs-AI games (campaign and roguelike missions), same test as
  // GameDisplayWeb2.tsx's isVsAIGame. Hidden unless toggled on.
  const [showPve, setShowPve] = useShowPveGames();
  const visibleGames = useMemo(
    () => (showPve ? sortedGames : sortedGames.filter((g) => g.metadata.joiner !== AI_USER_ID)),
    [sortedGames, showPve],
  );

  const storageKey = useMemo(() => `selectedGameIdWeb2-${userId || "anonymous"}`, [userId]);
  const viewModeKey = useMemo(() => `gamesViewModeWeb2-${userId || "anonymous"}`, [userId]);
  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && isLoggedIn && userId && !isLoading && !selectedGame && games.length > 0) {
      const viewMode = localStorage.getItem(viewModeKey);
      if (viewMode !== "detail") return;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const gameToRestore = games.find((g) => g.metadata.gameId.toString() === saved);
        if (gameToRestore) {
          setSelectedGame(gameToRestore);
        } else if (!hasAttemptedRestore.current) {
          localStorage.removeItem(storageKey);
          hasAttemptedRestore.current = true;
        }
      }
    }
  }, [isMounted, games, isLoading, selectedGame, userId, storageKey, viewModeKey, isLoggedIn]);

  useEffect(() => {
    if (userId && selectedGame && games.length > 0) {
      const stillExists = games.some(
        (g) => String(g.metadata.gameId) === String(selectedGame.metadata.gameId),
      );
      if (!stillExists) {
        setSelectedGame(null);
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedGame, userId, storageKey, games]);

  const prevSelectedGameRef = useRef<Web2GameDataView | null>(null);
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && userId) {
      if (selectedGame) {
        localStorage.setItem(storageKey, selectedGame.metadata.gameId.toString());
        localStorage.setItem(viewModeKey, "detail");
      } else if (prevSelectedGameRef.current) {
        localStorage.removeItem(storageKey);
        localStorage.setItem(viewModeKey, "list");
        void refetchRef.current();
      }
      prevSelectedGameRef.current = selectedGame;
    }
  }, [isMounted, selectedGame, userId, storageKey, viewModeKey]);

  // Notify Home layout when a game detail is open so global chrome (header/tabs) hides consistently.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("void-tactics-games-detail-active", { detail: { active: Boolean(selectedGame) } }));
  }, [selectedGame]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent("void-tactics-games-detail-active", { detail: { active: false } }));
    };
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedGame(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
      localStorage.setItem(viewModeKey, "list");
    }
  }, [storageKey, viewModeKey]);

  const stableListRefetch = useCallback(() => {
    void refetchRef.current();
  }, []);

  if (selectedGame) {
    return (
      <GameDisplayWeb2
        game={selectedGame}
        onBack={handleBackToList}
        refetch={stableListRefetch}
      />
    );
  }

  return (
    <GamesListShell
      isAuthenticated={isLoggedIn}
      authRequiredMessage="Please sign in to view your games."
      isLoading={isLoading}
      error={error}
      count={visibleGames.length}
      showPve={showPve}
      onShowPveChange={setShowPve}
      hiddenPveCount={sortedGames.length - visibleGames.length}
    >
      {visibleGames.map((game) => (
        <GameCardWeb2
          key={game.metadata.gameId}
          game={game}
          userId={userId}
          remaining={game.metadata.winner === "" ? calculateTimeRemaining(game) : 0}
          onSelect={() => setSelectedGame(game)}
        />
      ))}
    </GamesListShell>
  );
};

/** Single game-list card — its own component because it needs its own
 * useMapNameWeb2 hook call, and hooks can't be called from inside a
 * .map() callback. */
const GameCardWeb2: React.FC<{
  game: Web2GameDataView;
  userId: string | null;
  remaining: number;
  onSelect: () => void;
}> = ({ game, userId, remaining, onSelect }) => {
  const { name: mapName } = useMapNameWeb2(game.mapId);
  const isFinished = game.metadata.winner !== "";
  const isDraw = isFinished && game.metadata.winner === WEB2_TIE_SENTINEL;
  const isVictory = isFinished && !isDraw && game.metadata.winner === userId;
  const isCreatorMe = game.metadata.creator === userId;

  return (
    <GameLogCard
      gameIdLabel={String(game.metadata.gameId)}
      isFinished={isFinished}
      isDraw={isDraw}
      isVictory={isVictory}
      lobbyIdLabel={String(game.metadata.lobbyId)}
      identityRows={
        <>
          <div className="data-readout">
            <span className="data-readout-label">Map</span>
            <span className="font-mono text-xs">{mapName ?? `#${game.mapId}`}</span>
          </div>
          <div className="data-readout">
            <span className="data-readout-label">You are</span>
            <span className="font-mono text-xs">{isCreatorMe ? "Creator" : "Joiner"}</span>
          </div>
          <div className="data-readout">
            <span className="data-readout-label">Opponent</span>
            <span className="font-mono text-xs">
              {isCreatorMe ? game.metadata.joinerLabel : game.metadata.creatorLabel}
            </span>
          </div>
        </>
      }
      dateLabel={new Date(game.metadata.startedAt).toLocaleDateString()}
      creatorScore={game.creatorScore}
      joinerScore={game.joinerScore}
      maxScore={game.maxScore}
      isMyTurn={game.turnState.currentTurn === userId}
      turnSecondsRemaining={remaining}
      onSelect={onSelect}
    />
  );
};

export default GamesWeb2;

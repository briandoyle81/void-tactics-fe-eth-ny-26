"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePlayerGamesWeb2 } from "../hooks/usePlayerGamesWeb2";
import { useMapNameWeb2 } from "../hooks/useMapNameWeb2";
import type { Web2GameDataView } from "../types/web2Game";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import GameDisplayWeb2 from "./GameDisplayWeb2";

// Web2-mode counterpart to `Games.tsx` — same list/detail navigation pattern
// and card layout, backed by `usePlayerGamesWeb2`/session user id instead of
// `usePlayerGames`/wallet address. Genuinely parallel component (not a
// branch inside `Games.tsx`) — same rationale as `ManageNavyWeb2`/
// `LobbiesWeb2`: hooks can't be called conditionally, and mode-specific
// logic belongs in its own file.
const GamesWeb2: React.FC = () => {
  const { userId, isLoggedIn } = useCurrentUser();
  const { games, isLoading, error, refetch } = usePlayerGamesWeb2();
  const [selectedGame, setSelectedGame] = useState<Web2GameDataView | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateTimeRemaining = (game: Web2GameDataView): number => {
    const turnTimeSec = game.turnState.turnTime || 0;
    const turnStartSec = Math.floor((game.turnState.turnStartTime || 0) / 1000);
    if (!turnTimeSec || !turnStartSec) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, nowSec - turnStartSec);
    return Math.max(0, turnTimeSec - elapsed);
  };

  const formatSeconds = (total: number): string => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
      const stillExists = games.some((g) => g.metadata.gameId === selectedGame.metadata.gameId);
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

  if (selectedGame) {
    return (
      <GameDisplayWeb2
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

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-text-muted">Please sign in to view your games.</p>
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
            {sortedGames.map((game) => (
              <GameCardWeb2
                key={game.metadata.gameId}
                game={game}
                userId={userId}
                remaining={game.metadata.winner === "" ? calculateTimeRemaining(game) : 0}
                formatSeconds={formatSeconds}
                onSelect={() => setSelectedGame(game)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Single game-list card — its own component because it needs its own
 * useMapNameWeb2 hook call, and hooks can't be called from inside a
 * .map() callback. */
const GameCardWeb2: React.FC<{
  game: Web2GameDataView;
  userId: string | null;
  remaining: number;
  formatSeconds: (total: number) => string;
  onSelect: () => void;
}> = ({ game, userId, remaining, formatSeconds, onSelect }) => {
  const { name: mapName } = useMapNameWeb2(game.mapId);
  const isFinished = game.metadata.winner !== "";
  const isDraw = isFinished && game.metadata.winner === WEB2_TIE_SENTINEL;
  const isVictory = isFinished && !isDraw && game.metadata.winner === userId;
  const accentClass = isFinished
    ? isDraw ? "border-purple" : isVictory ? "border-phosphor-green" : "border-warning-red"
    : "border-amber";
  const accentColor = isFinished
    ? isDraw ? "var(--color-purple)" : isVictory ? "var(--color-phosphor-green)" : "var(--color-warning-red)"
    : "var(--color-amber)";
  const isCreatorMe = game.metadata.creator === userId;

  return (
    <div
      className={`corner-bracket border-2 ${accentClass} bg-near-black p-4 rounded-none`}
      style={{ "--bracket-color": accentColor } as React.CSSProperties}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-mono font-bold tracking-wider text-text-primary">
          ENGAGEMENT #{game.metadata.gameId}
        </h3>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-xs font-bold tracking-wider rounded-none ${
            isFinished
              ? isDraw
                ? "border-purple/50 bg-purple/10 text-purple"
                : isVictory
                  ? "border-phosphor-green/50 bg-phosphor-green/10 text-phosphor-green"
                  : "border-warning-red/50 bg-warning-red/10 text-warning-red"
              : "border-amber/50 bg-amber/10 text-amber"
          }`}
        >
          {isFinished ? (isDraw ? "DRAW" : isVictory ? "VICTORY" : "DEFEAT") : "IN PROGRESS"}
        </span>
      </div>

      <div className="space-y-0">
        <div className="data-readout">
          <span className="data-readout-label">Lobby</span>
          <span className="font-mono text-xs">{game.metadata.lobbyId}</span>
        </div>
        <div className="data-readout">
          <span className="data-readout-label">Map</span>
          <span className="font-mono text-xs">{mapName ?? `#${game.mapId}`}</span>
        </div>
        <div className="data-readout">
          <span className="data-readout-label">You are</span>
          <span className="font-mono text-xs">{isCreatorMe ? "Creator" : "Joiner"}</span>
        </div>
        <div className="data-readout">
          <span className="data-readout-label">Date</span>
          <span className="font-mono text-xs">{new Date(game.metadata.startedAt).toLocaleDateString()}</span>
        </div>
        <div className="data-readout">
          <span className="data-readout-label">Score</span>
          <span className="font-mono text-xs font-bold">
            {game.creatorScore} / {game.joinerScore}
            <span className="opacity-40 font-normal"> of {game.maxScore}</span>
          </span>
        </div>
        {!isFinished && (
          <>
            <div className="data-readout">
              <span className="data-readout-label">Initiative</span>
              <span className={`font-mono text-xs font-bold ${game.turnState.currentTurn === userId ? "text-phosphor-green" : "text-warning-red"}`}>
                {game.turnState.currentTurn === userId ? "YOURS" : "OPPONENT"}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Turn Timer</span>
              <span className={`font-mono text-xs font-bold ${remaining <= 10 ? "text-warning-red" : ""}`}>
                {formatSeconds(remaining)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gunmetal">
        <button
          className={`w-full rounded-none border-2 py-2.5 font-mono font-bold tracking-widest transition-all duration-200 text-sm ${
            isFinished
              ? "border-gunmetal text-text-muted hover:border-cyan hover:text-cyan hover:bg-cyan/5"
              : "border-cyan text-cyan hover:bg-cyan/10"
          }`}
          onClick={onSelect}
        >
          {isFinished ? "VIEW RECORD" : "ENTER ENGAGEMENT"}
        </button>
      </div>
    </div>
  );
};

export default GamesWeb2;

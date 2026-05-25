"use client";

import React, { useMemo } from "react";
import { useAccount } from "../hooks/useAccount";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePlayerGames } from "../hooks/usePlayerGames";

const Profile: React.FC = () => {
  const { isConnected } = useAccount();
  const { userId: address } = useCurrentUser();
  const { games, isLoading } = usePlayerGames();

  // Calculate statistics from finished games
  const stats = useMemo(() => {
    if (!address || !games.length) {
      return { wins: 0, losses: 0, inProgress: 0, winRate: 0 };
    }

    const finishedGames = games.filter(
      (game) =>
        game.metadata.winner !==
        "0x0000000000000000000000000000000000000000"
    );

    const wins = finishedGames.filter(
      (game) => game.metadata.winner.toLowerCase() === address.toLowerCase()
    ).length;

    const losses = finishedGames.length - wins;
    const inProgress = games.length - finishedGames.length;
    const winRate =
      finishedGames.length > 0
        ? Math.round((wins / finishedGames.length) * 100)
        : 0;

    return { wins, losses, inProgress, winRate };
  }, [games, address]);

  // Sort games: finished first (by startedAt desc), then in progress
  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const aFinished =
        a.metadata.winner !== "0x0000000000000000000000000000000000000000";
      const bFinished =
        b.metadata.winner !== "0x0000000000000000000000000000000000000000";

      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // Both same status, sort by startedAt descending
      return Number(b.metadata.startedAt) - Number(a.metadata.startedAt);
    });
  }, [games]);

  const getGameOutcome = (game: typeof games[0]) => {
    if (
      game.metadata.winner === "0x0000000000000000000000000000000000000000"
    ) {
      return { text: "IN PROGRESS", color: "text-amber" };
    }
    if (address && game.metadata.winner.toLowerCase() === address.toLowerCase()) {
      return { text: "VICTORY", color: "text-phosphor-green" };
    }
    return { text: "DEFEAT", color: "text-warning-red" };
  };

  const getPlayerScore = (game: typeof games[0]) => {
    if (!address) return null;
    const isCreator = game.metadata.creator.toLowerCase() === address.toLowerCase();
    return isCreator ? game.creatorScore : game.joinerScore;
  };

  const getOpponentAddress = (game: typeof games[0]) => {
    if (!address) return null;
    const isCreator = game.metadata.creator.toLowerCase() === address.toLowerCase();
    const opponent = isCreator ? game.metadata.joiner : game.metadata.creator;
    return `${opponent.slice(0, 6)}…${opponent.slice(-4)}`;
  };

  const getActiveShips = (game: typeof games[0]) => {
    if (!address) return null;
    const isCreator = game.metadata.creator.toLowerCase() === address.toLowerCase();
    return isCreator
      ? game.creatorActiveShipIds.length
      : game.joinerActiveShipIds.length;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const navigateToGame = (gameId: string) => {
    if (!address) return;
    localStorage.setItem(`selectedGameId-${address}`, gameId);
    localStorage.setItem(`gamesViewMode-${address}`, "detail");
    window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
  };

  return (
    <div className="text-cyan font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [PROFILE]
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div
          className="corner-bracket border bg-black/40 p-4"
          style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-cyan mb-2 tracking-widest">
            [STATISTICS]
          </h4>
          {isConnected ? (
            <div className="space-y-0 mt-2">
              <div className="data-readout">
                <span className="data-readout-label">Wins</span>
                <span className="font-bold text-phosphor-green font-mono text-xs">{stats.wins}</span>
              </div>
              <div className="data-readout">
                <span className="data-readout-label">Losses</span>
                <span className="font-bold text-warning-red font-mono text-xs">{stats.losses}</span>
              </div>
              <div className="data-readout">
                <span className="data-readout-label">Win Rate</span>
                <span className="font-bold font-mono text-xs">{stats.winRate}%</span>
              </div>
              {stats.inProgress > 0 && (
                <div className="data-readout">
                  <span className="data-readout-label">In Progress</span>
                  <span className="font-bold text-amber font-mono text-xs">{stats.inProgress}</span>
                </div>
              )}
              <div className="data-readout">
                <span className="data-readout-label">Total</span>
                <span className="font-mono text-xs opacity-60">{games.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-mono opacity-80 tracking-wider">
              // Connect wallet to view statistics
            </p>
          )}
        </div>
        <div
          className="corner-bracket corner-bracket-purple border border-purple bg-black/40 p-4"
          style={{ borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-purple mb-2 tracking-widest">
            [ACHIEVEMENTS]
          </h4>
          <p className="text-sm font-mono opacity-50 tracking-wider">Operational tracking coming in a future update.</p>
        </div>
      </div>

      {/* Game History */}
      {isConnected && (
        <div
          className="corner-bracket border bg-black/40 p-4"
          style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-cyan mb-4 tracking-widest">
            [ENGAGEMENT HISTORY]
          </h4>
          {isLoading ? (
            <p className="text-sm font-mono text-text-muted animate-pulse tracking-widest">&gt;&gt; RETRIEVING RECORDS...</p>
          ) : sortedGames.length === 0 ? (
            <p className="text-sm font-mono text-text-muted">[NO RECORDS FOUND]</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedGames.map((game) => {
                const outcome = getGameOutcome(game);
                const playerScore = getPlayerScore(game);
                const opponent = getOpponentAddress(game);
                const activeShips = getActiveShips(game);
                const round = Number(game.turnState.currentRound);
                const inProgress = game.metadata.winner === "0x0000000000000000000000000000000000000000";
                return (
                  <div
                    key={game.metadata.gameId.toString()}
                    className="border border-gunmetal bg-black/20 px-3 py-2 text-xs cursor-pointer transition-colors duration-100 hover:border-cyan hover:bg-black/40"
                    style={{ borderRadius: 0 }}
                    onClick={() => navigateToGame(game.metadata.gameId.toString())}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigateToGame(game.metadata.gameId.toString()); }}
                  >
                    {/* Row 1: ID, outcome, date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold shrink-0">
                          Game #{game.metadata.gameId.toString()}
                        </span>
                        <span className={`font-bold shrink-0 ${outcome.color}`}>
                          [{outcome.text}]
                        </span>
                      </div>
                      <span className="opacity-50 shrink-0">
                        {formatDate(game.metadata.startedAt)}
                      </span>
                    </div>
                    {/* Row 1b: opponent (own line so it never crowds the ID/outcome) */}
                    {opponent && (
                      <div className="mt-0.5 opacity-50 font-mono">
                        vs {opponent}
                      </div>
                    )}
                    {/* Row 2: score, round, ships */}
                    <div className="flex items-center gap-4 mt-1 opacity-70">
                      {playerScore !== null && (
                        <span className="font-mono">
                          <span className="opacity-60">score </span>
                          <span className="font-bold">{playerScore.toString()}</span>
                          <span className="opacity-60"> / {game.maxScore.toString()}</span>
                        </span>
                      )}
                      {round > 0 && (
                        <span className="font-mono">
                          <span className="opacity-60">rnd </span>
                          <span className="font-bold">{round}</span>
                        </span>
                      )}
                      {activeShips !== null && inProgress && (
                        <span className="font-mono">
                          <span className="opacity-60">ships </span>
                          <span className="font-bold">{activeShips}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;

"use client";

import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { PlayerStatsPanel } from "./PlayerStatsPanel";
import { GameHistoryList, type GameHistoryRowData } from "./GameHistoryList";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const Profile: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { games, isLoading } = usePlayerGames();

  // Calculate statistics from finished games
  const stats = useMemo(() => {
    if (!address || !games.length) {
      return { wins: 0, losses: 0, inProgress: 0, winRate: 0, total: 0 };
    }

    const finishedGames = games.filter(
      (game) => game.metadata.winner !== ZERO_ADDRESS
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

    return { wins, losses, inProgress, winRate, total: games.length };
  }, [games, address]);

  // Sort games: finished first (by startedAt desc), then in progress
  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const aFinished = a.metadata.winner !== ZERO_ADDRESS;
      const bFinished = b.metadata.winner !== ZERO_ADDRESS;

      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // Both same status, sort by startedAt descending
      return Number(b.metadata.startedAt) - Number(a.metadata.startedAt);
    });
  }, [games]);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const historyRows: GameHistoryRowData[] = useMemo(() => {
    if (!address) return [];
    return sortedGames.map((game) => {
      const isCreator = game.metadata.creator.toLowerCase() === address.toLowerCase();
      const inProgress = game.metadata.winner === ZERO_ADDRESS;
      const outcome = inProgress
        ? { text: "IN PROGRESS", color: "text-amber" }
        : game.metadata.winner.toLowerCase() === address.toLowerCase()
        ? { text: "VICTORY", color: "text-phosphor-green" }
        : { text: "DEFEAT", color: "text-warning-red" };
      const opponent = isCreator ? game.metadata.joiner : game.metadata.creator;

      return {
        id: game.metadata.gameId.toString(),
        outcomeText: outcome.text,
        outcomeColor: outcome.color,
        dateLabel: formatDate(game.metadata.startedAt),
        opponentLabel: `${opponent.slice(0, 6)}…${opponent.slice(-4)}`,
        playerScore: Number(isCreator ? game.creatorScore : game.joinerScore),
        maxScore: Number(game.maxScore),
        round: Number(game.turnState.currentRound),
        activeShips: isCreator
          ? game.creatorActiveShipIds.length
          : game.joinerActiveShipIds.length,
        inProgress,
      };
    });
  }, [sortedGames, address]);

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
      <PlayerStatsPanel
        isSignedIn={isConnected}
        signInPrompt="// Connect wallet to view statistics"
        stats={stats}
      />
      <GameHistoryList
        isSignedIn={isConnected}
        isLoading={isLoading}
        rows={historyRows}
        onRowClick={navigateToGame}
      />
    </div>
  );
};

export default Profile;

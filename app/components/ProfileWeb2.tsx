"use client";

import React, { useMemo } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePlayerGamesWeb2 } from "../hooks/usePlayerGamesWeb2";
import { WEB2_TIE_SENTINEL } from "../types/web2Game";
import { PlayerStatsPanel } from "./PlayerStatsPanel";
import { GameHistoryList, type GameHistoryRowData } from "./GameHistoryList";

// Web2-mode counterpart to `Profile.tsx` — same layout/copy, backed by
// `usePlayerGamesWeb2`/session user id instead of `usePlayerGames`/wallet
// address. Opponent identity uses `creatorLabel`/`joinerLabel` (attached
// server-side by GET /api/games — see Web2GameMetadata's doc comment)
// instead of web3 Profile's truncated-address display.
const ProfileWeb2: React.FC = () => {
  const { userId, isLoggedIn } = useCurrentUser();
  const { games, isLoading } = usePlayerGamesWeb2();

  const stats = useMemo(() => {
    if (!userId || !games.length) {
      return { wins: 0, losses: 0, draws: 0, inProgress: 0, winRate: 0, total: 0 };
    }

    const finishedGames = games.filter((game) => game.metadata.winner !== "");
    const draws = finishedGames.filter(
      (game) => game.metadata.winner === WEB2_TIE_SENTINEL,
    ).length;
    const wins = finishedGames.filter(
      (game) => game.metadata.winner === userId,
    ).length;
    const losses = finishedGames.length - wins - draws;
    const inProgress = games.length - finishedGames.length;
    const winRate =
      finishedGames.length > 0
        ? Math.round((wins / finishedGames.length) * 100)
        : 0;

    return { wins, losses, draws, inProgress, winRate, total: games.length };
  }, [games, userId]);

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const aFinished = a.metadata.winner !== "";
      const bFinished = b.metadata.winner !== "";

      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      return b.metadata.startedAt - a.metadata.startedAt;
    });
  }, [games]);

  const formatDate = (timestampMs: number) => {
    const date = new Date(timestampMs);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const historyRows: GameHistoryRowData[] = useMemo(() => {
    if (!userId) return [];
    return sortedGames.map((game) => {
      const isCreator = game.metadata.creator === userId;
      const inProgress = game.metadata.winner === "";
      const outcome =
        game.metadata.winner === ""
          ? { text: "IN PROGRESS", color: "text-amber" }
          : game.metadata.winner === WEB2_TIE_SENTINEL
          ? { text: "DRAW", color: "text-purple" }
          : game.metadata.winner === userId
          ? { text: "VICTORY", color: "text-phosphor-green" }
          : { text: "DEFEAT", color: "text-warning-red" };

      return {
        id: game.metadata.gameId.toString(),
        outcomeText: outcome.text,
        outcomeColor: outcome.color,
        opponentLabel: isCreator ? game.metadata.joinerLabel : game.metadata.creatorLabel,
        dateLabel: formatDate(game.metadata.startedAt),
        playerScore: isCreator ? game.creatorScore : game.joinerScore,
        maxScore: game.maxScore,
        round: game.turnState.currentRound,
        activeShips: isCreator
          ? game.creatorActiveShipIds.length
          : game.joinerActiveShipIds.length,
        inProgress,
      };
    });
  }, [sortedGames, userId]);

  const navigateToGame = (gameId: string) => {
    if (!userId) return;
    localStorage.setItem(`selectedGameIdWeb2-${userId}`, gameId);
    localStorage.setItem(`gamesViewModeWeb2-${userId}`, "detail");
    window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games"));
  };

  return (
    <div className="text-cyan font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [PROFILE]
      </h3>
      <PlayerStatsPanel
        isSignedIn={isLoggedIn}
        signInPrompt="// Sign in to view statistics"
        stats={stats}
      />
      <GameHistoryList
        isSignedIn={isLoggedIn}
        isLoading={isLoading}
        rows={historyRows}
        onRowClick={navigateToGame}
      />
    </div>
  );
};

export default ProfileWeb2;

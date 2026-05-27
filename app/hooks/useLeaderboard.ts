"use client";

import { useQuery } from "@tanstack/react-query";

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  isMe: boolean;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export function useLeaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 60_000,
  });

  return {
    entries: data ?? [],
    isLoading,
    error: error ? String(error) : null,
  };
}

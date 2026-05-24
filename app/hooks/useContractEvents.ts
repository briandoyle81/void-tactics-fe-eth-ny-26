"use client";

// Global refetch registry — lets GameDisplay register its refetch fn so debug
// tools and future integrations can trigger a manual refetch by game ID.
export const globalGameRefetchFunctions: Map<number, () => void> = new Map();

export function registerGameRefetch(gameId: number, refetchFn: () => void) {
  globalGameRefetchFunctions.set(gameId, refetchFn);
}

export function unregisterGameRefetch(gameId: number) {
  globalGameRefetchFunctions.delete(gameId);
}

// No-op: blockchain event watchers removed; real-time updates are handled by
// useGameStream (SSE) and React Query's refetchInterval.
export function useContractEvents() {
  return { isListening: false };
}

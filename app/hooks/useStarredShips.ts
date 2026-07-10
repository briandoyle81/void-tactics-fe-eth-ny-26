"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "void-tactics-starred-ships-v1";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) —
// starred-ship ids as a `Set<string>`, persisted to localStorage under a
// caller-supplied `scopeKey` (web3: `${chainId}:${address.toLowerCase()}`,
// web2: the user's id). An empty `scopeKey` means "no identity yet" (e.g.
// wallet not connected) and is treated as an empty, unpersisted set.
export function useStarredShips(scopeKey: string) {
  const [starredShips, setStarredShips] = useState<Set<string>>(new Set());
  const storageKey = scopeKey ? `${STORAGE_PREFIX}:${scopeKey}` : null;

  useEffect(() => {
    if (!storageKey) {
      setStarredShips(new Set());
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setStarredShips(new Set());
      return;
    }
    try {
      setStarredShips(new Set(JSON.parse(saved)));
    } catch (error) {
      console.error("Error loading starred ships:", error);
      setStarredShips(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(starredShips)));
  }, [storageKey, starredShips]);

  const toggleStar = useCallback((shipId: string) => {
    setStarredShips((prev) => {
      const next = new Set(prev);
      if (next.has(shipId)) {
        next.delete(shipId);
      } else {
        next.add(shipId);
      }
      return next;
    });
  }, []);

  return { starredShips, toggleStar };
}

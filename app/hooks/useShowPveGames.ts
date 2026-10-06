"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vt-engagement-log-show-pve";

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Engagement log filter: PvE games (campaign and roguelike missions) are
 * hidden unless the player turns them on. Remembered in localStorage;
 * shared by Games.tsx and GamesWeb2.tsx.
 */
export function useShowPveGames(): [boolean, (show: boolean) => void] {
  // Read after mount (not in the initializer) to avoid a hydration mismatch.
  const [showPve, setShowPveState] = useState(false);
  useEffect(() => {
    setShowPveState(readStored());
  }, []);
  const setShowPve = useCallback((show: boolean) => {
    setShowPveState(show);
    try {
      localStorage.setItem(STORAGE_KEY, show ? "1" : "0");
    } catch {
      // Storage blocked — the choice just won't be remembered.
    }
  }, []);
  return [showPve, setShowPve];
}

"use client";

import { useEffect, useState } from "react";

/**
 * False while the tab is hidden. Gate background RPC polling on it: a game
 * tab left open in the background otherwise keeps polling the node all day.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return visible;
}

/**
 * False while the window doesn't have focus (another app or window in
 * front, tab still visible). Polling slows down rather than stopping here,
 * since the page may still be on screen.
 */
export function useWindowFocused(): boolean {
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const sync = () => setFocused(document.hasFocus());
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
    };
  }, []);
  return focused;
}

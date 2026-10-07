"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Background music for the game client (credited on /audio-credits). Off
// by default; the setting is remembered in this browser.

const MUSIC_SRC = "/music/synthwave-80s-robot-swarm-218092.mp3";
const MUSIC_VOLUME = 0.35;
const STORAGE_KEY = "vt-music-enabled";

export function useGameMusic() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // storage unavailable: stay off
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      const audio = new Audio(MUSIC_SRC);
      audio.loop = true;
      audio.volume = MUSIC_VOLUME;
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    // Browsers block playback until the page has had a click or tap (e.g.
    // after a reload with music on), so retry on the first one.
    const onGesture = () => {
      void audio.play().catch(() => {});
    };
    audio.play().catch(() => {
      window.addEventListener("pointerdown", onGesture, { once: true });
    });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, [enabled]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // storage unavailable: setting lasts for this page only
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}

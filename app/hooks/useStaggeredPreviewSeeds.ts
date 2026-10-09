"use client";

import { useEffect, useState } from "react";

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

/**
 * One reroll seed per Store pack card, refreshed in turn rather than all at
 * once: every `intervalMs / count` one card gets a new seed, so each card
 * still changes every `intervalMs` but never in sync with its neighbours.
 */
export function useStaggeredPreviewSeeds(count: number, intervalMs: number): number[] {
  const [seeds, setSeeds] = useState<number[]>(() => Array.from({ length: count }, randomSeed));

  // Keep one seed per card as the pack list loads or changes size.
  useEffect(() => {
    setSeeds((prev) =>
      prev.length === count
        ? prev
        : Array.from({ length: count }, (_, i) => prev[i] ?? randomSeed()),
    );
  }, [count]);

  useEffect(() => {
    if (count <= 0) return;
    let next = 0;
    const interval = setInterval(() => {
      const index = next % count;
      next += 1;
      setSeeds((prev) => prev.map((seed, i) => (i === index ? randomSeed() : seed)));
    }, intervalMs / count);
    return () => clearInterval(interval);
  }, [count, intervalMs]);

  return seeds;
}

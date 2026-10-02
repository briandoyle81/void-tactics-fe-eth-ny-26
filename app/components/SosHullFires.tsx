"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

function loopTime(baseSeconds: number, scale: number) {
  return `${(baseSeconds * scale).toFixed(2)}s`;
}

function hashSeed(id: string | number) {
  const s = String(id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function range(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

function layoutForShip(shipId: string | number) {
  const rng = mulberry32(hashSeed(shipId));
  const breaches = Array.from({ length: 10 }, () => ({
    left: `${range(rng, 5, 95).toFixed(1)}%`,
    top: `${range(rng, 36, 64).toFixed(1)}%`,
    size: range(rng, 3.8, 6.4),
    delay: `${range(rng, 0, 0.7).toFixed(2)}s`,
    duration: loopTime(1.35, range(rng, 0.7, 1.3)),
    spark: loopTime(1.8, range(rng, 0.7, 1.3)),
  }));
  const vents = Array.from({ length: 5 }, () => ({
    left: `${range(rng, 5, 90).toFixed(1)}%`,
    top: `${range(rng, 38, 60).toFixed(1)}%`,
    width: `${range(rng, 12, 18).toFixed(1)}%`,
    height: `${range(rng, 3.5, 5.5).toFixed(1)}%`,
    delay: `${range(rng, 0, 1.1).toFixed(2)}s`,
    duration: loopTime(2.2, range(rng, 0.7, 1.3)),
  }));
  return { breaches, vents };
}

type ArtBox = { left: number; top: number; width: number; height: number };
type OpaqueBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  nw: number;
  nh: number;
};

const MAX_OPAQUE_BOUNDS = 64;
const opaqueBoundsCache = new Map<string, OpaqueBounds>();

function rememberOpaqueBounds(key: string, bounds: OpaqueBounds) {
  if (opaqueBoundsCache.has(key)) opaqueBoundsCache.delete(key);
  opaqueBoundsCache.set(key, bounds);
  while (opaqueBoundsCache.size > MAX_OPAQUE_BOUNDS) {
    const oldest = opaqueBoundsCache.keys().next().value;
    if (oldest == null) break;
    opaqueBoundsCache.delete(oldest);
  }
}

function artBoxUnchanged(prev: ArtBox | null, next: ArtBox) {
  if (!prev) return false;
  return (
    Math.abs(prev.left - next.left) < 0.5 &&
    Math.abs(prev.top - next.top) < 0.5 &&
    Math.abs(prev.width - next.width) < 0.5 &&
    Math.abs(prev.height - next.height) < 0.5
  );
}

function readOpaqueBounds(img: HTMLImageElement) {
  const key = img.currentSrc || img.src;
  const cached = opaqueBoundsCache.get(key);
  if (cached) {
    rememberOpaqueBounds(key, cached);
    return cached;
  }
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }
  const width = canvas.width;
  const height = canvas.height;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  const bounds = { minX, minY, maxX, maxY, nw: width, nh: height };
  if (key) rememberOpaqueBounds(key, bounds);
  return bounds;
}

function measureShipArtBox(host: HTMLElement, img: HTMLImageElement): ArtBox | null {
  const bounds = readOpaqueBounds(img);
  if (!bounds || !img.clientWidth || !img.clientHeight) return null;

  const fit = Math.min(img.clientWidth / bounds.nw, img.clientHeight / bounds.nh);
  const drawnW = bounds.nw * fit;
  const drawnH = bounds.nh * fit;
  const drawnLeft = (host.clientWidth - drawnW) / 2;
  const drawnTop = (host.clientHeight - drawnH) / 2;

  return {
    left: drawnLeft + bounds.minX * fit,
    top: drawnTop + bounds.minY * fit,
    width: (bounds.maxX - bounds.minX) * fit,
    height: (bounds.maxY - bounds.minY) * fit,
  };
}

export function SosHullFires({ shipId }: { shipId: string | number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [artBox, setArtBox] = useState<ArtBox | null>(null);
  const { breaches, vents } = useMemo(() => layoutForShip(shipId), [shipId]);

  useLayoutEffect(() => {
    const host = hostRef.current?.parentElement;
    if (!host) return;

    let img: HTMLImageElement | null = null;
    let raf = 0;
    let lastHostW = -1;
    let lastHostH = -1;
    let artBoxReady = false;

    const sync = () => {
      const next = host.querySelector("img");
      if (next !== img) {
        img?.removeEventListener("load", sync);
        img = next;
        img?.addEventListener("load", sync);
        artBoxReady = false;
      }
      if (!img || !img.complete || !img.naturalWidth) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (Math.abs(w - lastHostW) < 0.5 && Math.abs(h - lastHostH) < 0.5 && artBoxReady) {
        return;
      }
      lastHostW = w;
      lastHostH = h;
      const box = measureShipArtBox(host, img);
      if (!box || box.width <= 1 || box.height <= 1) return;
      artBoxReady = true;
      setArtBox((prev) => (artBoxUnchanged(prev, box) ? prev : box));
    };

    const scheduleSync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    sync();
    const ro = new ResizeObserver(scheduleSync);
    ro.observe(host);
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        const target = rec.target as Element | null;
        if (target?.closest?.(".sos-hull-fires")) continue;
        scheduleSync();
        return;
      }
    });
    mo.observe(host, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      img?.removeEventListener("load", sync);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="sos-hull-fires pointer-events-none absolute z-[12] overflow-visible"
      aria-hidden
      style={
        artBox
          ? {
              left: artBox.left,
              top: artBox.top,
              width: artBox.width,
              height: artBox.height,
            }
          : { visibility: "hidden", inset: 0 }
      }
    >
      {artBox ? (
        <>
          {vents.map((vent, i) => (
            <span
              key={`vent-${i}`}
              className="sos-hull-vent"
              style={{
                left: vent.left,
                top: vent.top,
                width: vent.width,
                height: vent.height,
                animationDelay: vent.delay,
                animationDuration: vent.duration,
              }}
            />
          ))}
          {breaches.map((breach, i) => (
            <span
              key={`breach-${i}`}
              className="sos-hull-breach"
              style={{
                left: breach.left,
                top: breach.top,
                width: `${breach.size}%`,
                animationDelay: breach.delay,
                animationDuration: breach.duration,
              }}
            >
              <span className="sos-hull-hole" />
              <span
                className="sos-hull-cloud"
                style={{
                  animationDelay: breach.delay,
                  animationDuration: breach.duration,
                }}
              />
              <span
                className="sos-hull-spark"
                style={{
                  animationDelay: breach.delay,
                  animationDuration: breach.spark,
                }}
              />
            </span>
          ))}
        </>
      ) : null}
    </div>
  );
}

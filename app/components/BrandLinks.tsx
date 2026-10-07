"use client";

import React from "react";
import { ALPHA_DISCORD_INVITE_URL } from "../config/alpha";

// Brand chrome shared by the game client's Header and the website header.

export const VOID_TACTICS_X_URL = "https://x.com/voidtacticsxyz";

export function HeaderAlphaBadge({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`shrink-0 border border-solid w-fit ${
        compact ? "px-2 py-0.5" : "px-2.5 py-1"
      }`}
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        fontSize: compact ? "10px" : "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: compact ? "0.06em" : "0.1em",
        color: "var(--color-amber)",
        borderColor: "rgba(245, 158, 11, 0.75)",
        backgroundColor: "rgba(13, 17, 23, 0.7)",
      }}
    >
      [ALPHA]
    </div>
  );
}

export function HeaderXLink({ compact = false }: { compact?: boolean }) {
  const box = compact ? 32 : 36;
  const icon = compact ? 14 : 16;
  return (
    <a
      href={VOID_TACTICS_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Void Tactics on X"
      title="Follow on X"
      className={`vt-header-social-btn inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150${
        compact ? " vt-header-social-btn-compact" : ""
      }`}
      style={{
        width: box,
        height: box,
        color: "var(--color-cyan, #56d6ff)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-slate)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)";
      }}
    >
      <svg
        className="vt-header-social-icon"
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{ width: icon, height: icon, display: "block", flexShrink: 0 }}
      >
        <path d="M18.244 2H21.5l-7.108 8.124L22.75 22h-6.547l-5.128-6.703L5.21 22H1.95l7.604-8.692L1.25 2h6.713l4.636 6.112L18.244 2Zm-1.147 18.04h1.803L6.982 3.86H5.047L17.097 20.04Z" />
      </svg>
    </a>
  );
}

export function HeaderDiscordLink({ compact = false }: { compact?: boolean }) {
  const box = compact ? 32 : 36;
  const icon = compact ? 14 : 16;
  return (
    <a
      href={ALPHA_DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join Void Tactics Discord"
      title="Join Discord"
      className={`vt-header-social-btn inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150${
        compact ? " vt-header-social-btn-compact" : ""
      }`}
      style={{
        width: box,
        height: box,
        color: "var(--color-cyan, #56d6ff)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-slate)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)";
      }}
    >
      <svg
        className="vt-header-social-icon"
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{ width: icon, height: icon, display: "block", flexShrink: 0 }}
      >
        <path d="M20.32 4.37A19.79 19.79 0 0 0 15.4 2.8a13.92 13.92 0 0 0-.63 1.3 18.35 18.35 0 0 0-5.55 0 13.5 13.5 0 0 0-.63-1.3A19.66 19.66 0 0 0 3.68 4.37C.56 8.98-.27 13.47.15 17.9a20.04 20.04 0 0 0 6.07 3.08c.5-.69.95-1.42 1.33-2.19-.73-.27-1.42-.61-2.08-1.01.17-.12.34-.25.5-.39 4.01 1.88 8.35 1.88 12.31 0 .17.14.34.27.5.39-.66.4-1.36.74-2.09 1.01.38.76.83 1.49 1.34 2.18a19.96 19.96 0 0 0 6.06-3.08c.5-5.13-.86-9.58-3.77-13.53ZM8.02 15.15c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.97 2.45-2.18 2.45Zm7.96 0c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.96 2.45-2.18 2.45Z" />
      </svg>
    </a>
  );
}

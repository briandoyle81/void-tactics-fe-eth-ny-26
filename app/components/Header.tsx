"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { AuthButton } from "./AuthButton";
import { HeaderUtcWidget } from "./HeaderUtcWidget";
import { ALPHA_DISCORD_INVITE_URL } from "../config/alpha";

const VOID_TACTICS_X_URL = "https://x.com/voidtacticsxyz";

function HeaderAlphaBadge({ compact }: { compact?: boolean }) {
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

function HeaderTitleBlock({ variant }: { variant?: "mobile" | "desktop" }) {
  const isMobile = variant === "mobile";
  return (
    <div className={isMobile ? "relative min-w-0 shrink" : "relative w-fit shrink-0"}>
      <h1
        className={
          isMobile
            ? "truncate text-xl font-black uppercase leading-none tracking-wide sm:text-2xl"
            : "text-[34px] font-black uppercase leading-none tracking-[0.06em] sm:text-3xl md:text-4xl"
        }
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        VOID TACTICS
      </h1>
      <div
        className={isMobile ? "mt-0.5 h-0.5 w-full" : "absolute -bottom-1 left-0 right-0 h-0.5"}
        style={{ backgroundColor: "var(--color-cyan)" }}
      />
    </div>
  );
}

function HeaderXLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={VOID_TACTICS_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Void Tactics on X"
      title="Follow on X"
      className={`inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      }`}
      style={{
        color: "var(--color-cyan)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)"; }}
    >
      <svg className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2H21.5l-7.108 8.124L22.75 22h-6.547l-5.128-6.703L5.21 22H1.95l7.604-8.692L1.25 2h6.713l4.636 6.112L18.244 2Zm-1.147 18.04h1.803L6.982 3.86H5.047L17.097 20.04Z" />
      </svg>
    </a>
  );
}

function HeaderDiscordLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={ALPHA_DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join Void Tactics Discord"
      title="Join Discord"
      className={`inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      }`}
      style={{
        color: "var(--color-cyan)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)"; }}
    >
      <svg className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.32 4.37A19.79 19.79 0 0 0 15.4 2.8a13.92 13.92 0 0 0-.63 1.3 18.35 18.35 0 0 0-5.55 0 13.5 13.5 0 0 0-.63-1.3A19.66 19.66 0 0 0 3.68 4.37C.56 8.98-.27 13.47.15 17.9a20.04 20.04 0 0 0 6.07 3.08c.5-.69.95-1.42 1.33-2.19-.73-.27-1.42-.61-2.08-1.01.17-.12.34-.25.5-.39 4.01 1.88 8.35 1.88 12.31 0 .17.14.34.27.5.39-.66.4-1.36.74-2.09 1.01.38.76.83 1.49 1.34 2.18a19.96 19.96 0 0 0 6.06-3.08c.5-5.13-.86-9.58-3.77-13.53ZM8.02 15.15c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.97 2.45-2.18 2.45Zm7.96 0c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.96 2.45-2.18 2.45Z" />
      </svg>
    </a>
  );
}

function HeaderUserMenu() {
  const { isLoggedIn, isLoading, username, image } = useCurrentUser();
  const [open, setOpen] = useState(false);

  if (isLoading) return <div className="h-9 w-24" />;

  if (!isLoggedIn) {
    return <AuthButton />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 border border-solid h-9 transition-colors duration-150"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--color-cyan)",
          backgroundColor: "var(--color-near-black)",
          borderColor: "rgba(86, 214, 255, 0.75)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-5 h-5 rounded-full" />
        )}
        <span className="max-w-[120px] truncate">{username}</span>
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-[130] w-40 border border-solid"
          style={{
            backgroundColor: "var(--color-near-black)",
            borderColor: "var(--color-cyan)",
            borderTopColor: "var(--color-steel)",
            borderLeftColor: "var(--color-steel)",
          }}
        >
          <button
            onClick={() => signOut()}
            className="flex h-9 w-full items-center px-3 text-left text-[11px] font-bold uppercase tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: "var(--color-warning-red)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            [LOG OUT]
          </button>
        </div>
      )}
    </div>
  );
}

const Header: React.FC = () => {
  return (
    <header
      className="relative z-[300] border-b-2 border-solid overflow-visible"
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
      }}
    >
      <div className="mx-auto max-w-7xl overflow-visible px-3 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between gap-4 py-2">
          {/* Left — logo + badges + social */}
          <div className="flex items-end gap-3">
            {/* Mobile title row */}
            <div className="flex items-end gap-2 md:hidden">
              <HeaderTitleBlock variant="mobile" />
              <HeaderAlphaBadge compact />
            </div>
            {/* Desktop title row */}
            <div className="hidden md:flex md:items-end md:gap-3">
              <HeaderTitleBlock />
              <HeaderAlphaBadge />
              <HeaderDiscordLink />
              <HeaderXLink />
            </div>
          </div>

          {/* Right — auth + mobile social */}
          <div className="flex items-center gap-2">
            {/* Mobile: social icons next to auth */}
            <div className="flex items-center gap-2 md:hidden">
              <HeaderDiscordLink compact />
              <HeaderXLink compact />
            </div>
            <HeaderUtcWidget />
            <HeaderUserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

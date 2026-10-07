"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import posthog from "posthog-js";
import { useOpenWalletSignIn } from "../hooks/useOpenWalletSignIn";
import { ArtSlot } from "./ArtSlot";
import { HeaderAlphaBadge, HeaderDiscordLink, HeaderXLink } from "./BrandLinks";

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

function SignInOption({
  title,
  body,
  action,
  color,
  onClick,
}: {
  title: string;
  body: string;
  action: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid gap-1 border-2 border-solid p-4 text-left transition-colors duration-150 hover:bg-steel"
      style={{ borderColor: color, backgroundColor: "rgba(12,17,23,0.85)" }}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold uppercase tracking-wider" style={{ ...DISPLAY_FONT, color }}>
          {title}
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {action} ›
        </span>
      </span>
      <span className="text-sm text-text-secondary" style={DISPLAY_FONT}>
        {body}
      </span>
    </button>
  );
}

/**
 * The client's title screen for signed-out players: sign in with a wallet
 * or Google, or go straight into a first battle (no sign-in needed).
 */
export function BootScreen({ onStartFirstBattle }: { onStartFirstBattle: () => void }) {
  const openWalletSignIn = useOpenWalletSignIn();

  return (
    <ArtSlot slot="bootBackdrop" className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="relative grid w-full max-w-xl gap-6">
        <div className="grid justify-items-center gap-2 text-center">
          <h1
            className="text-5xl font-bold uppercase leading-none tracking-wider text-cyan sm:text-7xl"
            style={{ ...DISPLAY_FONT, textShadow: "0 0 20px rgba(86, 214, 255, 0.5)" }}
          >
            Void Tactics
          </h1>
          <HeaderAlphaBadge />
        </div>

        <div className="grid gap-3">
          <SignInOption
            title="Wallet"
            body="Your ships are yours on-chain. Every move is recorded."
            action="Connect"
            color="var(--color-cyan)"
            onClick={() => void openWalletSignIn()}
          />
          <SignInOption
            title="Google"
            body="Play instantly. No wallet needed."
            action="Sign in"
            color="var(--color-amber)"
            onClick={() => {
              posthog.capture("web2_sign_in_clicked", { surface: "boot" });
              void signIn("google");
            }}
          />
        </div>

        <div className="grid justify-items-center gap-2 text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            New commander?
          </span>
          <button
            type="button"
            onClick={() => {
              posthog.capture("boot_first_battle_clicked");
              onStartFirstBattle();
            }}
            className="border-2 border-solid border-phosphor-green px-8 py-3 text-base font-bold uppercase tracking-wider text-phosphor-green transition-colors duration-150 hover:bg-phosphor-green/10"
            style={DISPLAY_FONT}
          >
            Jump into your first battle
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-wider text-text-muted">
          <HeaderDiscordLink compact />
          <HeaderXLink compact />
          <Link href="/privacy" className="hover:text-cyan">Privacy</Link>
          <Link href="/terms" className="hover:text-cyan">Terms</Link>
          <Link href="/audio-credits" className="hover:text-cyan">Audio credits</Link>
        </div>
      </div>
    </ArtSlot>
  );
}

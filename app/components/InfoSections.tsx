"use client";

import React from "react";
import { HeroShipShowcase } from "./HeroShipShowcase";
import { TacticalTargetingPreview } from "./TacticalTargetingPreview";
import { useAppMode } from "../hooks/useAppMode";

// The website's hero and feature sections (app/components/Website.tsx).
// The hero takes its call-to-action as a prop.

/** Grid wrapper the sections render in. */
export const INFO_GRID_CLASS =
  "mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-4 gap-y-4 px-0 md:grid-cols-12 md:gap-x-6 md:gap-y-8 md:px-0";

/** Full width so its inner grid aligns with the feature sections below. */
export function InfoHero({ actions }: { actions: React.ReactNode }) {
  return (
    <section
      className="corner-bracket relative overflow-hidden border-2 bg-black/60 py-4 md:col-span-12 md:py-8"
      style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
      aria-labelledby="info-hero-heading"
    >
      {/* Background pattern/grid effect */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--color-cyan) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-4 px-2 md:grid-cols-12 md:gap-6 md:px-0">
        {/* Left side - Text + primary CTA */}
        <div className="text-left md:col-span-5 md:pl-8 md:pr-2">
          <h1
            id="info-hero-heading"
            className="sr-only mb-0 md:not-sr-only md:mb-4 text-3xl sm:text-4xl md:text-6xl font-bold tracking-wider leading-none"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              color: "var(--color-cyan)",
              textShadow: "0 0 20px rgba(86, 214, 255, 0.5)",
            }}
          >
            VOID TACTICS
          </h1>
          <p
            className="text-base sm:text-lg md:text-2xl mb-2 md:mb-3 opacity-100"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              color: "var(--color-text-primary)",
            }}
          >
            STRATEGIC PvP FLEET COMMAND
          </p>
          <div className="mb-3 space-y-2 md:mb-4 md:hidden">
            <p
              className="text-sm leading-snug opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Admiral, your fleet is under fire.
            </p>
            <p
              className="text-xs leading-snug text-balance opacity-90 line-clamp-2"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Turn-based PvP on a grid. Positioning, range, and target
              priority decide each fight.
            </p>
          </div>
          <p
            className="hidden text-base sm:text-lg mb-3 md:mb-4 opacity-100 md:block"
            style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              color: "var(--color-text-primary)",
            }}
          >
            Admiral, your fleet is dropping out of warp under fire.
          </p>
          <p
            className="hidden text-sm sm:text-base mb-5 md:mb-6 opacity-100 md:block"
            style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              color: "var(--color-text-primary)",
            }}
          >
            Deploy your ships. Outmaneuver real opponents with positioning,
            range control, and ruthless target priority in tactical,
            turn-based battles.
          </p>
            {actions}
        </div>

        {/* Right side - Gameplay clip (above the fold) */}
        <div className="flex justify-center px-0 md:col-span-7 md:justify-end md:pr-8 md:pl-0">
          <div className="w-full">
            <TacticalTargetingPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

export function InfoFeatureSections() {
  const appMode = useAppMode();
  return (
    <>
    {/* Ship demo display (kept, moved below hero) */}
    <section
      className="corner-bracket corner-bracket-green relative border-2 border-phosphor-green bg-black/40 p-2 md:col-span-12 md:p-6"
      style={{
        borderRadius: 0,
      }}
      aria-labelledby="info-intel-heading"
    >
      <h2
        id="info-intel-heading"
        className="text-xl font-bold mb-3 tracking-wider text-center md:text-left"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-phosphor-green)",
        }}
      >
        [INTEL]
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/0 p-1" style={{ borderRadius: 0 }}>
          <HeroShipShowcase
            seedOffset={0}
            align="start"
            side="allied"
            forcedVariant={1}
          />
        </div>
        <div
          className="hidden bg-black/0 p-1 md:block"
          style={{ borderRadius: 0 }}
        >
          <HeroShipShowcase
            seedOffset={3}
            align="start"
            side="enemy"
            flipLayout={true}
            forcedVariant={2}
          />
        </div>
      </div>
    </section>

    {/* Key Features - same 12-col grid so left edges align with hero */}
    {/* Feature 1: Build your Navy */}
    <article
      className="corner-bracket relative border-2 bg-black/40 p-2 md:col-span-6 md:p-6"
      style={{
        borderRadius: 0,
        borderColor: "var(--color-cyan)",
      }}
    >
      <h3
        className="text-xl font-bold mb-3"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-cyan)",
        }}
      >
        [BUILD YOUR NAVY]
      </h3>
      <p
        className="text-base mb-4 opacity-100"
        style={{
          fontFamily: "var(--font-rajdhani), sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        Acquire ships through buying, selling, and trading on a global open
        market. Customize loadouts and traits, or recycle ships you no longer
        need. Think TCG economy with real ownership.
      </p>
      <ul
        className="text-sm space-y-1 opacity-100"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "var(--color-text-primary)",
        }}
      >
        <li>• Global open market: buy, sell, trade</li>
        <li>• Customizable ships (equipment, traits)</li>
        <li>• Recycling mechanics</li>
      </ul>
    </article>

    {/* Feature 2: Assemble a Fleet */}
    <article
      className="corner-bracket corner-bracket-green relative border-2 border-phosphor-green bg-black/40 p-2 md:col-span-6 md:p-6"
      style={{
        borderRadius: 0,
      }}
    >
      <h3
        className="text-xl font-bold mb-3"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-phosphor-green)",
        }}
      >
        [ASSEMBLE A FLEET]
      </h3>
      <p
        className="text-base mb-4 opacity-100"
        style={{
          fontFamily: "var(--font-rajdhani), sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        Assemble your fleet around mission objectives and the strategy you
        want to run. Choose the composition that fits your plan.
      </p>
      <ul
        className="text-sm space-y-1 opacity-100"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "var(--color-text-primary)",
        }}
      >
        <li>• Small fleet of well-armored tanks</li>
        <li>• Large fleet of cheap, expendable ships</li>
        <li>• Fast, hard-hitting strike force</li>
        <li>• Long-range sniper backline</li>
      </ul>
    </article>

    {/* Feature 3: Tactical Combat */}
    <article
      className="corner-bracket corner-bracket-amber relative border-2 border-amber bg-black/40 p-2 md:col-span-6 md:p-6"
      style={{
        borderRadius: 0,
      }}
    >
      <h3
        className="text-xl font-bold mb-3"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-amber)",
        }}
      >
        [ENGAGE THE ENEMY]
      </h3>
      <p
        className="text-base mb-4 opacity-100"
        style={{
          fontFamily: "var(--font-rajdhani), sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        Fight in turn-based strategic battles where positioning, range, and
        weapon selection determine the outcome. Plan your moves carefully.
      </p>
      <ul
        className="text-sm space-y-1 opacity-100"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "var(--color-text-primary)",
        }}
      >
        <li>• Turn-based PvP battles</li>
        <li>• Strategic positioning system</li>
        <li>• Multiple weapon and defense types</li>
      </ul>
    </article>

    {/* Feature 4: Collect the Rewards */}
    <article
      className="corner-bracket corner-bracket-red relative border-2 border-warning-red bg-black/40 p-2 md:col-span-6 md:p-6"
      style={{
        borderRadius: 0,
      }}
    >
      <h3
        className="text-xl font-bold mb-3"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-warning-red)",
        }}
      >
        [COLLECT THE REWARDS]
      </h3>
      <p
        className="text-base mb-4 opacity-100"
        style={{
          fontFamily: "var(--font-rajdhani), sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        Level up your ships by destroying enemy ships in battle. For every
        enemy you kill, collect part of the salvage reward and make your fleet
        stronger over time.
      </p>
      <ul
        className="text-sm space-y-1 opacity-100"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "var(--color-text-primary)",
        }}
      >
        <li>• Ships level up from destroying enemies</li>
        <li>• Salvage reward for each kill</li>
        <li>• Grow your fleet&apos;s power over time</li>
      </ul>
    </article>

    {/* Getting Started Section */}
    <section
      className="corner-bracket relative border-2 bg-black/40 p-2 md:col-span-12 md:p-6"
      style={{
        borderRadius: 0,
        borderColor: "var(--color-cyan)",
      }}
      aria-labelledby="info-getting-started-heading"
    >
      <h2
        id="info-getting-started-heading"
        className="text-xl sm:text-2xl font-bold mb-4 text-center"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-cyan)",
        }}
      >
        [GETTING STARTED]
      </h2>
      <div className="space-y-0 font-mono">
        {[
          {
            n: "01",
            color: "var(--color-cyan)",
            cmd: appMode === "web2" ? "SIGN_IN" : "CONNECT_WALLET",
            desc:
              appMode === "web2"
                ? "Sign in with Google to access fleet command"
                : "Authenticate via Web3 wallet to access fleet command",
          },
          {
            n: "02",
            color: "var(--color-amber)",
            cmd: "ACQUIRE_FLEET",
            desc: "Claim free ships or purchase units — configure loadout to doctrine",
          },
          {
            n: "03",
            color: "var(--color-phosphor-green)",
            cmd: "ENTER_COMBAT",
            desc: "Join a lobby and execute tactical operations against hostile fleets",
          },
        ].map(({ n, color, cmd, desc }) => (
          <div
            key={n}
            className="flex items-start gap-4 border-b border-gunmetal/60 py-3 last:border-b-0"
          >
            <span
              className="shrink-0 text-2xl font-bold leading-none tabular-nums"
              style={{ color, fontFamily: "var(--font-mono), monospace" }}
            >
              {n}
            </span>
            <div className="min-w-0">
              <div
                className="text-sm font-bold tracking-widest mb-0.5"
                style={{ color }}
              >
                {`> ${cmd}`}
              </div>
              <p
                className="text-sm text-text-secondary"
                style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
              >
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { ArtSlot } from "../ArtSlot";
import { FreeShipsCard } from "../FreeShipsCard";
import type { RunPipState } from "../../utils/runProgress";
import type { CommandDeckLayout } from "../../hooks/useCommandDeckLayout";
import { TOURNAMENTS_ENABLED } from "../../config/alpha";

// The Command Deck hub (Play tab). Layout A is a grid of mode tiles; layout
// B is a full-bleed Operations panel over art with a mode rail, kept for an
// A/B test (useCommandDeckLayout). Shared by web3 and web2 — the adapters
// in this folder supply number-native data.

export type CommandDeckDestination = "operations" | "skirmish" | "battles" | "tournaments" | "store";

export interface OperationsSummary {
  state: "loading" | "noRun" | "active";
  /** Title of the node the fleet is at. */
  missionTitle?: string;
  pips: RunPipState[];
  /** Run roster hull, 0–100, shown in layout B. */
  roster: { key: string; hullPercent: number }[];
}

/** The pack on the featured store tile — the top tier, as on the Store page. */
export interface FeaturedPackSummary {
  /** e.g. "FLAGSHIP PACK". */
  callout: string;
  priceLabel: string;
  /** What's in the pack, e.g. "60 ships, led by 4 veterans up to Rank 5." */
  description: string;
  /** Tier text color class from shipPurchaseTierDisplay (e.g. "text-amber"). */
  textClass: string;
  /** Pack preview ships, lead ship first (ShipImage / ShipImageWeb2). */
  previewShipImages: ReactNode[];
}

export interface CommandDeckProps {
  layout: CommandDeckLayout;
  operations: OperationsSummary;
  yourTurnCount: number;
  openTournamentCount: number;
  featuredPack?: FeaturedPackSummary;
  onOpen: (destination: CommandDeckDestination) => void;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

export function RunPips({ pips, className = "" }: { pips: RunPipState[]; className?: string }) {
  if (pips.length === 0) return null;
  const done = pips.filter((p) => p === "done").length;
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="img"
      aria-label={`${done} mission${done === 1 ? "" : "s"} cleared, ${pips.length - done - 1} ahead`}
    >
      {pips.map((pip, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-px w-2.5" style={{ backgroundColor: "var(--color-gunmetal)" }} />}
          <span
            className="block h-2.5 w-2.5 rotate-45 border"
            style={
              pip === "done"
                ? { backgroundColor: "var(--color-cyan)", borderColor: "var(--color-cyan)" }
                : pip === "now"
                  ? {
                      backgroundColor: "var(--color-amber)",
                      borderColor: "var(--color-amber)",
                      boxShadow: "0 0 8px var(--color-amber)",
                    }
                  : pip === "resupply"
                    ? { borderColor: "var(--color-phosphor-green)" }
                    : { borderColor: "var(--color-gunmetal)" }
            }
          />
        </span>
      ))}
    </div>
  );
}

function hullColor(percent: number): string {
  if (percent < 35) return "var(--color-warning-red)";
  if (percent < 70) return "var(--color-amber)";
  return "var(--color-phosphor-green)";
}

function RosterHull({ roster }: { roster: OperationsSummary["roster"] }) {
  if (roster.length === 0) return null;
  return (
    <div className="flex gap-1.5" aria-label="Run fleet hull">
      {roster.map((ship) => (
        <div key={ship.key} className="grid w-8 gap-1" title={`${Math.round(ship.hullPercent)}% hull`}>
          <div className="h-5 border" style={{ borderColor: "var(--color-steel)", backgroundColor: "rgba(86,214,255,0.08)" }} />
          <div className="h-1" style={{ backgroundColor: "var(--color-steel)" }}>
            <div className="h-full" style={{ width: `${ship.hullPercent}%`, backgroundColor: hullColor(ship.hullPercent) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DeckButton({
  children,
  onClick,
  solid = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  solid?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 border-solid px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors duration-150 ${
        solid
          ? "border-cyan bg-cyan text-near-black hover:bg-cyan/85"
          : "border-cyan bg-transparent text-cyan hover:bg-steel"
      } ${className}`}
      style={DISPLAY_FONT}
    >
      {children}
    </button>
  );
}

function operationsCta(operations: OperationsSummary): string {
  if (operations.state === "active") return "Continue run";
  if (operations.state === "noRun") return "Start a run";
  return "Operations";
}

function Tile({
  children,
  borderColor = "var(--color-gunmetal)",
  className = "",
}: {
  children: ReactNode;
  borderColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden border-2 border-solid bg-black/40 ${className}`}
      style={{ borderColor }}
    >
      {children}
    </div>
  );
}

/**
 * The featured pack's preview ships, laid out like the Store's tier card:
 * the lead ship large, the rest in a column beside it.
 */
function FeaturedPackPreview({ pack }: { pack: FeaturedPackSummary }) {
  const [lead, ...rest] = pack.previewShipImages;
  return (
    <div className="flex min-h-40 flex-1 items-end justify-center gap-1 bg-black/20 p-2">
      <div className="flex min-w-0 flex-1 items-end justify-center">
        <div className="aspect-square w-full max-w-56">{lead}</div>
      </div>
      {rest.length > 0 && (
        <div className="flex shrink-0 flex-col justify-end gap-0.5">
          {rest.map((node, i) => (
            <div key={i} className="h-10 w-10">
              {node}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A mode that isn't open yet: greyed out, not clickable, with a red
 * "Coming Soon" band across it. Passes children through when `active` is
 * false. Placement classes (grid cell) go on the wrapper via className.
 */
function ComingSoon({
  active,
  compact = false,
  className = "",
  children,
}: {
  active: boolean;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!active) return <div className={`flex min-h-0 flex-col ${className}`}>{children}</div>;
  return (
    <div className={`relative flex min-h-0 flex-col ${className}`} aria-disabled="true">
      <div className="pointer-events-none flex min-h-0 flex-1 select-none flex-col opacity-50 grayscale" inert>
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
        <span
          className={`w-[200%] bg-warning-red text-center font-bold uppercase text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${
            compact ? "-rotate-12 py-0.5 text-xs tracking-[0.2em]" : "-rotate-[16deg] py-2 text-2xl tracking-[0.3em]"
          }`}
          style={DISPLAY_FONT}
        >
          Coming Soon
        </span>
      </div>
    </div>
  );
}

function LayoutA({ operations, yourTurnCount, openTournamentCount, featuredPack, onOpen }: Omit<CommandDeckProps, "layout">) {
  return (
    // Sized to the window on desktop (70vh, 30–52rem) so the tiles fill the
    // screen; rows never shrink below 14rem.
    <div className="grid grid-cols-1 gap-3 md:h-[clamp(30rem,70vh,52rem)] md:grid-cols-[1.35fr_1fr_15rem] md:grid-rows-[minmax(14rem,1fr)_minmax(14rem,1fr)] md:gap-4 xl:grid-cols-[1.35fr_1fr_18rem]">
      <Tile borderColor="var(--color-cyan)" className="md:col-start-1 md:row-span-2 md:row-start-1">
        <ArtSlot slot="operations" className="min-h-40 flex-1" />
        <div className="grid gap-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-4xl font-bold uppercase leading-none tracking-wider text-cyan md:text-5xl" style={DISPLAY_FONT}>
              Operations
            </span>
            {operations.missionTitle && (
              <span className="text-lg font-semibold uppercase tracking-wider text-amber" style={DISPLAY_FONT}>
                {operations.missionTitle}
              </span>
            )}
          </div>
          <RunPips pips={operations.pips} />
          <DeckButton solid onClick={() => onOpen("operations")} className="w-full py-3 text-base">
            {operationsCta(operations)}
          </DeckButton>
        </div>
      </Tile>

      <Tile className="md:col-start-2 md:row-start-1">
        <ArtSlot slot="skirmish" className="min-h-28 flex-1" />
        <div className="flex items-center justify-between gap-3 p-3">
          <span className="text-3xl font-bold uppercase tracking-wider" style={DISPLAY_FONT}>
            Skirmish
          </span>
          <DeckButton onClick={() => onOpen("skirmish")}>Play</DeckButton>
        </div>
      </Tile>

      <Tile borderColor="var(--color-amber)" className="md:col-start-3 md:row-start-1">
        {featuredPack ? (
          <FeaturedPackPreview pack={featuredPack} />
        ) : (
          <ArtSlot slot="storeFeatured" className="min-h-28 flex-1" />
        )}
        <div className="flex items-center justify-between gap-2 p-3">
          {featuredPack ? (
            <div className="min-w-0">
              <div className={`text-lg font-bold uppercase leading-tight tracking-wider ${featuredPack.textClass}`} style={DISPLAY_FONT}>
                {featuredPack.callout}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-text-secondary">{featuredPack.description}</p>
              <div className="mt-1 font-mono text-xs text-text-primary">{featuredPack.priceLabel}</div>
            </div>
          ) : (
            <span className="text-lg font-bold uppercase tracking-wider text-amber" style={DISPLAY_FONT}>
              Ship packs
            </span>
          )}
          <button
            type="button"
            onClick={() => onOpen("store")}
            className="border border-amber px-2 py-1 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/10"
          >
            Store
          </button>
        </div>
      </Tile>

      <ComingSoon active={!TOURNAMENTS_ENABLED} className="md:col-start-2 md:row-start-2">
        <Tile className="flex-1">
          <ArtSlot slot="tournaments" className="min-h-28 flex-1" />
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="text-3xl font-bold uppercase tracking-wider" style={DISPLAY_FONT}>
              Tournaments
            </span>
            <button
              type="button"
              onClick={() => onOpen("tournaments")}
              disabled={!TOURNAMENTS_ENABLED}
              className="border border-amber px-2 py-1 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/10"
            >
              {openTournamentCount > 0 ? `${openTournamentCount} open` : "View"}
            </button>
          </div>
        </Tile>
      </ComingSoon>

      <div className="grid min-h-0 gap-3 md:col-start-3 md:row-start-2 md:grid-rows-[auto_1fr] md:gap-4">
        <FreeShipsCard />
        <Tile borderColor="var(--color-phosphor-green)">
          <div className="px-3 pt-3 text-lg font-bold uppercase tracking-wider" style={DISPLAY_FONT}>
            Battles
          </div>
          <div className="grid flex-1 place-items-center py-2 text-center">
            <div>
              <div className="text-6xl font-bold leading-none text-phosphor-green" style={DISPLAY_FONT}>
                {yourTurnCount}
              </div>
              <div className="font-mono text-xs text-phosphor-green">your turn</div>
            </div>
          </div>
          <div className="p-3 pt-0">
            <DeckButton onClick={() => onOpen("battles")} className="w-full">
              Open
            </DeckButton>
          </div>
        </Tile>
      </div>
    </div>
  );
}

function LayoutB({ operations, yourTurnCount, openTournamentCount, onOpen }: Omit<CommandDeckProps, "layout">) {
  const rail: { id: CommandDeckDestination; label: string; chip?: string; chipColor?: string }[] = [
    { id: "operations", label: "Operations" },
    { id: "skirmish", label: "Skirmish" },
    {
      id: "tournaments",
      label: "Tournaments",
      chip: openTournamentCount > 0 ? String(openTournamentCount) : undefined,
      chipColor: "var(--color-amber)",
    },
    {
      id: "battles",
      label: "Battles",
      chip: yourTurnCount > 0 ? String(yourTurnCount) : undefined,
      chipColor: "var(--color-phosphor-green)",
    },
  ];
  return (
    <div className="flex flex-col border-2 border-solid" style={{ borderColor: "var(--color-gunmetal)" }}>
      <ArtSlot slot="operationsBackdrop" className="flex min-h-[22rem] items-end p-4 md:min-h-[28rem] md:p-8">
        <div
          className="relative grid w-full max-w-xl gap-3 border-l-2 p-4 md:p-5"
          style={{ borderColor: "var(--color-cyan)", backgroundColor: "rgba(12,17,23,0.85)" }}
        >
          <span className="text-5xl font-bold uppercase leading-none tracking-wider md:text-6xl" style={DISPLAY_FONT}>
            Operations
          </span>
          {operations.missionTitle && (
            <span className="text-lg font-semibold uppercase tracking-wider text-amber md:text-xl" style={DISPLAY_FONT}>
              {operations.missionTitle}
            </span>
          )}
          <RunPips pips={operations.pips} />
          <RosterHull roster={operations.roster} />
          <div>
            <DeckButton solid onClick={() => onOpen("operations")} className="px-6 py-3 text-base">
              {operationsCta(operations)}
            </DeckButton>
          </div>
        </div>
      </ArtSlot>
      <div
        className="grid grid-cols-2 gap-2 border-t p-3 md:grid-cols-4 md:gap-3 md:px-8 md:py-4"
        style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}
      >
        {rail.map((item) => {
          const comingSoon = item.id === "tournaments" && !TOURNAMENTS_ENABLED;
          return (
            <ComingSoon key={item.id} active={comingSoon} compact>
              <button
                type="button"
                disabled={comingSoon}
                onClick={() => onOpen(item.id)}
                className={`flex items-center justify-between gap-2 border border-solid p-3 text-left transition-colors duration-150 hover:border-cyan ${
                  item.id === "operations" ? "border-cyan bg-steel text-cyan" : "border-gunmetal"
                }`}
              >
                <span className="font-bold uppercase tracking-wider" style={DISPLAY_FONT}>
                  {item.label}
                </span>
                {item.chip && (
                  <span className="border px-1.5 font-mono text-xs" style={{ borderColor: item.chipColor, color: item.chipColor }}>
                    {item.chip}
                  </span>
                )}
              </button>
            </ComingSoon>
          );
        })}
      </div>
    </div>
  );
}

export function CommandDeck({ layout, ...props }: CommandDeckProps) {
  return (
    <section aria-label="Command Deck" className="w-full">
      {layout === "B" ? <LayoutB {...props} /> : <LayoutA {...props} />}
    </section>
  );
}

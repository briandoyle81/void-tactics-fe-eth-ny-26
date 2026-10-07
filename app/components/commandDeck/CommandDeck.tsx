"use client";

import type { ReactNode } from "react";
import { ArtSlot } from "../ArtSlot";
import { FreeShipsCard } from "../FreeShipsCard";
import type { RunPipState } from "../../utils/runProgress";
import type { CommandDeckLayout } from "../../hooks/useCommandDeckLayout";

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

export interface CommandDeckProps {
  layout: CommandDeckLayout;
  operations: OperationsSummary;
  yourTurnCount: number;
  openTournamentCount: number;
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

function LayoutA({ operations, yourTurnCount, openTournamentCount, onOpen }: Omit<CommandDeckProps, "layout">) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_1fr_15rem] md:grid-rows-[minmax(14rem,1fr)_minmax(14rem,1fr)] md:gap-4">
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

      <Tile borderColor="var(--color-phosphor-green)" className="md:col-start-3 md:row-start-1">
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

      <Tile className="md:col-start-2 md:row-start-2">
        <ArtSlot slot="tournaments" className="min-h-28 flex-1" />
        <div className="flex items-center justify-between gap-3 p-3">
          <span className="text-3xl font-bold uppercase tracking-wider" style={DISPLAY_FONT}>
            Tournaments
          </span>
          <button
            type="button"
            onClick={() => onOpen("tournaments")}
            className="border border-amber px-2 py-1 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/10"
          >
            {openTournamentCount > 0 ? `${openTournamentCount} open` : "View"}
          </button>
        </div>
      </Tile>

      <div className="grid min-h-0 gap-3 md:col-start-3 md:row-start-2 md:grid-rows-[auto_1fr] md:gap-4">
        <FreeShipsCard />
        <Tile borderColor="var(--color-amber)">
          <ArtSlot slot="storeFeatured" className="min-h-28 flex-1" />
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="text-lg font-bold uppercase tracking-wider text-amber" style={DISPLAY_FONT}>
              Ship packs
            </span>
            <button
              type="button"
              onClick={() => onOpen("store")}
              className="border border-amber px-2 py-1 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/10"
            >
              Store
            </button>
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
        {rail.map((item) => (
          <button
            key={item.id}
            type="button"
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
        ))}
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

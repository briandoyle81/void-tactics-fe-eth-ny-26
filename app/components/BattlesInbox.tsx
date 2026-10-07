"use client";

import React from "react";

// The Battles tab: an inbox of your games, grouped by whose turn it is —
// your turn first (soonest timer on top), then waiting on the opponent,
// then finished with replay. Shared by Games.tsx (web3) and GamesWeb2.tsx
// (web2); each builds number-native items.

export interface BattleInboxItem {
  key: string;
  /** "vs <opponent>" for PvP, the mission name for PvE. */
  title: string;
  /** Mode line, e.g. "Skirmish" or "Operations". */
  subtitle: string;
  status: "yourTurn" | "waiting" | "finished";
  result?: "victory" | "defeat" | "draw";
  isPve: boolean;
  myScore: number;
  theirScore: number;
  maxScore: number;
  /** Seconds left on the current turn; null when there's no timer. */
  secondsRemaining: number | null;
  /** Unix ms, for ordering and the finished date. */
  startedAtMs: number;
  onOpen: () => void;
  onReplay?: () => void;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;
const MONO_FONT = { fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" } as const;

function formatTimer(total: number): string {
  if (total >= 3600) return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m left`;
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s} left`;
}

const RESULT_STYLE: Record<NonNullable<BattleInboxItem["result"]>, { label: string; color: string }> = {
  victory: { label: "Victory", color: "var(--color-phosphor-green)" },
  defeat: { label: "Defeat", color: "var(--color-warning-red)" },
  draw: { label: "Draw", color: "var(--color-purple)" },
};

function InboxRow({ item }: { item: BattleInboxItem }) {
  const accent =
    item.status === "yourTurn"
      ? "var(--color-phosphor-green)"
      : item.status === "waiting"
        ? "var(--color-amber)"
        : item.result
          ? RESULT_STYLE[item.result].color
          : "var(--color-gunmetal)";
  const actionLabel =
    item.status === "yourTurn" ? (item.isPve ? "Resume" : "Take turn") : item.status === "waiting" ? "View board" : "View";

  return (
    <li
      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border border-l-4 border-solid bg-black/30 px-3 py-3 md:grid-cols-[minmax(0,1fr)_9rem_9rem_auto]"
      style={{ borderColor: "var(--color-gunmetal)", borderLeftColor: accent }}
    >
      <div className="min-w-0">
        <div className="truncate text-lg font-bold uppercase tracking-wider text-text-primary" style={DISPLAY_FONT}>
          {item.title}
        </div>
        <div className="truncate text-[11px] uppercase tracking-wider text-text-muted" style={MONO_FONT}>
          {item.subtitle}
        </div>
      </div>

      <div className="order-3 col-span-2 text-sm md:order-none md:col-span-1" style={MONO_FONT}>
        <span className="font-bold text-cyan">{item.myScore}</span>
        <span className="text-text-muted"> – </span>
        <span className="font-bold text-warning-red">{item.theirScore}</span>
        <span className="text-text-muted"> / {item.maxScore}</span>
      </div>

      <div className="order-4 col-span-2 text-xs md:order-none md:col-span-1" style={MONO_FONT}>
        {item.status === "finished" ? (
          <>
            {item.result && (
              <span className="font-bold uppercase" style={{ color: RESULT_STYLE[item.result].color }}>
                {RESULT_STYLE[item.result].label}
              </span>
            )}{" "}
            <span className="text-text-muted">{new Date(item.startedAtMs).toLocaleDateString()}</span>
          </>
        ) : item.secondsRemaining == null ? (
          <span className="text-text-muted">No timer</span>
        ) : (
          <span className={item.status === "yourTurn" && item.secondsRemaining <= 60 ? "font-bold text-warning-red" : "text-text-secondary"}>
            {formatTimer(item.secondsRemaining)}
          </span>
        )}
      </div>

      <div className="row-span-1 flex justify-end gap-2">
        {item.onReplay && (
          <button
            type="button"
            onClick={item.onReplay}
            className="border border-solid border-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10"
            style={DISPLAY_FONT}
          >
            Replay
          </button>
        )}
        <button
          type="button"
          onClick={item.onOpen}
          className={`border-2 border-solid px-4 py-1.5 text-sm font-bold uppercase tracking-wider transition-colors duration-150 ${
            item.status === "yourTurn"
              ? "border-phosphor-green bg-phosphor-green text-near-black hover:bg-phosphor-green/85"
              : "border-gunmetal text-text-secondary hover:border-cyan hover:text-cyan"
          }`}
          style={DISPLAY_FONT}
        >
          {actionLabel}
        </button>
      </div>
    </li>
  );
}

function InboxGroup({ title, items, color }: { title: string; items: BattleInboxItem[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-base font-bold uppercase tracking-widest" style={{ ...DISPLAY_FONT, color }}>
        {title} · {items.length}
      </h2>
      <ul className="grid gap-2">
        {items.map((item) => (
          <InboxRow key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}

interface BattlesInboxProps {
  isAuthenticated: boolean;
  authRequiredMessage: string;
  isLoading: boolean;
  error?: string | null;
  items: BattleInboxItem[];
  /** PvE (campaign/roguelike) games are hidden unless this is on. */
  showPve: boolean;
  onShowPveChange: (show: boolean) => void;
  /** How many PvE games the current filter is hiding. */
  hiddenPveCount: number;
  /** Extra controls in the header row (e.g. web3's cache reset). */
  headerExtra?: React.ReactNode;
}

export function BattlesInbox({
  isAuthenticated,
  authRequiredMessage,
  isLoading,
  error,
  items,
  showPve,
  onShowPveChange,
  hiddenPveCount,
  headerExtra,
}: BattlesInboxProps) {
  if (!isAuthenticated) {
    return <p className="font-mono text-sm text-text-muted">{authRequiredMessage}</p>;
  }

  const yourTurn = items
    .filter((i) => i.status === "yourTurn")
    .sort((a, b) => (a.secondsRemaining ?? Infinity) - (b.secondsRemaining ?? Infinity));
  const waiting = items.filter((i) => i.status === "waiting").sort((a, b) => b.startedAtMs - a.startedAtMs);
  const finished = items.filter((i) => i.status === "finished").sort((a, b) => b.startedAtMs - a.startedAtMs);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-text-primary" style={DISPLAY_FONT}>
          Battles
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {headerExtra}
          <label className="flex cursor-pointer items-center gap-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
            <input
              type="checkbox"
              checked={showPve}
              onChange={(e) => onShowPveChange(e.target.checked)}
              className="accent-cyan"
            />
            Show PvE missions
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse font-mono text-xs tracking-widest text-text-muted">Loading battles…</div>
      ) : error ? (
        <p className="font-mono text-sm text-warning-red">Couldn&apos;t load your battles: {error}</p>
      ) : items.length === 0 ? (
        <div className="py-6 font-mono text-sm text-text-muted">
          No battles yet. Start a skirmish from the Command Deck.
          {hiddenPveCount > 0 && (
            <div className="mt-2 text-xs">
              {hiddenPveCount} PvE mission{hiddenPveCount !== 1 ? "s" : ""} hidden
            </div>
          )}
        </div>
      ) : (
        <>
          <InboxGroup title="Your turn" items={yourTurn} color="var(--color-phosphor-green)" />
          <InboxGroup title="Waiting on opponent" items={waiting} color="var(--color-amber)" />
          <InboxGroup title="Finished" items={finished} color="var(--color-text-secondary)" />
          {hiddenPveCount > 0 && (
            <p className="font-mono text-xs text-text-muted">
              {hiddenPveCount} PvE mission{hiddenPveCount !== 1 ? "s" : ""} hidden
            </p>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DialogMission } from "../types/dialog";
import {
  isOpeningSnapshot,
  selectDialogLines,
  snapshotsEqual,
  type DialogQueueItem,
  type DialogSnapshot,
} from "../utils/missionDialog";

/** A comms message that was shown (or dismissed unread), with the round it arrived in. */
export interface DialogLogEntry extends DialogQueueItem {
  round: number;
}

interface StoredDialogState {
  last: DialogSnapshot;
  fired: string[];
  /**
   * Fired lines not yet shown or dismissed. Kept in storage (not just
   * React state) so a remount — including React strict mode's double mount
   * in development — rebuilds the queue instead of losing lines that
   * `fired` already marks as done.
   */
  pending?: DialogLogEntry[];
}

function storageKey(gameId: string): string {
  return `vt-dialog-${gameId}`;
}

function readStored(gameId: string): StoredDialogState | null {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    return raw ? (JSON.parse(raw) as StoredDialogState) : null;
  } catch {
    return null;
  }
}

function writeStored(gameId: string, state: StoredDialogState): void {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(state));
  } catch {
    // Storage full or blocked — dialog may repeat after a reload, nothing worse.
  }
}

function logStorageKey(gameId: string): string {
  return `vt-dialog-log-${gameId}`;
}

function readStoredLog(gameId: string): DialogLogEntry[] {
  try {
    const raw = localStorage.getItem(logStorageKey(gameId));
    return raw ? (JSON.parse(raw) as DialogLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStoredLog(gameId: string, log: DialogLogEntry[]): void {
  try {
    localStorage.setItem(logStorageKey(gameId), JSON.stringify(log));
  } catch {
    // Storage full or blocked — the log just won't survive a reload.
  }
}

function appendToLog(log: DialogLogEntry[], entries: DialogLogEntry[]): DialogLogEntry[] {
  const seen = new Set(log.map((e) => e.key));
  const added = entries.filter((e) => !seen.has(e.key));
  return added.length > 0 ? [...log, ...added] : log;
}

function missionKey(mission: DialogMission | null): string {
  if (!mission) return "";
  return mission.kind === "tutorial" ? "tutorial" : `${mission.kind}:${mission.nodeId}`;
}

/**
 * Queues in-mission dialog lines as the game state crosses triggers (see
 * app/utils/missionDialog.ts). Shared by GameDisplay, GameDisplayWeb2 and
 * SimulatedGameDisplay.
 *
 * - The last seen snapshot and fired line keys are kept per game in
 *   localStorage, so a reload doesn't replay anything. Opening a game that's
 *   already underway with no stored record plays only the mission's entry
 *   lines, then continues silently from where it is.
 * - `enabled` is false for games without a mission and replays. It stays on
 *   when the game ends so victory/defeat lines (snapshot.outcome) can play;
 *   views show the queue inside the result screen at that point. `paused`
 *   holds the queue (e.g. while RoundStartModal is open).
 * - `log` is every message shown so far (plus any dismissed unread), kept
 *   alongside the rest of the state and still readable after the game ends.
 * - Pure derived state from data the views already have: no RPC calls.
 */
export function useMissionDialog({
  gameId,
  mission,
  snapshot,
  enabled,
  paused = false,
  persist = true,
}: {
  gameId: string;
  mission: DialogMission | null;
  snapshot: DialogSnapshot | null;
  enabled: boolean;
  paused?: boolean;
  /**
   * false keeps state in memory only and treats a return to the opening
   * state as a restart (the tutorial, which starts over on every visit).
   */
  persist?: boolean;
}) {
  // `index` is the line being shown; once it passes the end the queue is
  // drained, and the next batch starts a fresh queue (so "1/3" counts only
  // lines that are waiting together).
  const [queue, setQueue] = useState<{ items: DialogLogEntry[]; index: number }>({
    items: [],
    index: 0,
  });
  const [log, setLog] = useState<DialogLogEntry[]>([]);

  // Latest mission object without making it an effect dependency (views
  // build it inline); missionKey below is the real dependency.
  const missionRef = useRef(mission);
  missionRef.current = mission;
  const currentMissionKey = missionKey(mission);

  const memoryStateRef = useRef<StoredDialogState | null>(null);

  // Appends to the waiting lines, or starts a fresh queue once the last
  // batch has been shown.
  const enqueue = useCallback((items: DialogLogEntry[]) => {
    setQueue((q) =>
      q.index >= q.items.length
        ? { items, index: 0 }
        : { items: [...q.items, ...items], index: q.index },
    );
  }, []);

  // Rebuild the queue (from lines still pending) and load the log when
  // switching games or remounting.
  useEffect(() => {
    const pending = persist && gameId ? (readStored(gameId)?.pending ?? []) : [];
    setQueue({ items: pending, index: 0 });
    memoryStateRef.current = null;
    setLog(persist && gameId ? readStoredLog(gameId) : []);
  }, [gameId, persist]);

  // Drops lines from the stored pending list once shown or dismissed.
  const clearPending = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) return;
      const drop = new Set(keys);
      if (!persist) {
        const state = memoryStateRef.current;
        if (state?.pending) state.pending = state.pending.filter((p) => !drop.has(p.key));
        return;
      }
      const stored = readStored(gameId);
      if (!stored?.pending?.some((p) => drop.has(p.key))) return;
      writeStored(gameId, { ...stored, pending: stored.pending.filter((p) => !drop.has(p.key)) });
    },
    [persist, gameId],
  );

  // Persist the log whenever it grows.
  useEffect(() => {
    if (persist && gameId && log.length > 0) writeStoredLog(gameId, log);
  }, [log, persist, gameId]);

  const round = snapshot?.round;
  const myScore = snapshot?.myScore;
  const enemyScore = snapshot?.enemyScore;
  const myShipsDestroyed = snapshot?.myShipsDestroyed;
  const enemyShipsDestroyed = snapshot?.enemyShipsDestroyed;
  const outcome = snapshot?.outcome ?? null;
  const hasSnapshot = snapshot != null;

  useEffect(() => {
    const currentMission = missionRef.current;
    if (!enabled || !hasSnapshot || !currentMission || !gameId) return;
    const next: DialogSnapshot = {
      round: round!,
      myScore: myScore!,
      enemyScore: enemyScore!,
      myShipsDestroyed: myShipsDestroyed!,
      enemyShipsDestroyed: enemyShipsDestroyed!,
      outcome,
    };

    const save = (state: StoredDialogState) => {
      if (persist) writeStored(gameId, state);
      else memoryStateRef.current = state;
    };
    let stored = persist ? readStored(gameId) : memoryStateRef.current;
    // Records saved before victory/defeat triggers existed have no outcome;
    // treat them as already at the current outcome so opening an old,
    // finished game doesn't suddenly play its debrief.
    if (stored && stored.last.outcome === undefined) {
      stored = { ...stored, last: { ...stored.last, outcome: next.outcome } };
    }
    if (!persist && stored && isOpeningSnapshot(next) && !isOpeningSnapshot(stored.last)) {
      stored = null; // tutorial restarted
      setQueue({ items: [], index: 0 });
      setLog([]);
    }
    if (!stored && next.outcome !== null) {
      // First seen after it already ended (e.g. opening a finished game from
      // the list): nothing to play.
      save({ last: next, fired: [], pending: [] });
      return;
    }
    if (!stored && !isOpeningSnapshot(next)) {
      // First time this game is seen, but it's already underway (opened on
      // another device, or the AI moved/scored before the mission resolved).
      // Still play the mission's entry lines; everything else starts silently
      // from here instead of replaying past events.
      const entryItems: DialogLogEntry[] = selectDialogLines({
        mission: currentMission,
        gameId,
        prev: null,
        next,
        firedKeys: new Set(),
      })
        .filter((item) => item.event === "missionStart")
        .map((item) => ({ ...item, round: next.round }));
      save({ last: next, fired: entryItems.map((item) => item.key), pending: entryItems });
      if (entryItems.length > 0) {
        enqueue(entryItems);
      }
      return;
    }
    if (stored && snapshotsEqual(stored.last, next)) return;

    const fired = new Set(stored?.fired ?? []);
    const items: DialogLogEntry[] = selectDialogLines({
      mission: currentMission,
      gameId,
      prev: stored?.last ?? null,
      next,
      firedKeys: fired,
    }).map((item) => ({ ...item, round: next.round }));
    items.forEach((item) => fired.add(item.key));
    save({ last: next, fired: [...fired], pending: [...(stored?.pending ?? []), ...items] });
    if (items.length > 0) enqueue(items);
  }, [
    enabled,
    persist,
    enqueue,
    hasSnapshot,
    gameId,
    currentMissionKey,
    round,
    myScore,
    enemyScore,
    myShipsDestroyed,
    enemyShipsDestroyed,
    outcome,
  ]);

  const advance = useCallback(
    () => setQueue((q) => ({ items: q.items, index: q.index + 1 })),
    [],
  );
  const dismissAll = useCallback(() => {
    // Lines skipped unread still go in the log.
    const skipped = queue.items.slice(queue.index);
    setLog((l) => appendToLog(l, skipped));
    clearPending(skipped.map((item) => item.key));
    setQueue((q) => ({ items: q.items, index: q.items.length }));
  }, [queue, clearPending]);

  const active = enabled && !paused;
  const current = active && queue.index < queue.items.length ? queue.items[queue.index] : null;

  // A line enters the log (and leaves the pending list) as soon as it's shown.
  useEffect(() => {
    if (!current) return;
    setLog((l) => appendToLog(l, [current]));
    clearPending([current.key]);
  }, [current, clearPending]);

  return {
    current,
    log,
    /** 1-based position of `current` among the lines waiting together. */
    position: queue.index + 1,
    total: queue.items.length,
    advance,
    dismissAll,
  };
}

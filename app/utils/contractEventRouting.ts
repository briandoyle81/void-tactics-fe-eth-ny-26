// Routing for the app-wide contract event watcher (ContractEventsHost): one
// eth_getLogs poll covers every watched event, and the decoded logs are
// split back out by event name for their handlers. Pure, so it's testable.

export const WATCHED_EVENT_NAMES = [
  "Transfer",
  "GameUpdate",
  "GameStarted",
  "AITurnTaken",
  "GameReserved",
] as const;

export type WatchedEventName = (typeof WATCHED_EVENT_NAMES)[number];

export function groupLogsByEvent<T extends { eventName?: string }>(
  logs: readonly T[],
): Partial<Record<WatchedEventName, T[]>> {
  const groups: Partial<Record<WatchedEventName, T[]>> = {};
  for (const log of logs) {
    const name = log.eventName as WatchedEventName | undefined;
    if (!name || !(WATCHED_EVENT_NAMES as readonly string[]).includes(name)) continue;
    (groups[name] ??= []).push(log);
  }
  return groups;
}

// Fast polling on request: screens waiting on another player (e.g. the
// lobby waiting for an opponent's fleet) ask for the match-speed interval
// while they wait.
const fastPollingSources = new Set<string>();
const listeners = new Set<() => void>();

export function setFastEventPolling(source: string, on: boolean): void {
  const had = fastPollingSources.has(source);
  if (on === had) return;
  if (on) fastPollingSources.add(source);
  else fastPollingSources.delete(source);
  listeners.forEach((listener) => listener());
}

export function isFastEventPollingRequested(): boolean {
  return fastPollingSources.size > 0;
}

export function subscribeFastEventPolling(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Hidden-tab turn watch: an open PvP match waiting on the opponent asks the
// host to keep a slow poll running while the tab is hidden, so the "your
// turn" cue still fires. Everything else stops polling in hidden tabs.
const hiddenTurnWatchSources = new Set<string>();

export function setHiddenTurnWatch(source: string, on: boolean): void {
  const had = hiddenTurnWatchSources.has(source);
  if (on === had) return;
  if (on) hiddenTurnWatchSources.add(source);
  else hiddenTurnWatchSources.delete(source);
  listeners.forEach((listener) => listener());
}

export function isHiddenTurnWatchRequested(): boolean {
  return hiddenTurnWatchSources.size > 0;
}

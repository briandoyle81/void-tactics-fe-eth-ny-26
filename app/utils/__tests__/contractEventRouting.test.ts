import { describe, expect, it, vi } from "vitest";
import {
  groupLogsByEvent,
  isFastEventPollingRequested,
  setFastEventPolling,
  subscribeFastEventPolling,
} from "../contractEventRouting";

describe("groupLogsByEvent", () => {
  it("splits logs by event name, keeping order", () => {
    const logs = [
      { eventName: "GameUpdate", id: 1 },
      { eventName: "Transfer", id: 2 },
      { eventName: "GameUpdate", id: 3 },
      { eventName: "AITurnTaken", id: 4 },
    ];
    const groups = groupLogsByEvent(logs);
    expect(groups.GameUpdate?.map((l) => l.id)).toEqual([1, 3]);
    expect(groups.Transfer?.map((l) => l.id)).toEqual([2]);
    expect(groups.AITurnTaken?.map((l) => l.id)).toEqual([4]);
    expect(groups.GameStarted).toBeUndefined();
  });

  it("ignores undecoded and unwatched events", () => {
    const groups = groupLogsByEvent([{ eventName: undefined }, { eventName: "OwnershipTransferred" }]);
    expect(Object.keys(groups)).toEqual([]);
  });
});

describe("fast event polling requests", () => {
  it("is on while any source requests it, and notifies on changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFastEventPolling(listener);
    setFastEventPolling("lobby", true);
    setFastEventPolling("lobby", true);
    setFastEventPolling("other", true);
    expect(isFastEventPollingRequested()).toBe(true);
    setFastEventPolling("lobby", false);
    expect(isFastEventPollingRequested()).toBe(true);
    setFastEventPolling("other", false);
    expect(isFastEventPollingRequested()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });
});

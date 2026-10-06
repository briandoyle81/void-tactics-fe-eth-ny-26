import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMissionDialog } from "../useMissionDialog";

// Fixed test dialog, independent of the real (in-progress) content files.
vi.mock("../../data/dialog/missionDialog", () => ({
  MISSION_DIALOG_LINES: [
    {
      id: "roguelike-1-start",
      characterId: "adjutant",
      text: "Entry.",
      mission: { kind: "roguelike", nodeId: 1 },
      trigger: { type: "missionStart" },
    },
    {
      id: "roguelike-1-defeat",
      characterId: "adjutant",
      text: "We lost.",
      mission: { kind: "roguelike", nodeId: 1 },
      trigger: { type: "missionDefeat" },
      responses: [{ characterId: "commander", text: "Regroup." }],
    },
  ],
}));
vi.mock("../../data/dialog/genericDialog", () => ({ GENERIC_DIALOG_LINES: [] }));
import type { DialogSnapshot } from "../../utils/missionDialog";

const OPENING: DialogSnapshot = {
  round: 1,
  myScore: 0,
  enemyScore: 0,
  myShipsDestroyed: 0,
  enemyShipsDestroyed: 0,
  outcome: null,
};

describe("useMissionDialog", () => {
  beforeEach(() => localStorage.clear());

  it("queues the defeat line and its reply when the game is lost", () => {
    const { result, rerender } = renderHook(
      ({ outcome }: { outcome: "defeat" | null }) =>
        useMissionDialog({
          gameId: "defeat-1",
          mission: { kind: "roguelike", nodeId: 1 },
          snapshot: { ...OPENING, outcome },
          enabled: true,
        }),
      { initialProps: { outcome: null as "defeat" | null } },
    );
    expect(result.current.current?.key).toBe("roguelike-1-start@missionStart");
    rerender({ outcome: "defeat" });
    expect(result.current.total).toBe(3); // entry still showing + defeat + reply
    act(() => result.current.advance());
    rerender({ outcome: "defeat" });
    expect(result.current.current?.key).toBe("roguelike-1-defeat@missionDefeat");
  });

  it("keeps the entry line queued through React strict mode's double mount", () => {
    const { result } = renderHook(
      () =>
        useMissionDialog({
          gameId: "strict-1",
          mission: { kind: "roguelike", nodeId: 1 },
          snapshot: OPENING,
          enabled: true,
        }),
      { wrapper: React.StrictMode },
    );
    expect(result.current.current?.key).toBe("roguelike-1-start@missionStart");
  });

  it("restores a queued-but-unshown line after a remount", () => {
    const props = {
      gameId: "remount-1",
      mission: { kind: "roguelike", nodeId: 1 } as const,
      snapshot: OPENING,
      enabled: true,
      paused: true,
    };
    const first = renderHook(() => useMissionDialog(props));
    expect(first.result.current.current).toBeNull(); // paused, not shown yet
    first.unmount();

    const second = renderHook(() => useMissionDialog({ ...props, paused: false }));
    expect(second.result.current.current?.key).toBe("roguelike-1-start@missionStart");
  });

  it("still plays the entry line and its replies when first seen mid-game", () => {
    const { result } = renderHook(() =>
      useMissionDialog({
        gameId: "resumed-1",
        mission: { kind: "roguelike", nodeId: 1 },
        snapshot: { ...OPENING, round: 3, enemyScore: 5 },
        enabled: true,
      }),
    );
    expect(result.current.current?.key).toBe("roguelike-1-start@missionStart");
  });

  it("plays nothing when a game is first seen after it already ended", () => {
    const { result } = renderHook(() =>
      useMissionDialog({
        gameId: "finished-1",
        mission: { kind: "roguelike", nodeId: 1 },
        snapshot: { ...OPENING, round: 4, outcome: "victory" },
        enabled: true,
      }),
    );
    expect(result.current.current).toBeNull();
  });

  it("doesn't play a debrief for games recorded before outcomes existed", () => {
    localStorage.setItem(
      "vt-dialog-legacy-1",
      JSON.stringify({ last: { ...OPENING, round: 4, outcome: undefined }, fired: [], pending: [] }),
    );
    const { result } = renderHook(() =>
      useMissionDialog({
        gameId: "legacy-1",
        mission: { kind: "roguelike", nodeId: 1 },
        snapshot: { ...OPENING, round: 4, outcome: "defeat" },
        enabled: true,
      }),
    );
    expect(result.current.current).toBeNull();
  });
});

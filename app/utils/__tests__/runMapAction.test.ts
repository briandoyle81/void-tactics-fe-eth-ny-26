import { describe, expect, it } from "vitest";
import { getRunMapAction, type RunMapActionInput } from "../runMapAction";

const base: RunMapActionInput = {
  isBrowseMode: false,
  selectedKind: "combat",
  isCurrentNode: false,
  isReachableChild: true,
  isDefeated: false,
  hasActiveGame: false,
  isEnteringResupply: false,
};

describe("getRunMapAction", () => {
  it("starts a run from the run-less map preview", () => {
    expect(getRunMapAction({ ...base, isBrowseMode: true, canStartRun: true })).toEqual({
      type: "start",
      label: "Start run",
      disabled: false,
    });
    expect(getRunMapAction({ ...base, isBrowseMode: true, selectedKind: null, canStartRun: true }).type).toBe("start");
  });

  it("warps to a reachable combat node", () => {
    expect(getRunMapAction(base)).toEqual({ type: "warp", label: "Warp to mission", disabled: false });
  });

  it("warps to the current node until it's cleared", () => {
    expect(getRunMapAction({ ...base, isCurrentNode: true, isReachableChild: false }).type).toBe("warp");
    expect(getRunMapAction({ ...base, isCurrentNode: true, isDefeated: true })).toEqual({
      type: "none",
      label: "Pick your next mission",
      disabled: true,
    });
  });

  it("returns to a live match instead of relaunching", () => {
    expect(getRunMapAction({ ...base, isCurrentNode: true, hasActiveGame: true })).toEqual({
      type: "resume",
      label: "Return to battle",
      disabled: false,
    });
  });

  it("enters reachable resupply nodes", () => {
    expect(getRunMapAction({ ...base, selectedKind: "resupply" }).type).toBe("resupply");
    expect(getRunMapAction({ ...base, selectedKind: "resupply", isEnteringResupply: true })).toEqual({
      type: "resupply",
      label: "Entering…",
      disabled: true,
    });
  });

  it("is disabled for cleared, unreachable or unselected nodes, and while browsing", () => {
    expect(getRunMapAction({ ...base, isDefeated: true }).label).toBe("Already cleared");
    expect(getRunMapAction({ ...base, isReachableChild: false }).label).toBe("Not reachable");
    expect(getRunMapAction({ ...base, selectedKind: null }).label).toBe("Select a mission");
    expect(getRunMapAction({ ...base, isBrowseMode: true }).label).toBe("Start a run to enter");
  });
});

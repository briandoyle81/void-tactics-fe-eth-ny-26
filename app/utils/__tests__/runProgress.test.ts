import { describe, expect, it } from "vitest";
import { buildRunPips, type RunGraphNode } from "../runProgress";

// 1 → 2 → 3 → 5, and 2 → 4 (resupply) → 5 → 6
const GRAPH: RunGraphNode[] = [
  { id: 1, isResupply: false, childIds: [2] },
  { id: 2, isResupply: false, childIds: [3, 4] },
  { id: 3, isResupply: false, childIds: [5] },
  { id: 4, isResupply: true, childIds: [5] },
  { id: 5, isResupply: false, childIds: [6] },
  { id: 6, isResupply: false, childIds: [] },
];

describe("buildRunPips", () => {
  it("starts with the current node and the longest route ahead", () => {
    expect(buildRunPips(GRAPH, 1, [])).toEqual(["now", "todo", "todo", "todo", "todo"]);
  });

  it("counts cleared missions before the current node", () => {
    expect(buildRunPips(GRAPH, 2, [1])).toEqual(["done", "now", "todo", "todo", "todo"]);
  });

  it("marks resupply stops on the route", () => {
    const graph = GRAPH.map((n) => (n.id === 2 ? { ...n, childIds: [4] } : n));
    expect(buildRunPips(graph, 2, [1])).toEqual(["done", "now", "resupply", "todo", "todo"]);
  });

  it("skips defeated nodes when finding the route ahead", () => {
    expect(buildRunPips(GRAPH, 2, [1, 3])).toEqual(["done", "done", "now", "resupply", "todo", "todo"]);
  });

  it("keeps the current node as now even after it's cleared", () => {
    expect(buildRunPips(GRAPH, 6, [1, 2, 3, 5, 6])).toEqual(["done", "done", "done", "done", "now"]);
  });

  it("handles two-way edges without looping", () => {
    const graph: RunGraphNode[] = [
      { id: 1, isResupply: false, childIds: [2] },
      { id: 2, isResupply: false, childIds: [1, 3] },
      { id: 3, isResupply: false, childIds: [] },
    ];
    expect(buildRunPips(graph, 1, [])).toEqual(["now", "todo", "todo"]);
  });

  it("drops the oldest cleared missions when over the limit", () => {
    expect(buildRunPips(GRAPH, 5, [1, 2, 3], 3)).toEqual(["done", "now", "todo"]);
  });

  it("returns nothing for an unknown current node", () => {
    expect(buildRunPips(GRAPH, 99, [])).toEqual([]);
  });
});

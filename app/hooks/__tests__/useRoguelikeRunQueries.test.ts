import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

// The real contract config imports ABI JSON paths Vite can't resolve in tests.
vi.mock("../../config/contracts", () => ({
  CONTRACT_ABIS: { ROGUELIKE_RUN: [] },
  CONTRACT_ADDRESSES_BY_CHAIN_ID: {
    84532: {
      ROGUELIKE_RUN: "0x1111111111111111111111111111111111111111",
      GAME_LENS: "0x2222222222222222222222222222222222222222",
    },
  },
}));
vi.mock("../useShipsContract", () => ({ invalidateShipsReads: vi.fn() }));

import {
  ROGUELIKE_RUN_ADDRESS,
  invalidateRoguelikeRunQueries,
  resetRoguelikeRunQueries,
} from "../useRoguelikeRun";

const OTHER = "0x000000000000000000000000000000000000dEaD";

function seed(client: QueryClient) {
  client.setQueryData(["readContract", { address: ROGUELIKE_RUN_ADDRESS, functionName: "getRun" }], "run");
  client.setQueryData(
    ["readContracts", { contracts: [{ address: ROGUELIKE_RUN_ADDRESS, functionName: "getShipHP" }] }],
    "hp",
  );
  client.setQueryData(
    ["readContract", { address: "0x2222222222222222222222222222222222222222", functionName: "getRunView" }],
    "runView",
  );
  client.setQueryData(
    ["readContract", { address: "0x2222222222222222222222222222222222222222", functionName: "getShipsOwned" }],
    "lensShips",
  );
  client.setQueryData(["readContract", { address: OTHER, functionName: "balanceOf" }], "other");
  client.setQueryData(["readContracts", { contracts: [{ address: OTHER, functionName: "x" }] }], "otherBatch");
}

describe("roguelike run query helpers", () => {
  it("reset removes single and batched run reads, leaving other contracts", () => {
    const client = new QueryClient();
    seed(client);
    resetRoguelikeRunQueries(client);
    const keys = client.getQueryCache().getAll().map((q) => q.state.data);
    expect(keys).not.toContain("run");
    expect(keys).not.toContain("hp");
    expect(keys).not.toContain("runView");
    expect(keys).toContain("lensShips");
    expect(keys).toContain("other");
    expect(keys).toContain("otherBatch");
  });

  it("invalidate marks single and batched run reads stale (e.g. roster HP after a win)", () => {
    const client = new QueryClient();
    seed(client);
    const spy = vi.spyOn(client, "invalidateQueries");
    invalidateRoguelikeRunQueries(client);
    const runCall = spy.mock.calls.find(([filters]) => typeof filters?.predicate === "function");
    expect(runCall).toBeDefined();
    const stale = client
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.isInvalidated)
      .map((q) => q.state.data);
    expect(stale).toEqual(expect.arrayContaining(["run", "hp", "runView"]));
    expect(stale).not.toContain("lensShips");
    expect(stale).not.toContain("other");
    expect(stale).not.toContain("otherBatch");
  });
});

import { describe, expect, it } from "vitest";
import { aiTurnBatchSize } from "../aiTurnBatch";

const ids = (...n: number[]) => n.map(BigInt);

describe("aiTurnBatchSize", () => {
  it("moves one ship at a time while the human still has unmoved ships", () => {
    expect(
      aiTurnBatchSize({
        humanActiveShipIds: ids(1, 2),
        aiActiveShipIds: ids(10, 11, 12),
        movedShipIds: new Set(ids(1)),
      }),
    ).toBe(1);
  });

  it("batches the AI's remaining moves once the human has none left", () => {
    expect(
      aiTurnBatchSize({
        humanActiveShipIds: ids(1, 2),
        aiActiveShipIds: ids(10, 11, 12, 13),
        movedShipIds: new Set(ids(1, 2, 10)),
      }),
    ).toBe(3);
  });

  it("caps the batch", () => {
    expect(
      aiTurnBatchSize({
        humanActiveShipIds: ids(1),
        aiActiveShipIds: ids(10, 11, 12, 13, 14, 15, 16, 17),
        movedShipIds: new Set(ids(1)),
        max: 4,
      }),
    ).toBe(4);
  });

  it("never returns less than one", () => {
    expect(
      aiTurnBatchSize({ humanActiveShipIds: [], aiActiveShipIds: [], movedShipIds: new Set() }),
    ).toBe(1);
  });
});

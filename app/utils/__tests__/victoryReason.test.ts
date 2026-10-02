import { describe, it, expect } from "vitest";
import { inferVictoryReason } from "../victoryReason";

describe("inferVictoryReason", () => {
  it("reports site control when the score target was reached", () => {
    expect(
      inferVictoryReason({
        myScore: 100,
        maxScore: 100,
        enemyShips: [{ status: 0, hullPoints: 50 }],
      }),
    ).toBe("siteControl");
  });

  it("reports destroyed when enemy ships were destroyed or disabled", () => {
    expect(
      inferVictoryReason({
        myScore: 40,
        maxScore: 100,
        enemyShips: [
          { status: 1, hullPoints: null },
          { status: 0, hullPoints: 0 },
        ],
      }),
    ).toBe("fleetDestroyed");
  });

  it("reports destroyed for a mix of retreated and destroyed ships", () => {
    expect(
      inferVictoryReason({
        myScore: 40,
        maxScore: 100,
        enemyShips: [
          { status: 2, hullPoints: 30 },
          { status: 1, hullPoints: null },
        ],
      }),
    ).toBe("fleetDestroyed");
  });

  it("reports fled when every enemy ship retreated", () => {
    expect(
      inferVictoryReason({
        myScore: 40,
        maxScore: 100,
        enemyShips: [
          { status: 2, hullPoints: 30 },
          { status: 2, hullPoints: 10 },
        ],
      }),
    ).toBe("enemyFled");
  });

  it("reports fled when the match ended with enemy ships still flying", () => {
    expect(
      inferVictoryReason({
        myScore: 40,
        maxScore: 100,
        enemyShips: [
          { status: 0, hullPoints: 30 },
          { status: 1, hullPoints: null },
        ],
      }),
    ).toBe("enemyFled");
  });
});

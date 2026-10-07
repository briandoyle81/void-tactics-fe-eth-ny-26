import { describe, it, expect } from "vitest";
import {
  buildDialogSnapshot,
  isOpeningSnapshot,
  mergeDisabledShips,
  selectDialogLines,
  triggerOccurrences,
  type DialogSnapshot,
} from "../missionDialog";
import type { GenericDialogLine, MissionDialogLine } from "../../types/dialog";

const START: DialogSnapshot = {
  round: 1,
  myScore: 0,
  enemyScore: 0,
  myShipsDestroyed: 0,
  enemyShipsDestroyed: 0,
  myShipsDisabled: 0,
  enemyShipsDisabled: 0,
  outcome: null,
};
const snap = (over: Partial<DialogSnapshot>): DialogSnapshot => ({ ...START, ...over });
const CAMPAIGN_1 = { kind: "campaign", nodeId: 1 } as const;

function select(
  prev: DialogSnapshot | null,
  next: DialogSnapshot,
  missionLines: MissionDialogLine[],
  genericLines: GenericDialogLine[] = [],
  mission: Parameters<typeof selectDialogLines>[0]["mission"] = CAMPAIGN_1,
  firedKeys: Set<string> = new Set(),
) {
  return selectDialogLines({ mission, gameId: "42", prev, next, firedKeys, missionLines, genericLines });
}

describe("buildDialogSnapshot", () => {
  it("separates destroyed ships from disabled ones, ignoring fled and unknown ships", () => {
    const s = buildDialogSnapshot({
      round: 2,
      myScore: 5,
      enemyScore: 0,
      ships: [
        { id: "1", isMine: true, status: 1, hullPoints: null }, // destroyed
        { id: "2", isMine: true, status: 2, hullPoints: 0 }, // fled
        { id: "3", isMine: false, status: 0, hullPoints: 0 }, // disabled
        { id: "4", isMine: false, status: 0, hullPoints: null }, // unknown
        { id: "5", isMine: false, status: 0, hullPoints: 40 }, // flying
      ],
    });
    expect(s.myShipsDestroyed).toBe(1);
    expect(s.enemyShipsDestroyed).toBe(0);
    expect(s.myDisabledShipIds).toEqual([]);
    expect(s.enemyDisabledShipIds).toEqual(["3"]);
  });

  it("accumulates disabled ships across observations, counting each ship once", () => {
    const base = buildDialogSnapshot({ round: 1, myScore: 0, enemyScore: 0, ships: [] });
    const first = mergeDisabledShips({ ...base, enemyDisabledShipIds: ["3"] }, null);
    expect(first.snapshot.enemyShipsDisabled).toBe(1);
    // Repaired: no longer disabled, but still counted.
    const repaired = mergeDisabledShips(base, first.everDisabled);
    expect(repaired.snapshot.enemyShipsDisabled).toBe(1);
    // Same ship disabled again, plus a new one.
    const again = mergeDisabledShips({ ...base, enemyDisabledShipIds: ["3", "8"] }, repaired.everDisabled);
    expect(again.snapshot.enemyShipsDisabled).toBe(2);
    expect(again.everDisabled.enemy).toEqual(["3", "8"]);
  });

  it("recognizes the opening state", () => {
    expect(isOpeningSnapshot(START)).toBe(true);
    expect(isOpeningSnapshot(snap({ enemyScore: 1 }))).toBe(false);
    expect(isOpeningSnapshot(snap({ round: 2 }))).toBe(false);
  });
});

describe("triggerOccurrences", () => {
  it("fires mission start only at the very start", () => {
    expect(triggerOccurrences({ type: "missionStart" }, null, START)).toHaveLength(1);
    expect(triggerOccurrences({ type: "missionStart" }, START, snap({ myScore: 5 }))).toHaveLength(0);
  });

  it("covers every round passed in a multi-round jump", () => {
    const prev = snap({ round: 2 });
    const next = snap({ round: 4 });
    expect(triggerOccurrences({ type: "roundStart" }, prev, next).map((o) => o)).toEqual([
      { type: "roundStart", round: 3 },
      { type: "roundStart", round: 4 },
    ]);
    expect(triggerOccurrences({ type: "roundEnd" }, prev, next)).toEqual([
      { type: "roundEnd", round: 2 },
      { type: "roundEnd", round: 3 },
    ]);
    expect(triggerOccurrences({ type: "roundStart", round: 4 }, prev, next)).toHaveLength(1);
    expect(triggerOccurrences({ type: "roundStart", round: 2 }, prev, next)).toHaveLength(0);
  });

  it("fires disabled and destroyed triggers from their own counts", () => {
    const disabled = { type: "shipsDisabled", side: "enemy", count: 1 } as const;
    const destroyed = { type: "shipsDestroyed", side: "enemy", count: 1 } as const;
    const knockedDown = snap({ enemyShipsDisabled: 1 });
    expect(triggerOccurrences(disabled, START, knockedDown)).toHaveLength(1);
    expect(triggerOccurrences(destroyed, START, knockedDown)).toHaveLength(0);
    const finishedOff = snap({ enemyShipsDisabled: 1, enemyShipsDestroyed: 1 });
    expect(triggerOccurrences(disabled, knockedDown, finishedOff)).toHaveLength(0);
    expect(triggerOccurrences(destroyed, knockedDown, finishedOff)).toHaveLength(1);
  });

  it("fires thresholds only when crossed", () => {
    const t = { type: "shipsDestroyed", side: "enemy", count: 2 } as const;
    expect(triggerOccurrences(t, snap({ enemyShipsDestroyed: 0 }), snap({ enemyShipsDestroyed: 3 }))).toHaveLength(1);
    expect(triggerOccurrences(t, snap({ enemyShipsDestroyed: 2 }), snap({ enemyShipsDestroyed: 3 }))).toHaveLength(0);
    const p = { type: "pointsScored", side: "player", points: 10 } as const;
    expect(triggerOccurrences(p, snap({ myScore: 5 }), snap({ myScore: 15 }))).toHaveLength(1);
    expect(triggerOccurrences(p, snap({ myScore: 5 }), snap({ enemyScore: 15, myScore: 5 }))).toHaveLength(0);
  });
});

describe("selectDialogLines", () => {
  const missionLine = (
    id: string,
    trigger: MissionDialogLine["trigger"],
    mission: MissionDialogLine["mission"] = CAMPAIGN_1,
  ): MissionDialogLine => ({ id, characterId: "c", text: id, mission, trigger });
  const generic = (
    id: string,
    trigger: GenericDialogLine["trigger"],
    variants: GenericDialogLine["variants"] = ["a", "b", "c"],
    missionKinds?: GenericDialogLine["missionKinds"],
  ): GenericDialogLine => ({ id, characterId: "c", trigger, variants, missionKinds });

  it("plays every mission line for an event in authored order, and only for its mission", () => {
    const lines = [
      missionLine("one", { type: "missionStart" }),
      missionLine("two", { type: "missionStart" }),
      missionLine("other", { type: "missionStart" }, { kind: "campaign", nodeId: 2 }),
    ];
    expect(select(null, START, lines).map((i) => i.text)).toEqual(["one", "two"]);
  });

  it("orders events: round end, round start, kills, points", () => {
    const lines = [
      missionLine("points", { type: "pointsScored", side: "player", points: 5 }),
      missionLine("kill", { type: "shipsDestroyed", side: "enemy", count: 1 }),
      missionLine("start", { type: "roundStart" }),
      missionLine("end", { type: "roundEnd" }),
    ];
    const items = select(START, snap({ round: 2, myScore: 5, enemyShipsDestroyed: 1 }), lines);
    expect(items.map((i) => i.text)).toEqual(["end", "start", "kill", "points"]);
  });

  it("lets mission lines replace generic lines for the same event", () => {
    const items = select(
      null,
      START,
      [missionLine("mission", { type: "missionStart" })],
      [generic("g", { type: "missionStart" })],
    );
    expect(items.map((i) => i.text)).toEqual(["mission"]);
  });

  it("plays one generic line with a deterministic variant when no mission line covers the event", () => {
    const genericLines = [generic("g1", { type: "missionStart" }), generic("g2", { type: "missionStart" })];
    const first = select(null, START, [], genericLines);
    const again = select(null, START, [], genericLines);
    expect(first).toHaveLength(1);
    expect(again).toEqual(first);
    expect(["a", "b", "c"]).toContain(first[0].text);
  });

  it("repeats an every-round generic line once per round", () => {
    const genericLines = [generic("each", { type: "roundStart" })];
    const items = select(snap({ round: 1 }), snap({ round: 3 }), [], genericLines);
    expect(items.map((i) => i.key)).toEqual(["each@roundStart:2", "each@roundStart:3"]);
  });

  it("skips lines already fired", () => {
    const lines = [missionLine("one", { type: "missionStart" })];
    expect(select(null, START, lines, [], CAMPAIGN_1, new Set(["one@missionStart"]))).toEqual([]);
  });

  it("respects missionKinds and never plays generic lines in the tutorial", () => {
    const genericLines = [generic("roguelike-only", { type: "missionStart" }, ["x"], ["roguelike"])];
    expect(select(null, START, [], genericLines)).toEqual([]);
    expect(
      select(snap({ round: 1 }), snap({ round: 2 }), [], [generic("r", { type: "roundStart" }, ["x"], ["roguelike"])], {
        kind: "roguelike",
        nodeId: 1,
      }),
    ).toHaveLength(1);
    expect(select(null, START, [], [generic("g", { type: "missionStart" })], { kind: "tutorial" })).toEqual([]);
  });

  it("shows an error instead of a generic line when a roguelike mission has no entry line", () => {
    const roguelike = { kind: "roguelike", nodeId: 7 } as const;
    const items = select(null, START, [], [generic("g", { type: "missionStart" })], roguelike);
    expect(items).toEqual([
      {
        key: "missing-entry@missionStart",
        event: "missionStart",
        characterId: "",
        text: "Error: roguelike node #7 has no entry dialog line",
        isError: true,
      },
    ]);
    const written = [missionLine("entry", { type: "missionStart" }, roguelike)];
    expect(select(null, START, written, [], roguelike).map((i) => i.text)).toEqual(["entry"]);
    // Campaign missions still fall back to generic entry lines.
    expect(select(null, START, [], [generic("g", { type: "missionStart" })])).toHaveLength(1);
  });

  it("plays a mission line's responses right after it, with their own speakers", () => {
    const line: MissionDialogLine = {
      ...missionLine("report", { type: "missionStart" }),
      responses: [
        { characterId: "commander", text: "Copy that." },
        { characterId: "c", text: "Moving out." },
      ],
    };
    const items = select(null, START, [line, missionLine("after", { type: "missionStart" })]);
    expect(items.map((i) => [i.key, i.characterId, i.text])).toEqual([
      ["report@missionStart", "c", "report"],
      ["report@missionStart~r1", "commander", "Copy that."],
      ["report@missionStart~r2", "c", "Moving out."],
      ["after@missionStart", "c", "after"],
    ]);
    expect(items.every((i) => i.event === "missionStart")).toBe(true);
  });

  it("plays the replies belonging to the picked generic variant", () => {
    const genericLines = [
      generic("g", { type: "missionStart" }, [
        { text: "only variant", responses: [{ characterId: "hive", text: "We hear you." }] },
      ]),
    ];
    const items = select(null, START, [], genericLines);
    expect(items.map((i) => [i.characterId, i.text])).toEqual([
      ["c", "only variant"],
      ["hive", "We hear you."],
    ]);
  });

  it("plays victory or defeat lines when the game ends, after the final kill", () => {
    const lines = [
      missionLine("win", { type: "missionVictory" }),
      missionLine("lose", { type: "missionDefeat" }),
      missionLine("kill", { type: "shipsDestroyed", side: "enemy", count: 1 }),
    ];
    const won = select(START, snap({ enemyShipsDestroyed: 1, outcome: "victory" }), lines);
    expect(won.map((i) => i.text)).toEqual(["kill", "win"]);
    const lost = select(START, snap({ outcome: "defeat" }), lines);
    expect(lost.map((i) => i.text)).toEqual(["lose"]);
    // Only on the transition, and never for a draw (null outcome).
    expect(select(snap({ outcome: "victory" }), snap({ outcome: "victory" }), lines)).toEqual([]);
    expect(select(START, snap({ round: 2 }), lines)).toEqual([]);
  });

  it("matches tutorial mission lines", () => {
    const lines = [missionLine("t", { type: "missionStart" }, { kind: "tutorial" })];
    expect(select(null, START, lines, [], { kind: "tutorial" }).map((i) => i.text)).toEqual(["t"]);
  });
});

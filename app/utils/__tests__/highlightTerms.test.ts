import { describe, it, expect } from "vitest";
import { splitHighlights } from "../highlightTerms";
import type { HighlightTerm } from "../../data/dialog/highlightTerms";

const TERMS: HighlightTerm[] = [
  { match: ["Central"], className: "c", caseSensitive: true },
  { match: ["enemy", "enemies"], className: "e" },
  { match: ["dust belts"], className: "d" },
  { match: ["outer dust belts"], className: "o" },
];

const marked = (text: string) =>
  splitHighlights(text, TERMS)
    .filter((s) => s.className)
    .map((s) => [s.text, s.className]);

describe("splitHighlights", () => {
  it("keeps the surrounding text intact", () => {
    const text = "Central says the enemy is near.";
    expect(splitHighlights(text, TERMS).map((s) => s.text).join("")).toBe(text);
  });

  it("matches whole words only, ignoring case unless the term is case-sensitive", () => {
    expect(marked("Enemies inbound; an enemy-held site.")).toEqual([
      ["Enemies", "e"],
      ["enemy", "e"],
    ]);
    expect(marked("enemyship")).toEqual([]);
    expect(marked("Central command, central sector")).toEqual([["Central", "c"]]);
  });

  it("prefers the longest overlapping term", () => {
    expect(marked("past the outer dust belts")).toEqual([["outer dust belts", "o"]]);
  });

  it("uses the real vocabulary by default", () => {
    expect(
      splitHighlights("Admiral, the enemy fleet is in the nebula.")
        .filter((s) => s.className)
        .map((s) => s.text),
    ).toEqual(["Admiral", "enemy", "fleet", "nebula"]);
  });
});

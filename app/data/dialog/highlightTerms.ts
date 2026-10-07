// Words highlighted in mission dialog (comms messages, the comms log, the
// result-screen debrief, and mission briefings) — the same terms and colors
// the tutorial highlights (app/components/TutorialGridPanelConfigs.tsx), so
// the game's vocabulary reads the same everywhere.
//
// Each entry:
//   match          — every form to highlight, e.g. ["enemy", "enemies"].
//                    Whole words only ("fleet" won't match "fleeting");
//                    longer entries win over shorter ones that overlap.
//   className      — the tutorial's Tailwind classes for that term (weight +
//                    color), e.g. "font-semibold text-amber".
//   caseSensitive  — true for names, so "Central" (the authority) is
//                    highlighted but "central" (the adjective) isn't.
//                    Default false.
//
// Tutorial highlights deliberately left out, because they're one-off
// emphasis rather than vocabulary and would light up ordinary words:
//   numbers/amounts: 100, 60, 70, 1 tile, 2 free ships, 3 free ships
//   colors & UI labels: blue, red, Green, Submit, Next, Log in, Last Move,
//     FLEET STATUS
//   sentence fragments: behind on the board, you on station, in the hole,
//     the fight is still yours to take, What's left of, inspection,
//     controlled, both sides, first player, right side, owner, destroyed it,
//     lost, powerful ship, Victory, Save your ship:, Sacrifice for victory:,
//     Live to fight again.
// Add any of them below if you do want them highlighted in dialog.

export interface HighlightTerm {
  match: string[];
  className: string;
  caseSensitive?: boolean;
}

export const HIGHLIGHT_TERMS: HighlightTerm[] = [
  // People and authorities
  { match: ["Admiral"], className: "font-bold text-cyan", caseSensitive: true },
  { match: ["Central"], className: "font-semibold text-cyan", caseSensitive: true },

  // Sides
  { match: ["enemy", "enemies"], className: "font-semibold text-warning-red" },
  { match: ["fleet", "fleets"], className: "font-semibold text-cyan" },

  // Law and resources
  { match: ["space law"], className: "font-semibold text-amber" },
  { match: ["legal control"], className: "font-semibold text-amber" },
  { match: ["sparse resources"], className: "font-semibold text-amber" },
  { match: ["resource cluster", "resource clusters"], className: "font-semibold text-amber/70" },
  { match: ["outer dust belts", "dust belt", "dust belts"], className: "font-semibold text-amber/70" },

  // Combat terms
  { match: ["movement"], className: "font-semibold text-phosphor-green" },
  { match: ["threat range"], className: "font-semibold text-amber" },
  { match: ["weapons range"], className: "font-semibold text-amber" },
  { match: ["overload points", "overload point"], className: "font-semibold text-amber" },
  { match: ["reactor damage"], className: "font-semibold text-purple" },
  { match: ["nebula", "nebulae"], className: "font-semibold text-purple" },
  { match: ["EMP"], className: "font-semibold text-cyan", caseSensitive: true },
  { match: ["Plasma"], className: "font-semibold text-cyan/80", caseSensitive: true },

  // Tutorial ship names
  { match: ["Sentinel"], className: "font-semibold text-cyan", caseSensitive: true },
  { match: ["Resolute"], className: "font-semibold text-cyan", caseSensitive: true },
  { match: ["Vigilant"], className: "font-semibold text-cyan", caseSensitive: true },
  { match: ["Hammer"], className: "font-semibold text-warning-red", caseSensitive: true },
  { match: ["Anvil"], className: "font-semibold text-warning-red", caseSensitive: true },
];

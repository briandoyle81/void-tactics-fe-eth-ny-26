import type { DialogCharacter } from "../../types/dialog";

// The cast: everyone who can speak in comms messages (missionDialog.ts,
// genericDialog.ts) and mission briefings (briefings.ts).
//
// Each entry:
//   key        — how lines refer to this character (`characterId`). Must
//                equal the entry's `id`.
//   id         — same as the key.
//   name       — display name on the comms panel, comms log and briefing.
//   image      — portrait path under public/, e.g.
//                "/img/character-art/adjutant.svg". Square art works best.
//                If the file doesn't exist yet, the character's initials
//                are shown in `textColor` instead, so placeholders are fine.
//   textColor  — color for their text, name and portrait frame. Prefer a
//                theme token: "var(--color-cyan)", "var(--color-amber)",
//                "var(--color-phosphor-green)", "var(--color-warning-red)";
//                any CSS color (e.g. "#ff9900") also works.
//
// Adding a character here makes its key valid for `characterId` everywhere;
// a typo in a line's `characterId` is a type error.
export const DIALOG_CHARACTERS = {
  commander: {
    id: "commander",
    name: "Commander Richards",
    image: "/img/character-art/commander.png",
    textColor: "var(--color-cyan)",
  },
  adjutant: {
    id: "adjutant",
    name: "Adjutant Bosch",
    image: "/img/character-art/adjutant.svg",
    textColor: "var(--color-amber)",
  },
  hive: {
    id: "hive",
    name: "Hive Mind",
    image: "/img/character-art/hive-queen.svg",
    textColor: "var(--color-warning-red)",
  },
  prototypeDrone: {
    id: "prototypeDrone",
    name: "Unknown Vessel",
    image: "/img/character-art/prototype-drone.svg",
    textColor: "var(--color-warning-red)",
  },
} as const satisfies Record<string, DialogCharacter>;

export type DialogCharacterId = keyof typeof DIALOG_CHARACTERS;

export function getDialogCharacter(id: string): DialogCharacter | undefined {
  return (DIALOG_CHARACTERS as Record<string, DialogCharacter>)[id];
}

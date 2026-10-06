// In-mission dialog (frontend only). Characters and lines are authored in
// app/data/dialog/; the trigger engine is app/utils/missionDialog.ts.
//
// The doc comments on each property below show up on hover in the editor
// while writing entries in app/data/dialog/*.ts.

/** Someone who can speak in comms messages and mission briefings. */
export interface DialogCharacter {
  /**
   * Unique key for this character. Must match the key it's stored under in
   * DIALOG_CHARACTERS (app/data/dialog/characters.ts); lines refer to the
   * character by this id via `characterId`.
   */
  id: string;
  /** Display name shown on the comms panel, comms log and briefing name plate. */
  name: string;
  /**
   * Public path to the portrait, e.g. "/img/character-art/adjutant.svg"
   * (files live in public/img/character-art/). Square art works best; it's
   * cropped to fill. If the file is missing, the character's initials are
   * shown in `textColor` instead.
   */
  image: string;
  /**
   * Color for this character's comms text, name and portrait frame. Use a
   * theme token so it matches the rest of the UI — "var(--color-cyan)",
   * "var(--color-amber)", "var(--color-phosphor-green)",
   * "var(--color-warning-red)" — or any CSS color such as "#ff9900".
   */
  textColor: string;
}

/**
 * Which mission a game belongs to.
 * - `{ kind: "campaign", nodeId }` — a node in the 30-mission campaign.
 * - `{ kind: "roguelike", nodeId }` — a combat node in the roguelike run.
 *   Campaign and roguelike node ids are separate: campaign node 1 and
 *   roguelike node 1 are different missions.
 * - `{ kind: "tutorial" }` — the onboarding tutorial (there's only one).
 */
export type DialogMission =
  | { kind: "campaign"; nodeId: number }
  | { kind: "roguelike"; nodeId: number }
  | { kind: "tutorial" };

export type DialogMissionKind = DialogMission["kind"];

/** "player" is the local player's side, "enemy" is the AI's. */
export type DialogSide = "player" | "enemy";

/**
 * When a line plays. Each trigger fires once per game (except the
 * every-round forms of roundStart/roundEnd, which fire once per round).
 *
 * - `{ type: "missionStart" }` — when the mission opens.
 * - `{ type: "roundStart", round: 3 }` — at the start of round 3. Omit
 *   `round` to fire at the start of every round (including round 1).
 * - `{ type: "roundEnd", round: 2 }` — when round 2 ends. Omit `round` to
 *   fire at the end of every round.
 * - `{ type: "shipsDestroyed", side: "enemy", count: 1 }` — when that side
 *   has lost `count` ships in total (destroyed or disabled; ships that
 *   retreated don't count). `count: 1` is "first kill"/"first loss".
 * - `{ type: "pointsScored", side: "player", points: 10 }` — when that
 *   side's total score reaches `points`.
 * - `{ type: "missionVictory" }` — when the player wins the mission.
 * - `{ type: "missionDefeat" }` — when the player loses it (destroyed,
 *   out-scored, or retreated). A draw triggers neither.
 *   Victory/defeat lines play as a debrief inside the result screen.
 *
 * When several events happen at once they play in this order: mission
 * start, round end, round start, ships destroyed, points scored,
 * victory/defeat.
 */
export type DialogTrigger =
  | { type: "missionStart" }
  /** Omit `round` to fire at the start of every round. */
  | { type: "roundStart"; round?: number }
  /** Omit `round` to fire at the end of every round. */
  | { type: "roundEnd"; round?: number }
  /** Fires once when `side` has lost `count` ships in total. */
  | { type: "shipsDestroyed"; side: DialogSide; count: number }
  /** Fires once when `side`'s total score reaches `points`. */
  | { type: "pointsScored"; side: DialogSide; points: number }
  /** Fires once when the player wins the mission. Plays in the result screen. */
  | { type: "missionVictory" }
  /** Fires once when the player loses (incl. retreat). Plays in the result screen. */
  | { type: "missionDefeat" };

/**
 * A reply that plays right after the line it's attached to, by the same
 * character or anyone else — e.g. the Adjutant reports, the Commander
 * answers. Replies play in order; each is its own comms message (the player
 * presses NEXT or it auto-advances).
 */
export interface DialogResponse<C extends string = string> {
  /** Who says it — a key of DIALOG_CHARACTERS. Can be the same speaker. */
  characterId: C;
  /** What they say. */
  text: string;
}

/**
 * One wording of a generic line. Either just the text, or the text plus
 * replies that belong to that wording:
 *   "Target down."
 *   { text: "Target down.", responses: [{ characterId: "commander", text: "Next." }] }
 */
export type DialogVariant<C extends string = string> =
  | string
  | { text: string; responses?: DialogResponse<C>[] };

/** A line that belongs to one mission. */
export interface MissionDialogLine<C extends string = string> {
  /**
   * Unique id for this line, e.g. "roguelike-3-first-kill". It's what marks
   * the line as already played for a game, so changing it makes the line
   * play again in games where it already fired.
   */
  id: string;
  /** Who says it — a key of DIALOG_CHARACTERS. */
  characterId: C;
  /**
   * What they say. Keep it to a sentence or two: the comms panel shows it
   * for 4–9 seconds depending on length (the player can click to advance).
   */
  text: string;
  /** The mission this line belongs to. See DialogMission. */
  mission: DialogMission;
  /** When it plays. See DialogTrigger. */
  trigger: DialogTrigger;
  /** Optional replies that play right after this line, in order. See DialogResponse. */
  responses?: DialogResponse<C>[];
}

/**
 * A line that can fire in any mission. One variant is picked each time it
 * fires. Generic lines never fire in the tutorial, and only fire for an event
 * when no mission line covers that same event.
 */
export interface GenericDialogLine<C extends string = string> {
  /** Unique id for this line, e.g. "generic-first-loss". */
  id: string;
  /** Who says it — a key of DIALOG_CHARACTERS. */
  characterId: C;
  /** When it plays. See DialogTrigger. */
  trigger: DialogTrigger;
  /**
   * Alternative wordings; one is picked per game (the pick is stable, so a
   * reload doesn't change it). Add as many as you like. A variant can carry
   * its own replies — see DialogVariant.
   */
  variants: DialogVariant<C>[];
  /**
   * Mission kinds this line may fire in: ["campaign"], ["roguelike"], or
   * both. Defaults to both when omitted. Generic lines never fire in the
   * tutorial.
   */
  missionKinds?: Exclude<DialogMissionKind, "tutorial">[];
}

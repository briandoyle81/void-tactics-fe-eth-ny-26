import type { MissionDialogLine } from "../../types/dialog";
import type { DialogCharacterId } from "./characters";

// Lines written for one specific mission.
//
// Each entry:
//   id           — unique id, e.g. "roguelike-3-first-kill". Marks the line
//                  as played for a game; renaming it makes it play again.
//   characterId  — who speaks (a key of DIALOG_CHARACTERS in characters.ts).
//   text         — what they say. Short is best: the comms panel is small.
//                  It stays up until the player presses NEXT/OK.
//   mission      — which mission:
//                    { kind: "campaign", nodeId: 5 }   campaign node 5
//                    { kind: "roguelike", nodeId: 5 }  roguelike node 5
//                    { kind: "tutorial" }              the tutorial
//                  Campaign and roguelike node ids are separate numbering.
//   trigger      — when it plays:
//                    { type: "missionStart" }
//                    { type: "roundStart", round: 3 }   omit round = every round
//                    { type: "roundEnd", round: 2 }     omit round = every round
//                    { type: "shipsDisabled", side: "enemy", count: 1 }
//                    { type: "shipsDestroyed", side: "enemy", count: 1 }
//                    { type: "pointsScored", side: "player", points: 10 }
//                    { type: "missionVictory" }   when the player wins
//                    { type: "missionDefeat" }    when the player loses (incl. retreat)
//                  side is "player" (you) or "enemy" (the AI). Ship and point
//                  triggers fire once, when the running total reaches the
//                  number.
//                  Disabled = knocked to 0 hull but still on the board (can
//                  be repaired or finished off); counts distinct ships over
//                  the game. Destroyed = removed from the game. A ship that's
//                  disabled then finished off fires both. Retreats are neither.
//                  Victory/defeat lines (and their responses) play as a
//                  debrief inside the result screen, after any final
//                  kill/score lines. A draw triggers neither.
//   responses    — optional replies that play right after this line, in
//                  order, each by any character (same or different):
//                    responses: [
//                      { characterId: "commander", text: "Understood. Proceed." },
//                      { characterId: "adjutant", text: "Aye, Admiral." },
//                    ]
//                  Each reply is its own comms message; the player reads
//                  them one by one with NEXT.
//
// Rules:
// - Several lines with the same mission and trigger play one after another,
//   in the order listed here. For a back-and-forth, `responses` on one line
//   keeps the exchange together in a single entry.
// - A mission line replaces the generic lines (genericDialog.ts) for that
//   event, so generic chatter never talks over written dialog.
// - Every roguelike combat node needs a missionStart line. A missing one
//   shows an error in game instead of a generic line (see
//   ENTRY_LINE_REQUIRED_KINDS in app/utils/missionDialog.ts).
// - The mission's description (the briefing in the node preview) isn't
//   written here; its speaker is assigned in briefings.ts.
export const MISSION_DIALOG_LINES: MissionDialogLine<DialogCharacterId>[] = [
  {
    id: "roguelike-1-start",
    characterId: "adjutant",
    text: "Admiral, we're at the coordinates Central sent. Unidentified contacts ahead. They look like standard-pattern vessels, but they're not broadcasting IFF and not responding to our hails. What is going on here?",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "missionStart" },
  },
  {
    id: "roguelike-1-first-kill",
    characterId: "adjutant",
    text: "We got one!  Maybe there will be clues in the wreckage.",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "shipsDestroyed", side: "enemy", count: 1 },
    responses: [
      {
        characterId: "prototypeDrone",
        text: "And from the deep there came, the metallic intelligence descended upon the fire, so that none aboard could distinguish machinery from omen.",
      },
      { characterId: "adjutant", text: "Who are we fighting?  Or what...?" },
    ],
  },
  {
    id: "roguelike-1-strange-message",
    characterId: "adjutant",
    text: "Hailing unknown vessels. What are your intentions?  Under Space Law, you cannot legally claim a resource site if you are not broadcasting IFF.",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "roundStart", round: 2 },
    responses: [
      {
        characterId: "prototypeDrone",
        text: "The deck trembled as if judgment had taken mechanical form. Now therefore, the fluke was numbered with the beam, and the apparatus was cast upon the depth, and every eye was turned toward the impossible light. For it was written.",
      },
      {
        characterId: "adjutant",
        text: "Unknown vessels, your last message was garbled.  Please repeat.",
      },
      {
        characterId: "prototypeDrone",
        text: "Hitherto authoritatively regarded as the monster as if in answer to the amazement was a matter almost indispensable to do; when all these ran into each other in three places, be the man on horseback, yet the arbitrary vein in which I fling half out to the fringing fibres of that tempestuous wind.",
      },
    ],
  },
  {
    id: "roguelike-1-strange-message-2",
    characterId: "prototypeDrone",
    text: "Now therefore: the captain crossed the valley of smoke, until the water shone like metal beneath a furnace. In those days: the old sailor beyond the cold moon, and the measure thereof was hidden from men. ",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "roundStart", round: 3 },
    responses: [
      {
        characterId: "adjutant",
        text: "You aren't making any sense. We claim this site under Section 10, Addendum 3. Leave, or be destroyed.",
      },
    ],
  },
  {
    id: "roguelike-1-victory",
    characterId: "adjutant",
    text: "That was really strange, Admiral.  They looked and fought like any other ship built in a drone factory, but those messages...",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "missionVictory" },
    responses: [
      {
        characterId: "adjutant",
        text: "We'll investigate the site and the wreckage.  Maybe we'll find some answers.",
      },
    ],
  },
  {
    id: "roguelike-1-defeat",
    characterId: "adjutant",
    text: "We've lost, admiral.  The unknown vessels were too fast and too well-armed.  We couldn't hold them off.",
    mission: { kind: "roguelike", nodeId: 1 },
    trigger: { type: "missionDefeat" },
    responses: [
      {
        characterId: "adjutant",
        text: "Whatever is going on here, someone else will have to figure it out.",
      },
    ],
  },
];

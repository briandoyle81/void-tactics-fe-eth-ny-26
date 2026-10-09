import type { DialogMission } from "../../types/dialog";
import type { DialogCharacterId } from "./characters";

// Who speaks each mission's description — the briefing shown as an
// "incoming transmission" in the node preview, before the mission starts.
//
// Each entry:
//   mission      — which mission: { kind: "campaign", nodeId: 5 },
//                  { kind: "roguelike", nodeId: 5 } (separate numbering).
//   characterId  — who delivers the briefing (a key of DIALOG_CHARACTERS
//                  in characters.ts); their portrait, name and color frame
//                  the text.
//
// The briefing text itself isn't written here: it's the node's description
// in nodeContent.ts (web3; web2 keeps it in Postgres). A mission with no
// entry here shows its description as plain, unattributed text.
export const MISSION_BRIEFING_SPEAKERS: {
  mission: DialogMission;
  characterId: DialogCharacterId;
}[] = [{ mission: { kind: "roguelike", nodeId: 1 }, characterId: "adjutant" }];

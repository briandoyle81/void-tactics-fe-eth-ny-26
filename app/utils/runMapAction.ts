// The run map's primary action (bottom right of the action bar) for the
// selected node. Shared by RoguelikeGraph (web3) and RoguelikeGraphWeb2.

export type RunMapActionType = "warp" | "resume" | "resupply" | "none";

export interface RunMapAction {
  type: RunMapActionType;
  label: string;
  disabled: boolean;
}

export interface RunMapActionInput {
  /** No run: browsing or editing the map. */
  isBrowseMode: boolean;
  selectedKind: "combat" | "resupply" | null;
  isCurrentNode: boolean;
  isReachableChild: boolean;
  isDefeated: boolean;
  /** A match for this run is already live (web3 run.activeGameId). */
  hasActiveGame: boolean;
  isEnteringResupply: boolean;
}

const none = (label: string): RunMapAction => ({ type: "none", label, disabled: true });

export function getRunMapAction(input: RunMapActionInput): RunMapAction {
  if (input.selectedKind === null) return none("Select a mission");
  if (input.isBrowseMode) return none("Start a run to enter");

  if (input.isCurrentNode) {
    if (input.isDefeated) return none("Pick your next mission");
    // Relaunching while a match is live would revert; go back to it instead.
    if (input.hasActiveGame) return { type: "resume", label: "Return to battle", disabled: false };
    return { type: "warp", label: "Warp to mission", disabled: false };
  }

  if (!input.isReachableChild) return none("Not reachable");

  if (input.selectedKind === "resupply") {
    return input.isEnteringResupply
      ? { type: "resupply", label: "Entering…", disabled: true }
      : { type: "resupply", label: "Enter resupply", disabled: false };
  }
  if (input.isDefeated) return none("Already cleared");
  return { type: "warp", label: "Warp to mission", disabled: false };
}

// Types for the Roguelike campaign mode (RoguelikeNodeMap/RoguelikeRun/
// RoguelikeMatch/RoguelikeResupply) — a second, structurally different
// single-player campaign that exists alongside the original NodeMap
// campaign (see docs/update/Frontend_Update_Guide_Roguelike_Campaign.md).
// Field shapes below are pulled directly from the deployed contracts' ABIs
// (app/contracts/artifacts/DeployModule#Roguelike*.json), not just doc
// prose, to guarantee they match on-chain reality.

export enum RunStatus {
  None,
  Active,
  Won,
  Ended,
}

export enum RoguelikeNodeKind {
  Combat,
  Resupply,
}

export interface RoguelikeRun {
  status: RunStatus;
  generation: bigint;
  campaignId: bigint;
  currentNodeId: bigint;
  currentCostCap: bigint;
  reservationFleetId: bigint;
  rosterShipIds: bigint[];
  /** Nonzero while a combat match started via enterCombatNode is still
   * live; retreatRun must be called with this id first to forfeit the
   * match (ActiveGameInProgress otherwise) before retreatRun(0) can end
   * the run. See docs/update/Frontend_Updates_2026-08-26.md. */
  activeGameId: bigint;
}

export interface RoguelikeEdge {
  childId: bigint;
  twoWay: boolean;
}

export interface RoguelikeNode {
  id: bigint;
  campaignId: bigint;
  kind: RoguelikeNodeKind;
  mapId: bigint;
  turnTime: bigint;
  maxScore: bigint;
  creatorGoesFirst: boolean;
  costCapOverride: bigint;
  children: RoguelikeEdge[];
  exists: boolean;
}

export interface RoguelikePosition {
  row: number;
  col: number;
}

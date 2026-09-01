import { Address } from "viem";

export interface Ship {
  name: string;
  id: bigint;
  equipment: ShipEquipment;
  traits: ShipTraits;
  shipData: ShipData;
  owner: Address;
}

export interface ShipEquipment {
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
}

export interface ShipTraits {
  serialNumber: bigint;
  colors: ShipColors;
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
}

export interface ShipColors {
  h1: number;
  s1: number;
  l1: number;
  h2: number;
  s2: number;
  l2: number;
}

export interface ShipData {
  shipsDestroyed: number;
  costsVersion: number;
  cost: number;
  shiny: boolean;
  constructed: boolean;
  inFleet: boolean;
  timestampDestroyed: bigint;
}

export type ShipTuple = [
  string, // name
  bigint, // id
  ShipEquipment, // equipment
  ShipTraits, // traits
  ShipData, // shipData
  Address // owner
];

export function tupleToShip(tuple: ShipTuple): Ship {
  return {
    name: tuple[0],
    id: tuple[1],
    equipment: tuple[2],
    traits: tuple[3],
    shipData: tuple[4],
    owner: tuple[5],
  };
}

// Equipment enum mappings based on actual contract enums. Verified
// 2026-08-28 via `cast call` against the live RenderMetadata contract on
// Base Sepolia (mainWeaponNames(1, slot)) — "Missile"/"Plasma" were
// abbreviated relative to the on-chain names.
export const MAIN_WEAPON_NAMES = {
  0: "Laser",
  1: "Railgun",
  2: "Missile Launcher",
  3: "Plasma Cannon",
} as const;

// Variant 2 ("Drone" faction) display names for the same MainWeapon enum
// values, per docs/faction-2.md §6 (art-matching, not a new enum).
export const MAIN_WEAPON_NAMES_V2 = {
  0: "Medium Mining Laser",
  1: "Linear Accelerator",
  2: "Torpedo Launcher",
  3: "Mining Drill",
} as const;

export const ARMOR_NAMES = {
  0: "None",
  1: "Light",
  2: "Medium",
  3: "Heavy",
} as const;

export const SHIELD_NAMES = {
  0: "None",
  1: "Basic",
  2: "Enhanced",
  3: "Advanced",
} as const;

// Variant 1's Special enum: None/EMP/RepairDrones/FlakArray. Verified
// 2026-08-28 via `cast call` against the live RenderMetadata contract on
// Base Sepolia (specialNames(1, slot)) — the previous "Repair"/"Flak"
// strings here were abbreviated relative to the on-chain names.
export const SPECIAL_NAMES = {
  0: "None",
  1: "EMP",
  2: "Repair Drones",
  3: "Flak Array",
} as const;

// Variant 2 uses a disjoint set of Special values (Slot4/5/6), per
// docs/faction-2.md §6.
export const SPECIAL_NAMES_V2 = {
  0: "None",
  4: "Lightening Field",
  5: "Attack Drones",
  6: "Aux Engine",
} as const;

// Helper functions to get equipment names. `variant` defaults to 1 for call
// sites that only have a bare weapon/special value in scope (e.g. building a
// generic filter-dropdown label list) rather than a specific ship.
export function getMainWeaponName(value: number, variant: number = 1): string {
  const names = variant === 2 ? MAIN_WEAPON_NAMES_V2 : MAIN_WEAPON_NAMES;
  return (
    names[value as keyof typeof names] ||
    `Unknown (${value})`
  );
}

export function getArmorName(value: number): string {
  return ARMOR_NAMES[value as keyof typeof ARMOR_NAMES] || `Unknown (${value})`;
}

export function getShieldName(value: number): string {
  return (
    SHIELD_NAMES[value as keyof typeof SHIELD_NAMES] || `Unknown (${value})`
  );
}

export function getSpecialName(value: number, variant: number = 1): string {
  const names = variant === 2 ? SPECIAL_NAMES_V2 : SPECIAL_NAMES;
  return (
    names[value as keyof typeof names] || `Unknown (${value})`
  );
}

// Which raw Special values are valid for a given variant — variant 2's
// Special enum is disjoint from variant 1's (Slot 4/5/6 vs Slot 1/2/3), so a
// value valid for one variant can be meaningless/invalid for the other.
// Shared by customize-ship forms (option lists) and validation
// (app/lib/customizeCost.ts) so both stay in sync with SPECIAL_NAMES/
// SPECIAL_NAMES_V2 above.
const VALID_SPECIALS_BY_VARIANT: Record<number, readonly number[]> = {
  2: [0, 4, 5, 6],
};
const DEFAULT_VALID_SPECIALS: readonly number[] = [0, 1, 2, 3];

export function validSpecialsForVariant(variant: number): readonly number[] {
  return VALID_SPECIALS_BY_VARIANT[variant] ?? DEFAULT_VALID_SPECIALS;
}

// New types for Game and Lobbies contracts

export enum LobbyStatus {
  Open,
  FleetSelection,
  InGame,
}

export interface LobbyBasic {
  id: bigint;
  creator: Address;
  costLimit: bigint;
  createdAt: bigint;
}

export interface LobbyPlayers {
  joiner: Address;
  reservedJoiner: Address; // Address of player this lobby is reserved for (address(0) if open)
  creatorFleetId: bigint;
  joinerFleetId: bigint;
  joinedAt: bigint;
  joinerFleetSetAt: bigint;
}

export interface LobbyGameConfig {
  creatorGoesFirst: boolean;
  turnTime: bigint;
  selectedMapId: bigint;
  maxScore: bigint; // Maximum score needed to win the game
}

export interface LobbyState {
  status: LobbyStatus;
  gameStartedAt: bigint;
}

export interface Lobby {
  basic: LobbyBasic;
  players: LobbyPlayers;
  gameConfig: LobbyGameConfig;
  state: LobbyState;
}

export interface Fleet {
  id: bigint;
  lobbyId: bigint;
  owner: Address;
  shipIds: bigint[];
  totalCost: bigint;
  isComplete: boolean;
  // Added: starting positions (immutable once created)
  startingPositions?: Array<{ row: number; col: number }>;
}

export interface PlayerStats {
  wins: bigint;
  losses: bigint;
  totalGames: bigint;
}

export interface GameResult {
  gameId: bigint;
  winner: Address;
  loser: Address;
  timestamp: bigint;
}

export interface PlayerLobbyState {
  activeLobbyId: bigint;
  activeLobbiesCount: bigint;
  hasActiveLobby: boolean;
  kickCount: bigint;
  lastKickTime: bigint;
  /** Unresolved (not yet InGame) lobbies reserved for the AI. The first one is free to create; a second concurrent one costs 1 UTC. */
  activeAILobbiesCount: bigint;
}

export interface Attributes {
  version: number;
  range: number;
  gunDamage: number;
  hullPoints: number;
  maxHullPoints: number;
  movement: number;
  damageReduction: number;
  reactorCriticalTimer: number;
  statusEffects: number[];
}

export interface GameData {
  gameId: bigint;
  lobbyId: bigint;
  creator: Address;
  joiner: Address;
  creatorFleetId: bigint;
  joinerFleetId: bigint;
  creatorGoesFirst: boolean;
  startedAt: bigint;
  currentTurn: Address;
}

export interface GameMetadata {
  gameId: bigint;
  lobbyId: bigint;
  creator: Address;
  joiner: Address;
  creatorFleetId: bigint;
  joinerFleetId: bigint;
  creatorGoesFirst: boolean;
  startedAt: bigint;
  winner: Address;
  ended: boolean;
  orchestrator: Address; // PvPMatch or SinglePlayerMatch — whichever contract started this game
}

export interface GameTurnState {
  currentTurn: Address;
  turnTime: bigint;
  turnStartTime: bigint;
  currentRound: bigint;
}

export interface GameGridDimensions {
  gridWidth: number;
  gridHeight: number;
}

// Tuple types for contract return values
export type FleetTuple = [
  bigint, // id
  bigint, // lobbyId
  Address, // owner
  bigint[], // shipIds
  bigint, // totalCost
  boolean // isComplete
];

export type PlayerLobbyStateTuple = [
  bigint, // activeLobbyId
  bigint, // activeLobbiesCount
  boolean, // hasActiveLobby
  bigint, // kickCount
  bigint, // lastKickTime
  bigint // activeAILobbiesCount
];

export type GameDataTuple = [
  bigint, // gameId
  bigint, // lobbyId
  Address, // creator
  Address, // joiner
  bigint, // creatorFleetId
  bigint, // joinerFleetId
  boolean, // creatorGoesFirst
  bigint, // startedAt
  Address // currentTurn
];

// Helper functions to convert tuples to objects
export function tupleToFleet(tuple: FleetTuple): Fleet {
  return {
    id: tuple[0],
    lobbyId: tuple[1],
    owner: tuple[2],
    shipIds: tuple[3],
    totalCost: tuple[4],
    isComplete: tuple[5],
  };
}

export function tupleToPlayerLobbyState(
  tuple: PlayerLobbyStateTuple
): PlayerLobbyState {
  return {
    activeLobbyId: tuple[0],
    activeLobbiesCount: tuple[1],
    hasActiveLobby: tuple[2],
    kickCount: tuple[3],
    lastKickTime: tuple[4],
    activeAILobbiesCount: tuple[5],
  };
}

export function tupleToGameData(tuple: GameDataTuple): GameData {
  return {
    gameId: tuple[0],
    lobbyId: tuple[1],
    creator: tuple[2],
    joiner: tuple[3],
    creatorFleetId: tuple[4],
    joinerFleetId: tuple[5],
    creatorGoesFirst: tuple[6],
    startedAt: tuple[7],
    currentTurn: tuple[8],
  };
}

export interface Position {
  row: number; // Row position (0 to gridHeight-1)
  col: number; // Column position (0 to gridWidth-1)
}

export interface ShipPosition {
  shipId: bigint;
  position: Position;
  isCreator: boolean;
  // 0 = alive, 1 = destroyed, 2 = fled
  status?: 0 | 1 | 2;
  isPreview?: boolean; // Optional flag for preview ships
}

export interface LastMove {
  shipId: bigint;
  oldRow: number;
  oldCol: number;
  newRow: number;
  newCol: number;
  actionType: ActionType;
  targetShipId: bigint;
  timestamp: bigint;
}

export interface GameDataView {
  metadata: GameMetadata;
  turnState: GameTurnState;
  gridDimensions: GameGridDimensions;
  maxScore: bigint; // Maximum score needed to win the game
  creatorScore: bigint; // Current score of the creator player
  joinerScore: bigint; // Current score of the joiner player
  shipIds: readonly bigint[]; // Array of ship IDs that corresponds to shipAttributes by index
  shipAttributes: readonly Attributes[]; // Combined array of all ship attributes indexed by ship ID
  shipPositions: readonly ShipPosition[]; // All ship positions on the grid
  creatorActiveShipIds: readonly bigint[];
  joinerActiveShipIds: readonly bigint[];
  // Ships that have moved this round
  creatorMovedShipIds: readonly bigint[]; // Creator ships that have moved this round
  joinerMovedShipIds: readonly bigint[]; // Joiner ships that have moved this round
  lastMove?: LastMove; // Last move made in the game
}

// NOTE: values 0-4 (Pass..Special) match the on-chain Game.ActionType 1:1.
// ClaimPoints (5) and Ram (6) are web2/simulated-only — the real contract's
// on-chain ActionType enum has no equivalents (scoring is automatic per
// round, and ramming is now dispatched as FactionAbility). Raw on-chain
// value 5 must be normalized to FactionAbility (7) at the web3 read
// boundary — see useGetGame in useGameContract.ts — before it reaches any
// shared component, since literal 5 would otherwise collide with
// ClaimPoints. Do not renumber/remove ClaimPoints or Ram: web2 persists
// these raw integers directly (see app/api/games/[id]/action/route.ts).
export enum ActionType {
  Pass,
  Shoot,
  Retreat,
  Assist,
  Special,
  ClaimPoints,
  Ram,
  FactionAbility,
}

// SinglePlayerMatch / AIEncounters types
export enum Archetype {
  Grunt,
  Aggressor,
  Sniper,
  Support,
  Turtle,
  Rammer,
}

// SinglePlayerMatch.aiShipInfo(shipId)
export interface AIShipInfo {
  archetype: Archetype;
  variant: number;
  special: number;
}

// NodeMap.getAllNodes()/.getNode(nodeId) — the campaign graph. No display
// names/flavor text on-chain, see app/config/campaignNodes.ts for that.
export interface CampaignNode {
  id: bigint;
  campaignId: bigint;
  mapId: bigint;
  prerequisites: bigint[];
  costLimit: bigint;
  turnTime: bigint;
  maxScore: bigint;
  creatorGoesFirst: boolean;
  exists: boolean;
}

// Maps.mapMode(mapId) / createPresetMap(..., mode) — which flow a map is
// valid for. Enforced on-chain: Lobbies reverts InvalidMapId for PvE-only
// maps, NodeMap reverts InvalidMapMode for maps that aren't PvE or Both.
export enum MapMode {
  PvP = 0,
  PvE = 1,
  Both = 2,
}

// AIEncounters' on-chain `Colors`/`Traits` structs have a third color slot
// (h3/s3/l3) that the shared ShipColors/ShipTraits types (used for regular
// ship purchasing/rendering) don't carry — see ShipConstructor.tsx, which
// already tracks h3/s3/l3 separately from ShipColors for the same reason.
// Scoped to AIEncounters only; not a fix for the wider ShipColors gap.
export interface AIEncountersColors {
  h1: number;
  s1: number;
  l1: number;
  h2: number;
  s2: number;
  l2: number;
  h3: number;
  s3: number;
  l3: number;
}

export interface AIEncountersTraits {
  serialNumber: bigint;
  colors: AIEncountersColors;
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
}

// AIEncounters.getAIShipConfig(configId) / getAllAIShipConfigs()
export interface AIShipConfig {
  id: bigint;
  name: string;
  equipment: ShipEquipment;
  traits: AIEncountersTraits;
  archetype: Archetype;
}

// Maps contract types
export interface MapPosition {
  row: number;
  col: number;
}

export interface ScoringPosition {
  row: number;
  col: number;
  points: number;
  onlyOnce: boolean;
}

export interface PresetMap {
  id: number;
  blockedPositions: MapPosition[];
  scoringPositions: ScoringPosition[];
}

export interface MapEditorState {
  blockedTiles: boolean[][];
  scoringTiles: number[][];
  onlyOnceTiles: boolean[][];
  selectedTool: "block" | "score" | "erase";
  selectedScoreValue: number;
  selectedOnlyOnce: boolean;
  symmetryMode: "none" | "radial";
}

export const GRID_DIMENSIONS = {
  WIDTH: 17,
  HEIGHT: 11,
} as const;

// Game contract types
export interface GameMetadata {
  gameId: bigint;
  lobbyId: bigint;
  creator: Address;
  joiner: Address;
  creatorFleetId: bigint;
  joinerFleetId: bigint;
  creatorGoesFirst: boolean;
  startedAt: bigint;
  winner: Address;
  ended: boolean;
  orchestrator: Address; // PvPMatch or SinglePlayerMatch — whichever contract started this game
}

export interface GameTurnState {
  currentTurn: Address;
  turnTime: bigint;
  turnStartTime: bigint;
  currentRound: bigint;
}

export interface GameGridDimensions {
  gridWidth: number;
  gridHeight: number;
}

export interface Game {
  metadata: GameMetadata;
  turnState: GameTurnState;
  gridDimensions: GameGridDimensions;
  maxScore: bigint;
  creatorScore: bigint;
  joinerScore: bigint;
  shipIds: readonly bigint[]; // Array of ship IDs that corresponds to shipAttributes by index
  shipAttributes: readonly Attributes[]; // Combined array of all ship attributes indexed by ship ID
  shipPositions: readonly ShipPosition[]; // All ship positions on the grid
  creatorActiveShipIds: readonly bigint[];
  joinerActiveShipIds: readonly bigint[];
}

// ── Tournament types ────────────────────────────────────────────────────────

export enum TournamentState {
  Registration = 0,
  Active = 1,
  Complete = 2,
  Cancelled = 3,
}

export interface TournamentConfig {
  entryFee: bigint;
  minPlayers: number;
  maxPlayers: number;
  lastStartTime: bigint;
  costLimit: bigint;
  turnTime: bigint;
  selectedMapId: bigint;
  maxScore: bigint;
}

export interface TournamentMatch {
  matchId: bigint;
  round: number;
  player1: Address;
  player2: Address;
  winner: Address;
  gameId: bigint;
  walrusBlobId: `0x${string}`;
  resolved: boolean;
}

export interface TournamentSummary {
  tournamentId: bigint;
  state: TournamentState;
  creator: Address;
  prizePool: bigint;
  registrantCount: bigint;
  totalRounds: number;
  champion: Address;
  runnerUp: Address;
}

export interface TurnRecord {
  turnNumber: number;
  round: number;
  player: string; // address
  actions: unknown;
  snapshot: GameDataView;
  timestamp: number;
}

export interface GameRecord {
  gameId: string;
  initialState: GameDataView;
  player1: string; // address
  player2: string; // address
  winner: string; // address or "" if in-progress
  turns: TurnRecord[];
  tournamentId?: number;
  matchId?: number;
}

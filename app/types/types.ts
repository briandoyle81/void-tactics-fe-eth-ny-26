import { Address } from "viem";

export interface Ship {
  name: string;
  id: number;
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
  serialNumber: number;
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
  timestampDestroyed: number;
}

export type ShipTuple = [
  string, // name
  number, // id
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

// Equipment enum mappings based on actual contract enums
export const MAIN_WEAPON_NAMES = {
  0: "Laser",
  1: "Railgun",
  2: "Missile",
  3: "Plasma",
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

export const SPECIAL_NAMES = {
  0: "None",
  1: "EMP",
  2: "Repair",
  3: "Flak",
} as const;

// Helper functions to get equipment names
export function getMainWeaponName(value: number): string {
  return (
    MAIN_WEAPON_NAMES[value as keyof typeof MAIN_WEAPON_NAMES] ||
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

export function getSpecialName(value: number): string {
  return (
    SPECIAL_NAMES[value as keyof typeof SPECIAL_NAMES] || `Unknown (${value})`
  );
}

// New types for Game and Lobbies contracts

export enum LobbyStatus {
  Open,
  FleetSelection,
  InGame,
}

export interface LobbyBasic {
  id: number;
  creator: Address;
  costLimit: number;
  createdAt: number;
}

export interface LobbyPlayers {
  joiner: Address;
  reservedJoiner: Address; // Address of player this lobby is reserved for (address(0) if open)
  creatorFleetId: number;
  joinerFleetId: number;
  joinedAt: number;
  joinerFleetSetAt: number;
}

export interface LobbyGameConfig {
  creatorGoesFirst: boolean;
  turnTime: number;
  selectedMapId: number;
  maxScore: number;
}

export interface LobbyState {
  status: LobbyStatus;
  gameStartedAt: number;
}

export interface Lobby {
  basic: LobbyBasic;
  players: LobbyPlayers;
  gameConfig: LobbyGameConfig;
  state: LobbyState;
}

export interface Fleet {
  id: number;
  lobbyId: number;
  owner: Address;
  shipIds: number[];
  totalCost: number;
  isComplete: boolean;
  startingPositions?: Array<{ row: number; col: number }>;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  totalGames: number;
}

export interface GameResult {
  gameId: number;
  winner: Address;
  loser: Address;
  timestamp: number;
}

export interface PlayerLobbyState {
  activeLobbyId: number;
  activeLobbiesCount: number;
  hasActiveLobby: boolean;
  kickCount: number;
  lastKickTime: number;
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
  gameId: number;
  lobbyId: number;
  creator: Address;
  joiner: Address;
  creatorFleetId: number;
  joinerFleetId: number;
  creatorGoesFirst: boolean;
  startedAt: number;
  currentTurn: Address;
}

export interface GameMetadata {
  gameId: number;
  lobbyId: number;
  creator: Address;
  joiner: Address;
  creatorFleetId: number;
  joinerFleetId: number;
  creatorGoesFirst: boolean;
  startedAt: number;
  winner: Address;
}

export interface GameTurnState {
  currentTurn: Address;
  turnTime: number;
  turnStartTime: number;
  currentRound: number;
}

export interface GameGridDimensions {
  gridWidth: number;
  gridHeight: number;
}

// Tuple types for contract return values
export type LobbyTuple = [
  number, // id
  Address, // creator
  Address, // joiner
  number, // costLimit
  number, // status
  number, // createdAt
  number, // gameStartedAt
  number, // creatorFleetId
  number, // joinerFleetId
  boolean, // creatorGoesFirst
  number, // turnTime
  number, // joinedAt
  number, // joinerFleetSetAt
  number, // selectedMapId
  number // maxScore
];

export type FleetTuple = [
  number, // id
  number, // lobbyId
  Address, // owner
  number[], // shipIds
  number, // totalCost
  boolean // isComplete
];

export type PlayerLobbyStateTuple = [
  number, // activeLobbyId
  number, // activeLobbiesCount
  boolean, // hasActiveLobby
  number, // kickCount
  number // lastKickTime
];

export type GameDataTuple = [
  number, // gameId
  number, // lobbyId
  Address, // creator
  Address, // joiner
  number, // creatorFleetId
  number, // joinerFleetId
  boolean, // creatorGoesFirst
  number, // startedAt
  Address // currentTurn
];

// Helper functions to convert tuples to objects
export function tupleToLobby(tuple: LobbyTuple): Lobby {
  return {
    basic: {
      id: Number(tuple[0]),
      creator: tuple[1],
      costLimit: Number(tuple[3]),
      createdAt: Number(tuple[5]),
    },
    players: {
      joiner: tuple[2],
      reservedJoiner: "0x0000000000000000000000000000000000000000" as Address,
      creatorFleetId: Number(tuple[7]),
      joinerFleetId: Number(tuple[8]),
      joinedAt: Number(tuple[11]),
      joinerFleetSetAt: Number(tuple[12]),
    },
    gameConfig: {
      creatorGoesFirst: tuple[9],
      turnTime: Number(tuple[10]),
      selectedMapId: Number(tuple[13]),
      maxScore: Number(tuple[14]),
    },
    state: {
      status: tuple[4],
      gameStartedAt: Number(tuple[6]),
    },
  };
}

export function tupleToFleet(tuple: FleetTuple): Fleet {
  return {
    id: Number(tuple[0]),
    lobbyId: Number(tuple[1]),
    owner: tuple[2],
    shipIds: tuple[3],
    totalCost: Number(tuple[4]),
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
  };
}

export function tupleToGameData(tuple: GameDataTuple): GameData {
  return {
    gameId: tuple[0],
    lobbyId: tuple[1],
    creator: tuple[2],
    joiner: tuple[3],
    creatorFleetId: Number(tuple[4]),
    joinerFleetId: Number(tuple[5]),
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
  shipId: number;
  position: Position;
  isCreator: boolean;
  // 0 = alive, 1 = destroyed, 2 = fled
  status?: 0 | 1 | 2;
  isPreview?: boolean; // Optional flag for preview ships
}

export interface LastMove {
  shipId: number;
  oldRow: number;
  oldCol: number;
  newRow: number;
  newCol: number;
  actionType: ActionType;
  targetShipId: number;
  timestamp: number;
}

export interface GameDataView {
  metadata: GameMetadata;
  turnState: GameTurnState;
  gridDimensions: GameGridDimensions;
  mapId: number;
  maxScore: number;
  creatorScore: number;
  joinerScore: number;
  shipIds: readonly number[];
  shipAttributes: readonly Attributes[];
  shipPositions: readonly ShipPosition[];
  creatorActiveShipIds: readonly number[];
  joinerActiveShipIds: readonly number[];
  creatorMovedShipIds: readonly number[];
  joinerMovedShipIds: readonly number[];
  lastMove?: LastMove;
}

export enum ActionType {
  Pass,
  Shoot,
  Retreat,
  Assist,
  Special,
  ClaimPoints,
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

export interface Game {
  metadata: GameMetadata;
  turnState: GameTurnState;
  gridDimensions: GameGridDimensions;
  maxScore: number;
  creatorScore: number;
  joinerScore: number;
  shipIds: readonly number[];
  shipAttributes: readonly Attributes[];
  shipPositions: readonly ShipPosition[];
  creatorActiveShipIds: readonly number[];
  joinerActiveShipIds: readonly number[];
}

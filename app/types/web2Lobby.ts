// Web2-mode lobby/fleet types. Parallel to (and never sharing a definition
// with) the web3 `Lobby`/`Fleet` types in `./types.ts`, which model on-chain
// data (`bigint` ids, `0x${string}` addresses). Web2 lobbies are
// Prisma-backed rows keyed by plain integer ids and owned by NextAuth user
// ids (Google OAuth subs, not addresses) — see app/types/web2Ship.ts for why
// the two systems never interoperate.

export enum Web2LobbyStatus {
  Open,
  FleetSelection,
  InGame,
}

export interface Web2LobbyBasic {
  id: number;
  creator: string;
  costLimit: number;
  createdAt: number;
}

export interface Web2LobbyPlayers {
  joiner: string;
  reservedJoiner: string;
  creatorFleetId: number;
  joinerFleetId: number;
  joinedAt: number;
  joinerFleetSetAt: number;
}

export interface Web2LobbyGameConfig {
  creatorGoesFirst: boolean;
  turnTime: number;
  selectedMapId: number;
  maxScore: number;
}

export interface Web2LobbyState {
  status: Web2LobbyStatus;
  gameStartedAt: number;
}

export interface Web2Lobby {
  basic: Web2LobbyBasic;
  players: Web2LobbyPlayers;
  gameConfig: Web2LobbyGameConfig;
  state: Web2LobbyState;
}

export interface Web2Fleet {
  id: number;
  lobbyId: number;
  owner: string;
  shipIds: number[];
  totalCost: number;
  isComplete: boolean;
  startingPositions?: Array<{ row: number; col: number }>;
}

import { Lobby, PlayerLobbyState } from "../types/types";

const STUB = { data: undefined as unknown, isLoading: false, error: null as Error | null, refetch: async () => {} };

export function useLobbiesChainParams() {
  return {
    address: "0x0000000000000000000000000000000000000000",
    abi: [] as const,
    chainId: 0,
  } as const;
}

export function useLobbiesContract() {
  return useLobbiesChainParams();
}

export function useLobbiesRead(
  _functionName: string,
  _args?: readonly unknown[],
  _options?: { query?: { enabled?: boolean } }
) {
  return STUB;
}

export function useLobbiesWrite() {
  return {
    writeContract: async () => {},
    writeContractAsync: async () => { throw new Error("blockchain writes disabled"); },
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    reset: () => {},
  };
}

export type LobbiesReadFunction =
  | "getLobby"
  | "getPlayerState"
  | "getPlayerTimeoutEnd"
  | "isLobbyOpenForJoining"
  | "lobbyCount"
  | "freeGamesPerAddress"
  | "additionalLobbyFee"
  | "paused";

export type LobbiesWriteFunction =
  | "createLobby"
  | "joinLobby"
  | "leaveLobby"
  | "timeoutJoiner"
  | "createFleet"
  | "quitWithPenalty"
  | "acceptGame"
  | "rejectGame";

export function useLobby(
  _lobbyId: number,
  _options?: { enabled?: boolean }
) {
  return {
    lobby: undefined as Lobby | undefined,
    error: null,
    isLoading: false,
    refetch: async () => {},
  };
}

export function usePlayerLobbyState(_playerAddress: string) {
  return {
    playerState: undefined as PlayerLobbyState | undefined,
    error: null,
    isLoading: false,
    refetch: async () => {},
  };
}

export function useLobbyCount() {
  return STUB;
}

export function useLobbySettings() {
  return {
    freeGamesPerAddress: undefined,
    additionalLobbyFee: undefined,
    paused: undefined,
    isLoading: false,
    error: null,
  };
}

export function useIsLobbyOpenForJoining(_lobbyId: number) {
  return STUB;
}

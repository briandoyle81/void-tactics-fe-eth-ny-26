export function useFleetsContract() {
  return {
    address: "0x0000000000000000000000000000000000000000",
    abi: [] as const,
    chainId: 0,
  };
}

const STUB = { data: undefined as unknown, isLoading: false, error: null as Error | null, refetch: async () => {} };

export function useFleetsRead(
  _functionName: string,
  _args?: readonly unknown[],
  _options?: { query?: { enabled?: boolean } }
) {
  return STUB;
}

export function useFleetsWrite() {
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

export type FleetsReadFunction =
  | "getFleetShipIds"
  | "getFleet"
  | "getFleetCount"
  | "getFleetIdsOwned"
  | "getFleetIdsInLobby";

export type FleetsWriteFunction = "createFleet" | "withdrawFleet";

export function useFleetShipIdsAndPositions(
  _fleetId?: number,
  _options?: { query?: { enabled?: boolean } }
) {
  return STUB;
}

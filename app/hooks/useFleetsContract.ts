import { getContractAddresses } from "../config/contracts";
import { getSelectedChainId } from "../config/networks";

export function useFleetsContract() {
  const chainId = getSelectedChainId();
  const { FLEETS } = getContractAddresses(chainId);
  return {
    address: FLEETS as `0x${string}`,
    abi: [] as const,
    chainId,
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

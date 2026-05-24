import { getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

export function useShipsContract() {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  return {
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: [] as const,
    chainId: activeChainId,
  };
}

const STUB = { data: undefined as unknown, isLoading: false, error: null as Error | null, refetch: async () => {} };

export function useShipsRead(_functionName: string, _args?: readonly unknown[]) {
  return STUB;
}

export function useShipsWrite() {
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

export type ShipsReadFunction =
  | "getShip"
  | "getShipIdsOwned"
  | "getShipsByIds"
  | "getPurchaseInfo"
  | "getCosts"
  | "getCurrentCostsVersion"
  | "isShipDestroyed"
  | "getTierOfTrait"
  | "shipCount";

export type ShipsWriteFunction =
  | "constructShip"
  | "constructShips"
  | "constructAllMyShips"
  | "shipBreaker"
  | "syncShipCosts"
  | "setCostOfShip";

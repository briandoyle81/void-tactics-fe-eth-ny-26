export function useShipsContract() {
  return {
    address: "0x0000000000000000000000000000000000000000",
    abi: [] as const,
    chainId: 0,
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

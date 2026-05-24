import { useCurrentUser } from "./useCurrentUser";

export interface GunData { range: number; damage: number; movement: number; }
export interface ArmorData { damageReduction: number; movement: number; }
export interface ShieldData { damageReduction: number; movement: number; }
export interface SpecialData { range: number; strength: number; movement: number; }
export interface AttributesVersion {
  version: number; baseHull: number; baseSpeed: number;
  foreAccuracy: number[]; hull: number[]; engineSpeeds: number[];
  guns: GunData[]; armors: ArmorData[]; shields: ShieldData[]; specials: SpecialData[];
}
export interface Costs {
  version: number; baseCost: number; accuracy: number[]; hull: number[];
  speed: number[]; mainWeapon: number[]; armor: number[]; shields: number[]; special: number[];
}

export type ShipAttributesReadFunction =
  | "getCurrentAttributesVersion" | "getCurrentCostsVersion" | "getAttributesVersionBase"
  | "getCosts" | "getGunData" | "getArmorData" | "getShieldData" | "getSpecialData"
  | "getSpecialRange" | "getSpecialStrength" | "owner";

export type ShipAttributesWriteFunction =
  | "setCurrentAttributesVersion" | "setAttributesVersionBase" | "addGunData"
  | "addArmorData" | "addShieldData" | "addSpecialData" | "addForeAccuracy"
  | "addEngineSpeed" | "setCosts";

const STUB = { data: undefined as unknown, isLoading: false, error: null as Error | null };

export function useShipAttributesRead(_functionName: ShipAttributesReadFunction, _args?: readonly unknown[]) {
  return STUB;
}

export function useShipAttributesWrite() {
  return {
    writeContract: async () => {},
    writeContractAsync: async () => { throw new Error("blockchain writes disabled"); },
    isPending: false, isSuccess: false, isError: false, error: null, data: undefined, reset: () => {},
  };
}

export function useShipAttributesOwner() {
  const { userId } = useCurrentUser();
  return { owner: undefined as `0x${string}` | undefined, isOwner: false, userId };
}

export function useCurrentAttributesVersion() { return STUB; }
export function useCurrentCostsVersion() { return STUB; }
export function useCosts() { return STUB; }
export function useAttributesVersionBase(_version: number) { return STUB; }
export function useGunData(_weaponIndex: number) { return STUB; }
export function useArmorData(_armorIndex: number) { return STUB; }
export function useShieldData(_shieldIndex: number) { return STUB; }
export function useSpecialData(_specialIndex: number) { return STUB; }

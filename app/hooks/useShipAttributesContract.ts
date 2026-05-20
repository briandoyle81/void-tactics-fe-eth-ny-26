import { useMemo } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

// Types based on the contract
export interface GunData {
  range: number;
  damage: number;
  movement: number;
}

export interface ArmorData {
  damageReduction: number;
  movement: number;
}

export interface ShieldData {
  damageReduction: number;
  movement: number;
}

export interface SpecialData {
  range: number;
  strength: number;
  movement: number;
}

export interface AttributesVersion {
  version: number;
  baseHull: number;
  baseSpeed: number;
  foreAccuracy: number[];
  hull: number[];
  engineSpeeds: number[];
  guns: GunData[];
  armors: ArmorData[];
  shields: ShieldData[];
  specials: SpecialData[];
}

export interface Costs {
  version: number;
  baseCost: number;
  accuracy: number[];
  hull: number[];
  speed: number[];
  mainWeapon: number[];
  armor: number[];
  shields: number[];
  special: number[];
}

export type ShipAttributesReadFunction =
  | "getCurrentAttributesVersion"
  | "getCurrentCostsVersion"
  | "getAttributesVersionBase"
  | "getCosts"
  | "getGunData"
  | "getArmorData"
  | "getShieldData"
  | "getSpecialData"
  | "getSpecialRange"
  | "getSpecialStrength"
  | "owner";

export type ShipAttributesWriteFunction =
  | "setCurrentAttributesVersion"
  | "setAttributesVersionBase"
  | "addGunData"
  | "addArmorData"
  | "addShieldData"
  | "addSpecialData"
  | "addForeAccuracy"
  | "addEngineSpeed"
  | "setCosts";

export function useShipAttributesRead(
  functionName: ShipAttributesReadFunction,
  args?: readonly unknown[]
) {
  const chainId = useSelectedChainId();
  const shipAttributes = getContractAddresses(chainId)
    .SHIP_ATTRIBUTES as `0x${string}`;

  return useReadContract({
    address: shipAttributes,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
    chainId,
    functionName,
    args,
  });
}

export function useShipAttributesWrite() {
  return useWriteContract();
}

export function useShipAttributesOwner() {
  const { data } = useShipAttributesRead("owner");
  const { address } = useAccount();
  const owner = typeof data === "string" ? (data as `0x${string}`) : undefined;

  return {
    owner,
    isOwner:
      !!address &&
      !!owner &&
      address.toLowerCase() === owner.toLowerCase(),
  };
}

// Specific hooks for common operations
export function useCurrentAttributesVersion() {
  return useShipAttributesRead("getCurrentAttributesVersion");
}

export function useCurrentCostsVersion() {
  return useShipAttributesRead("getCurrentCostsVersion");
}

export function useCosts() {
  return useShipAttributesRead("getCosts");
}

export function useAttributesVersionBase(version: number) {
  const args = useMemo(() => [version] as const, [version]);
  return useShipAttributesRead("getAttributesVersionBase", args);
}

export function useGunData(weaponIndex: number) {
  const args = useMemo(() => [weaponIndex] as const, [weaponIndex]);
  return useShipAttributesRead("getGunData", args);
}

export function useArmorData(armorIndex: number) {
  const args = useMemo(() => [armorIndex] as const, [armorIndex]);
  return useShipAttributesRead("getArmorData", args);
}

export function useShieldData(shieldIndex: number) {
  const args = useMemo(() => [shieldIndex] as const, [shieldIndex]);
  return useShipAttributesRead("getShieldData", args);
}

export function useSpecialData(specialIndex: number) {
  const args = useMemo(() => [specialIndex] as const, [specialIndex]);
  return useShipAttributesRead("getSpecialData", args);
}

import { useMemo } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { getVariantForChainId } from "../config/networks";
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

// A published attributes table for one (variant, version). As of the
// 2026-09-20/21 redesign this has no `version` field of its own — the
// version is tracked separately via getCurrentAttributesVersion/
// getLatestAttributesVersion, and rankThresholds/rankBonusPct are now part
// of the table (previously hard-coded). See
// docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §1.2.
export interface VariantAttributeData {
  baseHull: number;
  baseSpeed: number;
  foreAccuracy: number[];
  hull: number[];
  engineSpeeds: number[];
  guns: GunData[];
  armors: ArmorData[];
  shields: ShieldData[];
  specials: SpecialData[];
  rankThresholds: number[];
  rankBonusPct: number[];
}

/** Argument shape for `setVariantAttributes` — same fields as `VariantAttributeData` plus which variant it publishes for. No `version`: the contract always publishes `latest + 1` and makes it live. */
export type SetVariantAttributesParams = VariantAttributeData & {
  variant: number;
};

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
  | "getLatestAttributesVersion"
  | "getVariantAttributes"
  | "getCurrentCostsVersion"
  | "getCosts"
  | "getGunData"
  | "getArmorData"
  | "getShieldData"
  | "getSpecialData"
  | "getSpecialRange"
  | "getSpecialStrength"
  | "getSpecialRangeAt"
  | "getSpecialStrengthAt"
  | "getRank"
  | "owner";

export type ShipAttributesWriteFunction =
  | "setCurrentAttributesVersion"
  | "setVariantAttributes"
  | "setCosts";

// `chainIdOverride` pins the read to a specific chain instead of following
// the header network picker — needed by the campaign flow (Base-Sepolia-
// only, like every other campaign hook).
export function useShipAttributesRead(
  functionName: ShipAttributesReadFunction,
  args?: readonly unknown[],
  chainIdOverride?: number,
  enabled: boolean = true,
) {
  const pickerChainId = useSelectedChainId();
  const chainId = chainIdOverride ?? pickerChainId;
  const shipAttributes = getContractAddresses(chainId)
    .SHIP_ATTRIBUTES as `0x${string}`;

  return useReadContract({
    address: shipAttributes,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
    chainId,
    functionName,
    query: { enabled },
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

// Every per-variant getter below takes a `_variant` (ship traits.variant) as of
// the contract redeploy that made costs and attributes per-faction — omitting
// it throws an ABI encoding length mismatch and silently leaves `data`
// undefined. Callers that don't care about a specific faction get the
// selected chain's variant.
export function useChainVariant(chainIdOverride?: number) {
  const pickerChainId = useSelectedChainId();
  return getVariantForChainId(chainIdOverride ?? pickerChainId);
}

const SHIPS_ABI = CONTRACT_ABIS.SHIPS as Abi;

/** Highest ship variant (faction) the Ships contract will mint; variants are 1..maxVariant. */
export function useMaxVariant() {
  const chainId = useSelectedChainId();
  const config = useMemo(
    () => ({
      address: getContractAddresses(chainId).SHIPS as `0x${string}`,
      abi: SHIPS_ABI,
      functionName: "maxVariant" as const,
      chainId,
    }),
    [chainId],
  );
  return useReadContract(config);
}

// --- Attributes: versioned per variant, no global version any more ---

/** The attributes version currently live for a variant; 0 means the variant has never been configured (`getVariantAttributes` reverts `VariantNotConfigured` for it). */
export function useCurrentAttributesVersion(variant: number) {
  const args = useMemo(() => [variant] as const, [variant]);
  return useShipAttributesRead("getCurrentAttributesVersion", args);
}

/** Highest attributes version ever published for a variant (kept forever, immutable, readable regardless of which version is live). */
export function useLatestAttributesVersion(variant: number) {
  const args = useMemo(() => [variant] as const, [variant]);
  return useShipAttributesRead("getLatestAttributesVersion", args);
}

/** A variant's full attributes table at a given version; `version = 0` means "whatever's currently live". */
export function useVariantAttributes(variant: number, version: number = 0) {
  const args = useMemo(() => [variant, version] as const, [variant, version]);
  return useShipAttributesRead("getVariantAttributes", args);
}

/** Kills-based rank (1-6) for a variant, using that variant's own published rankThresholds. */
export function useRank(variant: number, shipsDestroyed: bigint | number) {
  const args = useMemo(
    () => [variant, BigInt(shipsDestroyed)] as const,
    [variant, shipsDestroyed],
  );
  return useShipAttributesRead("getRank", args);
}

// --- Costs: per variant, unchanged model (only validation changed) ---

export function useCurrentCostsVersion(
  chainIdOverride?: number,
  variantOverride?: number,
) {
  const chainVariant = useChainVariant(chainIdOverride);
  const variant = variantOverride ?? chainVariant;
  const args = useMemo(() => [variant] as const, [variant]);
  return useShipAttributesRead("getCurrentCostsVersion", args, chainIdOverride);
}

export function useCosts(variantOverride?: number) {
  const chainVariant = useChainVariant();
  const variant = variantOverride ?? chainVariant;
  const args = useMemo(() => [variant] as const, [variant]);
  return useShipAttributesRead("getCosts", args);
}

// --- Equipment stat lookups (live table) — fine for pre-game/editor
// display; wrong for an in-flight game, which must pin to the acting
// ship's own attributes.version via `useSpecialRangeAt`/`useSpecialStrengthAt`.

export function useGunData(weaponIndex: number, variant: number) {
  const args = useMemo(() => [weaponIndex, variant] as const, [weaponIndex, variant]);
  return useShipAttributesRead("getGunData", args);
}

export function useArmorData(armorIndex: number, variant: number) {
  const args = useMemo(() => [armorIndex, variant] as const, [armorIndex, variant]);
  return useShipAttributesRead("getArmorData", args);
}

export function useShieldData(shieldIndex: number, variant: number) {
  const args = useMemo(() => [shieldIndex, variant] as const, [shieldIndex, variant]);
  return useShipAttributesRead("getShieldData", args);
}

// `getSpecialData` takes a `_variant` argument (ship traits.variant) as of
// the contract redeploy that added per-variant special stats — see
// useSpecialRange.ts's matching doc for the failure mode when it's omitted.
export function useSpecialData(specialIndex: number, variant: number = 0) {
  const args = useMemo(() => [specialIndex, variant] as const, [specialIndex, variant]);
  return useShipAttributesRead("getSpecialData", args);
}

// Specials are pinned per game: resolvers (and Variant1AI's heal-range
// check) read a special's range/strength at the acting ship's pinned
// attributes.version, not the live table, so a mid-game rebalance can't
// change an in-flight game. In-game tooltips must use these, not
// `getSpecialRange`/`getSpecialData` above.
export function useSpecialRangeAt(
  variant: number,
  version: number,
  special: number,
  enabled: boolean = true,
) {
  const args = useMemo(
    () => [variant, version, special] as const,
    [variant, version, special],
  );
  // version 0 is never a real pinned version (InvalidAttributesVersion
  // on-chain) — guard it here so callers can pass a not-yet-loaded ship's
  // version without tripping a doomed read.
  return useShipAttributesRead("getSpecialRangeAt", args, undefined, enabled && version > 0);
}

export function useSpecialStrengthAt(
  variant: number,
  version: number,
  special: number,
  enabled: boolean = true,
) {
  const args = useMemo(
    () => [variant, version, special] as const,
    [variant, version, special],
  );
  return useShipAttributesRead("getSpecialStrengthAt", args, undefined, enabled && version > 0);
}

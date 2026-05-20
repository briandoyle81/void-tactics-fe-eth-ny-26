import React from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";
import { Attributes } from "../types/types";
import {
  readValidShipAttributesByIdsCache,
  shipIdsToCacheKeyString,
  writeShipAttributesByIdsCache,
} from "../utils/shipAttributesLocalCache";

export function useShipAttributesByIds(shipIds: bigint[]) {
  const chainId = useSelectedChainId();
  const shipIdsString = React.useMemo(
    () => shipIdsToCacheKeyString(shipIds),
    [shipIds],
  );

  const getCachedData = React.useCallback((): Attributes[] | null => {
    return readValidShipAttributesByIdsCache(chainId, shipIdsString);
  }, [chainId, shipIdsString]);

  // Get cached data
  const cachedData = React.useMemo(() => getCachedData(), [getCachedData]);

  // Only call contract if we don't have valid cached data
  const shouldCallContract = !cachedData && shipIds.length > 0;

  const shipAttributesAddress = React.useMemo(
    () => getContractAddresses(chainId).SHIP_ATTRIBUTES as `0x${string}`,
    [chainId],
  );

  const contractArgs = React.useMemo(
    () => (shouldCallContract ? ([shipIds] as const) : undefined),
    [shouldCallContract, shipIds],
  );

  const {
    data: contractData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: shipAttributesAddress,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
    chainId,
    functionName: "calculateShipAttributesByIds",
    args: contractArgs,
  });

  React.useEffect(() => {
    if (contractData) {
      const rows = contractData as Attributes[];
      if (rows.length === shipIds.length) {
        writeShipAttributesByIdsCache(chainId, shipIds, rows);
      }
    }
  }, [chainId, contractData, shipIds]);

  // Only use rows that match the current id list. Otherwise wagmi can briefly
  // keep the previous query's array while `shipIds` has already updated, which
  // mis-attributes stats (wrong damage reduction, etc.) when keyed by index.
  const attributes = React.useMemo((): Attributes[] => {
    const n = shipIds.length;
    if (n === 0) return [];

    if (cachedData && cachedData.length === n) {
      return cachedData;
    }

    const fromContract = contractData as Attributes[] | undefined;
    // Do not trust `contractData` while this query is still loading: wagmi can
    // keep the previous successful result until the new `args` resolve, and
    // lengths can match while rows belong to an older `shipIds` list.
    if (
      shouldCallContract &&
      fromContract &&
      fromContract.length === n &&
      !isLoading
    ) {
      return fromContract;
    }

    return [];
  }, [
    cachedData,
    contractData,
    shipIds.length,
    shipIdsString,
    shouldCallContract,
    isLoading,
  ]);

  return {
    attributes,
    isLoading: shouldCallContract && isLoading,
    error,
    refetch,
    isFromCache: !!cachedData && cachedData.length === shipIds.length,
  };
}

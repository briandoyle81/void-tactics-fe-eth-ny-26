import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { useShipsRead } from "./useShipsContract";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";
import { useSelectedChainId } from "./useSelectedChainId";

const REFETCH_DEBOUNCE_MS = 400;
const REFETCH_RETRY_MS = 2000;

export function useOwnedShips() {
  const { address } = useAccount();
  const activeChainId = useSelectedChainId();

  const baselineOwnedIdsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    baselineOwnedIdsKeyRef.current = null;
  }, [address, activeChainId]);

  const shipIdsArgs = useMemo(
    () => (address ? [address] : undefined),
    [address],
  );
  const shipIdsResult = useShipsRead("getShipIdsOwned", shipIdsArgs);

  const shipsDataArgs = useMemo(
    () => (shipIdsResult.data ? [shipIdsResult.data] : undefined),
    [shipIdsResult.data],
  );
  const shipsDataResult = useShipsRead("getShipsByIds", shipsDataArgs);

  const prevChainIdRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevChainIdRef.current;
    prevChainIdRef.current = activeChainId;
    if (prev === null || prev === activeChainId) return;
    void shipIdsResult.refetch();
    void shipsDataResult.refetch();
  }, [activeChainId, shipIdsResult.refetch, shipsDataResult.refetch]);

  const ownedIdsKey = useMemo(() => {
    const raw = shipIdsResult.data as bigint[] | undefined;
    if (!raw?.length) return "";
    return [...raw]
      .map((id) => id.toString())
      .sort((a, b) => a.localeCompare(b))
      .join(",");
  }, [shipIdsResult.data]);

  // When owned ship IDs change (claim, recycle, purchase), `getShipsByIds` often
  // still has the previous ID list in its query key until React re-renders. Refetch
  // ship details after the ID list key changes so new hulls always load.
  const refetchShipsByIds = shipsDataResult.refetch;
  useEffect(() => {
    if (!ownedIdsKey) return;
    const prev = baselineOwnedIdsKeyRef.current;
    if (prev === null) {
      baselineOwnedIdsKeyRef.current = ownedIdsKey;
      return;
    }
    if (prev === ownedIdsKey) return;
    baselineOwnedIdsKeyRef.current = ownedIdsKey;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) void refetchShipsByIds();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [ownedIdsKey, refetchShipsByIds]);

  // Cache ship data when it's fetched
  useEffect(() => {
    if (shipsDataResult.data && Array.isArray(shipsDataResult.data)) {
      const ships = shipsDataResult.data as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [shipsDataResult.data]);

  // Combine loading states
  const isLoading = shipIdsResult.isLoading || shipsDataResult.isLoading;

  // Combine errors
  const error = shipIdsResult.error || shipsDataResult.error;

  // Refetch IDs first, then ship rows. Same-ID updates (construct, attribute sync)
  // are served by the second refetch. New IDs rely on `ownedIdsKey` effect above.
  const refetch = useCallback(async () => {
    await shipIdsResult.refetch();
    await shipsDataResult.refetch();
    setTimeout(() => {
      void shipsDataResult.refetch();
    }, REFETCH_DEBOUNCE_MS);
    setTimeout(() => {
      void shipsDataResult.refetch();
    }, REFETCH_RETRY_MS);
  }, [shipIdsResult.refetch, shipsDataResult.refetch]);

  return {
    shipIds: (shipIdsResult.data as bigint[]) || [],
    ships: (shipsDataResult.data as Ship[]) || [],
    isLoading,
    error,
    refetch,
    hasShips: shipIdsResult.data
      ? (shipIdsResult.data as bigint[]).length > 0
      : false,
    shipCount: shipIdsResult.data ? (shipIdsResult.data as bigint[]).length : 0,
  };
}

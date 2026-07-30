"use client";

import { useEffect, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES_BY_CHAIN_ID,
  getContractAddresses,
} from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const SHIPS_ABI = CONTRACT_ABIS.SHIPS as Abi;
const SHIPS_ROUTER_ABI = CONTRACT_ABIS.SHIPS_ROUTER as Abi;
const SHIPS_ROUTER_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .SHIPS_ROUTER as `0x${string}`;

// Fetches full Ship data for an arbitrary list of ship ids appearing in a
// live game (both sides' fleets). Ships.getShipsByIds is a batch call, but
// ShipsRouter (needed on Base Sepolia so AI ship ids resolve correctly —
// see docs/singleplayer-frontend-integration.md) only exposes a singular
// getShip(id); useReadContracts batches N single calls into one multicall,
// so this is still one network round-trip either way.
export function useShipsByIds(shipIds: bigint[]) {
  const activeChainId = useSelectedChainId();

  // ShipsRouter.getShip transparently resolves both human (Ships.sol) and
  // AI (AIShips.sol) ship ids by id range — single-player only exists on
  // Base Sepolia, so that's the only chain where an id might be AI-owned
  // and the only chain ShipsRouter is deployed on. Elsewhere (PvP-only,
  // every id is a human NFT) plain Ships.sol is correct and there's no
  // router to use anyway.
  const useRouter =
    activeChainId === baseSepolia.id && SHIPS_ROUTER_ADDRESS !== ZERO_ADDRESS;
  const shipsAddress = getContractAddresses(activeChainId).SHIPS as `0x${string}`;
  const address = useRouter ? SHIPS_ROUTER_ADDRESS : shipsAddress;
  const abi = useRouter ? SHIPS_ROUTER_ABI : SHIPS_ABI;

  const contracts = useMemo(
    () =>
      shipIds.map((id) => ({
        address,
        abi,
        chainId: activeChainId,
        functionName: "getShip" as const,
        args: [id] as const,
      })),
    [shipIds, address, abi, activeChainId],
  );

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: { enabled: shipIds.length > 0 },
  });

  const ships = useMemo(
    () =>
      (data ?? [])
        .map((r) => r.result)
        .filter((s): s is Ship => s != null) as Ship[],
    [data],
  );

  // cacheShipsData itself skips AI ship ids (pooled/reused across matches —
  // see useShipDataCache.ts for why caching those long-term is wrong, not
  // just wasteful).
  useEffect(() => {
    if (ships.length > 0) cacheShipsData(ships);
  }, [ships]);

  return {
    ships,
    isLoading,
    error,
    refetch,
  };
}

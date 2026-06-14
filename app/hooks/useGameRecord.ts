"use client";

import { useReadContract } from "wagmi";
import { useMemo, useState, useEffect } from "react";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { hexToBase64url, deserializeBlob } from "../utils/walrus";
import type { GameRecord } from "../types/types";

const GAME_BLOB_REGISTRY_ABI = CONTRACT_ABIS.GAME_BLOB_REGISTRY as Abi;
const GAME_BLOB_REGISTRY_ADDRESS =
  CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id].GAME_BLOB_REGISTRY;
const ZERO_HEX =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** Fetches a completed game's archive blob from on-chain GameBlobRegistry. */
export function useGameRecord(gameId: bigint | null, player: `0x${string}` | undefined) {
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: blobIdHex } = useReadContract({
    address: GAME_BLOB_REGISTRY_ADDRESS,
    abi: GAME_BLOB_REGISTRY_ABI,
    functionName: "getBlob",
    args: gameId !== null && player ? [gameId, player] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: gameId !== null && !!player },
  });

  const rawBlobId = useMemo(() => {
    if (!blobIdHex || blobIdHex === ZERO_HEX) return null;
    return hexToBase64url(blobIdHex as `0x${string}`);
  }, [blobIdHex]);

  useEffect(() => {
    if (!rawBlobId) { setRecord(null); return; }
    setLoading(true);
    setError(null);
    fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${rawBlobId}`)
      .then((r) => r.text())
      .then((text) => { setRecord(deserializeBlob<GameRecord>(text)); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => setLoading(false));
  }, [rawBlobId]);

  return { record, loading, error, rawBlobId };
}

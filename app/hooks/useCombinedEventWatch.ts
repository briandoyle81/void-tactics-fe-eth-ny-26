"use client";

import { useEffect, useRef } from "react";
import { usePublicClient } from "wagmi";
import type { Abi, AbiEvent, Log } from "viem";

/** An event ABI from a contract ABI, by name. Throws if the ABI lacks it. */
export function eventAbi(abi: Abi, name: string): AbiEvent {
  const event = abi.find((item): item is AbiEvent => item.type === "event" && item.name === name);
  if (!event) throw new Error(`Event ${name} missing from ABI`);
  return event;
}

/** A log as delivered here: decoded, with its event name and args. */
export type DecodedLog = Log & { eventName?: string; args?: Record<string, unknown> };

/**
 * Watches several events across one or more contracts with a single
 * eth_getLogs (or filter) poll, instead of one watcher — and one RPC
 * request per poll — per event. The handler is read through a ref, so
 * passing a new function doesn't restart the watcher (which would create a
 * new filter each time). `events` and `addresses` should be stable
 * (module-level constants or memoized).
 */
export function useCombinedEventWatch({
  chainId,
  addresses,
  events,
  enabled,
  pollingInterval,
  onLogs,
}: {
  chainId: number;
  addresses: readonly `0x${string}`[];
  events: readonly AbiEvent[];
  enabled: boolean;
  pollingInterval: number;
  onLogs: (logs: DecodedLog[]) => void;
}) {
  const client = usePublicClient({ chainId });
  const onLogsRef = useRef(onLogs);
  onLogsRef.current = onLogs;
  const addressesKey = addresses.join(",");
  useEffect(() => {
    if (!client || !enabled || addressesKey.length === 0 || events.length === 0) return;
    return client.watchEvent({
      address: addressesKey.split(",") as `0x${string}`[],
      events,
      poll: true,
      pollingInterval,
      onLogs: (logs) => onLogsRef.current(logs as unknown as DecodedLog[]),
      onError: (error) => console.warn("Contract event poll failed:", error),
    });
  }, [client, enabled, pollingInterval, addressesKey, events]);
}

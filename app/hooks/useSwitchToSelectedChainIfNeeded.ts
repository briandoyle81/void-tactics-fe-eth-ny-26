"use client";

import { useCallback } from "react";

/** No-op: chain switching removed with wagmi. */
export function useSwitchToSelectedChainIfNeeded() {
  return useCallback(async () => {}, []);
}

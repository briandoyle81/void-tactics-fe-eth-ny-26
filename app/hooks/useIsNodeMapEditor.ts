"use client";

import { useAccount, useReadContract } from "wagmi";
import { useNodeMapContract } from "./useNodeMap";

// NodeMap has its own on-chain, multi-address editor permission system
// (isNodeEditor/setNodeEditor) — separate from MAP_ADMIN_ADDRESS (map
// geometry) and AIEncounters' isEncounterEditor (enemy fleet configs).
// Don't conflate the three.
export function useIsNodeMapEditor() {
  const { address } = useAccount();
  const contract = useNodeMapContract();

  const result = useReadContract({
    ...contract,
    functionName: "isNodeEditor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return { isEditor: result.data === true, isLoading: result.isLoading };
}

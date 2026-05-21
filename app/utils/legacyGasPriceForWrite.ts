import type { PublicClient } from "viem";
import {
  applyLegacyGasPriceFloor,
  isRoninSaigonChain,
  isFlowTestnetChain,
  FLOW_TESTNET_BLOCK_GAS_CAP,
} from "../config/networks";

/** Optional `gasPrice`/`gas` overrides for wagmi `writeContract` based on chain quirks. */
export async function getLegacyGasPriceOverridesForWrite(
  chainId: number,
  publicClient: Pick<PublicClient, "getGasPrice"> | null | undefined,
): Promise<{ gasPrice?: bigint; gas?: bigint }> {
  const overrides: { gasPrice?: bigint; gas?: bigint } = {};

  if (publicClient && isRoninSaigonChain(chainId)) {
    const quoted = await publicClient.getGasPrice();
    overrides.gasPrice = applyLegacyGasPriceFloor(chainId, quoted);
  }

  if (isFlowTestnetChain(chainId)) {
    overrides.gas = FLOW_TESTNET_BLOCK_GAS_CAP;
  }

  return overrides;
}

/** +50% over network quote, with Ronin Saigon minimum applied. */
export function bumpedLegacyGasPriceForRetry(
  chainId: number,
  baseGasPriceWei: bigint,
): bigint {
  return applyLegacyGasPriceFloor(chainId, (baseGasPriceWei * 3n) / 2n);
}

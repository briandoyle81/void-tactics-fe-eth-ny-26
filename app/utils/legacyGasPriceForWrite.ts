// Stub: wagmi gas price overrides removed in REST backend migration.

/** @deprecated Blockchain writes removed. Always returns empty overrides. */
export async function getLegacyGasPriceOverridesForWrite(
  _chainId: number,
  _publicClient: unknown,
): Promise<{ gasPrice?: bigint; gas?: bigint }> {
  return {};
}

/** @deprecated Blockchain writes removed. Returns zero. */
export function bumpedLegacyGasPriceForRetry(
  _chainId: number,
  _baseGasPriceWei: bigint,
): bigint {
  return 0n;
}

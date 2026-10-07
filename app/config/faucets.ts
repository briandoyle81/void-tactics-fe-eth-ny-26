// Testnet faucets per chain id, for the HUD's native-token pill and
// Store › Credits.
export const FAUCET_URLS: Record<number, string> = {
  545: "https://faucet.flow.com/fund-account",
  84532: "https://thirdweb.com/base-sepolia-testnet",
  2021: "https://faucet.roninchain.com/",
  37714555429: "https://faucet.quicknode.com/xai",
};

export function getFaucetUrl(chainId: number): string {
  return FAUCET_URLS[chainId] ?? FAUCET_URLS[545]!;
}

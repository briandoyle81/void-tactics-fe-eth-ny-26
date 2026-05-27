// networks.ts — stub for REST architecture (no wagmi/viem chain management)

export interface ChainLike {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  testnet?: boolean;
}

// Minimal chain definitions (no longer used for wagmi, kept for reference)
export const flowTestnet: ChainLike = {
  id: 747,
  name: "Flow Testnet",
  nativeCurrency: { name: "Flow", symbol: "FLOW", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.evm.nodes.onflow.org"] } },
  testnet: true,
};

export const saigon: ChainLike = {
  id: 2020,
  name: "Ronin Saigon",
  nativeCurrency: { name: "Ronin", symbol: "RON", decimals: 18 },
  rpcUrls: { default: { http: ["https://saigon-testnet.roninchain.com/rpc"] } },
  testnet: true,
};

export const baseSepolia: ChainLike = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  testnet: true,
};

export const xaiTestnet: ChainLike = {
  id: 37714555429,
  name: "Xai Testnet v2",
  nativeCurrency: { name: "Xai", symbol: "sXAI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-v2.xai-chain.net/rpc"] },
  },
  testnet: true,
};

export const SUPPORTED_CHAINS = [flowTestnet, saigon, baseSepolia, xaiTestnet] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const DEFAULT_CHAIN_ID: number = flowTestnet.id;

const CHAIN_IDS_SELECTABLE_IN_UI = new Set<number>([
  flowTestnet.id,
  saigon.id,
  baseSepolia.id,
  xaiTestnet.id,
]);

export function isChainSelectableInUi(chainId: number): boolean {
  return CHAIN_IDS_SELECTABLE_IN_UI.has(chainId);
}

export const SELECTED_CHAIN_ID_STORAGE_KEY = "void-tactics.selectedChainId";

/** Dispatched when the app-selected chain id in localStorage changes. */
export const VOID_TACTICS_CHAIN_CHANGED_EVENT = "void-tactics-chain-changed";

export function isSupportedChainId(chainId: number | undefined | null): boolean {
  if (chainId == null) return false;
  return SUPPORTED_CHAINS.some((c) => c.id === chainId);
}

export function getSelectedChainId(): number {
  if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
  const raw = window.localStorage.getItem(SELECTED_CHAIN_ID_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_CHAIN_ID;
  if (!isSupportedChainId(parsed)) return DEFAULT_CHAIN_ID;
  if (!isChainSelectableInUi(parsed)) return DEFAULT_CHAIN_ID;
  return parsed;
}

export function setSelectedChainId(chainId: number) {
  if (typeof window === "undefined") return;
  const next = isChainSelectableInUi(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const prevRaw = window.localStorage.getItem(SELECTED_CHAIN_ID_STORAGE_KEY);
  const prevParsed = prevRaw ? Number(prevRaw) : NaN;
  const prev = Number.isFinite(prevParsed) ? prevParsed : null;
  window.localStorage.setItem(SELECTED_CHAIN_ID_STORAGE_KEY, String(next));
  if (prev !== next) {
    window.dispatchEvent(
      new CustomEvent(VOID_TACTICS_CHAIN_CHANGED_EVENT, {
        detail: { chainId: next },
      }),
    );
  }
}

export function getChainById(chainId: number | undefined | null): SupportedChain {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  return (
    (SUPPORTED_CHAINS.find((c) => c.id === id) as SupportedChain | undefined) ??
    flowTestnet
  );
}

export function getNativeTokenSymbol(chainId: number | undefined | null): string {
  const chain = getChainById(chainId);
  if (chain.id === saigon.id) return "RON";
  return (chain.nativeCurrency?.symbol ?? "FLOW").toUpperCase();
}

export const RONIN_SAIGON_MIN_GAS_PRICE_WEI = 20n * 10n ** 9n;

export function isRoninSaigonChain(chainId: number): boolean {
  return chainId === saigon.id;
}

export function isFlowTestnetChain(chainId: number): boolean {
  return chainId === flowTestnet.id;
}

export const FLOW_TESTNET_BLOCK_GAS_CAP = 16_000_000n;

export function applyLegacyGasPriceFloor(chainId: number, gasPriceWei: bigint): bigint {
  if (isRoninSaigonChain(chainId) && gasPriceWei < RONIN_SAIGON_MIN_GAS_PRICE_WEI) {
    return RONIN_SAIGON_MIN_GAS_PRICE_WEI;
  }
  return gasPriceWei;
}

const CHAIN_VARIANT_BY_CHAIN_ID: Record<number, number> = {
  [flowTestnet.id]: 1,
  [saigon.id]: 1,
  [baseSepolia.id]: 1,
  [xaiTestnet.id]: 1,
};

export function getVariantForChainId(chainId: number | undefined | null): number {
  if (chainId == null) return CHAIN_VARIANT_BY_CHAIN_ID[DEFAULT_CHAIN_ID] ?? 1;
  return CHAIN_VARIANT_BY_CHAIN_ID[chainId] ?? (CHAIN_VARIANT_BY_CHAIN_ID[DEFAULT_CHAIN_ID] ?? 1);
}

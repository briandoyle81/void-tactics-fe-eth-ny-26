import { prisma } from "./prisma";
import { createTtlCache } from "./ttlCache";

export type KillRewardToken = "DEC" | "UTC";

export type EconomyConfig = {
  recycleRewardUtc: number;
  // Paid per kill when the destroyed ship belongs to a human opponent (PvP)
  // — currency depends on the *victim's* ownership for this direction, never
  // the ship's variant (docs/faction-2.md §1).
  killRewardUtc: number;
  // AI-kill reward, keyed by the *destroyed* ship's variant — mirrors
  // FactionRewardTokenRegistry.rewardToken(variant) on-chain (see
  // docs/update/Frontend_Updates_2026-09-17.md §2). A variant with no entry
  // here pays nothing, mirroring the contract's RewardSkipped event. Only
  // applies to AI-owned-ship-destroyed kills; PvP always pays killRewardUtc
  // regardless of variant.
  killRewardByVariant: Record<number, { token: KillRewardToken; amount: number }>;
  lobbyCreationCostUtc: number;
  reservationFeeUtc: number; // extra UTC charged when reserving a lobby for a specific player — matches web3's fixed 1 UTC reservation fee
  purchaseThresholdForRewards: number;
  freeGamesPerAddress: number; // how many lobby creations are free per user
};

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  recycleRewardUtc: 1,
  killRewardUtc: 1,
  // Matches today's live FactionRewardTokenRegistry config on Base Sepolia:
  // variant 2 -> DEC, variant 1 (and anything else unregistered) -> no reward.
  killRewardByVariant: {
    2: { token: "DEC", amount: 1 },
  },
  lobbyCreationCostUtc: 1,
  reservationFeeUtc: 1,
  purchaseThresholdForRewards: 10,
  freeGamesPerAddress: 1,
};

const cache = createTtlCache<EconomyConfig>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "economy_config" } });
  if (!row) return DEFAULT_ECONOMY_CONFIG;
  const stored = row.value as Partial<EconomyConfig>;
  return { ...DEFAULT_ECONOMY_CONFIG, ...stored };
}, 30_000);

export const getEconomyConfig = cache.get;

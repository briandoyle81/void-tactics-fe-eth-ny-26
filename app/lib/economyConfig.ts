import { prisma } from "./prisma";

export type EconomyConfig = {
  recycleRewardUtc: number;
  killRewardUtc: number;
  lobbyCreationCostUtc: number;
  purchaseThresholdForRewards: number;
  freeGamesPerAddress: number; // how many lobby creations are free per user
};

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  recycleRewardUtc: 1,
  killRewardUtc: 1,
  lobbyCreationCostUtc: 1,
  purchaseThresholdForRewards: 10,
  freeGamesPerAddress: 1,
};

export async function getEconomyConfig(): Promise<EconomyConfig> {
  const row = await prisma.config.findUnique({ where: { key: "economy_config" } });
  if (!row) return DEFAULT_ECONOMY_CONFIG;
  const stored = row.value as Partial<EconomyConfig>;
  return { ...DEFAULT_ECONOMY_CONFIG, ...stored };
}

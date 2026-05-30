import { prisma } from "./prisma";

export const AI_USER_ID = "ai-player-void-tactics";

export async function ensureAiUser(): Promise<void> {
  await prisma.user.upsert({
    where: { id: AI_USER_ID },
    update: {},
    create: {
      id: AI_USER_ID,
      email: "ai@void-tactics.internal",
      username: "AI Opponent",
    },
  });
}

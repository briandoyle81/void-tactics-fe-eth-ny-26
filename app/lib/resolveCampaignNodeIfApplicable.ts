import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";

// Web2 counterpart to NodeMap.recordCompletion — called from every path
// that finalizes a Game (score win, flee, timeout), same seam as
// resolveTournamentMatchIfApplicable. Only a human win records completion
// (matches web3: recordCompletion is only ever called on a player win, not
// on the AI winning or a draw).
export async function resolveCampaignNodeIfApplicable(
  lobbyId: number,
  winnerId: string,
): Promise<void> {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    select: { campaignNodeId: true },
  });
  if (!lobby?.campaignNodeId || winnerId === AI_USER_ID) return;

  await prisma.campaignNodeCompletion.upsert({
    where: { userId_nodeId: { userId: winnerId, nodeId: lobby.campaignNodeId } },
    update: {},
    create: { userId: winnerId, nodeId: lobby.campaignNodeId },
  });
}

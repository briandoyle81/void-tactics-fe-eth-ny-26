import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import { applyWinEffects, getWinEffectsSettings } from "./winEffectsWeb2";

// Web2 counterpart to PvPMatch.onWin. Web3 has a separate PvP-only
// PvPMatch contract, so its setWinEffects list only ever fires for a
// genuine human-vs-human match. Web2 has one shared Game model for every
// mode, so this checks the lobby wasn't AI/campaign/roguelike/tournament
// before applying the global "pvpWinEffects" list — those contexts have
// their own win-effect resolvers (resolveRoguelikeRunIfApplicable.ts / the
// tournament finalize route). Called from the same three seams as
// resolveTournamentMatchIfApplicable/resolveCampaignNodeIfApplicable/
// resolveRoguelikeRunIfApplicable (score win, flee, timeout).
export async function applyPvpWinEffectsIfApplicable(lobbyId: number, winnerId: string): Promise<void> {
  if (winnerId === AI_USER_ID) return;

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    select: {
      isAiGame: true,
      campaignNodeId: true,
      roguelikeRunId: true,
      tournamentMatch: { select: { id: true } },
    },
  });
  if (
    !lobby ||
    lobby.isAiGame ||
    lobby.campaignNodeId != null ||
    lobby.roguelikeRunId != null ||
    lobby.tournamentMatch
  ) {
    return;
  }

  const settings = await getWinEffectsSettings();
  await applyWinEffects(settings.pvpWinEffects, winnerId);
}

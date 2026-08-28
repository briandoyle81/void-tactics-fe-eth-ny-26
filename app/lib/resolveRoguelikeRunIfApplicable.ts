import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import type { Web2GameDataView } from "../types/web2Game";

// Web2 counterpart to RoguelikeMatch.onGameEnded — called from every path
// that finalizes a Game (score win, flee, timeout), same seam as
// resolveTournamentMatchIfApplicable/resolveCampaignNodeIfApplicable.
//
// On a human win: persists each surviving roster ship's final damage back
// onto RoguelikeRosterShip.hp (0 = undamaged, matching the on-chain
// getShipHP convention — see the field's doc-comment in schema.prisma),
// applies the campaign's autoHealPercent on top, and records the node as
// defeated (gates re-entry via a twoWay back-edge). A ship whose hullPoints
// reached 0 this mission is treated as maximally damaged rather than
// permanently removed from the roster — a deliberate simplification versus
// full on-chain permadeath semantics (see the "deliberately simpler first
// slice" precedent in GameDisplayWeb2.tsx), repairable at the next
// Resupply node like any other damage.
//
// On a human loss: ends the run and releases the roster (Ship.inFleet =
// false) — a run does not survive a lost combat node.
export async function resolveRoguelikeRunIfApplicable(
  lobbyId: number,
  winnerId: string,
): Promise<void> {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    select: { roguelikeRunId: true },
  });
  if (!lobby?.roguelikeRunId) return;

  const run = await prisma.roguelikeRun.findUnique({
    where: { id: lobby.roguelikeRunId },
    include: { campaign: true, roster: true },
  });
  if (!run || run.status !== "ACTIVE") return;

  if (winnerId === AI_USER_ID) {
    await prisma.$transaction([
      prisma.roguelikeRun.update({
        where: { id: run.id },
        data: { status: "ENDED", endedAt: new Date(), activeLobbyId: null },
      }),
      prisma.ship.updateMany({
        where: { id: { in: run.roster.map((r) => r.shipId) } },
        data: { inFleet: false },
      }),
    ]);
    return;
  }

  const game = await prisma.game.findUnique({ where: { lobbyId }, select: { state: true } });
  const state = game?.state as unknown as Web2GameDataView | undefined;
  const finalHullByShipId = new Map<number, { hullPoints: number; maxHullPoints: number }>();
  state?.shipIds.forEach((shipId, i) => {
    const attrs = state.shipAttributes[i];
    if (attrs) finalHullByShipId.set(shipId, attrs);
  });

  const autoHeal = run.campaign.autoHealPercent;
  await prisma.$transaction([
    ...run.roster.map((entry) => {
      const finalHull = finalHullByShipId.get(entry.shipId);
      const damage = finalHull ? Math.max(0, finalHull.maxHullPoints - finalHull.hullPoints) : entry.hp;
      const healed = autoHeal > 0 ? Math.round(damage * (1 - autoHeal / 100)) : damage;
      return prisma.roguelikeRosterShip.update({
        where: { id: entry.id },
        data: { hp: Math.max(0, healed) },
      });
    }),
    prisma.roguelikeNodeDefeat.upsert({
      where: { runId_nodeId: { runId: run.id, nodeId: run.currentNodeId } },
      update: {},
      create: { runId: run.id, nodeId: run.currentNodeId },
    }),
    prisma.roguelikeRun.update({
      where: { id: run.id },
      data: { activeLobbyId: null },
    }),
  ]);
}

import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import { applyWinEffects, getWinEffectsSettings } from "./winEffectsWeb2";
import { hullAfterRoguelikeWin } from "./roguelikeHeal";
import type { Web2GameDataView } from "../types/web2Game";

// Web2 counterpart to RoguelikeMatch.onGameEnded — called from every path
// that finalizes a Game (score win, flee, timeout), same seam as
// resolveTournamentMatchIfApplicable/resolveCampaignNodeIfApplicable.
//
// On a human win: persists each surviving roster ship's final damage back
// onto RoguelikeRosterShip.hp (stored as damage taken, 0 = undamaged — see
// the field's doc-comment in schema.prisma), applies the heal floors, and
// records the node as defeated (gates re-entry via a twoWay back-edge).
//
// Heal floors match the contracts exactly (RoguelikeMatch.onGameEnded and
// HealAboveFloorWinEffect.onWin): each ship is raised to at least
// floor(maxHull * percent / 100) and never lowered; a ship left at 0 hull
// carries forward at 1. The campaign's autoHealPercent always applies, then
// the node's Heal Above Floor win effect (if assigned) raises the floor to
// its own percent. One difference: the contract pins autoHealPercent when
// the node is entered; web2 reads the live campaign value. A ship whose hullPoints
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

  const node = await prisma.roguelikeNode.findUnique({
    where: { id: run.currentNodeId },
    select: { winEffects: true },
  });
  const winEffects = node?.winEffects ?? [];
  const healAboveFloorPercent = winEffects.includes("HEAL_ABOVE_FLOOR_WIN_EFFECT")
    ? (await getWinEffectsSettings()).healAboveFloorPercent
    : 0;
  const autoHeal = run.campaign.autoHealPercent;

  await prisma.$transaction([
    ...run.roster.flatMap((entry) => {
      const finalHull = finalHullByShipId.get(entry.shipId);
      // No final attributes for this ship: keep its stored damage untouched.
      if (!finalHull) return [];
      const hull = hullAfterRoguelikeWin({
        hullPoints: finalHull.hullPoints,
        maxHullPoints: finalHull.maxHullPoints,
        autoHealPercent: autoHeal,
        healAboveFloorPercent,
      });
      return [
        prisma.roguelikeRosterShip.update({
          where: { id: entry.id },
          data: { hp: finalHull.maxHullPoints - hull },
        }),
      ];
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

  // Heal Above Floor was applied above; applyWinEffects handles the rest.
  await applyWinEffects(winEffects, winnerId);
}

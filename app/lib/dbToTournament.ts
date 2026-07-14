import { Web2TournamentState, type Web2Tournament } from "../types/web2Tournament";
import type { Tournament, TournamentState } from "../generated/prisma";

const STATE_MAP: Record<TournamentState, Web2TournamentState> = {
  REGISTRATION: Web2TournamentState.Registration,
  ACTIVE: Web2TournamentState.Active,
  COMPLETE: Web2TournamentState.Complete,
  CANCELLED: Web2TournamentState.Cancelled,
};

export function dbTournamentToWeb2(db: Tournament, registrantCount: number): Web2Tournament {
  return {
    config: {
      entryFee: db.entryFee,
      minPlayers: db.minPlayers,
      maxPlayers: db.maxPlayers,
      registerBy: db.registerBy.getTime(),
      costLimit: db.costLimit,
      turnTimeSeconds: db.turnTimeSeconds,
      selectedMapId: db.selectedMapId,
      maxScore: db.maxScore,
    },
    summary: {
      id: db.id,
      creator: db.creatorId,
      state: STATE_MAP[db.state],
      prizePool: db.prizePool,
      registrantCount,
      totalRounds: db.totalRounds,
      championId: db.championId,
      runnerUpId: db.runnerUpId,
      createdAt: db.createdAt.getTime(),
      startedAt: db.startedAt ? db.startedAt.getTime() : null,
      completedAt: db.completedAt ? db.completedAt.getTime() : null,
    },
  };
}

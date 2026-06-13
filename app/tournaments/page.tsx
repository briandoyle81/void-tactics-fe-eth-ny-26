"use client";

import { useTournamentList } from "../hooks/useTournamentList";
import { TournamentCard } from "../components/TournamentCard";
import { TournamentState } from "../types/types";

export default function TournamentsPage() {
  const { tournaments, isLoading } = useTournamentList();

  const active = tournaments.filter(
    (t) => t.state === TournamentState.Registration || t.state === TournamentState.Active,
  );
  const completed = tournaments.filter(
    (t) => t.state === TournamentState.Complete || t.state === TournamentState.Cancelled,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-mono">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-wider text-phosphor-green">TOURNAMENTS</h1>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-xs text-text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
          Loading tournaments…
        </div>
      )}

      {!isLoading && tournaments.length === 0 && (
        <p className="py-8 text-center text-xs text-text-muted">No tournaments yet.</p>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-text-muted">
            Active
          </div>
          <div className="flex flex-col gap-3">
            {active.map((t) => (
              <TournamentCard key={String(t.tournamentId)} tournamentId={t.tournamentId} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <div className="mb-3 text-[10px] uppercase tracking-widest text-text-muted">
            Completed
          </div>
          <div className="flex flex-col gap-3">
            {completed.map((t) => (
              <TournamentCard key={String(t.tournamentId)} tournamentId={t.tournamentId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

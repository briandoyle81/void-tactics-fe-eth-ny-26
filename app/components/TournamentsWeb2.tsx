"use client";

import { useState, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useTournamentListWeb2 } from "../hooks/useTournamentListWeb2";
import { useTournamentWeb2 } from "../hooks/useTournamentWeb2";
import { useTournamentActionsWeb2, type CreateTournamentParamsWeb2 } from "../hooks/useTournamentActionsWeb2";
import { TournamentCardWeb2 } from "./TournamentCardWeb2";
import { TournamentRegisterWeb2 } from "./TournamentRegisterWeb2";
import { TournamentBracketWeb2 } from "./TournamentBracketWeb2";
import { TournamentAdminPanelWeb2 } from "./TournamentAdminPanelWeb2";
import { Web2TournamentState, type Web2Tournament } from "../types/web2Tournament";
import {
  IMMEDIATE_GAME_TURN_SECONDS,
  CORRESPONDENCE_GAME_TURN_SECONDS,
  SKIRMISH_THREAT_LIMIT,
  BATTLE_THREAT_LIMIT,
  SHORT_MAX_SCORE,
  MEDIUM_MAX_SCORE,
  LONG_MAX_SCORE,
} from "../utils/lobbyFormatters";

// Web2-mode counterpart to `Tournaments.tsx`. Same single-elimination
// lifecycle (create → register → start/bracket-generate → play each match
// through the normal Lobby/Fleet/Game pipeline → finalize/payout), backed
// by the Prisma tournament tables instead of the on-chain Tournament
// contract. Sybil resistance is "one registration per Google account"
// instead of a World ID proof; entry fee/prize pool are in-app credits
// instead of ETH, paid out directly on finalize instead of via a
// pull-based claim step (see TournamentRegisterWeb2/the API routes).

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

const STATE_LABELS: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "REGISTRATION",
  [Web2TournamentState.Active]: "ACTIVE",
  [Web2TournamentState.Complete]: "COMPLETE",
  [Web2TournamentState.Cancelled]: "CANCELLED",
};
const STATE_COLORS: Record<Web2TournamentState, string> = {
  [Web2TournamentState.Registration]: "text-cyan border-cyan",
  [Web2TournamentState.Active]: "text-phosphor-green border-phosphor-green",
  [Web2TournamentState.Complete]: "text-text-muted border-gunmetal",
  [Web2TournamentState.Cancelled]: "text-warning-red border-warning-red",
};

// ─── Detail view ─────────────────────────────────────────────────────────────

function TournamentDetail({ tournamentId, onBack }: { tournamentId: number; onBack: () => void }) {
  const { userId, isLoggedIn } = useCurrentUser();
  const { tournament, isLoading, refetch } = useTournamentWeb2(tournamentId);
  const actions = useTournamentActionsWeb2();
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setActionPending(true);
      setActionError(null);
      try {
        await fn();
        void refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setActionPending(false);
      }
    },
    [refetch],
  );

  if (isLoading || !tournament) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs text-text-muted font-mono">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
        Loading…
      </div>
    );
  }

  const { config, summary, bracket, registrants, isRegistered } = tournament;
  const stateLabel = STATE_LABELS[summary.state] ?? "UNKNOWN";
  const stateColor = STATE_COLORS[summary.state] ?? "text-text-muted border-gunmetal";

  return (
    <div className="font-mono">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
          ← Back
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-bold text-text-secondary">Tournament #{tournamentId}</span>
          <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${stateColor}`}>{stateLabel}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs mb-5 pb-4 border-b border-gunmetal/40">
        {summary.prizePool > 0 && (
          <div>
            <span className="text-text-muted">Prize </span>
            <span className="text-phosphor-green font-bold">{summary.prizePool} credits</span>
          </div>
        )}
        <div>
          <span className="text-text-muted">Players </span>
          <span className="text-text-secondary">
            {summary.registrantCount}/{config.maxPlayers}
          </span>
        </div>
        {config.entryFee > 0 && (
          <div>
            <span className="text-text-muted">Entry </span>
            <span className="text-text-secondary">{config.entryFee} credits</span>
          </div>
        )}
        <div>
          <span className="text-text-muted">Creator </span>
          <span className="text-text-secondary">{truncateId(summary.creator)}</span>
        </div>
      </div>

      <div className="mb-5">
        <TournamentRegisterWeb2
          tournamentId={tournamentId}
          config={config}
          summary={summary}
          isRegistered={isRegistered}
          isLoggedIn={isLoggedIn}
          onSuccess={() => void refetch()}
        />
      </div>

      {summary.state === Web2TournamentState.Registration && (
        <div className="mb-5">
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.start(tournamentId))}
            className="border border-gunmetal/60 px-4 py-2 text-xs text-text-muted hover:border-steel hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            {actionPending ? "Starting…" : "Start Tournament"}
          </button>
          <p className="mt-1 text-[10px] text-text-muted">
            Any registrant (or the creator) can start once conditions are met (full roster or past deadline + min players).
          </p>
        </div>
      )}

      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Bracket</div>
        <TournamentBracketWeb2 bracket={bracket} />
      </div>

      <div className="mb-5">
        <TournamentAdminPanelWeb2
          tournamentId={tournamentId}
          currentUserId={userId}
          summary={summary}
          bracket={bracket}
          onAction={() => void refetch()}
        />
      </div>

      {summary.state === Web2TournamentState.Registration && userId === summary.creator && (
        <div className="mb-4 border border-gunmetal/60 p-4">
          <div className="text-xs text-text-muted mb-2">Cancel this tournament and refund all registrants.</div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.cancel(tournamentId))}
            className="border border-warning-red/50 py-2 px-4 text-xs text-warning-red hover:bg-warning-red/5 transition-colors disabled:opacity-50"
          >
            {actionPending ? "Cancelling…" : "Cancel Tournament"}
          </button>
        </div>
      )}

      {summary.state === Web2TournamentState.Complete && summary.championId && (
        <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-phosphor-green/60 mb-1">Champion</div>
          <div className="text-phosphor-green font-bold">{truncateId(summary.championId)}</div>
          {summary.runnerUpId && (
            <div className="text-xs text-text-muted mt-1">Runner-up: {truncateId(summary.runnerUpId)}</div>
          )}
        </div>
      )}

      <p className="mt-4 text-[10px] text-text-muted">{registrants.length} registered</p>

      {actionError && <p className="text-xs text-warning-red mt-2 break-words">{actionError}</p>}
    </div>
  );
}

// ─── Create form ─────────────────────────────────────────────────────────────

interface CreateForm {
  entryFee: string;
  maxPlayers: "2" | "4" | "8" | "16";
  hoursUntilDeadline: number;
  threatScale: "skirmish" | "battle";
  turnPace: "immediate" | "correspondence";
  gameLength: "short" | "medium" | "long";
}

function OptionCard({ checked, onSelect, title, sub }: { checked: boolean; onSelect: () => void; title: string; sub: string }) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-start gap-3 border p-3 transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan ${
        checked ? "border-cyan bg-cyan/5" : "border-gunmetal bg-black/40 hover:border-steel"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onSelect} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan" />
      <span>
        <span className={`block font-mono font-bold ${checked ? "text-cyan" : "text-text-secondary"}`}>{title}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{sub}</span>
      </span>
    </label>
  );
}

const DEADLINE_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "4h", hours: 4 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "7d", hours: 168 },
] as const;

const MAX_PLAYER_OPTIONS = ["2", "4", "8", "16"] as const;

function CreateTournament({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => Promise<unknown> }) {
  const actions = useTournamentActionsWeb2();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>({
    entryFee: "",
    maxPlayers: "4",
    hoursUntilDeadline: 24,
    threatScale: "battle",
    turnPace: "immediate",
    gameLength: "medium",
  });

  const patch = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setError(null);
    setPending(true);
    try {
      const maxPlayers = parseInt(form.maxPlayers, 10);
      const minPlayers = Math.max(2, Math.floor(maxPlayers / 2));
      const registerBy = Date.now() + Math.round(form.hoursUntilDeadline * 3_600_000);
      const entryFee = form.entryFee && parseInt(form.entryFee, 10) > 0 ? parseInt(form.entryFee, 10) : 0;
      const costLimit = form.threatScale === "skirmish" ? SKIRMISH_THREAT_LIMIT : BATTLE_THREAT_LIMIT;
      const turnTimeSeconds = form.turnPace === "immediate" ? IMMEDIATE_GAME_TURN_SECONDS : CORRESPONDENCE_GAME_TURN_SECONDS;
      const maxScore = form.gameLength === "short" ? SHORT_MAX_SCORE : form.gameLength === "long" ? LONG_MAX_SCORE : MEDIUM_MAX_SCORE;

      const params: CreateTournamentParamsWeb2 = {
        entryFee,
        minPlayers,
        maxPlayers,
        registerBy,
        costLimit,
        turnTimeSeconds,
        selectedMapId: 1,
        maxScore,
      };

      await actions.create(params);
      await onSuccess();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
    } finally {
      setPending(false);
    }
  };

  const sl = "text-[10px] uppercase tracking-widest text-text-muted mb-1.5 block";
  const inputClass =
    "w-full bg-black/40 border border-gunmetal px-3 py-2 text-sm text-text-secondary font-mono focus:border-cyan focus:outline-none placeholder:text-gunmetal";

  return (
    <div className="font-mono">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
          ← Back
        </button>
        <span className="text-sm font-bold text-text-secondary">Create Tournament</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex flex-col gap-3">
          <div>
            <span className={sl}>Max players</span>
            <div className="grid grid-cols-4 gap-1.5">
              {MAX_PLAYER_OPTIONS.map((n) => (
                <OptionCard
                  key={n}
                  checked={form.maxPlayers === n}
                  onSelect={() => patch("maxPlayers", n)}
                  title={n}
                  sub={n === "2" ? "1v1" : `${parseInt(n) / 2} R1`}
                />
              ))}
            </div>
          </div>

          <div>
            <span className={sl}>Fleet threat limit</span>
            <div className="grid grid-cols-2 gap-1.5">
              <OptionCard checked={form.threatScale === "skirmish"} onSelect={() => patch("threatScale", "skirmish")} title="Skirmish" sub="1,000 threat" />
              <OptionCard checked={form.threatScale === "battle"} onSelect={() => patch("threatScale", "battle")} title="Battle" sub="2,000 threat" />
            </div>
          </div>

          <div>
            <span className={sl}>Victory condition</span>
            <div className="grid grid-cols-3 gap-1.5">
              <OptionCard checked={form.gameLength === "short"} onSelect={() => patch("gameLength", "short")} title="Short" sub="50 pts" />
              <OptionCard checked={form.gameLength === "medium"} onSelect={() => patch("gameLength", "medium")} title="Medium" sub="100 pts" />
              <OptionCard checked={form.gameLength === "long"} onSelect={() => patch("gameLength", "long")} title="Long" sub="200 pts" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <span className={sl}>Registration closes in</span>
            <div className="flex gap-1.5 flex-wrap">
              {DEADLINE_PRESETS.map(({ label, hours }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => patch("hoursUntilDeadline", hours)}
                  className={`px-4 py-2 text-xs font-bold tracking-wider border transition-colors ${
                    form.hoursUntilDeadline === hours
                      ? "border-cyan bg-cyan/10 text-cyan"
                      : "border-gunmetal bg-black/40 text-text-muted hover:border-steel hover:text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={sl}>Turn timer</span>
            <div className="grid grid-cols-2 gap-1.5">
              <OptionCard checked={form.turnPace === "immediate"} onSelect={() => patch("turnPace", "immediate")} title="Live" sub="5 min / turn" />
              <OptionCard checked={form.turnPace === "correspondence"} onSelect={() => patch("turnPace", "correspondence")} title="Async" sub="24 hr / turn" />
            </div>
          </div>

          <div>
            <span className={sl}>Entry fee (credits)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0 — free entry"
              className={inputClass}
              value={form.entryFee}
              onChange={(e) => patch("entryFee", e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
        </div>

        <div className="col-span-2 pt-1 flex flex-col gap-2">
          {error && <p className="text-xs text-warning-red break-words">{error}</p>}
          <button
            disabled={pending}
            onClick={() => void handleCreate()}
            className="w-full border border-phosphor-green py-3 text-sm font-bold tracking-wider text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create Tournament"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List view ───────────────────────────────────────────────────────────────

function TournamentList({
  tournaments,
  currentUserId,
  isLoading,
  onSelect,
  onCreate,
}: {
  tournaments: Web2Tournament[];
  currentUserId: string | null;
  isLoading: boolean;
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  const active = tournaments.filter(
    (t) => t.summary.state === Web2TournamentState.Registration || t.summary.state === Web2TournamentState.Active,
  );
  const finished = tournaments.filter(
    (t) => t.summary.state === Web2TournamentState.Complete || t.summary.state === Web2TournamentState.Cancelled,
  );

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">Tournaments</div>
        <button
          onClick={onCreate}
          className="border border-phosphor-green/60 px-3 py-1.5 text-xs text-phosphor-green font-bold tracking-wider hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
        >
          + New Tournament
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-xs text-text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
          Loading…
        </div>
      )}

      {!isLoading && tournaments.length === 0 && (
        <div className="py-12 text-center text-xs text-text-muted">
          No tournaments yet.{" "}
          <button onClick={onCreate} className="text-phosphor-green hover:underline">
            Create the first one.
          </button>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Open</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((t) => (
              <TournamentCardWeb2
                key={t.summary.id}
                tournament={t}
                isCreatorMe={t.summary.creator === currentUserId}
                onClick={() => onSelect(t.summary.id)}
              />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Completed</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {finished.map((t) => (
              <TournamentCardWeb2
                key={t.summary.id}
                tournament={t}
                isCreatorMe={t.summary.creator === currentUserId}
                onClick={() => onSelect(t.summary.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type View = { type: "list" } | { type: "detail"; tournamentId: number } | { type: "create" };

export function TournamentsWeb2() {
  const { userId } = useCurrentUser();
  const [view, setView] = useState<View>({ type: "list" });
  const { tournaments, isLoading, refetch } = useTournamentListWeb2();

  if (view.type === "detail") {
    return <TournamentDetail tournamentId={view.tournamentId} onBack={() => setView({ type: "list" })} />;
  }

  if (view.type === "create") {
    return <CreateTournament onBack={() => setView({ type: "list" })} onSuccess={refetch} />;
  }

  return (
    <TournamentList
      tournaments={tournaments}
      currentUserId={userId}
      isLoading={isLoading}
      onSelect={(id) => setView({ type: "detail", tournamentId: id })}
      onCreate={() => setView({ type: "create" })}
    />
  );
}

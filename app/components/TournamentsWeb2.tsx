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
import { TournamentDetailHeader } from "./TournamentDetailHeader";
import { TournamentDetailStatsRow } from "./TournamentDetailStatsRow";
import { TournamentCreateForm } from "./TournamentCreateForm";
import { TournamentListShell } from "./TournamentListShell";
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
import type {
  MaxPlayersOption,
  ThreatScaleOption,
  TurnPaceOption,
  GameLengthOption,
} from "../utils/tournamentCreateFormOptions";

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

  return (
    <div className="font-mono">
      <TournamentDetailHeader
        idLabel={`Tournament #${tournamentId}`}
        state={summary.state}
        onBack={onBack}
      />

      <TournamentDetailStatsRow
        prizeLabel={summary.prizePool > 0 ? `${summary.prizePool} credits` : null}
        playersLabel={`${summary.registrantCount}/${config.maxPlayers}`}
        entryFeeLabel={config.entryFee > 0 ? `${config.entryFee} credits` : null}
        creatorLabel={truncateId(summary.creator)}
      />

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
  maxPlayers: MaxPlayersOption;
  hoursUntilDeadline: number;
  threatScale: ThreatScaleOption;
  turnPace: TurnPaceOption;
  gameLength: GameLengthOption;
}

const INPUT_CLASS =
  "w-full bg-black/40 border border-gunmetal px-3 py-2 text-sm text-text-secondary font-mono focus:border-cyan focus:outline-none placeholder:text-gunmetal";
const FIELD_LABEL_CLASS = "text-[10px] uppercase tracking-widest text-text-muted mb-1.5 block";

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

  return (
    <TournamentCreateForm
      maxPlayers={form.maxPlayers}
      onMaxPlayersChange={(v) => patch("maxPlayers", v)}
      threatScale={form.threatScale}
      onThreatScaleChange={(v) => patch("threatScale", v)}
      gameLength={form.gameLength}
      onGameLengthChange={(v) => patch("gameLength", v)}
      hoursUntilDeadline={form.hoursUntilDeadline}
      onHoursUntilDeadlineChange={(hours) => patch("hoursUntilDeadline", hours)}
      turnPace={form.turnPace}
      onTurnPaceChange={(v) => patch("turnPace", v)}
      entryFeeSlot={
        <div>
          <span className={FIELD_LABEL_CLASS}>Entry fee (credits)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0 — free entry"
            className={INPUT_CLASS}
            value={form.entryFee}
            onChange={(e) => patch("entryFee", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
      }
      error={error}
      pending={pending}
      onSubmit={() => void handleCreate()}
      onBack={onBack}
    />
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
    <TournamentListShell
      isLoading={isLoading}
      totalCount={tournaments.length}
      onCreate={onCreate}
      activeCards={active.map((t) => (
        <TournamentCardWeb2
          key={t.summary.id}
          tournament={t}
          isCreatorMe={t.summary.creator === currentUserId}
          onClick={() => onSelect(t.summary.id)}
        />
      ))}
      finishedCards={finished.map((t) => (
        <TournamentCardWeb2
          key={t.summary.id}
          tournament={t}
          isCreatorMe={t.summary.creator === currentUserId}
          onClick={() => onSelect(t.summary.id)}
        />
      ))}
    />
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

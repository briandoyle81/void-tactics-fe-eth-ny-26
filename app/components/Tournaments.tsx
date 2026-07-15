"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useTournamentList } from "../hooks/useTournamentList";
import { useTournament } from "../hooks/useTournament";
import { useTournamentActions } from "../hooks/useTournamentActions";
import { TournamentCard } from "./TournamentCard";
import { TournamentRegister } from "./TournamentRegister";
import { TournamentBracket } from "./TournamentBracket";
import { TournamentAdminPanel } from "./TournamentAdminPanel";
import { TournamentDetailHeader } from "./TournamentDetailHeader";
import { TournamentDetailStatsRow } from "./TournamentDetailStatsRow";
import { TournamentCreateForm } from "./TournamentCreateForm";
import { TournamentListShell } from "./TournamentListShell";
import { TournamentState } from "../types/types";
import type { TournamentSummary } from "../types/types";
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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── Detail view ─────────────────────────────────────────────────────────────

function TournamentDetail({
  tournamentId,
  onBack,
}: {
  tournamentId: bigint;
  onBack: () => void;
}) {
  const { address } = useAccount();
  const { config, summary, bracket, isRegistered, winnings, isLoading, refetch } =
    useTournament(tournamentId);
  const actions = useTournamentActions();
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
        setActionError(err instanceof Error ? err.message : "Transaction failed");
      } finally {
        setActionPending(false);
      }
    },
    [refetch],
  );

  if (isLoading || !summary || !config) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs text-text-muted font-mono">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
        Loading…
      </div>
    );
  }

  const prizeEth = summary.prizePool > 0n ? formatEther(summary.prizePool) : null;

  return (
    <div className="font-mono">
      <TournamentDetailHeader
        idLabel={`Tournament #${String(tournamentId)}`}
        state={summary.state}
        onBack={onBack}
      />

      <TournamentDetailStatsRow
        prizeLabel={prizeEth ? `${prizeEth} ETH` : null}
        playersLabel={`${String(summary.registrantCount)}/${config.maxPlayers}`}
        entryFeeLabel={config.entryFee > 0n ? `${formatEther(config.entryFee)} ETH` : null}
        creatorLabel={`${summary.creator.slice(0, 6)}…${summary.creator.slice(-4)}`}
      />

      {/* Register */}
      <div className="mb-5">
        <TournamentRegister
          tournamentId={tournamentId}
          config={config}
          summary={summary}
          isRegistered={isRegistered}
          onSuccess={() => void refetch()}
        />
      </div>

      {/* Start (permissionless) */}
      {summary.state === TournamentState.Registration && (
        <div className="mb-5">
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.start(tournamentId))}
            className="border border-gunmetal/60 px-4 py-2 text-xs text-text-muted hover:border-steel hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            {actionPending ? "Starting…" : "Start Tournament"}
          </button>
          <p className="mt-1 text-[10px] text-text-muted">
            Anyone can start once conditions are met (full roster or past deadline + min players).
          </p>
        </div>
      )}

      {/* Bracket */}
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Bracket</div>
        <TournamentBracket tournamentId={tournamentId} bracket={bracket} />
      </div>

      {/* Admin */}
      <div className="mb-5">
        <TournamentAdminPanel
          tournamentId={tournamentId}
          config={config}
          summary={summary}
          bracket={bracket}
          onAction={() => void refetch()}
        />
      </div>

      {/* Claim prize */}
      {winnings > 0n && address && (
        <div className="mb-4 border border-phosphor-green/30 bg-phosphor-green/5 p-4">
          <div className="text-xs text-phosphor-green mb-2 font-bold">
            You have {formatEther(winnings)} ETH to claim!
          </div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.claimPrize(tournamentId))}
            className="border border-phosphor-green py-2 px-4 text-sm font-bold text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
          >
            {actionPending ? "Claiming…" : "Claim Prize"}
          </button>
        </div>
      )}

      {/* Claim refund */}
      {summary.state === TournamentState.Cancelled && isRegistered && (
        <div className="mb-4 border border-gunmetal/60 p-4">
          <div className="text-xs text-text-muted mb-2">
            Tournament cancelled — claim your entry fee refund.
          </div>
          <button
            disabled={actionPending}
            onClick={() => void run(() => actions.claimRefund(tournamentId))}
            className="border border-gunmetal/60 py-2 px-4 text-xs text-text-secondary hover:border-steel transition-colors disabled:opacity-50"
          >
            {actionPending ? "Claiming…" : "Claim Refund"}
          </button>
        </div>
      )}

      {/* Champion banner */}
      {summary.state === TournamentState.Complete && summary.champion !== ZERO_ADDRESS && (
        <div className="border border-phosphor-green/30 bg-phosphor-green/5 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-phosphor-green/60 mb-1">Champion</div>
          <div className="text-phosphor-green font-bold">
            {summary.champion.slice(0, 6)}…{summary.champion.slice(-4)}
          </div>
          {summary.runnerUp !== ZERO_ADDRESS && (
            <div className="text-xs text-text-muted mt-1">
              Runner-up: {summary.runnerUp.slice(0, 6)}…{summary.runnerUp.slice(-4)}
            </div>
          )}
        </div>
      )}

      {actionError && (
        <p className="text-xs text-warning-red mt-2 break-words">{actionError}</p>
      )}
    </div>
  );
}

// ─── Create form ─────────────────────────────────────────────────────────────

interface CreateForm {
  entryFeeEth: string;
  sponsorEth: string;
  maxPlayers: MaxPlayersOption;
  hoursUntilDeadline: number;
  threatScale: ThreatScaleOption;
  turnPace: TurnPaceOption;
  gameLength: GameLengthOption;
}

const INPUT_CLASS =
  "w-full bg-black/40 border border-gunmetal px-3 py-2 text-sm text-text-secondary font-mono focus:border-cyan focus:outline-none placeholder:text-gunmetal";
const FIELD_LABEL_CLASS = "text-[10px] uppercase tracking-widest text-text-muted mb-1.5 block";

function CreateTournament({ onBack, onCreated, onSuccess }: { onBack: () => void; onCreated: (id: bigint) => void; onSuccess: () => Promise<unknown> }) {
  const actions = useTournamentActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>({
    entryFeeEth: "",
    sponsorEth: "",
    maxPlayers: "4",
    hoursUntilDeadline: 24,
    threatScale: "battle",
    turnPace: "immediate",
    gameLength: "medium",
  });

  const patch = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setError(null);
    setPending(true);
    try {
      const maxPlayers = parseInt(form.maxPlayers, 10);
      const minPlayers = Math.max(2, Math.floor(maxPlayers / 2));
      const lastStartTime = BigInt(
        Math.floor(Date.now() / 1000) + Math.round(form.hoursUntilDeadline * 3600),
      );
      const entryFee =
        form.entryFeeEth && parseFloat(form.entryFeeEth) > 0
          ? parseEther(form.entryFeeEth)
          : 0n;
      const sponsorValue =
        form.sponsorEth && parseFloat(form.sponsorEth) > 0
          ? parseEther(form.sponsorEth)
          : 0n;
      const costLimit = BigInt(
        form.threatScale === "skirmish" ? SKIRMISH_THREAT_LIMIT : BATTLE_THREAT_LIMIT,
      );
      const turnTime = BigInt(
        form.turnPace === "immediate"
          ? IMMEDIATE_GAME_TURN_SECONDS
          : CORRESPONDENCE_GAME_TURN_SECONDS,
      );
      const maxScore = BigInt(
        form.gameLength === "short"
          ? SHORT_MAX_SCORE
          : form.gameLength === "long"
            ? LONG_MAX_SCORE
            : MEDIUM_MAX_SCORE,
      );

      const hash = await actions.createTournament(
        { entryFee, minPlayers, maxPlayers, lastStartTime, costLimit, turnTime, selectedMapId: 1n, maxScore },
        sponsorValue,
      );
      await actions.publicClient?.waitForTransactionReceipt({ hash });
      await onSuccess();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
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
          <span className={FIELD_LABEL_CLASS}>Entry fee (ETH)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0 — free entry"
            className={INPUT_CLASS}
            value={form.entryFeeEth}
            onChange={(e) => patch("entryFeeEth", e.target.value)}
          />
        </div>
      }
      sponsorSlot={
        <div>
          <span className={FIELD_LABEL_CLASS}>Sponsor prize (ETH)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            className={INPUT_CLASS}
            value={form.sponsorEth}
            onChange={(e) => patch("sponsorEth", e.target.value)}
          />
          <p className="text-[10px] text-text-muted mt-1">Sent with tx, added to prize pool</p>
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
  isLoading,
  onSelect,
  onCreate,
}: {
  tournaments: TournamentSummary[];
  isLoading: boolean;
  onSelect: (id: bigint) => void;
  onCreate: () => void;
}) {
  const active = tournaments.filter(
    (t) => t.state === TournamentState.Registration || t.state === TournamentState.Active,
  );
  const finished = tournaments.filter(
    (t) => t.state === TournamentState.Complete || t.state === TournamentState.Cancelled,
  );

  return (
    <TournamentListShell
      isLoading={isLoading}
      totalCount={tournaments.length}
      onCreate={onCreate}
      activeCards={active.map((t) => (
        <TournamentCard
          key={String(t.tournamentId)}
          tournamentId={t.tournamentId}
          onClick={() => onSelect(t.tournamentId)}
        />
      ))}
      finishedCards={finished.map((t) => (
        <TournamentCard
          key={String(t.tournamentId)}
          tournamentId={t.tournamentId}
          onClick={() => onSelect(t.tournamentId)}
        />
      ))}
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type View =
  | { type: "list" }
  | { type: "detail"; tournamentId: bigint }
  | { type: "create" };

export function Tournaments() {
  const [view, setView] = useState<View>({ type: "list" });
  const { tournaments, isLoading, refetch } = useTournamentList();

  if (view.type === "detail") {
    return (
      <TournamentDetail
        tournamentId={view.tournamentId}
        onBack={() => setView({ type: "list" })}
      />
    );
  }

  if (view.type === "create") {
    return (
      <CreateTournament
        onBack={() => setView({ type: "list" })}
        onCreated={(id) => setView({ type: "detail", tournamentId: id })}
        onSuccess={refetch}
      />
    );
  }

  return (
    <TournamentList
      tournaments={tournaments}
      isLoading={isLoading}
      onSelect={(id) => setView({ type: "detail", tournamentId: id })}
      onCreate={() => setView({ type: "create" })}
    />
  );
}

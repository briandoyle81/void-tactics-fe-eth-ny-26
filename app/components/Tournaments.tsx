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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const STATE_LABELS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "REGISTRATION",
  [TournamentState.Active]: "ACTIVE",
  [TournamentState.Complete]: "COMPLETE",
  [TournamentState.Cancelled]: "CANCELLED",
};
const STATE_COLORS: Record<TournamentState, string> = {
  [TournamentState.Registration]: "text-cyan border-cyan",
  [TournamentState.Active]: "text-phosphor-green border-phosphor-green",
  [TournamentState.Complete]: "text-text-muted border-gunmetal",
  [TournamentState.Cancelled]: "text-warning-red border-warning-red",
};

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

  const stateLabel = STATE_LABELS[summary.state] ?? "UNKNOWN";
  const stateColor = STATE_COLORS[summary.state] ?? "text-text-muted border-gunmetal";
  const prizeEth = summary.prizePool > 0n ? formatEther(summary.prizePool) : null;

  return (
    <div className="font-mono">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-xs text-text-muted hover:text-secondary transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-bold text-secondary">
            Tournament #{String(tournamentId)}
          </span>
          <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${stateColor}`}>
            {stateLabel}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-xs mb-5 pb-4 border-b border-gunmetal/40">
        {prizeEth && (
          <div>
            <span className="text-text-muted">Prize </span>
            <span className="text-phosphor-green font-bold">{prizeEth} ETH</span>
          </div>
        )}
        <div>
          <span className="text-text-muted">Players </span>
          <span className="text-secondary">
            {String(summary.registrantCount)}/{config.maxPlayers}
          </span>
        </div>
        {config.entryFee > 0n && (
          <div>
            <span className="text-text-muted">Entry </span>
            <span className="text-secondary">{formatEther(config.entryFee)} ETH</span>
          </div>
        )}
        <div>
          <span className="text-text-muted">Creator </span>
          <span className="text-secondary">
            {summary.creator.slice(0, 6)}…{summary.creator.slice(-4)}
          </span>
        </div>
      </div>

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
            className="border border-gunmetal/60 px-4 py-2 text-xs text-text-muted hover:border-steel hover:text-secondary transition-colors disabled:opacity-50"
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
            className="border border-gunmetal/60 py-2 px-4 text-xs text-secondary hover:border-steel transition-colors disabled:opacity-50"
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
  maxPlayers: "2" | "4" | "8" | "16";
  hoursUntilDeadline: number;
  threatScale: "skirmish" | "battle";
  turnPace: "immediate" | "correspondence";
  gameLength: "short" | "medium" | "long";
}

// Reusable option card — same visual language as Lobbies create form
function OptionCard({
  checked,
  onSelect,
  title,
  sub,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
}) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-start gap-3 border p-3 transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan ${
        checked ? "border-cyan bg-cyan/5" : "border-gunmetal bg-black/40 hover:border-steel"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan"
      />
      <span>
        <span className={`block font-mono font-bold ${checked ? "text-cyan" : "text-secondary"}`}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">{sub}</span>
      </span>
    </label>
  );
}

const DEADLINE_PRESETS = [
  { label: "1h",  hours: 1 },
  { label: "4h",  hours: 4 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "7d",  hours: 168 },
] as const;

const MAX_PLAYER_OPTIONS = ["2", "4", "8", "16"] as const;

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

  const sl = "text-[10px] uppercase tracking-widest text-text-muted mb-1.5 block";
  const inputClass =
    "w-full bg-black/40 border border-gunmetal px-3 py-2 text-sm text-secondary font-mono focus:border-cyan focus:outline-none placeholder:text-gunmetal";

  return (
    <div className="font-mono">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-xs text-text-muted hover:text-secondary transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-bold text-secondary">Create Tournament</span>
      </div>

      {/* Two columns, full width, all above fold */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">

        {/* ── Left: players + threat + victory ── */}
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
              <OptionCard
                checked={form.threatScale === "skirmish"}
                onSelect={() => patch("threatScale", "skirmish")}
                title="Skirmish"
                sub="1,000 threat"
              />
              <OptionCard
                checked={form.threatScale === "battle"}
                onSelect={() => patch("threatScale", "battle")}
                title="Battle"
                sub="2,000 threat"
              />
            </div>
          </div>

          <div>
            <span className={sl}>Victory condition</span>
            <div className="grid grid-cols-3 gap-1.5">
              <OptionCard
                checked={form.gameLength === "short"}
                onSelect={() => patch("gameLength", "short")}
                title="Short"
                sub="50 pts"
              />
              <OptionCard
                checked={form.gameLength === "medium"}
                onSelect={() => patch("gameLength", "medium")}
                title="Medium"
                sub="100 pts"
              />
              <OptionCard
                checked={form.gameLength === "long"}
                onSelect={() => patch("gameLength", "long")}
                title="Long"
                sub="200 pts"
              />
            </div>
          </div>
        </div>

        {/* ── Right: deadline + turn timer + prize ── */}
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
                      : "border-gunmetal bg-black/40 text-text-muted hover:border-steel hover:text-secondary"
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
              <OptionCard
                checked={form.turnPace === "immediate"}
                onSelect={() => patch("turnPace", "immediate")}
                title="Live"
                sub="5 min / turn"
              />
              <OptionCard
                checked={form.turnPace === "correspondence"}
                onSelect={() => patch("turnPace", "correspondence")}
                title="Async"
                sub="24 hr / turn"
              />
            </div>
          </div>

          <div>
            <span className={sl}>Entry fee (ETH)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0 — free entry"
              className={inputClass}
              value={form.entryFeeEth}
              onChange={(e) => patch("entryFeeEth", e.target.value)}
            />
          </div>

          <div>
            <span className={sl}>Sponsor prize (ETH)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              className={inputClass}
              value={form.sponsorEth}
              onChange={(e) => patch("sponsorEth", e.target.value)}
            />
            <p className="text-[10px] text-text-muted mt-1">Sent with tx, added to prize pool</p>
          </div>
        </div>

        {/* ── Full-width footer ── */}
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
              <TournamentCard
                key={String(t.tournamentId)}
                tournamentId={t.tournamentId}
                onClick={() => onSelect(t.tournamentId)}
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
              <TournamentCard
                key={String(t.tournamentId)}
                tournamentId={t.tournamentId}
                onClick={() => onSelect(t.tournamentId)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
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

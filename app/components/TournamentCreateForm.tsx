"use client";

import React from "react";
import { TournamentOptionCard } from "./TournamentOptionCard";
import {
  DEADLINE_PRESETS,
  MAX_PLAYER_OPTIONS,
  type MaxPlayersOption,
  type ThreatScaleOption,
  type TurnPaceOption,
  type GameLengthOption,
} from "../utils/tournamentCreateFormOptions";

const LABEL_CLASS = "text-[10px] uppercase tracking-widest text-text-muted mb-1.5 block";

interface TournamentCreateFormProps {
  maxPlayers: MaxPlayersOption;
  onMaxPlayersChange: (value: MaxPlayersOption) => void;
  threatScale: ThreatScaleOption;
  onThreatScaleChange: (value: ThreatScaleOption) => void;
  gameLength: GameLengthOption;
  onGameLengthChange: (value: GameLengthOption) => void;
  hoursUntilDeadline: number;
  onHoursUntilDeadlineChange: (hours: number) => void;
  turnPace: TurnPaceOption;
  onTurnPaceChange: (value: TurnPaceOption) => void;
  entryFeeSlot: React.ReactNode;
  sponsorSlot?: React.ReactNode;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const TournamentCreateForm: React.FC<TournamentCreateFormProps> = ({
  maxPlayers,
  onMaxPlayersChange,
  threatScale,
  onThreatScaleChange,
  gameLength,
  onGameLengthChange,
  hoursUntilDeadline,
  onHoursUntilDeadlineChange,
  turnPace,
  onTurnPaceChange,
  entryFeeSlot,
  sponsorSlot,
  error,
  pending,
  onSubmit,
  onBack,
}) => (
  <div className="font-mono">
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onBack}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        ← Back
      </button>
      <span className="text-sm font-bold text-text-secondary">Create Tournament</span>
    </div>

    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <div className="flex flex-col gap-3">
        <div>
          <span className={LABEL_CLASS}>Max players</span>
          <div className="grid grid-cols-4 gap-1.5">
            {MAX_PLAYER_OPTIONS.map((n) => (
              <TournamentOptionCard
                key={n}
                checked={maxPlayers === n}
                onSelect={() => onMaxPlayersChange(n)}
                title={n}
                sub={n === "2" ? "1v1" : `${parseInt(n, 10) / 2} R1`}
              />
            ))}
          </div>
        </div>

        <div>
          <span className={LABEL_CLASS}>Fleet threat limit</span>
          <div className="grid grid-cols-2 gap-1.5">
            <TournamentOptionCard
              checked={threatScale === "skirmish"}
              onSelect={() => onThreatScaleChange("skirmish")}
              title="Skirmish"
              sub="1,000 threat"
            />
            <TournamentOptionCard
              checked={threatScale === "battle"}
              onSelect={() => onThreatScaleChange("battle")}
              title="Battle"
              sub="2,000 threat"
            />
          </div>
        </div>

        <div>
          <span className={LABEL_CLASS}>Victory condition</span>
          <div className="grid grid-cols-3 gap-1.5">
            <TournamentOptionCard
              checked={gameLength === "short"}
              onSelect={() => onGameLengthChange("short")}
              title="Short"
              sub="50 pts"
            />
            <TournamentOptionCard
              checked={gameLength === "medium"}
              onSelect={() => onGameLengthChange("medium")}
              title="Medium"
              sub="100 pts"
            />
            <TournamentOptionCard
              checked={gameLength === "long"}
              onSelect={() => onGameLengthChange("long")}
              title="Long"
              sub="200 pts"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <span className={LABEL_CLASS}>Registration closes in</span>
          <div className="flex gap-1.5 flex-wrap">
            {DEADLINE_PRESETS.map(({ label, hours }) => (
              <button
                key={label}
                type="button"
                onClick={() => onHoursUntilDeadlineChange(hours)}
                className={`px-4 py-2 text-xs font-bold tracking-wider border transition-colors ${
                  hoursUntilDeadline === hours
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
          <span className={LABEL_CLASS}>Turn timer</span>
          <div className="grid grid-cols-2 gap-1.5">
            <TournamentOptionCard
              checked={turnPace === "immediate"}
              onSelect={() => onTurnPaceChange("immediate")}
              title="Live"
              sub="5 min / turn"
            />
            <TournamentOptionCard
              checked={turnPace === "correspondence"}
              onSelect={() => onTurnPaceChange("correspondence")}
              title="Async"
              sub="24 hr / turn"
            />
          </div>
        </div>

        {entryFeeSlot}
        {sponsorSlot}
      </div>

      <div className="col-span-2 pt-1 flex flex-col gap-2">
        {error && <p className="text-xs text-warning-red break-words">{error}</p>}
        <button
          disabled={pending}
          onClick={onSubmit}
          className="w-full border border-phosphor-green py-3 text-sm font-bold tracking-wider text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Tournament"}
        </button>
      </div>
    </div>
  </div>
);

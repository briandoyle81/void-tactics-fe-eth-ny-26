"use client";

import type { ReactNode } from "react";

// Shared between TournamentBracket.tsx (web3) and TournamentBracketWeb2.tsx
// (web2) — the round-grouping and match-card layout, ported verbatim from
// TournamentBracket.tsx. `renderReplayLink` is a render-prop for web3's
// walrus-blob replay link, which has no web2 equivalent yet.
export interface BracketMatchData {
  id: string;
  round: number;
  matchLabel: string;
  player1Label: string | null;
  player2Label: string | null;
  player1IsWinner: boolean;
  player2IsWinner: boolean;
  isBye: boolean;
  resolved: boolean;
  inProgress: boolean;
}

function MatchCard({
  match,
  renderReplayLink,
}: {
  match: BracketMatchData;
  renderReplayLink?: (match: BracketMatchData) => ReactNode;
}) {
  const noPlayer1 = match.player1Label === null;
  const noPlayer2 = match.player2Label === null;

  return (
    <div
      className={`border p-2 text-xs font-mono w-44 ${
        !noPlayer1 && !noPlayer2 && !match.resolved
          ? "border-phosphor-green/60 bg-phosphor-green/5"
          : match.resolved
            ? "border-gunmetal/60 bg-void-black"
            : "border-gunmetal/30 bg-void-black/50"
      }`}
    >
      <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
        R{match.round + 1} · M{match.matchLabel}
      </div>

      {/* Player 1 */}
      <div
        className={`py-0.5 px-1 mb-0.5 ${
          match.player1IsWinner ? "text-phosphor-green font-bold" : "text-text-secondary"
        } ${noPlayer1 ? "text-text-muted" : ""}`}
      >
        {noPlayer1 ? "TBD" : match.player1Label}
        {match.player1IsWinner && " ✓"}
      </div>

      {/* Player 2 */}
      <div
        className={`py-0.5 px-1 ${
          match.player2IsWinner ? "text-phosphor-green font-bold" : "text-text-secondary"
        } ${noPlayer2 || match.isBye ? "text-text-muted" : ""}`}
      >
        {match.isBye ? "BYE" : noPlayer2 ? "TBD" : match.player2Label}
        {match.player2IsWinner && " ✓"}
      </div>

      {/* Status / links */}
      {match.inProgress && (
        <div className="mt-1 text-[10px] text-cyan tracking-wider">Game in progress</div>
      )}
      {renderReplayLink?.(match)}
    </div>
  );
}

interface TournamentBracketViewProps {
  bracket: BracketMatchData[];
  renderReplayLink?: (match: BracketMatchData) => ReactNode;
}

export function TournamentBracketView({ bracket, renderReplayLink }: TournamentBracketViewProps) {
  if (bracket.length === 0) {
    return (
      <div className="text-center text-xs text-text-muted font-mono py-8">
        Bracket not yet generated. Tournament starts when registration conditions are met.
      </div>
    );
  }

  const rounds = bracket.reduce((acc, m) => {
    const r = m.round;
    if (!acc[r]) acc[r] = [];
    acc[r]!.push(m);
    return acc;
  }, {} as Record<number, BracketMatchData[]>);

  const roundNums = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);
  const maxRound = Math.max(...roundNums);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max py-4">
        {roundNums.map((r) => (
          <div key={r} className="flex flex-col gap-4 justify-around">
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest text-center mb-2">
              {r === maxRound ? "Final" : `Round ${r + 1}`}
            </div>
            {rounds[r]!.map((m) => (
              <MatchCard key={m.id} match={m} renderReplayLink={renderReplayLink} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

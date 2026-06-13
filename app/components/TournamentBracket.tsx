"use client";

import type { TournamentMatch } from "../types/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BLOB = "0x" + "0".repeat(64);

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function MatchCard({
  match,
  tournamentId,
}: {
  match: TournamentMatch;
  tournamentId: bigint;
}) {
  const noPlayer1 = match.player1 === ZERO_ADDRESS;
  const noPlayer2 = match.player2 === ZERO_ADDRESS;
  const isBye = !noPlayer1 && noPlayer2 && match.resolved;
  const isPlayable = !noPlayer1 && !noPlayer2 && !match.resolved;
  const inProgress = isPlayable && match.gameId !== 0n;
  const hasReplay = match.resolved && match.walrusBlobId !== ZERO_BLOB;

  return (
    <div
      className={`border p-2 text-xs font-mono w-44 ${
        isPlayable
          ? "border-phosphor-green/60 bg-phosphor-green/5"
          : match.resolved
            ? "border-gunmetal/60 bg-void-black"
            : "border-gunmetal/30 bg-void-black/50"
      }`}
    >
      <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
        R{match.round + 1} · M{String(match.matchId)}
      </div>

      {/* Player 1 */}
      <div
        className={`py-0.5 px-1 mb-0.5 ${
          match.resolved && match.winner === match.player1
            ? "text-phosphor-green font-bold"
            : "text-secondary"
        } ${noPlayer1 ? "text-text-muted" : ""}`}
      >
        {noPlayer1 ? "TBD" : shortAddr(match.player1)}
        {match.resolved && match.winner === match.player1 && " ✓"}
      </div>

      {/* Player 2 */}
      <div
        className={`py-0.5 px-1 ${
          match.resolved && match.winner === match.player2
            ? "text-phosphor-green font-bold"
            : "text-secondary"
        } ${noPlayer2 || isBye ? "text-text-muted" : ""}`}
      >
        {isBye ? "BYE" : noPlayer2 ? "TBD" : shortAddr(match.player2)}
        {match.resolved && match.winner === match.player2 && " ✓"}
      </div>

      {/* Status / links */}
      {inProgress && (
        <div className="mt-1 text-[10px] text-cyan tracking-wider">Game in progress</div>
      )}
      {hasReplay && (
        <a
          href={`/tournaments/${String(tournamentId)}/matches/${String(match.matchId)}`}
          className="mt-1 block text-[10px] text-phosphor-green/70 hover:text-phosphor-green underline"
        >
          View replay
        </a>
      )}
    </div>
  );
}

interface Props {
  tournamentId: bigint;
  bracket: TournamentMatch[];
}

export function TournamentBracket({ tournamentId, bracket }: Props) {
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
  }, {} as Record<number, TournamentMatch[]>);

  const roundNums = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max py-4">
        {roundNums.map((r) => (
          <div key={r} className="flex flex-col gap-4 justify-around">
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest text-center mb-2">
              {r === Math.max(...roundNums) ? "Final" : `Round ${r + 1}`}
            </div>
            {rounds[r]!.map((m) => (
              <MatchCard key={String(m.matchId)} match={m} tournamentId={tournamentId} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { Web2TournamentMatch } from "../types/web2Tournament";

// Web2-mode counterpart to `TournamentBracket.tsx`. No replay link (no
// walrus blob concept on web2 yet) — otherwise the same layout/logic,
// adapted to plain number ids and nullable player/lobby fields instead of
// the zero-address/zero-id sentinels.
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function MatchCard({ match }: { match: Web2TournamentMatch }) {
  const noPlayer1 = !match.player1Id;
  const noPlayer2 = !match.player2Id;
  const isBye = !noPlayer1 && noPlayer2 && match.resolved;
  const isPlayable = !noPlayer1 && !noPlayer2 && !match.resolved;
  const inProgress = isPlayable && match.lobbyId !== null;

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
        R{match.round + 1} · M{match.id}
      </div>

      <div
        className={`py-0.5 px-1 mb-0.5 ${
          match.resolved && match.winnerId === match.player1Id ? "text-phosphor-green font-bold" : "text-text-secondary"
        } ${noPlayer1 ? "text-text-muted" : ""}`}
      >
        {noPlayer1 ? "TBD" : truncateId(match.player1Id!)}
        {match.resolved && match.winnerId === match.player1Id && " ✓"}
      </div>

      <div
        className={`py-0.5 px-1 ${
          match.resolved && match.winnerId === match.player2Id ? "text-phosphor-green font-bold" : "text-text-secondary"
        } ${noPlayer2 || isBye ? "text-text-muted" : ""}`}
      >
        {isBye ? "BYE" : noPlayer2 ? "TBD" : truncateId(match.player2Id!)}
        {match.resolved && match.winnerId === match.player2Id && " ✓"}
      </div>

      {inProgress && (
        <div className="mt-1 text-[10px] text-cyan tracking-wider">Game in progress</div>
      )}
    </div>
  );
}

interface Props {
  bracket: Web2TournamentMatch[];
}

export function TournamentBracketWeb2({ bracket }: Props) {
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
  }, {} as Record<number, Web2TournamentMatch[]>);

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
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

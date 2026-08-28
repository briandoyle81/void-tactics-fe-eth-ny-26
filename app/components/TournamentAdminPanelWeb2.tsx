"use client";

import { useState } from "react";
import { useTournamentAdminWeb2 } from "../hooks/useTournamentAdminWeb2";
import { Web2TournamentState, type Web2TournamentSummary, type Web2TournamentMatch } from "../types/web2Tournament";
import { AdminPanelShell, AdminMatchRow, type AdminMatchRowData } from "./AdminPanelShell";

// Web2-mode counterpart to `TournamentAdminPanel.tsx`, including its
// "Resolve as Draw" stuck-match fallback — despite the label, web3's
// resolveDraw doesn't void the match, it deterministically awards it to
// whichever player registered first (docs/tournament.md §O-8), so this
// button offers no winner choice either, matching that behavior exactly
// (see the resolve route's doc comment for the tiebreak logic).
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

interface Props {
  tournamentId: number;
  currentUserId: string | null;
  summary: Web2TournamentSummary;
  bracket: Web2TournamentMatch[];
  onAction: () => void;
}

export function TournamentAdminPanelWeb2({ tournamentId, currentUserId, summary, bracket, onAction }: Props) {
  const admin = useTournamentAdminWeb2();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUserId || currentUserId !== summary.creator) return null;

  const allResolved = bracket.length > 0 && bracket.every((m) => m.resolved);
  const canFinalize = allResolved && summary.state === Web2TournamentState.Active;

  const runFinalize = async () => {
    setPending(true);
    setError(null);
    try {
      await admin.finalize(tournamentId);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalize failed");
    } finally {
      setPending(false);
    }
  };

  const actionableMatches = bracket.filter((m) => !!m.player1Id && !!m.player2Id && !m.resolved);

  return (
    <AdminPanelShell
      hasActionableMatches={actionableMatches.length > 0}
      canFinalize={canFinalize}
      isFinalizing={pending}
      finalizeError={error}
      onFinalize={() => void runFinalize()}
    >
      {actionableMatches.map((m) => {
        const needsLobby = !!m.player1Id && !!m.player2Id && !m.resolved && m.lobbyId === null;
        const isStuck = !!m.player1Id && !!m.player2Id && !m.resolved && m.lobbyId !== null;

        const data: AdminMatchRowData = {
          id: String(m.id),
          round: m.round,
          matchLabel: String(m.id),
          player1Label: truncateId(m.player1Id!),
          player2Label: truncateId(m.player2Id!),
          needsLobby,
          isStuck,
        };

        return (
          <AdminMatchRow
            key={m.id}
            match={data}
            onAction={onAction}
            onCreateLobby={() => admin.createMatchLobby(tournamentId, m.id)}
            stuckActions={[
              {
                label: "Resolve as Draw",
                pendingLabel: "Resolving…",
                onClick: () => admin.resolveStuckMatch(tournamentId, m.id),
              },
            ]}
          />
        );
      })}
    </AdminPanelShell>
  );
}

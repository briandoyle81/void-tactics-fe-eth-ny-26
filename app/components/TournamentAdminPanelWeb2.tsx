"use client";

import { useState } from "react";
import { useTournamentAdminWeb2 } from "../hooks/useTournamentAdminWeb2";
import { Web2TournamentState, type Web2TournamentSummary, type Web2TournamentMatch } from "../types/web2Tournament";
import { AdminPanelShell, AdminMatchRow, type AdminMatchRowData } from "./AdminPanelShell";

// Web2-mode counterpart to `TournamentAdminPanel.tsx`. One deliberate
// difference from web3's "Resolve as Draw" (which force-resolves a stuck
// match with no winner selection): the API here requires an explicit
// winner, so the stuck-match fallback is two "X wins" buttons instead of
// one "resolve as draw" button — a single-elimination bracket needs
// someone to advance either way, and letting the creator just pick is
// simpler than reproducing web3's unclear "draw" semantics.
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
                label: `${truncateId(m.player1Id!)} wins`,
                onClick: () => admin.resolveMatch(tournamentId, m.id, m.player1Id!),
              },
              {
                label: `${truncateId(m.player2Id!)} wins`,
                onClick: () => admin.resolveMatch(tournamentId, m.id, m.player2Id!),
              },
            ]}
          />
        );
      })}
    </AdminPanelShell>
  );
}

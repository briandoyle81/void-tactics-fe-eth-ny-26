"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useTournamentAdmin } from "../hooks/useTournamentAdmin";
import type { TournamentConfig, TournamentMatch, TournamentSummary } from "../types/types";
import { TournamentState } from "../types/types";
import { AdminPanelShell, AdminMatchRow, type AdminMatchRowData } from "./AdminPanelShell";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  tournamentId: bigint;
  config: TournamentConfig;
  summary: TournamentSummary;
  bracket: TournamentMatch[];
  onAction: () => void;
}

export function TournamentAdminPanel({ tournamentId, config, summary, bracket, onAction }: Props) {
  const { address } = useAccount();
  const admin = useTournamentAdmin();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address || address.toLowerCase() !== summary.creator.toLowerCase()) return null;

  const allResolved = bracket.length > 0 && bracket.every((m) => m.resolved);
  const canFinalize = allResolved && summary.state === TournamentState.Active;

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

  const actionableMatches = bracket.filter(
    (m) =>
      m.player1 !== ZERO_ADDRESS &&
      m.player2 !== ZERO_ADDRESS &&
      !m.resolved,
  );

  return (
    <AdminPanelShell
      hasActionableMatches={actionableMatches.length > 0}
      canFinalize={canFinalize}
      isFinalizing={pending}
      finalizeError={error}
      onFinalize={() => void runFinalize()}
    >
      {actionableMatches.map((m) => {
        const needsLobby =
          m.player1 !== ZERO_ADDRESS && m.player2 !== ZERO_ADDRESS && !m.resolved && m.gameId === 0n;
        const isStuck =
          m.player1 !== ZERO_ADDRESS && m.player2 !== ZERO_ADDRESS && !m.resolved && m.gameId !== 0n;

        const data: AdminMatchRowData = {
          id: String(m.matchId),
          round: m.round,
          matchLabel: String(m.matchId),
          player1Label: shortAddr(m.player1),
          player2Label: shortAddr(m.player2),
          needsLobby,
          isStuck,
        };

        return (
          <AdminMatchRow
            key={String(m.matchId)}
            match={data}
            onAction={onAction}
            onCreateLobby={() =>
              admin.createMatchLobby(tournamentId, m.matchId, m.player1, m.player2, config)
            }
            stuckActions={[
              {
                label: "Resolve as Draw",
                pendingLabel: "Resolving…",
                onClick: () => admin.resolveDraw(tournamentId, m.matchId),
              },
            ]}
          />
        );
      })}
    </AdminPanelShell>
  );
}

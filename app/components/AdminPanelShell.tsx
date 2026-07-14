"use client";

import { useCallback, useState, type ReactNode } from "react";

// Shared between TournamentAdminPanel.tsx (web3) and
// TournamentAdminPanelWeb2.tsx (web2) — the panel shell (header/empty-state/
// finalize button) and the per-match action row, ported verbatim from
// TournamentAdminPanel.tsx. The stuck-match resolution UI genuinely
// diverges (web3: one "resolve as draw" button; web2: two "X wins" buttons,
// since its API requires an explicit winner) — `stuckActions` is a plain
// data array so both shapes render through the same button list.
export interface AdminMatchRowData {
  id: string;
  round: number;
  matchLabel: string;
  player1Label: string;
  player2Label: string;
  needsLobby: boolean;
  isStuck: boolean;
}

export interface AdminStuckAction {
  label: string;
  pendingLabel?: string;
  onClick: () => Promise<unknown>;
}

interface AdminMatchRowProps {
  match: AdminMatchRowData;
  onAction: () => void;
  onCreateLobby: () => Promise<unknown>;
  stuckActions: AdminStuckAction[];
}

export function AdminMatchRow({ match, onAction, onCreateLobby, stuckActions }: AdminMatchRowProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<unknown>, label?: string) => {
      setPending(true);
      setPendingLabel(label ?? null);
      setError(null);
      try {
        await fn();
        onAction();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setPending(false);
        setPendingLabel(null);
      }
    },
    [onAction],
  );

  if (!match.needsLobby && !match.isStuck) return null;

  return (
    <div className="border border-gunmetal/40 p-3 text-xs font-mono">
      <div className="text-text-muted mb-1">
        R{match.round + 1} · M{match.matchLabel} ·{" "}
        <span className="text-text-secondary">{match.player1Label}</span> vs{" "}
        <span className="text-text-secondary">{match.player2Label}</span>
      </div>

      {match.needsLobby && (
        <button
          disabled={pending}
          onClick={() => void run(onCreateLobby)}
          className="border border-phosphor-green/50 px-3 py-1 text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Lobby & Assign"}
        </button>
      )}

      {match.isStuck && (
        <div className="flex gap-2">
          {stuckActions.map((action) => (
            <button
              key={action.label}
              disabled={pending}
              onClick={() => void run(action.onClick, action.pendingLabel)}
              className="border border-warning-red/50 px-3 py-1 text-warning-red hover:border-warning-red hover:bg-warning-red/5 transition-colors disabled:opacity-50"
            >
              {pending && pendingLabel === action.pendingLabel && pendingLabel
                ? pendingLabel
                : action.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-warning-red text-[10px] break-words">{error}</p>}
    </div>
  );
}

interface AdminPanelShellProps {
  hasActionableMatches: boolean;
  canFinalize: boolean;
  isFinalizing: boolean;
  finalizeError: string | null;
  onFinalize: () => void;
  children: ReactNode;
}

export function AdminPanelShell({
  hasActionableMatches,
  canFinalize,
  isFinalizing,
  finalizeError,
  onFinalize,
  children,
}: AdminPanelShellProps) {
  return (
    <div className="border border-phosphor-green/20 bg-phosphor-green/5 p-4 font-mono">
      <div className="text-xs uppercase tracking-widest text-phosphor-green/70 mb-3">
        Admin Panel
      </div>

      {!hasActionableMatches && !canFinalize && (
        <p className="text-xs text-text-muted">No pending actions.</p>
      )}

      {hasActionableMatches && (
        <div className="flex flex-col gap-2 mb-4">{children}</div>
      )}

      {canFinalize && (
        <div>
          <button
            disabled={isFinalizing}
            onClick={onFinalize}
            className="w-full border border-phosphor-green py-2 text-sm font-bold text-phosphor-green hover:bg-phosphor-green/10 transition-colors disabled:opacity-50"
          >
            {isFinalizing ? "Finalizing…" : "Finalize Tournament"}
          </button>
          {finalizeError && (
            <p className="mt-2 text-xs text-warning-red break-words">{finalizeError}</p>
          )}
        </div>
      )}
    </div>
  );
}

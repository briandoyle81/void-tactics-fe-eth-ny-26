"use client";

import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";

// Shared fleet-status panel layout between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — pure layout container; each caller renders
// its own <GameFleetCard> elements (data lookup/bigint conversion stays at
// the call site, see app/types/gameDisplayData.ts).
interface GameFleetStatusPanelProps {
  myCount: number;
  enemyCount: number;
  myCards: React.ReactNode;
  enemyCards: React.ReactNode;
  /** Web3-only "[DETAILS]" button opening the full fleet modal — omitted (no button) if not provided. */
  onShowDetails?: () => void;
  /** Web2-only retreat button — rendered below both fleets if provided. */
  footer?: React.ReactNode;
}

export function GameFleetStatusPanel({
  myCount,
  enemyCount,
  myCards,
  enemyCards,
  onShowDetails,
  footer,
}: GameFleetStatusPanelProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border border-solid p-2"
      style={{
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        backgroundColor: "var(--color-near-black)",
        borderRadius: 0,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-text-secondary)" }}>
            FLEET STATUS
          </span>
          {onShowDetails && (
            <button
              type="button"
              onClick={onShowDetails}
              className="border border-solid px-1.5 py-0.5 uppercase tracking-wider transition-colors"
              style={{ ...STYLE_LABEL, fontSize: 9, color: "var(--color-text-secondary)", borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-steel)", borderRadius: 0 }}
            >
              [DETAILS]
            </button>
          )}
        </div>
        <span style={{ ...STYLE_MONO, fontSize: 10, color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-cyan)" }}>{myCount}</span>
          <span style={{ color: "var(--color-text-muted)" }}> vs </span>
          <span style={{ color: "var(--color-warning-red)" }}>{enemyCount}</span>
        </span>
      </div>

      {/* My Fleet */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 10, color: "var(--color-cyan)" }}>
            MY FLEET
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-cyan)", opacity: 0.25 }} />
          <span style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-cyan)" }}>{myCount}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {myCards}
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: "var(--color-gunmetal)" }} />

      {/* Opponent Fleet */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider font-bold" style={{ ...STYLE_LABEL, fontSize: 10, color: "var(--color-warning-red)" }}>
            OPPONENT
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-warning-red)", opacity: 0.25 }} />
          <span style={{ ...STYLE_MONO, fontSize: 9, color: "var(--color-warning-red)" }}>{enemyCount}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {enemyCards}
        </div>
      </div>

      {footer}
    </div>
  );
}

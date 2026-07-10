"use client";

import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import type { GameScoreData } from "../types/gameDisplayData";

// Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) desktop
// layouts — number-native (see app/types/gameDisplayData.ts): callers convert
// bigint game data to a GameScoreData via app/utils/toGameDisplayData.ts
// (web3) or gameDisplayDataWeb2.ts (web2) before passing it in.
interface GameScoreBoxProps {
  score: GameScoreData;
}

export function GameScoreBox({ score: { myScore, opponentScore, maxScore } }: GameScoreBoxProps) {
  return (
    <div
      className="w-full shrink-0 border border-solid overflow-hidden"
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
      }}
    >
      <div className="flex items-stretch" style={{ ...STYLE_MONO, fontSize: "22px" }}>
        <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
          <span style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-cyan)" }}>[YOU]</span>
          <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
            {myScore}/{maxScore}
          </span>
        </div>
        <div style={{ width: 1, backgroundColor: "var(--color-gunmetal)", flexShrink: 0 }} />
        <div className="flex flex-1 items-center justify-center gap-2 px-3 py-2">
          <span style={{ ...STYLE_LABEL, fontSize: 11, color: "var(--color-warning-red)" }}>[OPP]</span>
          <span title="Scores update at end of round." style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
            {opponentScore}/{maxScore}
          </span>
        </div>
      </div>
    </div>
  );
}

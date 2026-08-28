"use client";

import { useRoguelikeRunWeb2 } from "../hooks/useRoguelikeWeb2";
import { RoguelikeRunStartWeb2 } from "./RoguelikeRunStartWeb2";
import { RoguelikeGraphWeb2 } from "./RoguelikeGraphWeb2";

// Web2 counterpart to RoguelikeCampaign.tsx — branches on active-run same as web3.
export function RoguelikeCampaignWeb2() {
  const { run, isLoading, error, refetch } = useRoguelikeRunWeb2();

  if (isLoading) {
    return <div className="text-center font-mono text-sm text-text-muted">Loading run…</div>;
  }
  if (error) {
    return (
      <div className="text-center font-mono text-sm text-warning-red">
        [ERR] Failed to load run: {error.message}
      </div>
    );
  }

  if (!run) {
    return <RoguelikeRunStartWeb2 onRunStarted={() => void refetch()} />;
  }

  return <RoguelikeGraphWeb2 run={run} onRunEnded={() => void refetch()} />;
}

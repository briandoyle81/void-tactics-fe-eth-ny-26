"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useGetRoguelikeRun, useHasActiveRoguelikeRun } from "../hooks/useRoguelikeRun";
import { RunStatus } from "../types/roguelike";
import { RoguelikeRunStart } from "./RoguelikeRunStart";
import { RoguelikeGraph } from "./RoguelikeGraph";

// Top-level Roguelike tab container — branches on whether the connected
// player has an active run (docs/update/Frontend_Update_Guide_Roguelike_Campaign.md).
export function RoguelikeCampaign() {
  const { address, isConnected } = useAccount();
  const { data: hasActiveRun, isLoading: hasActiveRunLoading, refetch: refetchHasActiveRun } =
    useHasActiveRoguelikeRun(address);
  const { data: run, isLoading: runLoading, refetch: refetchRun } = useGetRoguelikeRun(address);

  const refetchAll = React.useCallback(() => {
    void refetchHasActiveRun();
    void refetchRun();
  }, [refetchHasActiveRun, refetchRun]);

  if (!isConnected) {
    return (
      <div className="border-2 border-cyan p-6 text-center font-mono text-sm text-text-muted" style={{ borderRadius: 0 }}>
        Connect your wallet to start a roguelike run.
      </div>
    );
  }

  if (hasActiveRunLoading || runLoading) {
    return (
      <div className="border-2 border-cyan p-6 text-center font-mono text-sm text-text-muted" style={{ borderRadius: 0 }}>
        Loading run status…
      </div>
    );
  }

  if (!hasActiveRun || !run || run.status !== RunStatus.Active) {
    return <RoguelikeRunStart onRunStarted={refetchAll} />;
  }

  return <RoguelikeGraph run={run} onRunEnded={refetchAll} onRunAdvanced={refetchAll} />;
}

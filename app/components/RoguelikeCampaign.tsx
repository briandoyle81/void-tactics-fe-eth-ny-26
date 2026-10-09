"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useGetRoguelikeRun, useHasActiveRoguelikeRun } from "../hooks/useRoguelikeRun";
import { toast } from "react-hot-toast";
import { RunStatus, type RoguelikeRun } from "../types/roguelike";
import { RoguelikeRunStart } from "./RoguelikeRunStart";
import { RoguelikeGraph } from "./RoguelikeGraph";

// Top-level Roguelike tab container — branches on whether the connected
// player has an active run (docs/update/Frontend_Update_Guide_Roguelike_Campaign.md).
// With no run it shows the campaign map as a preview (editors can turn on
// Edit Mode there); its Start run action opens fleet selection.
export function RoguelikeCampaign() {
  const { address, isConnected } = useAccount();
  const { data: hasActiveRun, isLoading: hasActiveRunLoading, refetch: refetchHasActiveRun } =
    useHasActiveRoguelikeRun(address);
  const { data: run, isLoading: runLoading, refetch: refetchRun } = useGetRoguelikeRun(address);
  const [choosingFleet, setChoosingFleet] = React.useState(false);

  const refetchAll = React.useCallback(async () => {
    await Promise.all([refetchHasActiveRun(), refetchRun()]);
  }, [refetchHasActiveRun, refetchRun]);

  // After startRun is mined, a load-balanced RPC node can still be a block
  // behind and report no active run — which left the player on the roster
  // screen. Poll until the run reads back as Active (or give up after ~10s).
  const refetchUntilRunActive = React.useCallback(async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const [hasRunResult, runResult] = await Promise.all([refetchHasActiveRun(), refetchRun()]);
      const fetchedRun = runResult.data as RoguelikeRun | undefined;
      if (hasRunResult.data && fetchedRun?.status === RunStatus.Active) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    toast.error("Run started, but the network hasn't caught up yet. Refresh in a moment.");
  }, [refetchHasActiveRun, refetchRun]);

  const handleRunStarted = React.useCallback(async () => {
    await refetchUntilRunActive();
    setChoosingFleet(false);
  }, [refetchUntilRunActive]);

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
    if (!choosingFleet) {
      return (
        <RoguelikeGraph
          run={null}
          onRunEnded={() => {}}
          onRunAdvanced={() => {}}
          onStartRun={() => setChoosingFleet(true)}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <BackToCampaignMapButton onClick={() => setChoosingFleet(false)} />
        <RoguelikeRunStart onRunStarted={handleRunStarted} />
      </div>
    );
  }

  return <RoguelikeGraph run={run} onRunEnded={refetchAll} onRunAdvanced={refetchAll} />;
}

/** Fleet selection's way back to the run-less campaign map. Shared with RoguelikeCampaignWeb2. */
export function BackToCampaignMapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start border-2 border-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10 font-mono"
      style={{ borderRadius: 0 }}
    >
      ← Campaign map
    </button>
  );
}

"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useGetRoguelikeRun, useHasActiveRoguelikeRun } from "../hooks/useRoguelikeRun";
import { useIsRoguelikeNodeEditor } from "../hooks/useRoguelikeNodeMap";
import { RunStatus } from "../types/roguelike";
import { RoguelikeRunStart } from "./RoguelikeRunStart";
import { RoguelikeGraph } from "./RoguelikeGraph";

// Top-level Roguelike tab container — branches on whether the connected
// player has an active run (docs/update/Frontend_Update_Guide_Roguelike_Campaign.md).
// Editors additionally get a run-less "browse/edit" entry point from the
// no-active-run screen, since RoguelikeGraph otherwise has no way to be
// reached without a run — see the campaign map editor plan's decision log.
export function RoguelikeCampaign() {
  const { address, isConnected } = useAccount();
  const { data: hasActiveRun, isLoading: hasActiveRunLoading, refetch: refetchHasActiveRun } =
    useHasActiveRoguelikeRun(address);
  const { data: run, isLoading: runLoading, refetch: refetchRun } = useGetRoguelikeRun(address);
  const { data: isEditor = false } = useIsRoguelikeNodeEditor(address);
  const [browsingMap, setBrowsingMap] = React.useState(false);

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

  if (browsingMap) {
    return (
      <RoguelikeGraph
        run={null}
        onRunEnded={() => setBrowsingMap(false)}
        onRunAdvanced={() => {}}
      />
    );
  }

  if (!hasActiveRun || !run || run.status !== RunStatus.Active) {
    return (
      <div className="flex flex-col gap-4">
        {isEditor && (
          <button
            type="button"
            onClick={() => setBrowsingMap(true)}
            className="self-start border-2 border-amber px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber hover:bg-amber/10 font-mono"
            style={{ borderRadius: 0 }}
          >
            [EDIT CAMPAIGN MAP]
          </button>
        )}
        <RoguelikeRunStart onRunStarted={refetchAll} />
      </div>
    );
  }

  return <RoguelikeGraph run={run} onRunEnded={refetchAll} onRunAdvanced={refetchAll} />;
}

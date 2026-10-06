"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useGetRoguelikeRun, useHasActiveRoguelikeRun } from "../hooks/useRoguelikeRun";
import { useIsRoguelikeNodeEditor } from "../hooks/useRoguelikeNodeMap";
import { toast } from "react-hot-toast";
import { RunStatus, type RoguelikeRun } from "../types/roguelike";
import { RoguelikeRunStart } from "./RoguelikeRunStart";
import { RoguelikeGraph } from "./RoguelikeGraph";

function browsingMapStorageKey(address: string | undefined): string {
  return `mission-browsing-map-${address || "anonymous"}`;
}

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
  const [browsingMap, setBrowsingMapState] = React.useState(false);
  React.useEffect(() => {
    setBrowsingMapState(localStorage.getItem(browsingMapStorageKey(address)) === "1");
  }, [address]);
  const setBrowsingMap = React.useCallback(
    (value: boolean) => {
      setBrowsingMapState(value);
      const key = browsingMapStorageKey(address);
      if (value) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    },
    [address],
  );

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
        <RoguelikeRunStart onRunStarted={refetchUntilRunActive} />
      </div>
    );
  }

  return <RoguelikeGraph run={run} onRunEnded={refetchAll} onRunAdvanced={refetchAll} />;
}

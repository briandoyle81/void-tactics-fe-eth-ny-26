"use client";

import React from "react";
import { useRoguelikeRunWeb2 } from "../hooks/useRoguelikeWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { RoguelikeRunStartWeb2 } from "./RoguelikeRunStartWeb2";
import { RoguelikeGraphWeb2 } from "./RoguelikeGraphWeb2";

// Web2 counterpart to RoguelikeCampaign.tsx — branches on active-run same
// as web3, plus the same run-less "browse/edit" entry point for admins.
export function RoguelikeCampaignWeb2() {
  const { run, isLoading, error, refetch } = useRoguelikeRunWeb2();
  const isEditor = useWeb2Admin();
  const [browsingMap, setBrowsingMap] = React.useState(false);

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

  if (browsingMap) {
    return <RoguelikeGraphWeb2 run={null} onRunEnded={() => setBrowsingMap(false)} />;
  }

  if (!run) {
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
        <RoguelikeRunStartWeb2 onRunStarted={() => void refetch()} />
      </div>
    );
  }

  return <RoguelikeGraphWeb2 run={run} onRunEnded={() => void refetch()} />;
}

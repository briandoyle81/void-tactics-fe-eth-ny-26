"use client";

import React from "react";
import { useRoguelikeRunWeb2 } from "../hooks/useRoguelikeWeb2";
import { RoguelikeRunStartWeb2 } from "./RoguelikeRunStartWeb2";
import { RoguelikeGraphWeb2 } from "./RoguelikeGraphWeb2";
import { BackToCampaignMapButton } from "./RoguelikeCampaign";

// Web2 counterpart to RoguelikeCampaign.tsx — branches on active-run same
// as web3, with the same run-less map preview and fleet selection.
export function RoguelikeCampaignWeb2() {
  const { run, isLoading, error, refetch } = useRoguelikeRunWeb2();
  const [choosingFleet, setChoosingFleet] = React.useState(false);

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
    if (!choosingFleet) {
      return <RoguelikeGraphWeb2 run={null} onRunEnded={() => {}} onStartRun={() => setChoosingFleet(true)} />;
    }
    return (
      <div className="flex flex-col gap-4">
        <BackToCampaignMapButton onClick={() => setChoosingFleet(false)} />
        <RoguelikeRunStartWeb2
          onRunStarted={() => {
            setChoosingFleet(false);
            void refetch();
          }}
        />
      </div>
    );
  }

  return <RoguelikeGraphWeb2 run={run} onRunEnded={() => void refetch()} />;
}

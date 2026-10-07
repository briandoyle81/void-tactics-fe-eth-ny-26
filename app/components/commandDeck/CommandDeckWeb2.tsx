"use client";

import { useMemo } from "react";
import { useRoguelikeRunWeb2, useRoguelikeCampaignNodesWeb2WithContent } from "../../hooks/useRoguelikeWeb2";
import { useRunRosterHullWeb2 } from "../../hooks/useRunRosterHull";
import type { RoguelikeRosterEntryWeb2 } from "../../hooks/useRoguelikeWeb2";
import { useTournamentListWeb2 } from "../../hooks/useTournamentListWeb2";
import { Web2TournamentState } from "../../types/web2Tournament";
import { buildRunPips } from "../../utils/runProgress";
import { CommandDeck, type CommandDeckProps, type OperationsSummary } from "./CommandDeck";

const NO_ROSTER: RoguelikeRosterEntryWeb2[] = [];
const RESUPPLY_KIND = 1;

/** Web2 adapter: same Command Deck data from the API instead of on-chain reads. */
export function CommandDeckWeb2(props: Omit<CommandDeckProps, "operations" | "openTournamentCount">) {
  const { run, isLoading: runLoading } = useRoguelikeRunWeb2();
  const activeRun = run?.status === "ACTIVE" ? run : null;
  const { nodes } = useRoguelikeCampaignNodesWeb2WithContent(activeRun?.campaignId);

  // Hull bars only show in layout B; skip the reads otherwise.
  const roster = props.layout === "B" && activeRun ? activeRun.roster : NO_ROSTER;
  const hullByShipId = useRunRosterHullWeb2(roster);

  const operations = useMemo<OperationsSummary>(() => {
    if (runLoading) return { state: "loading", pips: [], roster: [] };
    if (!activeRun) return { state: "noRun", pips: [], roster: [] };
    const current = nodes.find((n) => n.id === activeRun.currentNodeId);
    const pips = buildRunPips(
      nodes.map((n) => ({
        id: n.id,
        isResupply: n.kind === RESUPPLY_KIND,
        childIds: n.childEdges.map((e) => e.childId),
      })),
      activeRun.currentNodeId,
      activeRun.defeatedNodeIds,
    );
    return {
      state: "active",
      missionTitle: current?.titleStatus === "ok" ? current.title : undefined,
      pips,
      roster: roster.map((entry) => ({
        key: String(entry.shipId),
        hullPercent: hullByShipId.get(String(entry.shipId)) ?? 100,
      })),
    };
  }, [runLoading, activeRun, nodes, roster, hullByShipId]);

  const { tournaments } = useTournamentListWeb2();
  const openTournamentCount = tournaments.filter(
    (t) => t.summary.state === Web2TournamentState.Registration || t.summary.state === Web2TournamentState.Active,
  ).length;

  return <CommandDeck {...props} operations={operations} openTournamentCount={openTournamentCount} />;
}

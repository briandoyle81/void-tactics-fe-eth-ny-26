"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useGetRoguelikeRun, useAreRoguelikeNodesDefeated } from "../../hooks/useRoguelikeRun";
import { useRoguelikeGraphWithContent } from "../../hooks/useRoguelikeNodeMap";
import { useRunRosterHullWeb3 } from "../../hooks/useRunRosterHull";
import { useTournamentList } from "../../hooks/useTournamentList";
import { RoguelikeNodeKind, RunStatus, type RoguelikeRun } from "../../types/roguelike";
import { TournamentState } from "../../types/types";
import { buildRunPips } from "../../utils/runProgress";
import { CommandDeck, type CommandDeckProps, type OperationsSummary } from "./CommandDeck";

const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1n;
const NO_SHIP_IDS: bigint[] = [];

/** Web3 adapter: reads the run, graph and tournaments on-chain and converts them for CommandDeck. */
export function CommandDeckWeb3(props: Omit<CommandDeckProps, "operations" | "openTournamentCount">) {
  const { address } = useAccount();
  const { data, isLoading: runLoading } = useGetRoguelikeRun(address);
  const run = data as RoguelikeRun | undefined;
  const activeRun = run?.status === RunStatus.Active ? run : undefined;

  const { nodes } = useRoguelikeGraphWithContent(activeRun?.campaignId ?? DEFAULT_ROGUELIKE_CAMPAIGN_ID);
  const nodeIds = useMemo(() => (activeRun ? nodes.map((n) => n.id) : NO_SHIP_IDS), [activeRun, nodes]);
  const { defeatedByNodeId } = useAreRoguelikeNodesDefeated(address, nodeIds);

  // Hull bars only show in layout B; skip the reads otherwise.
  const rosterIds = props.layout === "B" && activeRun ? activeRun.rosterShipIds : NO_SHIP_IDS;
  const hullByShipId = useRunRosterHullWeb3(address, rosterIds);

  const operations = useMemo<OperationsSummary>(() => {
    if (runLoading) return { state: "loading", pips: [], roster: [] };
    if (!activeRun) return { state: "noRun", pips: [], roster: [] };
    const current = nodes.find((n) => n.id === activeRun.currentNodeId);
    const pips = buildRunPips(
      nodes.map((n) => ({
        id: Number(n.id),
        isResupply: n.kind === RoguelikeNodeKind.Resupply,
        childIds: n.children.map((e) => Number(e.childId)),
      })),
      Number(activeRun.currentNodeId),
      nodes.filter((n) => defeatedByNodeId.get(n.id.toString())).map((n) => Number(n.id)),
    );
    const roster = rosterIds.map((id) => ({
      key: id.toString(),
      hullPercent: hullByShipId.get(id.toString()) ?? 100,
    }));
    return {
      state: "active",
      missionTitle: current?.titleStatus === "ok" ? current.title : undefined,
      pips,
      roster,
    };
  }, [runLoading, activeRun, nodes, defeatedByNodeId, rosterIds, hullByShipId]);

  const { tournaments } = useTournamentList();
  const openTournamentCount = tournaments.filter(
    (t) => t.state === TournamentState.Registration || t.state === TournamentState.Active,
  ).length;

  return <CommandDeck {...props} operations={operations} openTournamentCount={openTournamentCount} />;
}

"use client";

import { useMemo } from "react";
import { TOURNAMENTS_ENABLED } from "../../config/alpha";
import { useRoguelikeRunWeb2, useRoguelikeCampaignNodesWeb2WithContent } from "../../hooks/useRoguelikeWeb2";
import { useRunRosterHullWeb2 } from "../../hooks/useRunRosterHull";
import type { RoguelikeRosterEntryWeb2 } from "../../hooks/useRoguelikeWeb2";
import { useTournamentListWeb2 } from "../../hooks/useTournamentListWeb2";
import { Web2TournamentState } from "../../types/web2Tournament";
import { buildRunPips } from "../../utils/runProgress";
import { CommandDeck, type CommandDeckProps, type FeaturedPackSummary, type OperationsSummary } from "./CommandDeck";
import { usePurchaseTiersWeb2 } from "../../hooks/usePurchaseTiersWeb2";
import { useStaggeredPreviewSeeds } from "../../hooks/useStaggeredPreviewSeeds";
import { ShipImageWeb2 } from "../ShipImageWeb2";
import { getKillsForRank } from "../../lib/purchaseTiers";
import { getTierCallout, getTierColors } from "../../utils/shipPurchaseTierDisplay";
import { getPreviewShipSpecsForTier } from "../../utils/shipPreviewSpec";
import { PREVIEW_REFRESH_INTERVAL_MS, toPreviewShipWeb2 } from "../../utils/previewShips";

const NO_ROSTER: RoguelikeRosterEntryWeb2[] = [];
const RESUPPLY_KIND = 1;

/** Web2 adapter: same Command Deck data from the API instead of on-chain reads. */
export function CommandDeckWeb2(
  props: Omit<CommandDeckProps, "operations" | "openTournamentCount" | "featuredPack">,
) {
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

  const { tournaments } = useTournamentListWeb2({ enabled: TOURNAMENTS_ENABLED });
  const openTournamentCount = tournaments.filter(
    (t) => t.summary.state === Web2TournamentState.Registration || t.summary.state === Web2TournamentState.Active,
  ).length;

  // Featured store tile (layout A): the top pack, previewed as on the Store.
  const { tiers: packTiers } = usePurchaseTiersWeb2();
  const [featuredSeed = 0] = useStaggeredPreviewSeeds(1, PREVIEW_REFRESH_INTERVAL_MS);
  const featuredPack = useMemo<FeaturedPackSummary | undefined>(() => {
    const top = packTiers[packTiers.length - 1];
    if (props.layout !== "A" || !top) return undefined;
    const ships = getPreviewShipSpecsForTier(featuredSeed, top.tier, top.shipCount, getKillsForRank).map(
      toPreviewShipWeb2,
    );
    return {
      callout: getTierCallout(top.tier),
      shipCount: top.shipCount,
      priceLabel: `$${(top.priceUsdCents / 100).toFixed(2)} USD`,
      textClass: getTierColors(top.tier).text,
      previewShipImages: ships.map((ship, idx) => (
        <ShipImageWeb2
          key={idx}
          ship={ship}
          holdPreviousImage
          showLoadingState={false}
          rankStarsSize={idx === 0 ? "large" : "default"}
        />
      )),
    };
  }, [props.layout, packTiers, featuredSeed]);

  return (
    <CommandDeck
      {...props}
      operations={operations}
      openTournamentCount={openTournamentCount}
      featuredPack={featuredPack}
    />
  );
}

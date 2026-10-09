"use client";

import { useMemo } from "react";
import { TOURNAMENTS_ENABLED } from "../../config/alpha";
import { useAccount } from "wagmi";
import { useRoguelikeRunView } from "../../hooks/useGameLens";
import { useRoguelikeGraphWithContent } from "../../hooks/useRoguelikeNodeMap";
import { useRunRosterHullWeb3 } from "../../hooks/useRunRosterHull";
import { useTournamentList } from "../../hooks/useTournamentList";
import { RoguelikeNodeKind, RunStatus } from "../../types/roguelike";
import { TournamentState } from "../../types/types";
import { buildRunPips } from "../../utils/runProgress";
import { CommandDeck, type CommandDeckProps, type FeaturedPackSummary, type OperationsSummary } from "./CommandDeck";
import { useShipsPurchaseInfo } from "../../hooks/useShipsPurchaseInfo";
import { useStaggeredPreviewSeeds } from "../../hooks/useStaggeredPreviewSeeds";
import { ShipImage } from "../ShipImage";
import { FLOW_USD_TIERS } from "../../config/flowPayment";
import { getTierCallout, getTierColors } from "../../utils/shipPurchaseTierDisplay";
import { getPreviewShipSpecsForTier } from "../../utils/shipPreviewSpec";
import {
  PREVIEW_REFRESH_INTERVAL_MS,
  previewShipsDestroyedForRank,
  toPreviewShip,
} from "../../utils/previewShips";

const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1n;
const NO_SHIP_IDS: bigint[] = [];

/** Web3 adapter: reads the run, graph and tournaments on-chain and converts them for CommandDeck. */
export function CommandDeckWeb3(
  props: Omit<CommandDeckProps, "operations" | "openTournamentCount" | "featuredPack">,
) {
  const { address } = useAccount();
  // Run, roster HP and cleared nodes in one GameLens call.
  const { run, defeatedByNodeId, isLoading: runLoading } = useRoguelikeRunView(address);
  const activeRun = run?.status === RunStatus.Active ? run : undefined;

  // The map (reachable nodes only, one call) for an active run's pips.
  const { nodes } = useRoguelikeGraphWithContent(
    activeRun?.campaignId ?? DEFAULT_ROGUELIKE_CAMPAIGN_ID,
    !!activeRun,
    { reachableOnly: true },
  );

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

  // A count only: skip the list's live event watchers (they poll the RPC).
  const { tournaments } = useTournamentList({ watch: false, enabled: TOURNAMENTS_ENABLED });
  const openTournamentCount = tournaments.filter(
    (t) => t.state === TournamentState.Registration || t.state === TournamentState.Active,
  ).length;

  // Featured store tile (layout A): the top pack, previewed as on the Store.
  const shipsPack = useShipsPurchaseInfo();
  const [featuredSeed = 0] = useStaggeredPreviewSeeds(1, PREVIEW_REFRESH_INTERVAL_MS);
  const featuredPack = useMemo<FeaturedPackSummary | undefined>(() => {
    const index = shipsPack.tierCount - 1;
    const tier = shipsPack.tiers[index];
    if (props.layout !== "A" || tier === undefined) return undefined;
    const ships = getPreviewShipSpecsForTier(
      featuredSeed,
      tier,
      shipsPack.shipsPerTier[index] ?? 1,
      previewShipsDestroyedForRank,
    ).map(toPreviewShip);
    return {
      callout: getTierCallout(tier),
      shipCount: shipsPack.shipsPerTier[index] ?? 1,
      priceLabel: `$${(FLOW_USD_TIERS[index] ?? FLOW_USD_TIERS[0]!).displayPrice} USD`,
      textClass: getTierColors(tier).text,
      previewShipImages: ships.map((ship, idx) => (
        <ShipImage
          key={idx}
          ship={ship}
          holdPreviousImage
          showLoadingState={false}
          rankStarsSize={idx === 0 ? "large" : "default"}
        />
      )),
    };
  }, [props.layout, shipsPack.tierCount, shipsPack.tiers, shipsPack.shipsPerTier, featuredSeed]);

  return (
    <CommandDeck
      {...props}
      operations={operations}
      openTournamentCount={openTournamentCount}
      featuredPack={featuredPack}
    />
  );
}

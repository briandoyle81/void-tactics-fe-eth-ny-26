"use client";

import { useMemo } from "react";
import {
  useGetAllPresetMaps,
  useMapModes,
  useMapNames,
  useMapsCreatorZonePositions,
  useMapsImpassablePositions,
  useMapsJoinerZonePositions,
} from "./useMapsContract";
import { useGetAllAIShipConfigs, useGetAllMapPlacements } from "./useAIEncountersContract";
import { useAllCampaignNodes } from "./useNodeMap";
import {
  useAllRoguelikeNodes,
  useCampaignAutoHealPercent,
  useRoguelikeCampaignCount,
  useRoguelikeCampaignInitialCostCap,
  useRoguelikeCampaignRequiredVariant,
  useRoguelikeCampaignRootNode,
} from "./useRoguelikeNodeMap";
import { useOnChainNodeContent } from "./useNodeContent";
import { useRoguelikeNodesWinEffects, useWinEffectAddresses } from "./useWinEffects";
import type { MissionChainSnapshot, NodeContent } from "../utils/missionSeedExport";

/** The deploy seeds exactly one roguelike campaign, which gets id 1. */
const ROGUELIKE_CAMPAIGN_ID = BigInt(1);

type Pos = { row: number; col: number };
const toPos = (p: Pos): Pos => ({ row: Number(p.row), col: Number(p.col) });

/**
 * Reads every piece of mission content the deploy seeds, converted to the
 * number-native MissionChainSnapshot that buildMissionSeedFiles consumes.
 * `snapshot` stays null until every read has returned, so a partial chain
 * state is never exported.
 */
export function useMissionChainSnapshot(): {
  snapshot: MissionChainSnapshot | null;
  isLoading: boolean;
  unknownWinEffects: string[];
} {
  // ---- Maps
  const { data: allMapsData, isLoading: mapsLoading } = useGetAllPresetMaps();
  const rawMaps = useMemo(() => {
    if (!Array.isArray(allMapsData) || allMapsData.length !== 3) return null;
    const [ids, blocked, scoring] = allMapsData as [
      bigint[],
      Pos[][],
      { row: number; col: number; points: number; onlyOnce: boolean }[][],
    ];
    return ids.map((id, i) => ({
      id: Number(id),
      blocked: blocked[i] ?? [],
      scoring: scoring[i] ?? [],
    }));
  }, [allMapsData]);
  const mapIds = useMemo(() => rawMaps?.map((m) => m.id) ?? [], [rawMaps]);
  const { nameByMapId, isLoading: namesLoading } = useMapNames(mapIds);
  const { modeByMapId, isLoading: modesLoading } = useMapModes(mapIds);
  const { impassableByMapId, isLoading: impassableLoading } = useMapsImpassablePositions(mapIds);
  const { creatorZoneByMapId, isLoading: creatorZoneLoading } = useMapsCreatorZonePositions(mapIds);
  const { joinerZoneByMapId, isLoading: joinerZoneLoading } = useMapsJoinerZonePositions(mapIds);

  // ---- AI configs + placements
  const { data: aiConfigs, isLoading: configsLoading } = useGetAllAIShipConfigs();
  const { data: placements, isLoading: placementsLoading } = useGetAllMapPlacements(mapIds);

  // ---- NodeMap campaign
  const {
    data: campaignNodes,
    campaignCount,
    isLoading: campaignNodesLoading,
  } = useAllCampaignNodes();

  // ---- Roguelike campaign
  const { nodes: roguelikeNodes, isLoading: roguelikeNodesLoading } = useAllRoguelikeNodes();
  const { data: rlCampaignCount } = useRoguelikeCampaignCount();
  const { data: autoHealPercent } = useCampaignAutoHealPercent(ROGUELIKE_CAMPAIGN_ID);
  const { data: requiredVariant } = useRoguelikeCampaignRequiredVariant(ROGUELIKE_CAMPAIGN_ID);
  const { data: rootNodeId } = useRoguelikeCampaignRootNode(ROGUELIKE_CAMPAIGN_ID);
  const { data: initialCostCap } = useRoguelikeCampaignInitialCostCap(ROGUELIKE_CAMPAIGN_ID);
  const roguelikeNodeIds = useMemo(() => roguelikeNodes.map((n) => n.id), [roguelikeNodes]);
  const { effectsByNodeId, isLoading: winEffectsLoading } =
    useRoguelikeNodesWinEffects(roguelikeNodeIds);
  const winEffectAddresses = useWinEffectAddresses();

  // ---- Titles/descriptions: what's set on chain in NodeContentRegistry.
  const campaignNodeIds = useMemo(() => campaignNodes.map((n) => n.id), [campaignNodes]);
  const { contentById: campaignChainContent, isLoading: campaignContentLoading } =
    useOnChainNodeContent("CAMPAIGN", campaignNodeIds);
  const { contentById: roguelikeChainContent, isLoading: roguelikeContentLoading } =
    useOnChainNodeContent("ROGUELIKE", roguelikeNodeIds);

  const isLoading =
    mapsLoading ||
    namesLoading ||
    modesLoading ||
    impassableLoading ||
    creatorZoneLoading ||
    joinerZoneLoading ||
    configsLoading ||
    placementsLoading ||
    campaignNodesLoading ||
    roguelikeNodesLoading ||
    winEffectsLoading ||
    campaignContentLoading ||
    roguelikeContentLoading;

  return useMemo(() => {
    const keyByAddress = new Map(
      Object.entries(winEffectAddresses)
        .filter(([, address]) => !!address)
        .map(([key, address]) => [address.toLowerCase(), key]),
    );
    const unknownWinEffects = new Set<string>();

    const ready =
      !isLoading &&
      rawMaps != null &&
      aiConfigs != null &&
      rlCampaignCount != null &&
      autoHealPercent != null &&
      requiredVariant != null &&
      rootNodeId != null &&
      initialCostCap != null &&
      mapIds.every(
        (id) =>
          nameByMapId.has(id) &&
          modeByMapId.has(id) &&
          impassableByMapId.has(id) &&
          creatorZoneByMapId.has(id) &&
          joinerZoneByMapId.has(id),
      ) &&
      roguelikeNodes.every((n) => effectsByNodeId.has(Number(n.id)));
    if (!ready) return { snapshot: null, isLoading: true, unknownWinEffects: [] };

    // Only text actually on chain; nodes without it export no title/description.
    const campaignContent = campaignChainContent;
    const roguelikeContent = roguelikeChainContent;

    const snapshot: MissionChainSnapshot = {
      maps: rawMaps!.map((m) => ({
        id: m.id,
        name: nameByMapId.get(m.id) ?? "",
        mode: Number(modeByMapId.get(m.id)),
        blockedTiles: m.blocked.map(toPos),
        impassableTiles: (impassableByMapId.get(m.id) ?? []).map(toPos),
        scoringTiles: m.scoring.map((s) => ({
          row: Number(s.row),
          col: Number(s.col),
          points: Number(s.points),
          onlyOnce: s.onlyOnce,
        })),
        creatorZone: (creatorZoneByMapId.get(m.id) ?? []).map(toPos),
        joinerZone: (joinerZoneByMapId.get(m.id) ?? []).map(toPos),
      })),
      aiConfigs: aiConfigs!.map((c) => ({
        id: Number(c.id),
        name: c.name,
        equipment: {
          mainWeapon: Number(c.equipment.mainWeapon),
          armor: Number(c.equipment.armor),
          shields: Number(c.equipment.shields),
          special: Number(c.equipment.special),
        },
        traits: {
          variant: Number(c.traits.variant),
          accuracy: Number(c.traits.accuracy),
          hull: Number(c.traits.hull),
          speed: Number(c.traits.speed),
        },
        archetype: Number(c.archetype),
      })),
      placements: placements.map((p) => ({
        mapId: p.mapId,
        positions: p.positions.map(toPos),
        configIds: p.configIds.map(Number),
      })),
      campaignCount,
      campaignNodes: campaignNodes.map((n) => ({
        id: Number(n.id),
        campaignId: Number(n.campaignId),
        mapId: Number(n.mapId),
        prerequisites: n.prerequisites.map(Number),
        costLimit: Number(n.costLimit),
        turnTime: Number(n.turnTime),
        maxScore: Number(n.maxScore),
        creatorGoesFirst: n.creatorGoesFirst,
      })),
      roguelike: {
        campaignCount: Number(rlCampaignCount),
        campaignId: Number(ROGUELIKE_CAMPAIGN_ID),
        autoHealPercent: Number(autoHealPercent),
        initialCostCap: Number(initialCostCap),
        requiredVariant: Number(requiredVariant),
        rootNodeId: Number(rootNodeId),
        nodes: roguelikeNodes.map((n) => ({
          id: Number(n.id),
          campaignId: Number(n.campaignId),
          kind: Number(n.kind),
          mapId: Number(n.mapId),
          turnTime: Number(n.turnTime),
          maxScore: Number(n.maxScore),
          creatorGoesFirst: n.creatorGoesFirst,
          costCapOverride: Number(n.costCapOverride),
          children: n.children.map((c) => ({ childId: Number(c.childId), twoWay: c.twoWay })),
          winEffects: (effectsByNodeId.get(Number(n.id)) ?? []).flatMap((address) => {
            const key = keyByAddress.get(address.toLowerCase());
            if (!key) unknownWinEffects.add(address);
            return key ? [key] : [];
          }),
        })),
      },
      campaignContent,
      roguelikeContent,
    };
    return { snapshot, isLoading: false, unknownWinEffects: [...unknownWinEffects] };
  }, [
    isLoading,
    rawMaps,
    mapIds,
    nameByMapId,
    modeByMapId,
    impassableByMapId,
    creatorZoneByMapId,
    joinerZoneByMapId,
    aiConfigs,
    placements,
    campaignCount,
    campaignNodes,
    roguelikeNodes,
    rlCampaignCount,
    autoHealPercent,
    requiredVariant,
    rootNodeId,
    initialCostCap,
    effectsByNodeId,
    winEffectAddresses,
    campaignChainContent,
    roguelikeChainContent,
  ]);
}

// Turns live on-chain mission content (maps, AI ship configs, enemy
// placements, campaign + roguelike node graphs, node titles, roguelike win
// effects) into the three seed files the contracts repo's deploy reads
// (void-tactics-contracts-eth-online-2026: ignition/data/
// singlePlayerStarterContent.json, roguelikeStarterContent.json,
// pvpStarterContent.json — consumed by ignition/modules/DeployAndConfig.ts).
//
// Those files reference everything by string key, and the deploy hardcodes
// some keys (campaign "mainCampaign", node "f06"), so the export must keep
// existing keys stable. It takes the current seed files as a baseline and
// maps chain items back to their keys:
// - maps, NodeMap campaigns/nodes and roguelike nodes: the deploy forces
//   these to be created in array order, so on-chain id == 1-indexed
//   position in the baseline (maps across all three files, in the deploy's
//   sp -> roguelike -> pvp concatenation order).
// - AI ship configs: created without forced order (ids read from events),
//   so these are matched by content, then by unique name, then by position.
// Anything on chain past the baseline gets a generated key.
//
// Pure and number-native: the caller converts chain reads first (see
// useMissionChainSnapshot).

export interface SeedPos {
  row: number;
  col: number;
}
export interface SeedScoringTile extends SeedPos {
  points: number;
  onlyOnce: boolean;
}
export type SeedMapMode = "PvP" | "PvE" | "Both";

export interface SeedMap {
  key: string;
  name: string;
  mode: SeedMapMode;
  type: string;
  blockedTiles: SeedPos[];
  impassableTiles: SeedPos[];
  scoringTiles: SeedScoringTile[];
  creatorZone: SeedPos[];
  joinerZone: SeedPos[];
}
export interface SeedEquipment {
  mainWeapon: number;
  armor: number;
  shields: number;
  special: number;
}
export interface SeedTraits {
  variant: number;
  accuracy: number;
  hull: number;
  speed: number;
}
export interface SeedAIConfig {
  key: string;
  name: string;
  equipment: SeedEquipment;
  traits: SeedTraits;
  archetype: number;
}
export interface SeedPlacement {
  mapKey: string;
  positions: SeedPos[];
  configKeys: string[];
}
export interface SeedCampaignNode {
  key: string;
  campaignKey: string;
  mapKey: string;
  prerequisites: string[];
  costLimit: number;
  turnTime: number;
  maxScore: number;
  creatorGoesFirst: boolean;
  title?: string;
  description?: string;
}
export interface SeedRoguelikeNode {
  key: string;
  kind: "Combat" | "Resupply";
  mapKey?: string;
  turnTime?: number;
  maxScore?: number;
  creatorGoesFirst?: boolean;
  costCapOverride?: number;
  title?: string;
  description?: string;
  /** Win effect catalog keys (e.g. "DEC_BONUS_WIN_EFFECT"), in run order. */
  winEffects?: string[];
}
export interface SeedRoguelikeEdge {
  from: string;
  to: string;
  twoWay?: boolean;
}

export interface SinglePlayerSeed {
  maps: SeedMap[];
  aiShipColors: Record<string, number>;
  aiShipConfigs: SeedAIConfig[];
  mapPlacements: SeedPlacement[];
  campaigns: { key: string }[];
  campaignNodes: SeedCampaignNode[];
  [extra: string]: unknown;
}
export interface RoguelikeSeed {
  campaign: { autoHealPercent: number; initialCostCap: number; requiredVariant: number };
  root: string;
  maps: SeedMap[];
  mapPlacements: SeedPlacement[];
  nodes: SeedRoguelikeNode[];
  edges: SeedRoguelikeEdge[];
  [extra: string]: unknown;
}
export interface PvpSeed {
  maps: SeedMap[];
  [extra: string]: unknown;
}
export interface MissionSeedFiles {
  singlePlayer: SinglePlayerSeed;
  roguelike: RoguelikeSeed;
  pvp: PvpSeed;
}

export interface NodeContent {
  title: string;
  description: string;
}

export interface ChainMap {
  id: number;
  name: string;
  /** Maps.mapMode: 0 PvP, 1 PvE, 2 Both */
  mode: number;
  blockedTiles: SeedPos[];
  impassableTiles: SeedPos[];
  scoringTiles: SeedScoringTile[];
  creatorZone: SeedPos[];
  joinerZone: SeedPos[];
}
export interface ChainAIConfig {
  id: number;
  name: string;
  equipment: SeedEquipment;
  traits: SeedTraits;
  archetype: number;
}
export interface ChainPlacement {
  mapId: number;
  positions: SeedPos[];
  configIds: number[];
}
export interface ChainCampaignNode {
  id: number;
  campaignId: number;
  mapId: number;
  prerequisites: number[];
  costLimit: number;
  turnTime: number;
  maxScore: number;
  creatorGoesFirst: boolean;
}
export interface ChainRoguelikeNode {
  id: number;
  campaignId: number;
  /** RoguelikeNodeKind: 0 Combat, 1 Resupply */
  kind: number;
  mapId: number;
  turnTime: number;
  maxScore: number;
  creatorGoesFirst: boolean;
  costCapOverride: number;
  children: { childId: number; twoWay: boolean }[];
  /** Win effect catalog keys already resolved from resolver addresses. */
  winEffects: string[];
}
export interface MissionChainSnapshot {
  maps: ChainMap[];
  aiConfigs: ChainAIConfig[];
  placements: ChainPlacement[];
  campaignCount: number;
  campaignNodes: ChainCampaignNode[];
  roguelike: {
    campaignCount: number;
    /** The deploy seeds exactly one roguelike campaign (id 1). */
    campaignId: number;
    autoHealPercent: number;
    initialCostCap: number;
    requiredVariant: number;
    rootNodeId: number;
    nodes: ChainRoguelikeNode[];
  };
  /** Only real content (DB edit or static entry), not generic placeholders. */
  campaignContent: Map<number, NodeContent>;
  roguelikeContent: Map<number, NodeContent>;
}

const MAP_MODE_NAMES: Record<number, SeedMapMode> = { 0: "PvP", 1: "PvE", 2: "Both" };

/**
 * The deploy calls AIEncounters.setMaxPlacementsPerMap(14) before placing
 * any fleet (DeployAndConfig.ts), and setMapPlacements reverts
 * TooManyPlacements above it — keep in sync if the deploy's value changes.
 */
export const DEPLOY_MAX_PLACEMENTS_PER_MAP = 14;

function uniqueKey(base: string, used: Set<string>): string {
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  return key;
}

const aiConfigSignature = (c: {
  name: string;
  equipment: SeedEquipment;
  traits: SeedTraits;
  archetype: number;
}) =>
  [
    c.name,
    c.equipment.mainWeapon,
    c.equipment.armor,
    c.equipment.shields,
    c.equipment.special,
    c.traits.variant,
    c.traits.accuracy,
    c.traits.hull,
    c.traits.speed,
    c.archetype,
  ].join("|");

function withContent<T extends object>(node: T, content: NodeContent | undefined): T {
  if (!content) return node;
  return { ...node, title: content.title, description: content.description };
}

/** Prerequisites must come before dependents (the deploy resolves them by key as it goes). Stable by id otherwise. */
function orderCampaignNodes(nodes: ChainCampaignNode[]): {
  ordered: ChainCampaignNode[];
  reordered: boolean;
} {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const remaining = [...nodes].sort((a, b) => a.id - b.id);
  const placed = new Set<number>();
  const ordered: ChainCampaignNode[] = [];
  while (remaining.length > 0) {
    const idx = remaining.findIndex((n) =>
      n.prerequisites.every((p) => placed.has(p) || !byId.has(p)),
    );
    // A prerequisite cycle can't be seeded in any order; fall back to id order for the rest.
    const next = remaining.splice(idx === -1 ? 0 : idx, 1)[0];
    placed.add(next.id);
    ordered.push(next);
  }
  const reordered = ordered.some((n, i) => i > 0 && n.id < ordered[i - 1].id);
  return { ordered, reordered };
}

export function buildMissionSeedFiles(
  chain: MissionChainSnapshot,
  baseline: MissionSeedFiles,
): { files: MissionSeedFiles; warnings: string[] } {
  const warnings: string[] = [];

  // ---- Maps -------------------------------------------------------------
  type MapFile = "singlePlayer" | "roguelike" | "pvp";
  const baselineMaps: { map: SeedMap; file: MapFile }[] = [
    ...baseline.singlePlayer.maps.map((map) => ({ map, file: "singlePlayer" as const })),
    ...baseline.roguelike.maps.map((map) => ({ map, file: "roguelike" as const })),
    ...baseline.pvp.maps.map((map) => ({ map, file: "pvp" as const })),
  ];
  const usedMapKeys = new Set(baselineMaps.map((b) => b.map.key));
  const roguelikeMapIds = new Set(
    chain.roguelike.nodes
      .filter((n) => n.campaignId === chain.roguelike.campaignId && n.kind === 0)
      .map((n) => n.mapId),
  );
  const campaignMapIds = new Set(chain.campaignNodes.map((n) => n.mapId));
  const placementMapIds = new Set(
    chain.placements.filter((p) => p.positions.length > 0).map((p) => p.mapId),
  );

  const mapKeyById = new Map<number, string>();
  const outMaps: Record<MapFile, SeedMap[]> = { singlePlayer: [], roguelike: [], pvp: [] };
  for (const m of [...chain.maps].sort((a, b) => a.id - b.id)) {
    const existing = baselineMaps[m.id - 1];
    const key = existing ? existing.map.key : uniqueKey(`map${m.id}`, usedMapKeys);
    const file: MapFile = existing
      ? existing.file
      : roguelikeMapIds.has(m.id)
        ? "roguelike"
        : campaignMapIds.has(m.id) || placementMapIds.has(m.id)
          ? "singlePlayer"
          : "pvp";
    const hasBlocking = m.blockedTiles.length > 0 || m.impassableTiles.length > 0;
    // "scoring" maps are created without blocked/impassable tiles, so only
    // keep that type if the map still has none.
    const type = existing && existing.map.type === "scoring" && !hasBlocking ? "scoring" : "full";
    const mode = MAP_MODE_NAMES[m.mode];
    if (!mode) warnings.push(`Map #${m.id} has unknown mode ${m.mode}; exported as Both.`);
    mapKeyById.set(m.id, key);
    outMaps[file].push({
      key,
      name: m.name,
      mode: mode ?? "Both",
      type,
      blockedTiles: m.blockedTiles,
      impassableTiles: m.impassableTiles,
      scoringTiles: m.scoringTiles,
      creatorZone: m.creatorZone,
      joinerZone: m.joinerZone,
    });
  }
  if (chain.maps.length < baselineMaps.length) {
    warnings.push(
      `Chain has ${chain.maps.length} maps but the baseline seed files list ${baselineMaps.length}; ` +
        "baseline maps past the chain's count were dropped. Check the seed files match this deployment.",
    );
  }
  const mapKey = (id: number, context: string) => {
    const key = mapKeyById.get(id);
    if (!key) warnings.push(`${context} references map #${id}, which isn't on chain.`);
    return key ?? `missingMap${id}`;
  };

  // ---- AI ship configs ----------------------------------------------------
  const baselineConfigs = baseline.singlePlayer.aiShipConfigs;
  const usedConfigKeys = new Set(baselineConfigs.map((c) => c.key));
  const claimed = new Set<string>();
  const configKeyById = new Map<number, string>();
  const sortedConfigs = [...chain.aiConfigs].sort((a, b) => a.id - b.id);
  const claim = (chainId: number, key: string) => {
    configKeyById.set(chainId, key);
    claimed.add(key);
  };
  // 1. exact content match
  for (const c of sortedConfigs) {
    const sig = aiConfigSignature(c);
    const match = baselineConfigs.find((b) => !claimed.has(b.key) && aiConfigSignature(b) === sig);
    if (match) claim(c.id, match.key);
  }
  // 2. unique name match (an edited config keeps its name)
  for (const c of sortedConfigs) {
    if (configKeyById.has(c.id)) continue;
    const named = baselineConfigs.filter((b) => !claimed.has(b.key) && b.name === c.name);
    if (named.length === 1) claim(c.id, named[0].key);
  }
  // 3. same position, 4. new key
  for (const c of sortedConfigs) {
    if (configKeyById.has(c.id)) continue;
    const byPosition = baselineConfigs[c.id - 1];
    if (byPosition && !claimed.has(byPosition.key)) {
      claim(c.id, byPosition.key);
    } else {
      claim(c.id, uniqueKey(`aiConfig${c.id}`, usedConfigKeys));
    }
  }
  const baselineConfigOrder = new Map(baselineConfigs.map((b, i) => [b.key, i]));
  const outConfigs: SeedAIConfig[] = sortedConfigs
    .map((c) => ({
      key: configKeyById.get(c.id)!,
      name: c.name,
      equipment: c.equipment,
      traits: c.traits,
      archetype: c.archetype,
    }))
    .sort(
      (a, b) =>
        (baselineConfigOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
        (baselineConfigOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER),
    );
  const droppedConfigs = baselineConfigs.filter((b) => !claimed.has(b.key));
  if (droppedConfigs.length > 0) {
    warnings.push(
      `${droppedConfigs.length} AI config(s) in the baseline have no on-chain match and were dropped: ` +
        droppedConfigs.map((c) => c.key).join(", "),
    );
  }

  // ---- Enemy placements -----------------------------------------------------
  const outPlacements: Record<"singlePlayer" | "roguelike", SeedPlacement[]> = {
    singlePlayer: [],
    roguelike: [],
  };
  const mapFileByKey = new Map<string, MapFile>();
  (Object.keys(outMaps) as MapFile[]).forEach((file) =>
    outMaps[file].forEach((m) => mapFileByKey.set(m.key, file)),
  );
  for (const p of [...chain.placements].sort((a, b) => a.mapId - b.mapId)) {
    if (p.positions.length === 0) continue;
    const key = mapKey(p.mapId, "Enemy placement");
    if (p.positions.length > DEPLOY_MAX_PLACEMENTS_PER_MAP) {
      warnings.push(
        `Map #${p.mapId} (${key}) has ${p.positions.length} enemy ships, but the deploy allows at most ` +
          `${DEPLOY_MAX_PLACEMENTS_PER_MAP} per map, so placing them would fail. Trim the fleet or raise ` +
          "the deploy's setMaxPlacementsPerMap value.",
      );
    }
    const configKeys = p.configIds.map((id) => {
      const k = configKeyById.get(id);
      if (!k) warnings.push(`Placement on map #${p.mapId} uses AI config #${id}, which isn't on chain.`);
      return k ?? `missingAIConfig${id}`;
    });
    // The deploy places fleets from both files by map key, so a PvP-file
    // map's fleet can live in the single-player list.
    const file = mapFileByKey.get(key) === "roguelike" ? "roguelike" : "singlePlayer";
    outPlacements[file].push({ mapKey: key, positions: p.positions, configKeys });
  }

  // ---- NodeMap campaigns + nodes --------------------------------------------
  const usedCampaignKeys = new Set(baseline.singlePlayer.campaigns.map((c) => c.key));
  const campaignKeyById = new Map<number, string>();
  const outCampaigns: { key: string }[] = [];
  for (let id = 1; id <= chain.campaignCount; id++) {
    const existing = baseline.singlePlayer.campaigns[id - 1];
    const key = existing ? existing.key : uniqueKey(`campaign${id}`, usedCampaignKeys);
    campaignKeyById.set(id, key);
    outCampaigns.push({ key });
  }

  const baselineNodes = baseline.singlePlayer.campaignNodes;
  const usedNodeKeys = new Set(baselineNodes.map((n) => n.key));
  const nodeKeyById = new Map<number, string>();
  for (const n of [...chain.campaignNodes].sort((a, b) => a.id - b.id)) {
    const existing = baselineNodes[n.id - 1];
    nodeKeyById.set(n.id, existing ? existing.key : uniqueKey(`node${n.id}`, usedNodeKeys));
  }
  const { ordered: orderedNodes, reordered } = orderCampaignNodes(chain.campaignNodes);
  if (reordered) {
    warnings.push(
      "Some campaign nodes were moved after a prerequisite added later on chain, so their " +
        "numeric node ids will differ on the new deploy (keys are unchanged).",
    );
  }
  const outCampaignNodes: SeedCampaignNode[] = orderedNodes.map((n) =>
    withContent(
      {
        key: nodeKeyById.get(n.id)!,
        campaignKey: campaignKeyById.get(n.campaignId) ?? `missingCampaign${n.campaignId}`,
        mapKey: mapKey(n.mapId, `Campaign node #${n.id}`),
        prerequisites: n.prerequisites
          .map((p) => nodeKeyById.get(p))
          .filter((k): k is string => k != null),
        costLimit: n.costLimit,
        turnTime: n.turnTime,
        maxScore: n.maxScore,
        creatorGoesFirst: n.creatorGoesFirst,
      },
      chain.campaignContent.get(n.id),
    ),
  );
  for (const required of ["mainCampaign"]) {
    if (!outCampaigns.some((c) => c.key === required)) {
      warnings.push(`The deploy expects a campaign keyed "${required}", which isn't in the export.`);
    }
  }
  if (!outCampaignNodes.some((n) => n.key === "f06")) {
    warnings.push('The deploy expects a campaign node keyed "f06" (medal final node), which isn\'t in the export.');
  }

  // ---- Roguelike campaign ----------------------------------------------------
  const rl = chain.roguelike;
  if (rl.campaignCount > 1) {
    warnings.push(
      `Chain has ${rl.campaignCount} roguelike campaigns; the deploy seeds one, so only campaign #${rl.campaignId} was exported.`,
    );
  }
  const baselineRlNodes = baseline.roguelike.nodes;
  const usedRlKeys = new Set(baselineRlNodes.map((n) => n.key));
  const rlNodes = [...rl.nodes]
    .filter((n) => n.campaignId === rl.campaignId)
    .sort((a, b) => a.id - b.id);
  const rlKeyById = new Map<number, string>();
  for (const n of rlNodes) {
    const existing = baselineRlNodes[n.id - 1];
    rlKeyById.set(n.id, existing ? existing.key : uniqueKey(`rl${n.id}`, usedRlKeys));
  }
  const outRlNodes: SeedRoguelikeNode[] = rlNodes.map((n) => {
    const key = rlKeyById.get(n.id)!;
    const base: SeedRoguelikeNode =
      n.kind === 0
        ? {
            key,
            kind: "Combat",
            mapKey: mapKey(n.mapId, `Roguelike node #${n.id}`),
            turnTime: n.turnTime,
            maxScore: n.maxScore,
            creatorGoesFirst: n.creatorGoesFirst,
          }
        : { key, kind: "Resupply", costCapOverride: n.costCapOverride };
    const node = withContent(base, chain.roguelikeContent.get(n.id));
    return n.winEffects.length > 0 ? { ...node, winEffects: n.winEffects } : node;
  });

  // Keep baseline edge order for edges that still exist, then append new ones.
  const chainEdges: SeedRoguelikeEdge[] = [];
  for (const n of rlNodes) {
    for (const child of n.children) {
      const to = rlKeyById.get(child.childId);
      if (!to) {
        warnings.push(`Roguelike node #${n.id} links to node #${child.childId}, which isn't in this campaign.`);
        continue;
      }
      chainEdges.push({ from: rlKeyById.get(n.id)!, to, ...(child.twoWay ? { twoWay: true } : {}) });
    }
  }
  const edgeId = (e: SeedRoguelikeEdge) => `${e.from}->${e.to}`;
  const baselineEdgeOrder = new Map(baseline.roguelike.edges.map((e, i) => [edgeId(e), i]));
  const outEdges = chainEdges.sort(
    (a, b) =>
      (baselineEdgeOrder.get(edgeId(a)) ?? Number.MAX_SAFE_INTEGER) -
      (baselineEdgeOrder.get(edgeId(b)) ?? Number.MAX_SAFE_INTEGER),
  );
  const root = rlKeyById.get(rl.rootNodeId);
  if (!root) warnings.push(`Roguelike root node #${rl.rootNodeId} isn't in the exported campaign.`);

  return {
    files: {
      singlePlayer: {
        ...baseline.singlePlayer,
        maps: outMaps.singlePlayer,
        aiShipConfigs: outConfigs,
        mapPlacements: outPlacements.singlePlayer,
        campaigns: outCampaigns,
        campaignNodes: outCampaignNodes,
      },
      roguelike: {
        ...baseline.roguelike,
        campaign: {
          ...baseline.roguelike.campaign,
          autoHealPercent: rl.autoHealPercent,
          initialCostCap: rl.initialCostCap,
          requiredVariant: rl.requiredVariant,
        },
        root: root ?? baseline.roguelike.root,
        maps: outMaps.roguelike,
        mapPlacements: outPlacements.roguelike,
        nodes: outRlNodes,
        edges: outEdges,
      },
      pvp: { ...baseline.pvp, maps: outMaps.pvp },
    },
    warnings,
  };
}

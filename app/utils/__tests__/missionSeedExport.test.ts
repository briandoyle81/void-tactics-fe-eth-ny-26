import { describe, it, expect } from "vitest";
import {
  buildMissionSeedFiles,
  type MissionChainSnapshot,
  type MissionSeedFiles,
} from "../missionSeedExport";

const MODE_IDS: Record<string, number> = { PvP: 0, PvE: 1, Both: 2 };

/** The chain state a fresh deploy of `seed` produces (DeployAndConfig.ts's id assignment). */
export function chainFromSeed(seed: MissionSeedFiles): MissionChainSnapshot {
  const allMaps = [...seed.singlePlayer.maps, ...seed.roguelike.maps, ...seed.pvp.maps];
  const mapIds = new Map(allMaps.map((m, i) => [m.key, i + 1]));
  const configIds = new Map(seed.singlePlayer.aiShipConfigs.map((c, i) => [c.key, i + 1]));
  const campaignIds = new Map(seed.singlePlayer.campaigns.map((c, i) => [c.key, i + 1]));
  const nodeIds = new Map(seed.singlePlayer.campaignNodes.map((n, i) => [n.key, i + 1]));
  const rlIds = new Map(seed.roguelike.nodes.map((n, i) => [n.key, i + 1]));
  return {
    maps: allMaps.map((m, i) => ({
      id: i + 1,
      name: m.name,
      mode: MODE_IDS[m.mode],
      blockedTiles: m.blockedTiles,
      impassableTiles: m.impassableTiles,
      scoringTiles: m.scoringTiles,
      creatorZone: m.creatorZone,
      joinerZone: m.joinerZone,
    })),
    aiConfigs: seed.singlePlayer.aiShipConfigs.map((c, i) => ({
      id: i + 1,
      name: c.name,
      equipment: c.equipment,
      traits: c.traits,
      archetype: c.archetype,
    })),
    placements: [...seed.singlePlayer.mapPlacements, ...seed.roguelike.mapPlacements].map((p) => ({
      mapId: mapIds.get(p.mapKey)!,
      positions: p.positions,
      configIds: p.configKeys.map((k) => configIds.get(k)!),
    })),
    campaignCount: seed.singlePlayer.campaigns.length,
    campaignNodes: seed.singlePlayer.campaignNodes.map((n, i) => ({
      id: i + 1,
      campaignId: campaignIds.get(n.campaignKey)!,
      mapId: mapIds.get(n.mapKey)!,
      prerequisites: n.prerequisites.map((k) => nodeIds.get(k)!),
      costLimit: n.costLimit,
      turnTime: n.turnTime,
      maxScore: n.maxScore,
      creatorGoesFirst: n.creatorGoesFirst,
    })),
    roguelike: {
      campaignCount: 1,
      campaignId: 1,
      autoHealPercent: seed.roguelike.campaign.autoHealPercent,
      initialCostCap: seed.roguelike.campaign.initialCostCap,
      requiredVariant: seed.roguelike.campaign.requiredVariant,
      rootNodeId: rlIds.get(seed.roguelike.root)!,
      nodes: seed.roguelike.nodes.map((n, i) => ({
        id: i + 1,
        campaignId: 1,
        kind: n.kind === "Combat" ? 0 : 1,
        mapId: n.mapKey ? mapIds.get(n.mapKey)! : 0,
        turnTime: n.turnTime ?? 0,
        maxScore: n.maxScore ?? 0,
        creatorGoesFirst: n.creatorGoesFirst ?? false,
        costCapOverride: n.costCapOverride ?? 0,
        children: seed.roguelike.edges
          .filter((e) => e.from === n.key)
          .map((e) => ({ childId: rlIds.get(e.to)!, twoWay: e.twoWay ?? false })),
        winEffects: n.winEffects ?? [],
      })),
    },
    campaignContent: new Map(
      seed.singlePlayer.campaignNodes.flatMap((n, i) =>
        n.title != null ? [[i + 1, { title: n.title, description: n.description ?? "" }]] : [],
      ),
    ),
    roguelikeContent: new Map(
      seed.roguelike.nodes.flatMap((n, i) =>
        n.title != null ? [[i + 1, { title: n.title, description: n.description ?? "" }]] : [],
      ),
    ),
  };
}

const tile = (row: number, col: number) => ({ row, col });
const map = (key: string, mode = "PvE") => ({
  key,
  name: `Map ${key}`,
  mode: mode as "PvE",
  type: "full",
  blockedTiles: [tile(1, 1)],
  impassableTiles: [],
  scoringTiles: [{ row: 5, col: 8, points: 5, onlyOnce: false }],
  creatorZone: [],
  joinerZone: [],
});

function fixture(): MissionSeedFiles {
  return {
    singlePlayer: {
      maps: [map("m01"), map("f06")],
      aiShipColors: { h1: 1 },
      aiShipConfigs: [
        {
          key: "grunt",
          name: "AI Grunt",
          equipment: { mainWeapon: 0, armor: 0, shields: 1, special: 0 },
          traits: { variant: 1, accuracy: 0, hull: 0, speed: 0 },
          archetype: 0,
        },
        {
          key: "brute",
          name: "AI Brute",
          equipment: { mainWeapon: 1, armor: 2, shields: 0, special: 0 },
          traits: { variant: 1, accuracy: 1, hull: 2, speed: 0 },
          archetype: 1,
        },
      ],
      mapPlacements: [{ mapKey: "m01", positions: [tile(2, 2)], configKeys: ["grunt"] }],
      campaigns: [{ key: "mainCampaign" }],
      campaignNodes: [
        {
          key: "m01",
          campaignKey: "mainCampaign",
          mapKey: "m01",
          prerequisites: [],
          costLimit: 500,
          turnTime: 600,
          maxScore: 15,
          creatorGoesFirst: true,
        },
        {
          key: "f06",
          campaignKey: "mainCampaign",
          mapKey: "f06",
          prerequisites: ["m01"],
          costLimit: 600,
          turnTime: 600,
          maxScore: 21,
          creatorGoesFirst: true,
        },
      ],
    },
    roguelike: {
      campaign: { autoHealPercent: 25, initialCostCap: 500, requiredVariant: 1 },
      root: "m01",
      maps: [map("rlM01")],
      mapPlacements: [{ mapKey: "rlM01", positions: [tile(3, 3)], configKeys: ["brute"] }],
      nodes: [
        { key: "m01", kind: "Combat", mapKey: "rlM01", turnTime: 600, maxScore: 15, creatorGoesFirst: true },
        { key: "r01", kind: "Resupply", costCapOverride: 700 },
      ],
      edges: [{ from: "m01", to: "r01" }],
    },
    pvp: { maps: [map("pvp01", "PvP")] },
  };
}

describe("buildMissionSeedFiles", () => {
  it("reproduces the seed files exactly when the chain matches them", () => {
    const seed = fixture();
    const { files, warnings } = buildMissionSeedFiles(chainFromSeed(seed), seed);
    expect(files).toEqual(seed);
    expect(warnings).toEqual([]);
  });

  it("keeps keys for edited content and adds titles and win effects", () => {
    const seed = fixture();
    const chain = chainFromSeed(seed);
    chain.aiConfigs[1].equipment = { ...chain.aiConfigs[1].equipment, armor: 3 }; // edited, same name
    chain.maps[0].name = "Renamed";
    chain.campaignContent.set(2, { title: "Final Stand", description: "Hold the line." });
    chain.roguelike.nodes[0].winEffects = ["DEC_BONUS_WIN_EFFECT"];
    chain.roguelike.nodes[0].children[0].twoWay = true;

    const { files, warnings } = buildMissionSeedFiles(chain, seed);
    expect(warnings).toEqual([]);
    expect(files.singlePlayer.aiShipConfigs[1]).toMatchObject({ key: "brute", equipment: { armor: 3 } });
    expect(files.roguelike.mapPlacements[0].configKeys).toEqual(["brute"]);
    expect(files.singlePlayer.maps[0]).toMatchObject({ key: "m01", name: "Renamed" });
    expect(files.singlePlayer.campaignNodes[1]).toMatchObject({
      key: "f06",
      title: "Final Stand",
      description: "Hold the line.",
    });
    expect(files.roguelike.nodes[0].winEffects).toEqual(["DEC_BONUS_WIN_EFFECT"]);
    expect(files.roguelike.edges).toEqual([{ from: "m01", to: "r01", twoWay: true }]);
  });

  it("gives new chain items generated keys in the right file", () => {
    const seed = fixture();
    const chain = chainFromSeed(seed);
    // New map (id 5) used by a new campaign node (id 3) that requires f06.
    chain.maps.push({ ...chain.maps[0], id: 5, name: "New Sector" });
    chain.campaignNodes.push({
      ...chain.campaignNodes[1],
      id: 3,
      mapId: 5,
      prerequisites: [2],
    });
    // New PvP-only map (id 6), referenced by nothing.
    chain.maps.push({ ...chain.maps[0], id: 6, mode: 0, name: "Arena" });

    const { files, warnings } = buildMissionSeedFiles(chain, seed);
    expect(warnings).toEqual([]);
    expect(files.singlePlayer.maps.map((m) => m.key)).toEqual(["m01", "f06", "map5"]);
    expect(files.pvp.maps.map((m) => m.key)).toEqual(["pvp01", "map6"]);
    expect(files.singlePlayer.campaignNodes[2]).toMatchObject({
      key: "node3",
      mapKey: "map5",
      prerequisites: ["f06"],
    });
  });

  it("orders a node after a prerequisite that was added later", () => {
    const seed = fixture();
    const chain = chainFromSeed(seed);
    chain.campaignNodes.push({ ...chain.campaignNodes[0], id: 3, prerequisites: [] });
    chain.campaignNodes[0].prerequisites = [3]; // node 1 now depends on newer node 3

    const { files, warnings } = buildMissionSeedFiles(chain, seed);
    const keys = files.singlePlayer.campaignNodes.map((n) => n.key);
    expect(keys.indexOf("node3")).toBeLessThan(keys.indexOf("m01"));
    expect(warnings.some((w) => w.includes("numeric node ids will differ"))).toBe(true);
  });

  it("warns when a map has more enemy ships than the deploy allows", () => {
    const seed = fixture();
    const chain = chainFromSeed(seed);
    chain.placements[0].positions = Array.from({ length: 15 }, (_, i) => tile(i % 11, i));
    chain.placements[0].configIds = Array.from({ length: 15 }, () => 1);
    const { warnings } = buildMissionSeedFiles(chain, seed);
    expect(warnings.some((w) => w.includes("15 enemy ships") && w.includes("at most 14"))).toBe(true);

    chain.placements[0].positions = chain.placements[0].positions.slice(0, 14);
    chain.placements[0].configIds = chain.placements[0].configIds.slice(0, 14);
    expect(buildMissionSeedFiles(chain, seed).warnings).toEqual([]);
  });

  it("warns when keys the deploy hardcodes are missing", () => {
    const seed = fixture();
    const chain = chainFromSeed(seed);
    chain.campaignNodes.pop(); // f06 gone
    const { warnings } = buildMissionSeedFiles(chain, seed);
    expect(warnings.some((w) => w.includes('"f06"'))).toBe(true);
  });
});

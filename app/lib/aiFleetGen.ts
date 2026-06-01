import { prisma } from "./prisma";
import { calcShipCost, DEFAULT_COSTS } from "./shipCosts";
import { AI_USER_ID } from "./aiUser";
import type { ShipEquipment, ShipTraits } from "../types/types";
import type { AiDifficulty } from "../utils/aiDispatch";

// ── Archetypes ─────────────────────────────────────────────────────────────────

type Role = "aggressor" | "sniper" | "midrange" | "tank" | "support";

interface ArchetypeTemplate {
  name: string;
  role: Role;
  equipment: ShipEquipment;
  traits: { accuracy: number; hull: number; speed: number };
}

const ARCHETYPES: ArchetypeTemplate[] = [
  {
    name: "EMP Hawk",
    role: "aggressor",
    equipment: { mainWeapon: 0, armor: 0, shields: 1, special: 1 },
    traits: { accuracy: 1, hull: 0, speed: 1 },
  },
  {
    name: "Rail Sniper",
    role: "sniper",
    equipment: { mainWeapon: 1, armor: 0, shields: 0, special: 0 },
    traits: { accuracy: 2, hull: 0, speed: 1 },
  },
  {
    name: "Missile Boat",
    role: "midrange",
    equipment: { mainWeapon: 2, armor: 1, shields: 0, special: 0 },
    traits: { accuracy: 1, hull: 0, speed: 0 },
  },
  {
    name: "Plasma Brawler",
    role: "aggressor",
    equipment: { mainWeapon: 3, armor: 3, shields: 0, special: 0 },
    traits: { accuracy: 0, hull: 2, speed: 0 },
  },
  {
    name: "Shield Tank",
    role: "tank",
    equipment: { mainWeapon: 0, armor: 0, shields: 3, special: 0 },
    traits: { accuracy: 0, hull: 2, speed: 0 },
  },
  {
    name: "Repair Frigate",
    role: "support",
    equipment: { mainWeapon: 0, armor: 0, shields: 2, special: 2 },
    traits: { accuracy: 0, hull: 0, speed: 1 },
  },
];

// Dark gunmetal + amber — visually distinct from player ships
const AI_COLORS = { h1: 220, s1: 10, l1: 20, h2: 35, s2: 70, l2: 50 };

// ── Fleet selection ────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cheapest possible ship cost — used to know when no more ships can fit
const MIN_SHIP_COST = Math.min(
  ...ARCHETYPES.map((a) => calcShipCost(a.equipment, a.traits, DEFAULT_COSTS)),
);

// Max ships: 4 deployment columns × 11 grid rows
const MAX_FLEET_SIZE = 44;

function greedySelect(
  candidates: ArchetypeTemplate[],
  budget: number,
  maxShips: number,
): ArchetypeTemplate[] {
  const selected: ArchetypeTemplate[] = [];
  let spent = 0;
  let hasRepair = false;

  // Phase 1: add priority ships (no duplicates in the core)
  const usedNames = new Set<string>();
  for (const t of candidates) {
    if (selected.length >= maxShips) break;
    if (usedNames.has(t.name)) continue;
    if (t.equipment.special === 2 && hasRepair) continue;
    const cost = calcShipCost(t.equipment, t.traits, DEFAULT_COSTS);
    if (budget !== Infinity && spent + cost > budget) continue;
    selected.push(t);
    spent += cost;
    usedNames.add(t.name);
    if (t.equipment.special === 2) hasRepair = true;
  }

  // Phase 2: fill to ≥ 90% of budget with duplicates (most expensive that fits first)
  if (budget !== Infinity) {
    const target = budget * 0.9;
    const byDescCost = [...ARCHETYPES].sort(
      (a, b) =>
        calcShipCost(b.equipment, b.traits, DEFAULT_COSTS) -
        calcShipCost(a.equipment, a.traits, DEFAULT_COSTS),
    );
    while (spent < target && selected.length < maxShips) {
      const remaining = budget - spent;
      if (remaining < MIN_SHIP_COST) break;
      const next = byDescCost.find(
        (t) => calcShipCost(t.equipment, t.traits, DEFAULT_COSTS) <= remaining,
      );
      if (!next) break;
      selected.push(next);
      spent += calcShipCost(next.equipment, next.traits, DEFAULT_COSTS);
    }
  }

  return selected;
}

// Recruit: random order — unpredictable but may be unbalanced
function selectRecruit(budget: number): ArchetypeTemplate[] {
  return greedySelect(shuffle(ARCHETYPES), budget, MAX_FLEET_SIZE);
}

// Veteran: one ship from each role, randomly ordered — balanced but not optimised
function selectVeteran(budget: number): ArchetypeTemplate[] {
  const byRole = new Map<Role, ArchetypeTemplate[]>();
  for (const a of ARCHETYPES) {
    if (!byRole.has(a.role)) byRole.set(a.role, []);
    byRole.get(a.role)!.push(a);
  }
  const roles: Role[] = shuffle(["aggressor", "sniper", "midrange", "tank", "support"]);
  const candidates = roles.flatMap((r) => {
    const pool = byRole.get(r) ?? [];
    return pool.length ? [pool[Math.floor(Math.random() * pool.length)]] : [];
  });
  // Fill any remaining budget slot from leftovers
  const used = new Set(candidates.map((c) => c.name));
  const extras = shuffle(ARCHETYPES.filter((a) => !used.has(a.name)));
  return greedySelect([...candidates, ...extras], budget, MAX_FLEET_SIZE);
}

// Commander/Elite: optimal synergy — EMP disruption + long-range + heavy damage + sustain
function selectOptimal(budget: number): ArchetypeTemplate[] {
  const priority = [
    "EMP Hawk",
    "Rail Sniper",
    "Plasma Brawler",
    "Shield Tank",
    "Repair Frigate",
  ];
  const ordered = priority
    .map((name) => ARCHETYPES.find((a) => a.name === name))
    .filter((a): a is ArchetypeTemplate => a !== undefined);
  return greedySelect(ordered, budget, MAX_FLEET_SIZE);
}

function selectShips(difficulty: AiDifficulty, budget: number): ArchetypeTemplate[] {
  switch (difficulty) {
    case "recruit":   return selectRecruit(budget);
    case "veteran":   return selectVeteran(budget);
    case "commander":
    case "elite":     return selectOptimal(budget);
  }
}

// ── Placement ──────────────────────────────────────────────────────────────────

// Joiner deployment zone: cols 13–16 (col 13 = closest to centre)
// Col preference by role (aggressive = push forward, sniper/support = stay back)
const ROLE_COL: Record<Role, number> = {
  aggressor: 13,
  midrange:  14,
  tank:      14,
  support:   15,
  sniper:    16,
};

// Spread N ships evenly across [0, gridHeight-1]
function spreadRows(count: number, height: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [Math.floor(height / 2)];
  return Array.from({ length: count }, (_, i) =>
    Math.round((height - 1) * i / (count - 1)),
  );
}

function computePositions(
  ships: ArchetypeTemplate[],
  blockedSet: Set<string>,
  scoringRows: number[],
  difficulty: AiDifficulty,
): Array<{ row: number; col: number }> {
  const GRID_HEIGHT = 11;
  const DEPLOY_COLS = [16, 15, 14, 13]; // back→front, fallback order

  const baseRows = spreadRows(ships.length, GRID_HEIGHT);

  // Commander/Elite: place fast ships (speed>0 or aggressor) close to scoring zones
  let rowFor: number[] = [...baseRows];
  if ((difficulty === "commander" || difficulty === "elite") && scoringRows.length > 0) {
    const medRow = Math.round(scoringRows.reduce((s, r) => s + r, 0) / scoringRows.length);
    const isFast = (t: ArchetypeTemplate) => t.traits.speed > 0 || t.role === "aggressor";

    const fastIdx  = ships.map((s, i) => (isFast(s)  ? i : -1)).filter((i) => i >= 0);
    const slowIdx  = ships.map((s, i) => (!isFast(s) ? i : -1)).filter((i) => i >= 0);

    // Rows sorted by closeness to median scoring row
    const sorted = [...baseRows].sort((a, b) =>
      Math.abs(a - medRow) - Math.abs(b - medRow),
    );
    rowFor = new Array(ships.length).fill(0);
    fastIdx.forEach((origIdx, i) => { rowFor[origIdx] = sorted[i] ?? baseRows[origIdx]; });
    slowIdx.forEach((origIdx, i) => { rowFor[origIdx] = sorted[fastIdx.length + i] ?? baseRows[origIdx]; });
  }

  const positions: Array<{ row: number; col: number }> = new Array(ships.length)
    .fill(null)
    .map(() => ({ row: 0, col: 16 }));
  const usedCells = new Set<string>();

  // Process ships back-to-front so snipers/support claim their preferred col first
  const order = ships
    .map((s, i) => ({ s, i }))
    .sort((a, b) => ROLE_COL[b.s.role] - ROLE_COL[a.s.role]);

  for (const { s, i } of order) {
    const preferredCol = ROLE_COL[s.role];
    const preferredRow = rowFor[i];
    const colsToTry = [preferredCol, ...DEPLOY_COLS.filter((c) => c !== preferredCol)];

    let placed = false;
    outer: for (const col of colsToTry) {
      // Try preferred row, then spiral outward
      for (let dr = 0; dr < GRID_HEIGHT; dr++) {
        const rows = dr === 0
          ? [preferredRow]
          : [
              (preferredRow + dr) % GRID_HEIGHT,
              ((preferredRow - dr) % GRID_HEIGHT + GRID_HEIGHT) % GRID_HEIGHT,
            ];
        for (const row of rows) {
          const key = `${row},${col}`;
          if (!blockedSet.has(key) && !usedCells.has(key)) {
            positions[i] = { row, col };
            usedCells.add(key);
            placed = true;
            break outer;
          }
        }
      }
    }

    // Absolute fallback — should never be needed
    if (!placed) {
      for (const col of DEPLOY_COLS) {
        for (let row = 0; row < GRID_HEIGHT; row++) {
          const key = `${row},${col}`;
          if (!blockedSet.has(key) && !usedCells.has(key)) {
            positions[i] = { row, col };
            usedCells.add(key);
            break;
          }
        }
        if (placed) break;
      }
    }
  }

  return positions;
}

// ── Map data ───────────────────────────────────────────────────────────────────

async function loadMapData(mapId: number | null): Promise<{
  blockedSet: Set<string>;
  scoringRows: number[];
}> {
  if (!mapId) return { blockedSet: new Set(), scoringRows: [] };
  const map = await prisma.map.findUnique({ where: { id: mapId } });
  if (!map) return { blockedSet: new Set(), scoringRows: [] };

  const blocked = (map.blockedTiles as Array<{ row: number; col: number }>) ?? [];
  const blockedSet = new Set(blocked.map((p) => `${p.row},${p.col}`));

  const scoring = (map.scoringTiles as Array<{ row: number; col: number; points: number }>) ?? [];
  // Only scoring tiles in the centre of the map matter for positioning
  const scoringRows = [...new Set(
    scoring.filter((p) => p.col >= 4 && p.col <= 12).map((p) => p.row),
  )];

  return { blockedSet, scoringRows };
}

// ── Trait builder ──────────────────────────────────────────────────────────────

function buildTraits(template: ArchetypeTemplate, index: number): ShipTraits {
  return {
    serialNumber: 10_000_000 + index * 997 + (Date.now() % 10_000),
    colors: AI_COLORS,
    variant: index % 3,
    accuracy: template.traits.accuracy,
    hull: template.traits.hull,
    speed: template.traits.speed,
  };
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateAiFleet(
  lobbyId: number,
  costLimit: number,
  difficulty: AiDifficulty = "recruit",
  mapId: number | null = null,
): Promise<number[]> {
  const budget = costLimit > 0 ? costLimit : Infinity;
  const selected = selectShips(difficulty, budget);
  if (selected.length === 0) return [];

  const { blockedSet, scoringRows } = await loadMapData(mapId);
  const positions = computePositions(selected, blockedSet, scoringRows, difficulty);

  const shipIds: number[] = [];
  let totalCost = 0;

  for (let i = 0; i < selected.length; i++) {
    const template = selected[i];
    const traits = buildTraits(template, i);
    const cost = calcShipCost(template.equipment, traits, DEFAULT_COSTS);
    totalCost += cost;

    const ship = await prisma.ship.create({
      data: {
        ownerId: AI_USER_ID,
        name: template.name,
        equipment: template.equipment as object,
        traits: traits as object,
        cost,
        costsVersion: DEFAULT_COSTS.version,
        constructed: true,
        inFleet: true,
      },
    });
    shipIds.push(ship.id);
  }

  await prisma.fleet.create({
    data: {
      ownerId: AI_USER_ID,
      lobbyId,
      shipIds,
      totalCost,
      startingPositions: positions,
      isComplete: true,
    },
  });

  return shipIds;
}

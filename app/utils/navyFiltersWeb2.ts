import {
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";
import { calculateShipRank } from "./shipLevel";
import { Web2Ship } from "../types/web2Ship";
import type {
  NavyFilterCategory,
  NavyFilterCriterion,
  NavySortField,
  NavySortOrder,
} from "./navyFilters";

// Web2 twin of app/utils/navyFilters.ts — same rationale as
// gameGridRangesWeb2.ts/calculateDamageWeb2.ts: `NavyFilterCategory`/
// `NavyFilterCriterion`/`NAVY_FILTER_GROUPS`/`navyFilterCategoryLabel`/
// `needsNavyFilterValue`/`isEquipmentOrTraitFilterCategory` have no Ship
// type dependency at all — import those straight from navyFilters.ts,
// don't duplicate them. Only the functions that take a ship (or Ship[])
// need a twin here, with `timestampDestroyed > 0` (number) replacing
// `> 0n`. `calculateShipRank` takes `Web2Ship` directly with no adapter —
// see app/utils/toShipVisual.ts's doc comment.

function uniqSortedInts(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function navyFilterSecondaryOptionsWeb2(
  category: NavyFilterCategory,
  fleet: Web2Ship[],
): { value: string; label: string }[] {
  switch (category) {
    case "eq_weapon":
      return [0, 1, 2, 3].map((v) => ({ value: String(v), label: getMainWeaponName(v).toUpperCase() }));
    case "eq_armor":
      return [0, 1, 2, 3].map((v) => ({ value: String(v), label: getArmorName(v).toUpperCase() }));
    case "eq_shield":
      return [0, 1, 2, 3].map((v) => ({ value: String(v), label: getShieldName(v).toUpperCase() }));
    case "eq_special":
      return [0, 1, 2, 3].map((v) => ({ value: String(v), label: getSpecialName(v).toUpperCase() }));
    case "trait_accuracy":
      return uniqSortedInts(fleet.map((s) => s.traits.accuracy)).map((v) => ({ value: String(v), label: String(v) }));
    case "trait_hull":
      return uniqSortedInts(fleet.map((s) => s.traits.hull)).map((v) => ({ value: String(v), label: String(v) }));
    case "trait_speed":
      return uniqSortedInts(fleet.map((s) => s.traits.speed)).map((v) => ({ value: String(v), label: String(v) }));
    case "trait_variant":
      return uniqSortedInts(fleet.map((s) => s.traits.variant)).map((v) => ({ value: String(v), label: String(v) }));
    case "data_threat":
      return uniqSortedInts(fleet.map((s) => s.shipData.cost)).map((v) => ({ value: String(v), label: String(v) }));
    case "data_rank":
      return [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: `R${v}` }));
    default:
      return [];
  }
}

export function shipMatchesNavyFilterWeb2(
  ship: Web2Ship,
  category: NavyFilterCategory,
  valueStr: string,
  starredShipIds: Set<string>,
): boolean {
  if (category === "all") return true;
  const n = Number(valueStr);
  const numOk = Number.isFinite(n);

  switch (category) {
    case "constructed":
      return ship.shipData.constructed;
    case "unconstructed":
      return !ship.shipData.constructed;
    case "starred":
      return starredShipIds.has(ship.id.toString());
    case "shiny":
      return ship.shipData.shiny;
    case "not_shiny":
      return !ship.shipData.shiny;
    case "in_fleet":
      return ship.shipData.inFleet;
    case "not_in_fleet":
      return !ship.shipData.inFleet;
    case "destroyed":
      return ship.shipData.timestampDestroyed > 0;
    case "alive":
      return ship.shipData.timestampDestroyed === 0;
    case "eq_weapon":
      return numOk && ship.equipment.mainWeapon === n;
    case "eq_armor":
      return numOk && ship.equipment.armor === n;
    case "eq_shield":
      return numOk && ship.equipment.shields === n;
    case "eq_special":
      return numOk && ship.equipment.special === n;
    case "trait_accuracy":
      return numOk && ship.traits.accuracy === n;
    case "trait_hull":
      return numOk && ship.traits.hull === n;
    case "trait_speed":
      return numOk && ship.traits.speed === n;
    case "trait_variant":
      return numOk && ship.traits.variant === n;
    case "data_threat":
      return numOk && ship.shipData.cost <= n;
    case "data_rank":
      return numOk && calculateShipRank(ship).rank === n;
    default:
      return true;
  }
}

/** AND across filter categories, OR within a category, then sorted. Shared shape with app/utils/navyFilters.ts's twin. */
export function filterAndSortShipsWeb2(
  ships: Web2Ship[],
  activeFilters: NavyFilterCriterion[],
  sortBy: NavySortField,
  sortOrder: NavySortOrder,
  starredShipIds: Set<string>,
): Web2Ship[] {
  const filtered = ships.filter((ship) => {
    if (activeFilters.length === 0) return true;
    const byCategory = new Map<NavyFilterCategory, NavyFilterCriterion[]>();
    for (const criterion of activeFilters) {
      const existing = byCategory.get(criterion.category);
      if (existing) {
        existing.push(criterion);
      } else {
        byCategory.set(criterion.category, [criterion]);
      }
    }
    for (const criteria of byCategory.values()) {
      const matchesAnyInCategory = criteria.some((criterion) =>
        shipMatchesNavyFilterWeb2(ship, criterion.category, criterion.value, starredShipIds),
      );
      if (!matchesAnyInCategory) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    let aValue: number;
    let bValue: number;
    switch (sortBy) {
      case "cost":
        aValue = a.shipData.cost;
        bValue = b.shipData.cost;
        break;
      case "accuracy":
        aValue = a.traits.accuracy;
        bValue = b.traits.accuracy;
        break;
      case "hull":
        aValue = a.traits.hull;
        bValue = b.traits.hull;
        break;
      case "speed":
        aValue = a.traits.speed;
        bValue = b.traits.speed;
        break;
      default: // 'id'
        aValue = a.id;
        bValue = b.id;
    }
    if (sortOrder === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

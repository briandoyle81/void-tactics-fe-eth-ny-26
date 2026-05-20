import {
  Ship,
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";
import { calculateShipRank } from "./shipLevel";

/** Matches construct-all UI: batch cap when there are more than this many targets. */
export const STALE_COST_SYNC_BATCH_CAP = 150;

export type NavyFilterCategory =
  | "all"
  | "constructed"
  | "unconstructed"
  | "starred"
  | "shiny"
  | "not_shiny"
  | "in_fleet"
  | "not_in_fleet"
  | "destroyed"
  | "alive"
  | "eq_weapon"
  | "eq_armor"
  | "eq_shield"
  | "eq_special"
  | "trait_accuracy"
  | "trait_hull"
  | "trait_speed"
  | "trait_variant"
  | "data_threat"
  | "data_rank";

export type NavyFilterCriterion = {
  id: string;
  category: NavyFilterCategory;
  value: string;
};

export const NAVY_FILTER_GROUPS: Array<{
  label: string;
  categories: NavyFilterCategory[];
}> = [
  {
    label: "Status",
    categories: [
      "constructed",
      "unconstructed",
      "starred",
      "shiny",
      "not_shiny",
      "in_fleet",
      "not_in_fleet",
      "destroyed",
      "alive",
      "data_rank",
    ],
  },
  {
    label: "Equipment",
    categories: ["eq_weapon", "eq_armor", "eq_shield", "eq_special"],
  },
  {
    label: "Traits",
    categories: [
      "trait_accuracy",
      "trait_hull",
      "trait_speed",
      "trait_variant",
    ],
  },
];

export function navyFilterCategoryLabel(category: NavyFilterCategory): string {
  switch (category) {
    case "all":
      return "All ships";
    case "constructed":
      return "Constructed";
    case "unconstructed":
      return "Unconstructed";
    case "starred":
      return "Starred";
    case "shiny":
      return "Shiny";
    case "not_shiny":
      return "Not shiny";
    case "in_fleet":
      return "In fleet";
    case "not_in_fleet":
      return "Not in fleet";
    case "destroyed":
      return "Destroyed";
    case "alive":
      return "Not destroyed";
    case "eq_weapon":
      return "Main weapon";
    case "eq_armor":
      return "Armor";
    case "eq_shield":
      return "Shields";
    case "eq_special":
      return "Special";
    case "trait_accuracy":
      return "Accuracy";
    case "trait_hull":
      return "Hull";
    case "trait_speed":
      return "Speed";
    case "trait_variant":
      return "Variant";
    case "data_threat":
      return "Threat (cost)";
    case "data_rank":
      return "Rank";
    default:
      return category;
  }
}

export function needsNavyFilterValue(category: NavyFilterCategory): boolean {
  return !(
    category === "all" ||
    category === "constructed" ||
    category === "unconstructed" ||
    category === "starred" ||
    category === "shiny" ||
    category === "not_shiny" ||
    category === "in_fleet" ||
    category === "not_in_fleet" ||
    category === "destroyed" ||
    category === "alive"
  );
}

function uniqSortedInts(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function navyFilterSecondaryOptions(
  category: NavyFilterCategory,
  fleet: Ship[],
): { value: string; label: string }[] {
  switch (category) {
    case "eq_weapon":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getMainWeaponName(v).toUpperCase(),
      }));
    case "eq_armor":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getArmorName(v).toUpperCase(),
      }));
    case "eq_shield":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getShieldName(v).toUpperCase(),
      }));
    case "eq_special":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getSpecialName(v).toUpperCase(),
      }));
    case "trait_accuracy":
      return uniqSortedInts(fleet.map((s) => s.traits.accuracy)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_hull":
      return uniqSortedInts(fleet.map((s) => s.traits.hull)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_speed":
      return uniqSortedInts(fleet.map((s) => s.traits.speed)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_variant":
      return uniqSortedInts(fleet.map((s) => s.traits.variant)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "data_threat":
      return uniqSortedInts(fleet.map((s) => s.shipData.cost)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "data_rank":
      return [1, 2, 3, 4, 5].map((v) => ({
        value: String(v),
        label: `R${v}`,
      }));
    default:
      return [];
  }
}

export function shipMatchesNavyFilter(
  ship: Ship,
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
      return ship.shipData.timestampDestroyed > 0n;
    case "alive":
      return ship.shipData.timestampDestroyed === 0n;
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

export function isEquipmentOrTraitFilterCategory(category: NavyFilterCategory): boolean {
  return (
    category === "eq_weapon" ||
    category === "eq_armor" ||
    category === "eq_shield" ||
    category === "eq_special" ||
    category === "trait_accuracy" ||
    category === "trait_hull" ||
    category === "trait_speed" ||
    category === "trait_variant" ||
    category === "data_rank"
  );
}

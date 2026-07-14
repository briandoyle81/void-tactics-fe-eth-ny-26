import { getMainWeaponName, getSpecialName } from "../types/types";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// fleet-selection ship-list filter state and predicate. Plain numbers/
// strings only (per the number-native-shared-components rule); each
// caller adapts its own ship shape (bigint fields on web3's `Ship`,
// already-plain on web2's `Web2Ship`) into `FleetFilterableShip` at the
// call site.
export interface FleetFilters {
  showShiny: boolean;
  showCommon: boolean;
  showUnavailable: boolean;
  minCost: number;
  maxCost: number;
  minAccuracy: number;
  maxAccuracy: number;
  minHull: number;
  maxHull: number;
  minSpeed: number;
  maxSpeed: number;
  weaponType: string;
  defenseType: string;
  specialType: string;
}

export const DEFAULT_FLEET_FILTERS: FleetFilters = {
  showShiny: true,
  showCommon: true,
  showUnavailable: false,
  minCost: 0,
  maxCost: 10000,
  minAccuracy: 0,
  maxAccuracy: 2,
  minHull: 0,
  maxHull: 2,
  minSpeed: 0,
  maxSpeed: 2,
  weaponType: "all",
  defenseType: "all",
  specialType: "all",
};

export interface FleetFilterableShip {
  cost: number;
  isShiny: boolean;
  accuracy: number;
  hull: number;
  speed: number;
  isConstructed: boolean;
  isDestroyed: boolean;
  inFleet: boolean;
  mainWeapon: number;
  shields: number;
  special: number;
}

/** Ported verbatim from Lobbies.tsx's inline `filteredShips` predicate. */
export function matchesFleetFilters(ship: FleetFilterableShip, filters: FleetFilters): boolean {
  if (!filters.showUnavailable) {
    if (!ship.isConstructed) return false;
    if (ship.isDestroyed) return false;
    if (ship.inFleet) return false;
  }

  if (ship.isShiny && !filters.showShiny) return false;
  if (!ship.isShiny && !filters.showCommon) return false;

  if (ship.cost < filters.minCost || ship.cost > filters.maxCost) return false;

  if (ship.accuracy < filters.minAccuracy || ship.accuracy > filters.maxAccuracy) return false;
  if (ship.hull < filters.minHull || ship.hull > filters.maxHull) return false;
  if (ship.speed < filters.minSpeed || ship.speed > filters.maxSpeed) return false;

  if (filters.weaponType !== "all") {
    const weaponName = getMainWeaponName(ship.mainWeapon).toLowerCase();
    if (!weaponName.includes(filters.weaponType.toLowerCase())) return false;
  }

  if (filters.defenseType !== "all") {
    const hasShield = ship.shields > 0;
    if (filters.defenseType === "shield" && !hasShield) return false;
    if (filters.defenseType === "armor" && hasShield) return false;
  }

  if (filters.specialType !== "all") {
    const specialName = getSpecialName(ship.special).toLowerCase();
    if (filters.specialType === "none" && specialName !== "none") return false;
    if (filters.specialType !== "none" && !specialName.includes(filters.specialType.toLowerCase())) return false;
  }

  return true;
}

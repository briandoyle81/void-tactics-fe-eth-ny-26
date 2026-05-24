import { useMemo } from "react";
import { useOwnedShips } from "./useOwnedShips";

export function useShipDetails() {
  const { ships, isLoading, error } = useOwnedShips();

  // Calculate fleet statistics
  const fleetStats = useMemo(() => {
    if (!ships || ships.length === 0) {
      return {
        totalShips: 0,
        constructedShips: 0,
        unconstructedShips: 0,
        totalCost: 0,
        averageCost: 0,
        shipsInFleet: 0,
        destroyedShips: 0,
        shinyShips: 0,
        totalShipsDestroyed: 0,
      };
    }

    const totalShips = ships.length;
    const constructedShips = ships.filter(
      (ship) => ship.shipData.constructed
    ).length;
    const unconstructedShips = totalShips - constructedShips;
    const totalCost = ships.reduce((sum, ship) => sum + ship.shipData.cost, 0);
    const averageCost = totalCost / totalShips;
    const shipsInFleet = ships.filter((ship) => ship.shipData.inFleet).length;
    const destroyedShips = ships.filter(
      (ship) => !!ship.shipData.timestampDestroyed
    ).length;
    const shinyShips = ships.filter((ship) => ship.shipData.shiny).length;
    const totalShipsDestroyed = ships.reduce(
      (sum, ship) => sum + ship.shipData.shipsDestroyed,
      0
    );

    return {
      totalShips,
      constructedShips,
      unconstructedShips,
      totalCost,
      averageCost,
      shipsInFleet,
      destroyedShips,
      shinyShips,
      totalShipsDestroyed,
    };
  }, [ships]);

  // Get ships by construction status
  const shipsByStatus = useMemo(() => {
    if (!ships) return { constructed: [], unconstructed: [] };

    return {
      constructed: ships.filter((ship) => ship.shipData.constructed),
      unconstructed: ships.filter((ship) => !ship.shipData.constructed),
    };
  }, [ships]);

  return {
    fleetStats,
    shipsByStatus,
    isLoading,
    error,
  };
}

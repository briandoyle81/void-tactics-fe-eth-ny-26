"use client";

import React from "react";
import { FleetCompositionCardControls } from "./FleetCompositionCardControls";
import type { useFleetComposition } from "../hooks/useFleetComposition";

interface ManageNavyFleetCompositionCardSlotProps {
  fleetComposition: ReturnType<typeof useFleetComposition>;
  shipId: string;
  constructed: boolean;
  destroyed: boolean;
}

// Shared render-slot for `ShipCard`'s `fleetCompositionControls` prop —
// identical decision logic between web3 (`ManageNavy.tsx`) and web2
// (`ManageNavyWeb2.tsx`); the only prior difference was bigint-vs-number ship
// ids, which callers now normalize to a string before passing in here.
export const ManageNavyFleetCompositionCardSlot: React.FC<
  ManageNavyFleetCompositionCardSlotProps
> = ({ fleetComposition, shipId, constructed, destroyed }) => {
  if (!fleetComposition.selectedId || !fleetComposition.activeFleet) {
    return undefined;
  }
  const inComp = fleetComposition.activeFleet.shipIds.includes(shipId);
  if (!constructed) return undefined;
  if (destroyed && !inComp) return undefined;

  return (
    <FleetCompositionCardControls
      destroyedAndInComposition={destroyed && inComp}
      inComposition={inComp}
      onAdd={() => fleetComposition.addShip(shipId)}
      onRemove={() => fleetComposition.removeShip(shipId)}
    />
  );
};

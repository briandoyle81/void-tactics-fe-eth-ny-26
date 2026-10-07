"use client";

import { useEffect, useMemo, useRef } from "react";
import { useOwnedShipsWeb2 } from "../../hooks/useOwnedShipsWeb2";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useFleetComposition } from "../../hooks/useFleetComposition";
import { ShipImageWeb2 } from "../ShipImageWeb2";
import { FleetCompositionLocalNoticeModal } from "../FleetCompositionLocalNoticeModal";
import { LoadoutsView, MAX_LOADOUT_THUMBNAILS, type LoadoutSummary } from "./LoadoutsView";
import type { Web2Ship } from "../../types/web2Ship";

// Same scope tag as ManageNavyWeb2's presets.
const FLEET_COMPOSITION_SCOPE_TAG = "web2";

const isActiveShip = (s: Web2Ship) => s.shipData.constructed && s.shipData.timestampDestroyed === 0;

/** Web2 adapter for Fleet › Loadouts — same stored presets as ManageNavyWeb2. */
export function LoadoutsWeb2({ onOpenShips }: { onOpenShips: () => void }) {
  const { userId } = useCurrentUser();
  const { ships, isLoading } = useOwnedShipsWeb2();

  const validShipIds = useMemo(
    () => (isLoading ? null : new Set(ships.filter(isActiveShip).map((s) => String(s.id)))),
    [ships, isLoading],
  );
  const fleetComposition = useFleetComposition(userId ?? "", FLEET_COMPOSITION_SCOPE_TAG, validShipIds);

  // Open Ships once the chosen (or new) preset is selected and saved.
  const pendingEditRef = useRef<string | null>(null);
  const { selectedId } = fleetComposition;
  useEffect(() => {
    const pending = pendingEditRef.current;
    if (pending == null || selectedId == null) return;
    if (pending === "__create__" || pending === selectedId) {
      pendingEditRef.current = null;
      onOpenShips();
    }
  }, [selectedId, onOpenShips]);

  const loadouts = useMemo<LoadoutSummary[]>(() => {
    const byId = new Map(ships.map((s) => [String(s.id), s]));
    return fleetComposition.fleetCompositions.map((fleet) => {
      const fleetShips = fleet.shipIds
        .map((id) => byId.get(id))
        .filter((s): s is Web2Ship => !!s && isActiveShip(s));
      return {
        id: fleet.id,
        name: fleet.name,
        shipCount: fleetShips.length,
        threat: fleetShips.reduce((sum, s) => sum + s.shipData.cost, 0),
        thumbnails: fleetShips
          .slice(0, MAX_LOADOUT_THUMBNAILS)
          .map((s) => <ShipImageWeb2 key={s.id} ship={s} className="h-full w-full" showLoadingState={false} />),
        isActive: fleet.id === selectedId,
      };
    });
  }, [ships, fleetComposition.fleetCompositions, selectedId]);

  const edit = (id: string) => {
    pendingEditRef.current = id;
    if (id === selectedId) {
      pendingEditRef.current = null;
      onOpenShips();
      return;
    }
    fleetComposition.selectFleet(id);
  };

  return (
    <>
      <LoadoutsView
        loadouts={loadouts}
        onEdit={edit}
        onCreate={() => edit("__create__")}
        onDelete={fleetComposition.deleteFleet}
        onExport={() => fleetComposition.exportFile("fleet_compositions")}
        importInputRef={fleetComposition.importInputRef}
        onImportFileChange={fleetComposition.onImportFileChange}
      />
      <FleetCompositionLocalNoticeModal
        show={fleetComposition.showLocalNoticeModal}
        onCancel={fleetComposition.cancelLocalNoticeModal}
        onAcknowledge={fleetComposition.acknowledgeLocalNoticeModal}
      />
    </>
  );
}

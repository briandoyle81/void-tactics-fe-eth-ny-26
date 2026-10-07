"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { useOwnedShips } from "../../hooks/useOwnedShips";
import { useSelectedChainId } from "../../hooks/useSelectedChainId";
import { useFleetComposition } from "../../hooks/useFleetComposition";
import { ShipImage } from "../ShipImage";
import { FleetCompositionLocalNoticeModal } from "../FleetCompositionLocalNoticeModal";
import { LoadoutsView, MAX_LOADOUT_THUMBNAILS, type LoadoutSummary } from "./LoadoutsView";
import type { Ship } from "../../types/types";

const isActiveShip = (s: Ship) => s.shipData.constructed && s.shipData.timestampDestroyed === 0n;

/**
 * Web3 adapter for Fleet › Loadouts. Uses the same stored presets as Manage
 * Navy (same scope key), so editing opens Ships with the preset selected.
 */
export function LoadoutsWeb3({ onOpenShips }: { onOpenShips: () => void }) {
  const { address } = useAccount();
  const chainId = useSelectedChainId();
  const { ships, isLoading } = useOwnedShips();

  const validShipIds = useMemo(
    () => (isLoading ? null : new Set(ships.filter(isActiveShip).map((s) => s.id.toString()))),
    [ships, isLoading],
  );
  const fleetComposition = useFleetComposition(
    address ? `${chainId}:${address.toLowerCase()}` : "",
    String(chainId),
    validShipIds,
  );

  // Open Ships once the chosen (or new) preset is selected and saved —
  // selecting can wait on the stored-locally notice first.
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
    const byId = new Map(ships.map((s) => [s.id.toString(), s]));
    return fleetComposition.fleetCompositions.map((fleet) => {
      const fleetShips = fleet.shipIds
        .map((id) => byId.get(id))
        .filter((s): s is Ship => !!s && isActiveShip(s));
      return {
        id: fleet.id,
        name: fleet.name,
        shipCount: fleetShips.length,
        // Bigint ship costs convert to number here (adapter layer).
        threat: fleetShips.reduce((sum, s) => sum + Number(s.shipData.cost), 0),
        thumbnails: fleetShips
          .slice(0, MAX_LOADOUT_THUMBNAILS)
          .map((s) => <ShipImage key={s.id.toString()} ship={s} className="h-full w-full" showLoadingState={false} />),
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
        onExport={() => fleetComposition.exportFile(`fleet_compositions_chain${chainId}`)}
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

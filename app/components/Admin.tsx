"use client";

import React, { useMemo } from "react";
import { useGetAllPresetMaps, useMapModes } from "../hooks/useMapsContract";
import { MapMode } from "../types/types";
import { AIEncountersAdminPanel } from "./AIEncountersAdminPanel";
import { LobbyAdminPanel } from "./LobbyAdminPanel";
import { GameAdminPanel } from "./GameAdminPanel";
import { PvPMatchAdminPanel } from "./PvPMatchAdminPanel";
import { AdminSettingsExport } from "./AdminSettingsExport";

// Admin tab (web3): every admin panel that isn't map editing, moved out of
// Maps.tsx. Each panel gates itself on its own on-chain role (encounter
// editor, contract owner, ...) and renders nothing for anyone else.
export default function Admin() {
  const { data: allMapsData } = useGetAllPresetMaps();
  const mapIds = useMemo((): number[] => {
    if (!Array.isArray(allMapsData) || allMapsData.length !== 3) return [];
    return (allMapsData[0] as bigint[]).map((id) => Number(id));
  }, [allMapsData]);
  const { modeByMapId } = useMapModes(mapIds);
  // AI fleets are only placed on maps usable for PvE.
  const pveMapIds = useMemo(
    () => mapIds.filter((id) => (modeByMapId.get(id) ?? MapMode.Both) !== MapMode.PvP),
    [mapIds, modeByMapId],
  );

  return (
    <div className="space-y-4">
      <h3 className="px-3 pt-3 font-mono text-xl font-bold tracking-wider text-cyan">[ADMIN]</h3>
      <AIEncountersAdminPanel mapIds={pveMapIds} />
      <LobbyAdminPanel />
      <GameAdminPanel />
      <PvPMatchAdminPanel />
      <AdminSettingsExport />
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { MapMode } from "../types/types";
import type { Web2Map } from "./MapsWeb2";
import { AIEncountersAdminPanelWeb2 } from "./AIEncountersAdminPanelWeb2";
import { LobbyAdminPanelWeb2 } from "./LobbyAdminPanelWeb2";
import { GameAdminPanelWeb2 } from "./GameAdminPanelWeb2";
import { PvPMatchAdminPanelWeb2 } from "./PvPMatchAdminPanelWeb2";
import { AdminSettingsExportWeb2 } from "./AdminSettingsExportWeb2";

// Web2 counterpart to Admin.tsx — the non-map admin panels moved out of
// MapsWeb2.tsx, each gated on useWeb2Admin(). Shares MapsWeb2's map query.
export default function AdminWeb2() {
  const { data: maps = [] } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2Map[]>("/api/maps"),
  });
  // AI fleets are only placed on maps usable for PvE.
  const pveMapIds = useMemo(
    () => maps.filter((m) => m.mode !== MapMode.PvP).map((m) => m.id),
    [maps],
  );

  return (
    <div className="space-y-4">
      <h3 className="px-3 pt-3 font-mono text-xl font-bold tracking-wider text-cyan">[ADMIN]</h3>
      <AIEncountersAdminPanelWeb2 mapIds={pveMapIds} />
      <LobbyAdminPanelWeb2 />
      <GameAdminPanelWeb2 />
      <PvPMatchAdminPanelWeb2 />
      <AdminSettingsExportWeb2 maps={maps} />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import type { AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

interface Web2Map {
  id: number;
  name: string;
  blockedTiles: unknown;
  scoringTiles: unknown;
}
interface AIMapPlacementWeb2 {
  mapId: number;
  row: number;
  col: number;
  configId: number;
}
interface CampaignNodeWeb2 {
  id: number;
  campaignId: number;
  mapId: number;
  prerequisites: number[];
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean;
}

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  maps: Web2Map[];
}

// Web2 counterpart to AdminSettingsExport.tsx — same aggregated JSON
// snapshot (maps, AI ship configs/archetypes, per-map enemy placements,
// campaign nodes), sourced from the Prisma-backed admin routes instead of
// on-chain reads, gated on useWeb2Admin() instead of the three separate
// on-chain admin roles. Read-only, same as web3.
export function AdminSettingsExportWeb2({ maps }: Props) {
  const isAdmin = useWeb2Admin();
  const [exporting, setExporting] = useState(false);

  if (!isAdmin) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const [aiShipConfigs, campaignNodes, placementsByMap] = await Promise.all([
        apiFetch<AIShipConfigWeb2[]>("/api/admin/ai-ship-configs"),
        apiFetch<CampaignNodeWeb2[]>("/api/admin/campaign/nodes"),
        Promise.all(
          maps.map((m) =>
            apiFetch<AIMapPlacementWeb2[]>(`/api/admin/ai-map-placements?mapId=${m.id}`),
          ),
        ),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        maps: maps.map((m) => ({
          id: m.id,
          name: m.name,
          blockedTiles: m.blockedTiles,
          scoringTiles: m.scoringTiles,
        })),
        aiShipConfigs: aiShipConfigs.map((c) => ({
          id: c.id,
          name: c.name,
          equipment: c.equipment,
          traits: c.traits,
          archetype: c.archetype,
        })),
        mapPlacements: placementsByMap.flat().map((p) => ({
          mapId: p.mapId,
          row: p.row,
          col: p.col,
          configId: p.configId,
        })),
        campaignNodes: campaignNodes.map((n) => ({
          id: n.id,
          campaignId: n.campaignId,
          mapId: n.mapId,
          prerequisites: n.prerequisites,
          costLimit: n.costLimit,
          turnTimeSeconds: n.turnTimeSeconds,
          maxScore: n.maxScore,
          creatorGoesFirst: n.creatorGoesFirst,
        })),
      };
      downloadJson(`void-tactics-admin-settings-web2-${Date.now()}.json`, exportData);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[EXPORT ALL SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Downloads every current admin-configured setting — maps, AI ship configs/archetypes, per-map enemy
        placements, and campaign nodes — as one JSON file. Read-only; doesn&apos;t change how any of these are
        saved individually.
      </p>
      <button
        type="button"
        disabled={exporting}
        onClick={() => void handleExport()}
        className="px-4 py-2 rounded-none font-mono text-sm border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? "Exporting..." : "[DOWNLOAD JSON]"}
      </button>
    </div>
  );
}

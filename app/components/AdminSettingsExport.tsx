"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useIsNodeMapEditor } from "../hooks/useIsNodeMapEditor";
import {
  useGetAllAIShipConfigs,
  useGetAllMapPlacements,
} from "../hooks/useAIEncountersContract";
import { useNodeMapContract, type CampaignGraphNode } from "../hooks/useNodeMap";
import type { PresetMap, CampaignNode } from "../types/types";

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(
    data,
    (_key, value) => (typeof value === "bigint" ? Number(value) : value),
    2,
  );
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
  maps: PresetMap[];
}

// Aggregates every admin-editable data source (preset maps, AI ship
// configs/archetypes, per-map enemy placements, campaign nodes) into one
// JSON snapshot the contracts team can load as the new default seed data
// on a fresh deploy. Read-only — doesn't change how any of those are
// individually saved, just bundles what's already on-chain into an export.
// Visible to anyone holding at least one of the three separate admin roles
// this page already gates on (map admin, AI encounter editor, node editor),
// since it only aggregates data those roles can already see individually.
export function AdminSettingsExport({ maps }: Props) {
  const { address } = useAccount();
  const isMapAdmin = address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase();
  const { isEditor: isEncounterEditor } = useIsEncounterEditor();
  const { isEditor: isNodeEditor } = useIsNodeMapEditor();

  const mapIds = useMemo(() => maps.map((m) => m.id), [maps]);
  const { data: aiShipConfigs } = useGetAllAIShipConfigs();
  const { data: mapPlacements } = useGetAllMapPlacements(mapIds);
  const nodeMapContract = useNodeMapContract();
  const { data: rawNodes } = useReadContract({
    ...nodeMapContract,
    functionName: "getAllNodes",
  });
  const campaignNodes = (rawNodes as CampaignGraphNode[] | undefined) ?? [];

  const [exporting, setExporting] = useState(false);

  if (!isMapAdmin && !isEncounterEditor && !isNodeEditor) return null;

  const handleExport = () => {
    setExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        maps: maps.map((m) => ({
          id: m.id,
          blockedPositions: m.blockedPositions,
          scoringPositions: m.scoringPositions,
        })),
        aiShipConfigs: (aiShipConfigs ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          equipment: c.equipment,
          traits: c.traits,
          archetype: c.archetype,
        })),
        mapPlacements: (mapPlacements ?? []).map((p) => ({
          mapId: p.mapId,
          positions: p.positions,
          configIds: p.configIds,
        })),
        campaignNodes: campaignNodes.map((n: CampaignNode) => ({
          id: n.id,
          campaignId: n.campaignId,
          mapId: n.mapId,
          prerequisites: n.prerequisites,
          costLimit: n.costLimit,
          turnTime: n.turnTime,
          maxScore: n.maxScore,
          creatorGoesFirst: n.creatorGoesFirst,
          enemyThreat: n.enemyThreat,
        })),
      };
      downloadJson(`void-tactics-admin-settings-${Date.now()}.json`, exportData);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[EXPORT ALL SETTINGS]</h4>
      <p className="text-xs text-text-muted">
        Downloads every current admin-configured setting — preset maps, AI ship configs/archetypes, per-map enemy
        placements, and campaign nodes — as one JSON file, for handing to the contract deployer to load as the new
        default seed data. Read-only; doesn&apos;t change how any of these are saved individually.
      </p>
      <button
        type="button"
        disabled={exporting}
        onClick={handleExport}
        className="px-4 py-2 rounded-none font-mono text-sm border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? "Exporting..." : "[DOWNLOAD JSON]"}
      </button>
    </div>
  );
}

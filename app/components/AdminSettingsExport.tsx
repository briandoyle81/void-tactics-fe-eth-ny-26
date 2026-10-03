"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useIsNodeMapEditor } from "../hooks/useIsNodeMapEditor";
import { useMissionChainSnapshot } from "../hooks/useMissionChainSnapshot";
import {
  buildMissionSeedFiles,
  type MissionSeedFiles,
  type PvpSeed,
  type RoguelikeSeed,
  type SinglePlayerSeed,
} from "../utils/missionSeedExport";

// Seed file names in the contracts repo (ignition/data/), read by
// ignition/modules/DeployAndConfig.ts. Downloads use the same names so they
// can be dropped straight over the originals.
const SEED_FILE_NAMES = {
  singlePlayer: "singlePlayerStarterContent.json",
  roguelike: "roguelikeStarterContent.json",
  pvp: "pvpStarterContent.json",
} as const;
type SeedSlot = keyof typeof SEED_FILE_NAMES;

function downloadJson(filename: string, data: unknown) {
  // Same formatting as the checked-in seed files, so an unchanged export
  // produces no diff.
  const json = `${JSON.stringify(data, null, 2)}\n`;
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

/** Identify a seed file by shape, so a renamed copy still works. */
function seedSlotOf(data: unknown): SeedSlot | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.campaignNodes) && Array.isArray(d.aiShipConfigs)) return "singlePlayer";
  if (Array.isArray(d.nodes) && Array.isArray(d.edges) && typeof d.root === "string") return "roguelike";
  if (Array.isArray(d.maps) && Object.keys(d).length === 1) return "pvp";
  return null;
}

// Exports every on-chain mission setting (maps, AI ship configs, enemy
// placements, campaign + roguelike node graphs, node titles, roguelike win
// effects) as the three seed files the contracts deploy reads. Takes the
// current seed files as input so existing keys stay stable — see
// app/utils/missionSeedExport.ts. Visible to anyone holding at least one of
// the admin roles this page already gates on, since it only aggregates data
// those roles can already see.
export function AdminSettingsExport() {
  const { address } = useAccount();
  const isMapAdmin = address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase();
  const { isEditor: isEncounterEditor } = useIsEncounterEditor();
  const { isEditor: isNodeEditor } = useIsNodeMapEditor();
  if (!isMapAdmin && !isEncounterEditor && !isNodeEditor) return null;
  // Inner component so the full-chain reads only run for editors.
  return <MissionSeedExportPanel />;
}

function MissionSeedExportPanel() {
  const { snapshot, isLoading, unknownWinEffects } = useMissionChainSnapshot();
  const [baseline, setBaseline] = useState<Partial<MissionSeedFiles>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setFileError(null);
    setWarnings(null);
    const next: Partial<MissionSeedFiles> = { ...baseline };
    for (const file of Array.from(fileList)) {
      try {
        const data = JSON.parse(await file.text());
        const slot = seedSlotOf(data);
        if (!slot) {
          setFileError(`${file.name} doesn't look like one of the three seed files.`);
          continue;
        }
        if (slot === "singlePlayer") next.singlePlayer = data as SinglePlayerSeed;
        else if (slot === "roguelike") next.roguelike = data as RoguelikeSeed;
        else next.pvp = data as PvpSeed;
      } catch {
        setFileError(`${file.name} isn't valid JSON.`);
      }
    }
    setBaseline(next);
  };

  const baselineComplete =
    baseline.singlePlayer != null && baseline.roguelike != null && baseline.pvp != null;

  const handleExport = () => {
    if (!snapshot || !baselineComplete) return;
    const { files, warnings: exportWarnings } = buildMissionSeedFiles(
      snapshot,
      baseline as MissionSeedFiles,
    );
    downloadJson(SEED_FILE_NAMES.singlePlayer, files.singlePlayer);
    downloadJson(SEED_FILE_NAMES.roguelike, files.roguelike);
    downloadJson(SEED_FILE_NAMES.pvp, files.pvp);
    setWarnings([
      ...exportWarnings,
      ...unknownWinEffects.map(
        (a) => `Win effect ${a} isn't a known effect contract on this chain and was left out.`,
      ),
    ]);
  };

  return (
    <div className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[EXPORT MISSION SEED FILES]</h4>
      <p className="text-xs text-text-muted">
        Turns the current on-chain missions (maps, AI ship configs, enemy placements, campaign and roguelike
        nodes, node titles, roguelike win effects) into the contracts repo&apos;s deploy seed files. Load the
        repo&apos;s current <code>ignition/data/</code> files first so existing keys stay the same, then drop the
        three downloads over them. Read-only.
      </p>

      <label className="block text-xs text-text-secondary">
        Current seed files ({Object.values(SEED_FILE_NAMES).join(", ")}):
        <input
          type="file"
          accept="application/json,.json"
          multiple
          onChange={(e) => void handleFiles(e.target.files)}
          className="mt-1 block text-xs"
        />
      </label>
      <ul className="text-xs font-mono">
        {(Object.keys(SEED_FILE_NAMES) as SeedSlot[]).map((slot) => (
          <li key={slot} className={baseline[slot] ? "text-phosphor-green" : "text-text-muted"}>
            {baseline[slot] ? "[LOADED]" : "[MISSING]"} {SEED_FILE_NAMES[slot]}
          </li>
        ))}
      </ul>
      {fileError && <p className="text-xs text-warning-red">{fileError}</p>}

      <button
        type="button"
        disabled={!snapshot || !baselineComplete}
        onClick={handleExport}
        className="px-4 py-2 rounded-none font-mono text-sm border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Reading chain..." : "[DOWNLOAD SEED FILES]"}
      </button>

      {warnings && (
        <div className="text-xs">
          {warnings.length === 0 ? (
            <p className="text-phosphor-green">Exported with no warnings.</p>
          ) : (
            <ul className="list-disc pl-4 text-amber space-y-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

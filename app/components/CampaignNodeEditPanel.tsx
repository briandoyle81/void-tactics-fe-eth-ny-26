"use client";

import React from "react";
import { toast } from "react-hot-toast";
import type { CampaignGraphNode } from "../hooks/useNodeMap";
import { useNodeMapAdmin } from "../hooks/useNodeMapAdmin";
import { useGetAllPresetMaps } from "../hooks/useMapsContract";
import { useGetAllAIShipConfigs, useGetMapPlacements } from "../hooks/useAIEncountersContract";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useAllNodeContent, useSaveNodeContent, resolveNodeContent } from "../hooks/useNodeContent";
import { MapPickerModal, type MapPickerMap } from "./MapPickerModal";
import { MapPlacementsEditor } from "./MapPlacementsEditor";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { aiConfigToPreviewShip, ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";

const DEFAULT_CAMPAIGN_ID = 1n;

// Placeholder defaults for a freshly-created node — real game-balance
// numbers should replace these before shipping (flagged in the map editor
// plan, not something this UI can infer on its own).
const NEW_NODE_DEFAULTS = { costLimit: 100n, turnTime: 120n, maxScore: 1000n };

interface CampaignNodeEditPanelProps {
  mode: "create" | "edit";
  /** Non-null in edit mode; ignored (but may be null) in create mode. */
  node: CampaignGraphNode | null;
  /** True while THIS node is the active connect-mode source (see CampaignGraph.tsx's connectMode state). */
  connectModeActive: boolean;
  onStartConnectMode: (sourceNodeId: bigint) => void;
  onCancelConnectMode: () => void;
  /** Called after any successful on-chain write so the parent can refetch the graph. */
  onSaved: () => void;
  onCreated: () => void;
  onCancelCreate: () => void;
}

// Replaces NodeMapAdminPanel.tsx's create/update form — rendered inline in
// CampaignGraphCanvas's children slot (in place of CampaignNodePreview) when
// the graph's Edit Mode is on and a node is selected. Owns its own writes
// (useNodeMapAdmin) and content save (useNodeContent) directly, matching
// the same "own its own chain-specific hooks" pattern CampaignNodePreview.tsx
// already uses — see that component for why this isn't force-shared with
// the web2 counterpart (CampaignNodeEditPanelWeb2.tsx, built alongside
// CampaignGraphWeb2.tsx's Edit Mode).
export function CampaignNodeEditPanel({
  mode,
  node,
  connectModeActive,
  onStartConnectMode,
  onCancelConnectMode,
  onSaved,
  onCreated,
  onCancelCreate,
}: CampaignNodeEditPanelProps) {
  const admin = useNodeMapAdmin();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: allConfigs } = useGetAllAIShipConfigs();
  const { isEditor: isEncounterEditor } = useIsEncounterEditor();
  const { contentById, refetch: refetchContent } = useAllNodeContent("CAMPAIGN");
  const saveContent = useSaveNodeContent();

  const [mapId, setMapId] = React.useState<bigint>(node?.mapId ?? 0n);
  const [costLimit, setCostLimit] = React.useState(node?.costLimit ?? NEW_NODE_DEFAULTS.costLimit);
  const [turnTime, setTurnTime] = React.useState(node?.turnTime ?? NEW_NODE_DEFAULTS.turnTime);
  const [maxScore, setMaxScore] = React.useState(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
  const [creatorGoesFirst, setCreatorGoesFirst] = React.useState(node?.creatorGoesFirst ?? true);
  const [showMapPicker, setShowMapPicker] = React.useState(false);
  const [showFleetEditor, setShowFleetEditor] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const resolvedContent = node ? resolveNodeContent("CAMPAIGN", contentById, node.id) : null;
  const [title, setTitle] = React.useState(resolvedContent?.title ?? "");
  const [description, setDescription] = React.useState(resolvedContent?.description ?? "");

  // Re-seed local field state when switching to a different selected node
  // (this component stays mounted across selection changes — CampaignGraph
  // swaps `node`, not the whole panel).
  const seededNodeIdRef = React.useRef<bigint | null>(null);
  React.useEffect(() => {
    const key = node?.id ?? null;
    if (seededNodeIdRef.current === key) return;
    seededNodeIdRef.current = key;
    setMapId(node?.mapId ?? 0n);
    setCostLimit(node?.costLimit ?? NEW_NODE_DEFAULTS.costLimit);
    setTurnTime(node?.turnTime ?? NEW_NODE_DEFAULTS.turnTime);
    setMaxScore(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
    setCreatorGoesFirst(node?.creatorGoesFirst ?? true);
    const c = node ? resolveNodeContent("CAMPAIGN", contentById, node.id) : null;
    setTitle(c?.title ?? "");
    setDescription(c?.description ?? "");
    // contentById intentionally excluded — only re-seed on node change, not
    // on every content refetch (would clobber an in-progress edit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const maps: MapPickerMap[] = React.useMemo(() => {
    if (!allMapsData) return [];
    const [mapIds, blockedArr, scoringArr] = allMapsData as [bigint[], unknown[], unknown[]];
    return mapIds.map((id, i) => ({
      id: Number(id),
      titleLabel: `Map #${id}`,
      blockedPositions: (blockedArr[i] as MapPickerMap["blockedPositions"]) ?? [],
      scoringPositions: (scoringArr[i] as MapPickerMap["scoringPositions"]) ?? [],
    }));
  }, [allMapsData]);

  const handleSaveDetails = async () => {
    if (mapId === 0n) {
      toast.error("Select a map before saving.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        const hash = await admin.createNode(
          DEFAULT_CAMPAIGN_ID,
          mapId,
          [],
          costLimit,
          turnTime,
          maxScore,
          creatorGoesFirst,
        );
        toast.success(`Node created. (tx: ${hash.slice(0, 10)}…)`);
        // writeContractAsync only surfaces the tx hash, not createNode's
        // returned nodeId (that needs a simulateContract call to decode) —
        // the caller just refetches and resets selection rather than
        // guessing which id was assigned.
        onCreated();
      } else if (node) {
        const hash = await admin.updateNode(
          node.id,
          node.campaignId,
          mapId,
          node.prerequisites,
          costLimit,
          turnTime,
          maxScore,
          creatorGoesFirst,
        );
        toast.success(`Node #${node.id} updated. (tx: ${hash.slice(0, 10)}…)`);
        onSaved();
      }
    } catch (error) {
      console.error("Failed to save node:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContent = async () => {
    const targetId = node?.id;
    if (targetId == null) return;
    try {
      await saveContent("CAMPAIGN", Number(targetId), { title, description });
      await refetchContent();
      toast.success("Node content saved.");
    } catch (error) {
      console.error("Failed to save node content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node content");
    }
  };

  const handleRemovePrerequisite = async (prerequisiteId: bigint) => {
    if (!node) return;
    try {
      await admin.removePrerequisite(node.id, prerequisiteId);
      onSaved();
    } catch (error) {
      console.error("Failed to remove prerequisite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove prerequisite");
    }
  };

  if (!node && mode === "edit") return null;

  return (
    <div
      className="grid grid-cols-1 gap-8 border-2 border-amber p-6 font-mono md:grid-cols-2"
      style={{ borderRadius: 0 }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-amber">
            {mode === "create" ? "[NEW NODE]" : `[EDIT NODE #${node!.id.toString()}]`}
          </h3>
          {mode === "create" && (
            <button
              type="button"
              onClick={onCancelCreate}
              className="text-amber hover:text-amber/80 text-xl font-bold leading-none"
              aria-label="Cancel"
            >
              ×
            </button>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          />
        </label>
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => void handleSaveContent()}
            className="self-start border-2 border-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10"
            style={{ borderRadius: 0 }}
          >
            [SAVE CONTENT]
          </button>
        )}

        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Map
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="self-start border-2 border-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10"
            style={{ borderRadius: 0 }}
          >
            {mapId === 0n ? "[SELECT MAP]" : `[MAP #${mapId.toString()}]`}
          </button>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Cost Limit
            <input
              type="number"
              value={costLimit.toString()}
              onChange={(e) => setCostLimit(BigInt(Math.max(0, Number(e.target.value) || 0)))}
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Turn Time (s)
            <input
              type="number"
              value={turnTime.toString()}
              onChange={(e) => setTurnTime(BigInt(Math.max(0, Number(e.target.value) || 0)))}
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Max Score
            <input
              type="number"
              value={maxScore.toString()}
              onChange={(e) => setMaxScore(BigInt(Math.max(0, Number(e.target.value) || 0)))}
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-text-muted self-end pb-2">
            <input
              type="checkbox"
              checked={creatorGoesFirst}
              onChange={(e) => setCreatorGoesFirst(e.target.checked)}
            />
            Creator goes first
          </label>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSaveDetails()}
          className="self-start border-2 border-phosphor-green px-4 py-2 text-sm font-bold uppercase tracking-wider text-phosphor-green hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isSaving ? "[SAVING...]" : mode === "create" ? "[CREATE NODE]" : "[SAVE DETAILS]"}
        </button>

        <button
          type="button"
          disabled={mapId === 0n}
          onClick={() => setShowFleetEditor(true)}
          title={mapId === 0n ? "Set a map before editing the enemy fleet." : undefined}
          className="self-start border-2 border-warning-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-red hover:bg-warning-red/10 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          [EDIT ENEMY FLEET]
        </button>
      </div>

      {mode === "edit" && node && (
        <div className="border-t border-steel pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0">
          <h4 className="text-xs uppercase tracking-wider text-text-muted mb-2">Prerequisites</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {node.prerequisites.length === 0 && (
              <span className="text-xs text-text-muted">None — this node is always reachable.</span>
            )}
            {node.prerequisites.map((p) => (
              <span
                key={p.toString()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-cyan/40 text-cyan"
              >
                #{p.toString()}
                <button
                  type="button"
                  onClick={() => void handleRemovePrerequisite(p)}
                  className="text-warning-red hover:text-warning-red/70"
                  aria-label={`Remove prerequisite ${p}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {connectModeActive ? (
            <button
              type="button"
              onClick={onCancelConnectMode}
              className="border-2 border-warning-red px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-warning-red hover:bg-warning-red/10"
              style={{ borderRadius: 0 }}
            >
              [CANCEL LINKING]
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartConnectMode(node.id)}
              className="border-2 border-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10"
              style={{ borderRadius: 0 }}
            >
              [+ LINK PREREQUISITE]
            </button>
          )}
        </div>
      )}

      {showMapPicker && (
        <MapPickerModal
          maps={maps}
          selectedMapId={mapId === 0n ? null : Number(mapId)}
          onSelect={(id) => {
            setMapId(BigInt(id));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showFleetEditor && mapId !== 0n && (
        <div className="fixed inset-0 z-[450]">
          {isEncounterEditor ? (
            <MapPlacementsEditor mapId={mapId} configs={allConfigs ?? []} />
          ) : (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
              <div
                className="bg-near-black border-2 p-6 max-w-2xl w-full rounded-none font-mono"
                style={{ borderColor: "var(--color-cyan)" }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-bold text-cyan">[ENEMY FLEET — VIEW ONLY]</h4>
                  <button
                    type="button"
                    onClick={() => setShowFleetEditor(false)}
                    className="text-cyan text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  You don&apos;t have the Enemy Fleet Editor role (isEncounterEditor) — ask an admin
                  to grant it from Campaign Settings to edit placements.
                </p>
                <EnemyFleetPreviewFor mapId={mapId} configs={allConfigs ?? []} />
              </div>
            </div>
          )}
          {isEncounterEditor && (
            <button
              type="button"
              onClick={() => setShowFleetEditor(false)}
              className="fixed top-4 right-4 z-[460] px-3 py-1 text-sm font-bold text-text-muted border border-gunmetal bg-near-black hover:text-text-secondary hover:border-steel"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Small adapter so the read-only fallback can reuse EnemyFleetPreview
// (already chain-agnostic) without duplicating AIEncounters placement
// reads here — mirrors how RoguelikeGraph.tsx builds its own fleetShips.
function EnemyFleetPreviewFor({
  mapId,
  configs,
}: {
  mapId: bigint;
  configs: ReturnType<typeof useGetAllAIShipConfigs>["data"];
}) {
  const placementsQuery = useGetMapPlacements(mapId);
  const configById = React.useMemo(() => {
    const map = new Map<string, NonNullable<typeof configs>[number]>();
    (configs ?? []).forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [configs]);

  const ships = React.useMemo(() => {
    if (!placementsQuery.data) return [];
    return placementsQuery.data.configIds.flatMap((configId, i) => {
      const config = configById.get(configId.toString());
      if (!config) return [];
      const previewShip = aiConfigToPreviewShip(config, BigInt(i));
      return [
        {
          key: `${configId.toString()}-${i}`,
          name: config.name || ARCHETYPE_LABEL[config.archetype],
          renderImage: () => (
            <ShipImage ship={previewShip} className="h-full w-full" showLoadingState={false} hideRankStars />
          ),
          renderHoverCard: () => (
            <ShipCard
              ship={toShipCardData(previewShip)}
              shipImage={<ShipImage ship={previewShip} className="h-full w-full" showLoadingState={false} />}
              isStarred={false}
              onToggleStar={() => {}}
              isSelected={false}
              onToggleSelection={() => {}}
              onRecycleClick={() => {}}
              showInGameProperties={false}
              hideRecycle
              hideCheckbox
              tooltipMode
            />
          ),
        },
      ];
    });
  }, [placementsQuery.data, configById]);

  const totalCost = React.useMemo(() => {
    if (!placementsQuery.data) return 0;
    return placementsQuery.data.configIds.reduce((sum: number, configId: bigint) => {
      const config = configById.get(configId.toString());
      return config ? sum + aiConfigToPreviewShip(config).shipData.cost : sum;
    }, 0);
  }, [placementsQuery.data, configById]);

  return (
    <EnemyFleetPreview ships={ships} totalCost={totalCost} isLoading={placementsQuery.isLoading} />
  );
}

"use client";

import React from "react";
import { toast } from "react-hot-toast";
import type { CampaignGraphNode } from "../hooks/useNodeMap";
import { useNodeMapAdmin } from "../hooks/useNodeMapAdmin";
import {
  useGetAllPresetMaps,
  useMapModes,
  useMapNames,
  useMapsCreatorZonePositions,
  useMapsImpassablePositions,
  useMapsJoinerZonePositions,
  mapTitleLabel,
} from "../hooks/useMapsContract";
import { MapMode } from "../types/types";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapEditScreen } from "./MapEditScreen";
import { useAccount } from "wagmi";
import { MAP_ADMIN_ADDRESS } from "../config/alpha";
import { useGetAllAIShipConfigs } from "../hooks/useAIEncountersContract";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import {
  editableDescription,
  editableTitle,
  nodeContentSaveError,
  useSaveOnChainNodeContent,
  type ResolvedNodeContent,
} from "../hooks/useNodeContent";
import { MapPickerModal, type MapPickerMap } from "./MapPickerModal";
import { MapPlacementsEditor } from "./MapPlacementsEditor";

const DEFAULT_CAMPAIGN_ID = 1n;

// Placeholder defaults for a freshly-created node — real game-balance
// numbers should replace these before shipping (flagged in the map editor
// plan, not something this UI can infer on its own).
const NEW_NODE_DEFAULTS = { costLimit: 100n, turnTime: 120n, maxScore: 1000n };

interface CampaignNodeEditPanelProps {
  mode: "create" | "edit";
  /** Non-null in edit mode; ignored (but may be null) in create mode. */
  /** The graph passes its node with resolved title/description attached. */
  node: (CampaignGraphNode & Partial<ResolvedNodeContent>) | null;
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
  const { data: allMapsData, refetch: refetchAllMaps } = useGetAllPresetMaps();
  const { address } = useAccount();
  const isMapAdmin = address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase();
  const [showMapEditor, setShowMapEditor] = React.useState(false);
  const { data: allConfigs } = useGetAllAIShipConfigs();
  const { isEditor: isEncounterEditor, isLoading: isEncounterEditorLoading } =
    useIsEncounterEditor();
  const saveContent = useSaveOnChainNodeContent();

  const [mapId, setMapId] = React.useState<bigint>(node?.mapId ?? 0n);
  const [costLimit, setCostLimit] = React.useState(node?.costLimit ?? NEW_NODE_DEFAULTS.costLimit);
  const [turnTime, setTurnTime] = React.useState(node?.turnTime ?? NEW_NODE_DEFAULTS.turnTime);
  const [maxScore, setMaxScore] = React.useState(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
  const [creatorGoesFirst, setCreatorGoesFirst] = React.useState(node?.creatorGoesFirst ?? true);
  const [showMapPicker, setShowMapPicker] = React.useState(false);
  const [showFleetEditor, setShowFleetEditor] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [title, setTitle] = React.useState(editableTitle(node));
  const [description, setDescription] = React.useState(editableDescription(node));

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
    // Only re-seed on node change, not when this node's content refetches
    // (would clobber an in-progress edit).
    setTitle(editableTitle(node));
    setDescription(editableDescription(node));
  }, [node]);

  const allMapIds = React.useMemo(() => {
    if (!allMapsData) return [];
    const [mapIds] = allMapsData as [bigint[], unknown[], unknown[]];
    return mapIds.map((id) => Number(id));
  }, [allMapsData]);
  const { nameByMapId } = useMapNames(allMapIds);
  const { modeByMapId } = useMapModes(allMapIds);
  const { impassableByMapId } = useMapsImpassablePositions(allMapIds);
  const { creatorZoneByMapId } = useMapsCreatorZonePositions(allMapIds);
  const { joinerZoneByMapId } = useMapsJoinerZonePositions(allMapIds);

  const maps: MapPickerMap[] = React.useMemo(() => {
    if (!allMapsData) return [];
    const [mapIds, blockedArr, scoringArr] = allMapsData as [bigint[], unknown[], unknown[]];
    return mapIds.map((id, i) => ({
      id: Number(id),
      titleLabel: mapTitleLabel(Number(id), nameByMapId),
      blockedPositions: (blockedArr[i] as MapPickerMap["blockedPositions"]) ?? [],
      scoringPositions: (scoringArr[i] as MapPickerMap["scoringPositions"]) ?? [],
      impassablePositions: impassableByMapId.get(Number(id)),
      creatorZonePositions: creatorZoneByMapId.get(Number(id)),
      joinerZonePositions: joinerZoneByMapId.get(Number(id)),
      modeLabel: MapMode[modeByMapId.get(Number(id)) ?? MapMode.Both],
    }));
  }, [allMapsData, nameByMapId, impassableByMapId, creatorZoneByMapId, joinerZoneByMapId, modeByMapId]);

  const pickerMaps = React.useMemo(
    () => maps.filter((m) => (modeByMapId.get(m.id) ?? MapMode.Both) !== MapMode.PvP),
    [maps, modeByMapId],
  );
  const selectedMapPreview = React.useMemo(
    () => (mapId === 0n ? undefined : maps.find((m) => m.id === Number(mapId))),
    [maps, mapId],
  );

  const handleEditEnemyFleet = () => {
    if (mapId === 0n) {
      toast.error("Select a map before editing the enemy fleet.");
      return;
    }
    if (!address) {
      toast.error("Connect the Enemy Fleet Editor wallet to edit placements.");
      return;
    }
    if (isEncounterEditorLoading) {
      toast.error("Checking Enemy Fleet Editor permission...");
      return;
    }
    if (!isEncounterEditor) {
      toast.error(
        "This wallet is not an Enemy Fleet Editor. Ask an admin to grant isEncounterEditor.",
      );
      return;
    }
    setShowFleetEditor(true);
  };

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
    if (node == null) return;
    try {
      const hash = await saveContent("CAMPAIGN", node.id, { title, description });
      toast.success(`Node content saved on chain. (tx: ${hash.slice(0, 10)}…)`);
      onSaved();
    } catch (error) {
      console.error("Failed to save node content:", error);
      toast.error(nodeContentSaveError(error));
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
            {mapId === 0n
              ? "[SELECT MAP]"
              : `[CHANGE MAP] ${mapTitleLabel(Number(mapId), nameByMapId)}`}
          </button>
          <span className="text-[10px] text-text-muted">
            Draft until you Save Details.
          </span>
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
          onClick={handleEditEnemyFleet}
          className="self-start border-2 border-warning-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-red hover:bg-warning-red/10"
          style={{ borderRadius: 0 }}
        >
          [EDIT ENEMY FLEET]
        </button>

        {selectedMapPreview && (
          <div className="mt-2 border-t border-steel pt-4">
            <MapPreviewCard
              map={selectedMapPreview}
              modeLabel={selectedMapPreview.modeLabel}
              onSelect={() => setShowMapPicker(true)}
              onEdit={isMapAdmin ? () => setShowMapEditor(true) : undefined}
            />
          </div>
        )}
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
          maps={pickerMaps}
          selectedMapId={mapId === 0n ? null : Number(mapId)}
          onSelect={(id) => {
            setMapId(BigInt(id));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showMapEditor && selectedMapPreview && (
        <div className="fixed inset-0 z-[600] overflow-y-auto bg-near-black/95 p-4">
          <div className="mx-auto max-w-5xl">
            <MapEditScreen
              mapId={selectedMapPreview.id}
              initialBlockedPositions={selectedMapPreview.blockedPositions}
              initialScoringPositions={selectedMapPreview.scoringPositions}
              onSaved={() => {
                setShowMapEditor(false);
                void refetchAllMaps();
              }}
              onCancel={() => setShowMapEditor(false)}
            />
          </div>
        </div>
      )}

      {showFleetEditor && mapId !== 0n && isEncounterEditor && (
        <MapPlacementsEditor
          mapId={mapId}
          configs={allConfigs ?? []}
          startOpen
          onClose={() => setShowFleetEditor(false)}
        />
      )}
    </div>
  );
}

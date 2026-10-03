"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { useCampaignAdminWeb2, type CampaignNodeWeb2 } from "../hooks/useCampaignAdminWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useNodeContentWeb2, useSaveNodeContentWeb2 } from "../hooks/useNodeContent";
import { MapPickerModal, type MapPickerMap } from "./MapPickerModal";
import { MapPreviewCard } from "./MapPreviewCard";
import { MapEditScreenWeb2 } from "./MapEditScreenWeb2";
import { MapMode } from "../types/types";
import { MapPlacementsEditorWeb2 } from "./MapPlacementsEditorWeb2";
import { type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";
import { parseZoneTiles } from "../utils/deploymentZone";

const DEFAULT_CAMPAIGN_ID = 1;

// Placeholder defaults for a freshly-created node — see CampaignNodeEditPanel.tsx's matching note.
const NEW_NODE_DEFAULTS = { costLimit: 100, turnTimeSeconds: 120, maxScore: 1000 };

interface Web2Map {
  id: number;
  name: string;
  blockedTiles: MapPickerMap["blockedPositions"];
  scoringTiles: MapPickerMap["scoringPositions"];
  impassableTiles?: NonNullable<MapPickerMap["impassablePositions"]>;
  creatorZone?: unknown;
  joinerZone?: unknown;
  mode: MapMode;
}

interface CampaignNodeEditPanelWeb2Props {
  mode: "create" | "edit";
  node: CampaignNodeWeb2 | null;
  connectModeActive: boolean;
  onStartConnectMode: (sourceNodeId: number) => void;
  onCancelConnectMode: () => void;
  onSaved: () => void;
  onCreated: () => void;
  onCancelCreate: () => void;
}

// Web2 counterpart to CampaignNodeEditPanel.tsx — same layout/flow, backed
// by Prisma writes (useCampaignAdminWeb2) instead of NodeMap contract calls.
// Kept as a separate component rather than force-sharing with the web3
// panel, matching CampaignNodePreview.tsx/CampaignNodePreviewWeb2.tsx's
// existing split (different data-fetching hooks per chain, not just
// different write handlers).
export function CampaignNodeEditPanelWeb2({
  mode,
  node,
  connectModeActive,
  onStartConnectMode,
  onCancelConnectMode,
  onSaved,
  onCreated,
  onCancelCreate,
}: CampaignNodeEditPanelWeb2Props) {
  const admin = useCampaignAdminWeb2();
  const isWeb2Admin = useWeb2Admin();
  const { email, isLoggedIn, isLoading: isUserLoading } = useCurrentUser();
  const { data: web2Maps, refetch: refetchWeb2Maps } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2Map[]>("/api/maps"),
  });
  const { data: configs } = useQuery({
    queryKey: ["ai-ship-configs"],
    queryFn: () => apiFetch<AIShipConfigWeb2[]>("/api/admin/ai-ship-configs"),
  });
  const { contentById, refetch: refetchContent } = useNodeContentWeb2("CAMPAIGN");
  const saveContent = useSaveNodeContentWeb2();

  const [mapId, setMapId] = React.useState<number>(node?.mapId ?? 0);
  const [costLimit, setCostLimit] = React.useState(node?.costLimit ?? NEW_NODE_DEFAULTS.costLimit);
  const [turnTimeSeconds, setTurnTimeSeconds] = React.useState(
    node?.turnTimeSeconds ?? NEW_NODE_DEFAULTS.turnTimeSeconds,
  );
  const [maxScore, setMaxScore] = React.useState(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
  const [creatorGoesFirst, setCreatorGoesFirst] = React.useState(node?.creatorGoesFirst ?? true);
  const [showMapPicker, setShowMapPicker] = React.useState(false);
  const [showMapEditor, setShowMapEditor] = React.useState(false);
  const [showFleetEditor, setShowFleetEditor] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const resolvedContent = node ? contentById.get(Number(node.id)) : undefined;
  const [title, setTitle] = React.useState(resolvedContent?.title ?? "");
  const [description, setDescription] = React.useState(resolvedContent?.description ?? "");

  const seededNodeIdRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const key = node?.id ?? null;
    if (seededNodeIdRef.current === key) return;
    seededNodeIdRef.current = key;
    setMapId(node?.mapId ?? 0);
    setCostLimit(node?.costLimit ?? NEW_NODE_DEFAULTS.costLimit);
    setTurnTimeSeconds(node?.turnTimeSeconds ?? NEW_NODE_DEFAULTS.turnTimeSeconds);
    setMaxScore(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
    setCreatorGoesFirst(node?.creatorGoesFirst ?? true);
    const c = node ? contentById.get(Number(node.id)) : undefined;
    setTitle(c?.title ?? "");
    setDescription(c?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const maps: MapPickerMap[] = React.useMemo(
    () =>
      (web2Maps ?? []).map((m) => ({
        id: m.id,
        titleLabel: `Map #${m.id} - ${m.name}`,
        blockedPositions: m.blockedTiles,
        scoringPositions: m.scoringTiles,
        impassablePositions: m.impassableTiles ?? [],
        creatorZonePositions: parseZoneTiles(m.creatorZone) ?? [],
        joinerZonePositions: parseZoneTiles(m.joinerZone) ?? [],
        modeLabel: MapMode[m.mode],
      })),
    [web2Maps],
  );
  const pickerMaps = React.useMemo(
    () => maps.filter((m) => {
      const raw = web2Maps?.find((w) => w.id === m.id)?.mode;
      return (raw ?? MapMode.Both) !== MapMode.PvP;
    }),
    [maps, web2Maps],
  );
  const selectedMapPreview = React.useMemo(
    () => (mapId === 0 ? undefined : maps.find((m) => m.id === mapId)),
    [maps, mapId],
  );
  const editingWeb2Map = (web2Maps ?? []).find((m) => m.id === mapId);

  const handleEditEnemyFleet = () => {
    if (mapId === 0) {
      toast.error("Select a map before editing the enemy fleet.");
      return;
    }
    if (isUserLoading) {
      toast.error("Checking admin permission...");
      return;
    }
    if (!isLoggedIn || !email) {
      toast.error("Log in as an admin to edit the enemy fleet.");
      return;
    }
    if (!isWeb2Admin) {
      toast.error("This account is not an admin. Log in with an admin email to edit the enemy fleet.");
      return;
    }
    setShowFleetEditor(true);
  };

  const handleSaveDetails = async () => {
    if (mapId === 0) {
      toast.error("Select a map before saving.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        await admin.createNode({
          campaignId: DEFAULT_CAMPAIGN_ID,
          mapId,
          prerequisites: [],
          costLimit,
          turnTimeSeconds,
          maxScore,
          creatorGoesFirst,
        });
        toast.success("Node created.");
        onCreated();
      } else if (node) {
        await admin.updateNode({
          ...node,
          mapId,
          costLimit,
          turnTimeSeconds,
          maxScore,
          creatorGoesFirst,
        });
        toast.success(`Node #${node.id} updated.`);
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
      await saveContent("CAMPAIGN", node.id, { title, description });
      await refetchContent();
      toast.success("Node content saved.");
    } catch (error) {
      console.error("Failed to save node content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node content");
    }
  };

  const handleRemovePrerequisite = async (prerequisiteId: number) => {
    if (!node) return;
    try {
      await admin.removePrerequisite(node, prerequisiteId);
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
            {mode === "create" ? "[NEW NODE]" : `[EDIT NODE #${node!.id}]`}
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
            {mapId === 0
              ? "[SELECT MAP]"
              : `[CHANGE MAP] ${selectedMapPreview?.titleLabel ?? `#${mapId}`}`}
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
              value={costLimit}
              onChange={(e) => setCostLimit(Math.max(0, Number(e.target.value) || 0))}
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Max Score
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(Math.max(0, Number(e.target.value) || 0))}
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
              onEdit={isWeb2Admin ? () => setShowMapEditor(true) : undefined}
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
                key={p}
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-cyan/40 text-cyan"
              >
                #{p}
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
          selectedMapId={mapId === 0 ? null : mapId}
          onSelect={(id) => {
            setMapId(id);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showMapEditor && editingWeb2Map && (
        <div className="fixed inset-0 z-[600] overflow-y-auto bg-near-black/95 p-4">
          <div className="mx-auto max-w-5xl">
            <MapEditScreenWeb2
              key={editingWeb2Map.id}
              map={{ ...editingWeb2Map, impassableTiles: editingWeb2Map.impassableTiles ?? [] }}
              onSaved={() => {
                setShowMapEditor(false);
                void refetchWeb2Maps();
              }}
              onCancel={() => setShowMapEditor(false)}
              onMapChanged={() => void refetchWeb2Maps()}
            />
          </div>
        </div>
      )}

      {showFleetEditor && mapId !== 0 && isWeb2Admin && (
        <MapPlacementsEditorWeb2
          mapId={mapId}
          configs={configs ?? []}
          startOpen
          onClose={() => setShowFleetEditor(false)}
        />
      )}
    </div>
  );
}

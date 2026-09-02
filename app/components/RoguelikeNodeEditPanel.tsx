"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind, type RoguelikeNode } from "../types/roguelike";
import { useRoguelikeNodeMapAdmin } from "../hooks/useRoguelikeNodeMapAdmin";
import { useGetAllPresetMaps } from "../hooks/useMapsContract";
import { useGetAllAIShipConfigs } from "../hooks/useAIEncountersContract";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useAllNodeContent, useSaveNodeContent, resolveNodeContent } from "../hooks/useNodeContent";
import { MapPickerModal, type MapPickerMap } from "./MapPickerModal";
import { MapPlacementsEditor } from "./MapPlacementsEditor";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { useGetMapPlacements } from "../hooks/useAIEncountersContract";
import { aiConfigToPreviewShip, ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";

// Placeholder defaults for a freshly-created node — see CampaignNodeEditPanel.tsx's matching note.
const NEW_NODE_DEFAULTS = { turnTime: 120n, maxScore: 1000n, costCapOverride: 700n };

interface RoguelikeNodeEditPanelProps {
  mode: "create" | "edit";
  node: RoguelikeNode | null;
  campaignId: bigint;
  /** True while THIS node is the active connect-mode source (parent side of addChild). */
  connectModeActive: boolean;
  onStartConnectMode: (sourceNodeId: bigint) => void;
  onCancelConnectMode: () => void;
  onSaved: () => void;
  onCreated: () => void;
  onCancelCreate: () => void;
}

// Roguelike counterpart to CampaignNodeEditPanel.tsx — same layout/flow,
// backed by useRoguelikeNodeMapAdmin instead of useNodeMapAdmin. Kept
// separate rather than shared for the same reason as the original
// campaign's web2/web3 split: different admin hooks, plus the extra
// kind (Combat/Resupply) field-graying this system needs that the
// original campaign has no equivalent of.
export function RoguelikeNodeEditPanel({
  mode,
  node,
  campaignId,
  connectModeActive,
  onStartConnectMode,
  onCancelConnectMode,
  onSaved,
  onCreated,
  onCancelCreate,
}: RoguelikeNodeEditPanelProps) {
  const admin = useRoguelikeNodeMapAdmin();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: allConfigs } = useGetAllAIShipConfigs();
  const { isEditor: isEncounterEditor } = useIsEncounterEditor();
  const { contentById, refetch: refetchContent } = useAllNodeContent("ROGUELIKE");
  const saveContent = useSaveNodeContent();

  const [kind, setKind] = React.useState<RoguelikeNodeKind>(node?.kind ?? RoguelikeNodeKind.Combat);
  const [mapId, setMapId] = React.useState<bigint>(node?.mapId ?? 0n);
  const [turnTime, setTurnTime] = React.useState(node?.turnTime ?? NEW_NODE_DEFAULTS.turnTime);
  const [maxScore, setMaxScore] = React.useState(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
  const [creatorGoesFirst, setCreatorGoesFirst] = React.useState(node?.creatorGoesFirst ?? true);
  const [costCapOverride, setCostCapOverride] = React.useState(
    node?.costCapOverride ?? NEW_NODE_DEFAULTS.costCapOverride,
  );
  const [twoWay, setTwoWay] = React.useState(false);
  const [showMapPicker, setShowMapPicker] = React.useState(false);
  const [showFleetEditor, setShowFleetEditor] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const resolvedContent = node ? resolveNodeContent("ROGUELIKE", contentById, node.id) : null;
  const [title, setTitle] = React.useState(resolvedContent?.title ?? "");
  const [description, setDescription] = React.useState(resolvedContent?.description ?? "");

  const seededNodeIdRef = React.useRef<bigint | null>(null);
  React.useEffect(() => {
    const key = node?.id ?? null;
    if (seededNodeIdRef.current === key) return;
    seededNodeIdRef.current = key;
    setKind(node?.kind ?? RoguelikeNodeKind.Combat);
    setMapId(node?.mapId ?? 0n);
    setTurnTime(node?.turnTime ?? NEW_NODE_DEFAULTS.turnTime);
    setMaxScore(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
    setCreatorGoesFirst(node?.creatorGoesFirst ?? true);
    setCostCapOverride(node?.costCapOverride ?? NEW_NODE_DEFAULTS.costCapOverride);
    const c = node ? resolveNodeContent("ROGUELIKE", contentById, node.id) : null;
    setTitle(c?.title ?? "");
    setDescription(c?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const isCombat = kind === RoguelikeNodeKind.Combat;

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
    if (isCombat && mapId === 0n) {
      toast.error("Select a map before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const effectiveMapId = isCombat ? mapId : 0n;
      const effectiveCostCapOverride = isCombat ? 0n : costCapOverride;
      if (mode === "create") {
        const hash = await admin.createNode(
          campaignId,
          kind,
          effectiveMapId,
          turnTime,
          maxScore,
          creatorGoesFirst,
          effectiveCostCapOverride,
        );
        toast.success(`Node created. (tx: ${hash.slice(0, 10)}…)`);
        onCreated();
      } else if (node) {
        const hash = await admin.updateNode(
          node.id,
          node.campaignId,
          kind,
          effectiveMapId,
          turnTime,
          maxScore,
          creatorGoesFirst,
          effectiveCostCapOverride,
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
      await saveContent("ROGUELIKE", Number(node.id), { title, description });
      await refetchContent();
      toast.success("Node content saved.");
    } catch (error) {
      console.error("Failed to save node content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node content");
    }
  };

  const handleRemoveChild = async (childId: bigint) => {
    if (!node) return;
    try {
      await admin.removeChild(node.id, childId);
      onSaved();
    } catch (error) {
      console.error("Failed to remove child edge:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove child edge");
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
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(Number(e.target.value) as RoguelikeNodeKind)}
            className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          >
            <option value={RoguelikeNodeKind.Combat}>Combat</option>
            <option value={RoguelikeNodeKind.Resupply}>Resupply</option>
          </select>
        </label>

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

        {isCombat ? (
          <>
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
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Cost Cap Override (0 = no change)
            <input
              type="number"
              value={costCapOverride.toString()}
              onChange={(e) => setCostCapOverride(BigInt(Math.max(0, Number(e.target.value) || 0)))}
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
          </label>
        )}

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSaveDetails()}
          className="self-start border-2 border-phosphor-green px-4 py-2 text-sm font-bold uppercase tracking-wider text-phosphor-green hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isSaving ? "[SAVING...]" : mode === "create" ? "[CREATE NODE]" : "[SAVE DETAILS]"}
        </button>

        {isCombat && (
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
        )}
      </div>

      {mode === "edit" && node && (
        <div className="border-t border-steel pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0">
          <h4 className="text-xs uppercase tracking-wider text-text-muted mb-2">Children</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {node.children.length === 0 && (
              <span className="text-xs text-text-muted">
                None — clearing this node ends the run.
              </span>
            )}
            {node.children.map((edge) => (
              <span
                key={edge.childId.toString()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-cyan/40 text-cyan"
              >
                #{edge.childId.toString()} {edge.twoWay ? "↔" : "→"}
                <button
                  type="button"
                  onClick={() => void handleRemoveChild(edge.childId)}
                  className="text-warning-red hover:text-warning-red/70"
                  aria-label={`Remove child ${edge.childId}`}
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
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-text-muted">
                <input type="checkbox" checked={twoWay} onChange={(e) => setTwoWay(e.target.checked)} />
                Two-way (player can walk back across this edge)
              </label>
              <button
                type="button"
                onClick={() => onStartConnectMode(node.id)}
                className="self-start border-2 border-cyan px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan hover:bg-cyan/10"
                style={{ borderRadius: 0 }}
              >
                [+ LINK CHILD]
              </button>
            </div>
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

      {showFleetEditor && isCombat && mapId !== 0n && (
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
                <RoguelikeEnemyFleetPreviewFor mapId={mapId} configs={allConfigs ?? []} />
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

function RoguelikeEnemyFleetPreviewFor({
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

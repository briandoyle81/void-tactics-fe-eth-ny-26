"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { RoguelikeNodeKind } from "../types/roguelike";
import type { RoguelikeNodeWeb2 } from "../hooks/useRoguelikeWeb2";
import { useRoguelikeAdminWeb2, type RoguelikeNodeWeb2Input } from "../hooks/useRoguelikeAdminWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useAllNodeContent, useSaveNodeContent, resolveNodeContent } from "../hooks/useNodeContent";
import { MapPickerModal, type MapPickerMap } from "./MapPickerModal";
import { MapPlacementsEditorWeb2 } from "./MapPlacementsEditorWeb2";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";
import { ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";

const NEW_NODE_DEFAULTS = { turnTimeSeconds: 120, maxScore: 1000, costCapOverride: 700 };

interface Web2Map {
  id: number;
  name: string;
  blockedTiles: MapPickerMap["blockedPositions"];
  scoringTiles: MapPickerMap["scoringPositions"];
}

interface AIMapPlacementWeb2 {
  configId: number;
}

interface RoguelikeNodeEditPanelWeb2Props {
  mode: "create" | "edit";
  node: RoguelikeNodeWeb2 | null;
  campaignId: number;
  connectModeActive: boolean;
  onStartConnectMode: (sourceNodeId: number) => void;
  onCancelConnectMode: () => void;
  onSaved: () => void;
  onCreated: () => void;
  onCancelCreate: () => void;
}

// Web2 counterpart to RoguelikeNodeEditPanel.tsx — same layout/flow, backed
// by useRoguelikeAdminWeb2 (Prisma writes) instead of the RoguelikeNodeMap
// contract.
export function RoguelikeNodeEditPanelWeb2({
  mode,
  node,
  campaignId,
  connectModeActive,
  onStartConnectMode,
  onCancelConnectMode,
  onSaved,
  onCreated,
  onCancelCreate,
}: RoguelikeNodeEditPanelWeb2Props) {
  const admin = useRoguelikeAdminWeb2();
  const isWeb2Admin = useWeb2Admin();
  const { data: web2Maps } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2Map[]>("/api/maps"),
  });
  const { data: configs } = useQuery({
    queryKey: ["ai-ship-configs"],
    queryFn: () => apiFetch<AIShipConfigWeb2[]>("/api/admin/ai-ship-configs"),
  });
  const { contentById, refetch: refetchContent } = useAllNodeContent("ROGUELIKE");
  const saveContent = useSaveNodeContent();

  const [kind, setKind] = React.useState<RoguelikeNodeKind>(
    (node?.kind as RoguelikeNodeKind) ?? RoguelikeNodeKind.Combat,
  );
  const [mapId, setMapId] = React.useState<number>(node?.mapId ?? 0);
  const [turnTimeSeconds, setTurnTimeSeconds] = React.useState(
    node?.turnTimeSeconds ?? NEW_NODE_DEFAULTS.turnTimeSeconds,
  );
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

  const seededNodeIdRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const key = node?.id ?? null;
    if (seededNodeIdRef.current === key) return;
    seededNodeIdRef.current = key;
    setKind((node?.kind as RoguelikeNodeKind) ?? RoguelikeNodeKind.Combat);
    setMapId(node?.mapId ?? 0);
    setTurnTimeSeconds(node?.turnTimeSeconds ?? NEW_NODE_DEFAULTS.turnTimeSeconds);
    setMaxScore(node?.maxScore ?? NEW_NODE_DEFAULTS.maxScore);
    setCreatorGoesFirst(node?.creatorGoesFirst ?? true);
    setCostCapOverride(node?.costCapOverride ?? NEW_NODE_DEFAULTS.costCapOverride);
    const c = node ? resolveNodeContent("ROGUELIKE", contentById, node.id) : null;
    setTitle(c?.title ?? "");
    setDescription(c?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const isCombat = kind === RoguelikeNodeKind.Combat;

  const maps: MapPickerMap[] = React.useMemo(
    () =>
      (web2Maps ?? []).map((m) => ({
        id: m.id,
        titleLabel: `Map #${m.id} — ${m.name}`,
        blockedPositions: m.blockedTiles,
        scoringPositions: m.scoringTiles,
      })),
    [web2Maps],
  );

  const handleSaveDetails = async () => {
    if (isCombat && mapId === 0) {
      toast.error("Select a map before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const input: RoguelikeNodeWeb2Input = {
        campaignId,
        kind,
        mapId: isCombat ? mapId : null,
        turnTimeSeconds: isCombat ? turnTimeSeconds : null,
        maxScore: isCombat ? maxScore : null,
        creatorGoesFirst: isCombat ? creatorGoesFirst : null,
        costCapOverride: isCombat ? null : costCapOverride,
      };
      if (mode === "create") {
        await admin.createNode(input);
        toast.success("Node created.");
        onCreated();
      } else if (node) {
        await admin.updateNode(node.id, input);
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
      await saveContent("ROGUELIKE", node.id, { title, description });
      await refetchContent();
      toast.success("Node content saved.");
    } catch (error) {
      console.error("Failed to save node content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node content");
    }
  };

  const handleRemoveChild = async (childId: number) => {
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
                {mapId === 0 ? "[SELECT MAP]" : `[MAP #${mapId}]`}
              </button>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Turn Time (s)
                <input
                  type="number"
                  value={turnTimeSeconds}
                  onChange={(e) => setTurnTimeSeconds(Math.max(0, Number(e.target.value) || 0))}
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
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Cost Cap Override (0 = no change)
            <input
              type="number"
              value={costCapOverride}
              onChange={(e) => setCostCapOverride(Math.max(0, Number(e.target.value) || 0))}
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
            disabled={mapId === 0}
            onClick={() => setShowFleetEditor(true)}
            title={mapId === 0 ? "Set a map before editing the enemy fleet." : undefined}
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
            {node.childEdges.length === 0 && (
              <span className="text-xs text-text-muted">
                None — clearing this node ends the run.
              </span>
            )}
            {node.childEdges.map((edge) => (
              <span
                key={edge.childId}
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-cyan/40 text-cyan"
              >
                #{edge.childId} {edge.twoWay ? "↔" : "→"}
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
          selectedMapId={mapId === 0 ? null : mapId}
          onSelect={(id) => {
            setMapId(id);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showFleetEditor && isCombat && mapId !== 0 && (
        <div className="fixed inset-0 z-[450]">
          {isWeb2Admin ? (
            <MapPlacementsEditorWeb2 mapId={mapId} configs={configs ?? []} />
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
                <RoguelikeEnemyFleetPreviewWeb2For mapId={mapId} configs={configs ?? []} />
              </div>
            </div>
          )}
          {isWeb2Admin && (
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

function RoguelikeEnemyFleetPreviewWeb2For({
  mapId,
  configs,
}: {
  mapId: number;
  configs: AIShipConfigWeb2[];
}) {
  const { data: placements, isLoading } = useQuery({
    queryKey: ["ai-map-placements", mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/ai-map-placements?mapId=${mapId}`),
  });
  const configById = React.useMemo(() => {
    const map = new Map<number, AIShipConfigWeb2>();
    configs.forEach((c) => map.set(c.id, c));
    return map;
  }, [configs]);

  const ships = React.useMemo(() => {
    if (!placements) return [];
    return placements.flatMap((p, i) => {
      const config = configById.get(p.configId);
      if (!config) return [];
      const previewShip = aiConfigToPreviewShipWeb2(config, i);
      return [
        {
          key: `${p.configId}-${i}`,
          name: config.name || ARCHETYPE_LABEL[config.archetype],
          renderImage: () => (
            <ShipImageWeb2 ship={previewShip} className="h-full w-full" showLoadingState={false} hideRankStars />
          ),
          renderHoverCard: () => (
            <ShipCard
              ship={toShipCardDataWeb2(previewShip)}
              shipImage={<ShipImageWeb2 ship={previewShip} className="h-full w-full" showLoadingState={false} />}
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
  }, [placements, configById]);

  const totalCost = React.useMemo(() => {
    if (!placements) return 0;
    return placements.reduce((sum, p) => {
      const config = configById.get(p.configId);
      return config ? sum + aiConfigToPreviewShipWeb2(config).shipData.cost : sum;
    }, 0);
  }, [placements, configById]);

  return <EnemyFleetPreview ships={ships} totalCost={totalCost} isLoading={isLoading} />;
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  MAIN_WEAPON_NAMES,
  ARMOR_NAMES,
  SHIELD_NAMES,
  SPECIAL_NAMES,
  Archetype,
  AIShipConfig,
  MapPosition,
} from "../types/types";
import { useIsEncounterEditor } from "../hooks/useIsEncounterEditor";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
  useMaxPlacementsPerMap,
} from "../hooks/useAIEncountersContract";
import { MapDisplay } from "./MapDisplay";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";
import { FleetShipListPanel, type FleetShipListItemData } from "./FleetShipListPanel";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";

const ARCHETYPE_NAMES: Record<Archetype, string> = {
  [Archetype.Grunt]: "Grunt",
  [Archetype.Aggressor]: "Aggressor",
  [Archetype.Sniper]: "Sniper",
  [Archetype.Support]: "Support",
  [Archetype.Turtle]: "Turtle",
  [Archetype.Rammer]: "Rammer",
};

const numberOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => i);

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

function ShipConfigForm({
  onSubmit,
  pending,
}: {
  onSubmit: (args: {
    name: string;
    mainWeapon: number;
    armor: number;
    shields: number;
    special: number;
    variant: number;
    accuracy: number;
    hull: number;
    speed: number;
    archetype: Archetype;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [mainWeapon, setMainWeapon] = useState(0);
  const [armor, setArmor] = useState(0);
  const [shields, setShields] = useState(0);
  const [special, setSpecial] = useState(0);
  const [variant, setVariant] = useState(1);
  const [accuracy, setAccuracy] = useState(1);
  const [hull, setHull] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [archetype, setArchetype] = useState<Archetype>(Archetype.Grunt);

  return (
    <div className="space-y-3 border border-gunmetal bg-black/40 p-3">
      <div>
        <label className="block text-xs text-cyan mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="AI ship config name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-cyan mb-1">Weapon</label>
          <select value={mainWeapon} onChange={(e) => setMainWeapon(Number(e.target.value))} className={inputClass} style={inputStyle}>
            {Object.entries(MAIN_WEAPON_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Armor</label>
          <select
            value={armor}
            onChange={(e) => { const v = Number(e.target.value); setArmor(v); if (v > 0) setShields(0); }}
            className={inputClass}
            style={inputStyle}
          >
            {Object.entries(ARMOR_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Shields</label>
          <select
            value={shields}
            onChange={(e) => { const v = Number(e.target.value); setShields(v); if (v > 0) setArmor(0); }}
            className={inputClass}
            style={inputStyle}
          >
            {Object.entries(SHIELD_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Special</label>
          <select value={special} onChange={(e) => setSpecial(Number(e.target.value))} className={inputClass} style={inputStyle}>
            {Object.entries(SPECIAL_NAMES).map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-cyan mb-1">Variant (faction, &gt;0)</label>
          <input
            type="number"
            min={1}
            value={variant}
            onChange={(e) => setVariant(Math.max(1, Number(e.target.value)))}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        {(
          [
            ["Accuracy", accuracy, setAccuracy],
            ["Hull", hull, setHull],
            ["Speed", speed, setSpeed],
          ] as const
        ).map(([label, value, setValue]) => (
          <div key={label}>
            <label className="block text-xs text-cyan mb-1">{label} (0-2)</label>
            <select
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {numberOptions(3).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs text-cyan mb-1">Archetype</label>
        <select
          value={archetype}
          onChange={(e) => setArchetype(Number(e.target.value) as Archetype)}
          className={inputClass}
          style={inputStyle}
        >
          {Object.entries(ARCHETYPE_NAMES).map(([v, n]) => (
            <option key={v} value={v}>{n}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={pending || !name.trim()}
        onClick={() =>
          onSubmit({ name: name.trim(), mainWeapon, armor, shields, special, variant, accuracy, hull, speed, archetype })
        }
        className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Creating..." : "Create Ship Config"}
      </button>
    </div>
  );
}

interface WorkingPlacement {
  /** Synthetic, rendering-only id (never sent on-chain — only row/col/configId are) so MapDisplay can key/select each placed ship even when the same config appears more than once on a map. */
  shipId: bigint;
  configId: bigint;
  row: number;
  col: number;
}

// Rendering-only id namespace for placements being edited — distinct from
// real AIShipConfig ids (small numbers) so MapDisplay's ship-id-keyed maps
// never collide. Never sent on-chain: setMapPlacements only takes
// row/col/configId.
const PLACEMENT_ID_BASE = 500_000_000n;

function MapPlacementsEditor({
  mapId,
  configs,
}: {
  mapId: bigint;
  configs: AIShipConfig[];
}) {
  const { setMapPlacements } = useAIEncountersAdmin();
  const { data: placementsData, refetch } = useGetMapPlacements(mapId);
  const { data: maxPlacementsData } = useMaxPlacementsPerMap();
  const maxPlacementsPerMap = Number(maxPlacementsData ?? 8n);

  const [placements, setPlacements] = useState<WorkingPlacement[]>([]);
  const seededMapIdRef = useRef<bigint | null>(null);
  const nextSyntheticIdRef = useRef(1);
  const freshShipId = () => PLACEMENT_ID_BASE + BigInt(nextSyntheticIdRef.current++);

  const seedFromChain = React.useCallback(() => {
    seededMapIdRef.current = mapId;
    setPlacements(
      (placementsData?.positions ?? []).map((p, i) => ({
        shipId: freshShipId(),
        configId: placementsData!.configIds[i],
        row: p.row,
        col: p.col,
      })),
    );
  }, [mapId, placementsData]);

  useEffect(() => {
    if (!placementsData) return;
    if (seededMapIdRef.current === mapId) return; // don't clobber in-progress edits on unrelated re-renders
    seedFromChain();
  }, [placementsData, mapId, seedFromChain]);

  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [draggedConfigId, setDraggedConfigId] = useState<bigint | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [pendingPlacementShipId, setPendingPlacementShipId] = useState<bigint | null>(null);
  const [armedConfigId, setArmedConfigId] = useState<bigint | null>(null);
  const pendingConfigForIdRef = useRef(new Map<string, bigint>());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const configById = useMemo(() => {
    const map = new Map<string, AIShipConfig>();
    configs.forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [configs]);

  const handleMove = (shipId: bigint, row: number, col: number) => {
    setPlacements((prev) => {
      const occupiedIdx = prev.findIndex((p) => p.row === row && p.col === col && p.shipId !== shipId);
      const next = occupiedIdx === -1 ? prev : prev.filter((_, i) => i !== occupiedIdx);

      const existingIdx = next.findIndex((p) => p.shipId === shipId);
      if (existingIdx !== -1) {
        return next.map((p) => (p.shipId === shipId ? { ...p, row, col } : p));
      }

      const configId = pendingConfigForIdRef.current.get(shipId.toString()) ?? draggedConfigId;
      pendingConfigForIdRef.current.delete(shipId.toString());
      if (configId == null) return next;
      if (next.length >= maxPlacementsPerMap) {
        toast.error(`This map already has the max ${maxPlacementsPerMap} enemy ships.`);
        return next;
      }
      return [...next, { shipId, configId, row, col }];
    });
    setIsDirty(true);
    setPendingPlacementShipId(null);
    setArmedConfigId(null);
  };

  const armRosterForTapToPlace = (configId: bigint) => {
    const id = freshShipId();
    pendingConfigForIdRef.current.set(id.toString(), configId);
    setPendingPlacementShipId(id);
    setArmedConfigId(configId);
  };

  const handleDrop = (row: number, col: number, e?: React.DragEvent) => {
    let shipIdToMove = draggedShipId;
    if (shipIdToMove == null && draggedConfigId == null && e) {
      const data = e.dataTransfer.getData("text/plain");
      if (data) {
        try {
          shipIdToMove = BigInt(data);
        } catch (error) {
          console.error("Failed to parse ship ID from drag data:", error);
        }
      }
    }
    if (shipIdToMove != null) {
      handleMove(shipIdToMove, row, col);
    } else if (draggedConfigId != null) {
      handleMove(freshShipId(), row, col);
    }
    setDraggedShipId(null);
    setDraggedConfigId(null);
    setDragOverPosition(null);
  };

  const handleRemoveSelected = () => {
    if (selectedShipId == null) return;
    setPlacements((prev) => prev.filter((p) => p.shipId !== selectedShipId));
    setSelectedShipId(null);
    setIsDirty(true);
  };

  const handleReset = () => {
    seedFromChain();
    setSelectedShipId(null);
    setIsDirty(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const positions: MapPosition[] = placements.map((p) => ({ row: p.row, col: p.col }));
      const configIds = placements.map((p) => p.configId);
      const hash = await setMapPlacements(mapId, positions, configIds);
      await refetch();
      setIsDirty(false);
      toast.success(`Enemy fleet placements saved. (tx: ${hash.slice(0, 10)}…)`);
    } catch (error) {
      console.error("Failed to save map placements:", error);
      toast.error("Failed to save placements — see console.");
    } finally {
      setSaving(false);
    }
  };

  const mapShips = useMemo(
    () =>
      placements
        .map((p) => {
          const config = configById.get(p.configId.toString());
          return config ? aiConfigToPreviewShip(config, p.shipId) : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [placements, configById],
  );
  const mapShipPositions = useMemo(
    () => placements.map((p) => ({ shipId: p.shipId, row: p.row, col: p.col })),
    [placements],
  );
  const totalThreat = useMemo(
    () => mapShips.reduce((sum, s) => sum + s.shipData.cost, 0),
    [mapShips],
  );

  const [showEditor, setShowEditor] = useState(false);

  const rosterItems: FleetShipListItemData[] = configs.map((c) => ({
    key: c.id.toString(),
    canSelect: true,
    isPending: armedConfigId === c.id,
    isTouchDevice: false,
    onDragStart: () => setDraggedConfigId(c.id),
    onDragEnd: () => setDraggedConfigId(null),
    card: (
      <ShipCard
        ship={toShipCardData(aiConfigToPreviewShip(c))}
        shipImage={<ShipImage ship={aiConfigToPreviewShip(c)} className="h-full w-full" showLoadingState={false} />}
        isStarred={false}
        onToggleStar={() => {}}
        isSelected={false}
        onToggleSelection={() => armRosterForTapToPlace(c.id)}
        onRecycleClick={() => {}}
        showInGameProperties={false}
        selectionMode
        hideRecycle
        hideCheckbox
        onCardClick={() => armRosterForTapToPlace(c.id)}
        canSelect
      />
    ),
  }));

  return (
    <div className="space-y-2 border border-gunmetal bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {placements.length}/{maxPlacementsPerMap} ships placed — total threat {totalThreat}
        </span>
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="px-4 py-2 rounded-none font-mono text-xs border border-cyan text-cyan hover:bg-cyan/10"
        >
          [EDIT PLACEMENTS]
        </button>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[400]">
          <div className="bg-near-black border border-cyan rounded-none p-6 w-[100vw] h-[100vh] flex flex-col" style={{ borderRadius: 0 }}>
            <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <h4 className="text-lg font-bold text-cyan whitespace-nowrap">
                  MAP #{mapId.toString()} — ENEMY PLACEMENTS
                </h4>
                <span className="px-3 py-1 text-xs font-bold text-text-secondary bg-steel/40 border border-steel rounded-none whitespace-nowrap">
                  {placements.length}/{maxPlacementsPerMap} placed
                  {placements.length >= maxPlacementsPerMap && " (max)"}
                </span>
                <span className="px-3 py-1 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
                  TOTAL THREAT: {totalThreat}
                </span>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:justify-center">
                <button
                  type="button"
                  disabled={selectedShipId == null}
                  onClick={handleRemoveSelected}
                  className="w-full px-4 py-2 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/20 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  REMOVE SELECTED
                </button>
                <button
                  type="button"
                  disabled={!isDirty || saving}
                  onClick={handleReset}
                  className="w-full px-4 py-2 rounded-none border border-steel text-text-secondary hover:border-text-secondary font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  RESET
                </button>
                <button
                  type="button"
                  disabled={!isDirty || saving}
                  onClick={() => void handleSave()}
                  className="w-full px-4 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  {saving ? "SAVING..." : "SAVE PLACEMENTS"}
                </button>
              </div>

              <div className="flex items-center justify-start gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-3 py-1 text-sm font-bold text-text-muted border border-gunmetal rounded-none hover:text-text-secondary hover:border-steel transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="mb-4 text-xs text-text-muted">
              Drag a ship from the roster onto the highlighted zone, or click one then click a tile. Click a placed ship to select it (drag to move, or use Remove Selected above). Enemy placements are restricted to the map&apos;s joiner columns — the same zone AI ships occupy in a real match.
            </p>

            <div className="flex gap-4 flex-1 min-h-0">
              <FleetShipListPanel widthClass="w-1/4" items={rosterItems} />
              <div className="w-3/4 h-full flex items-center justify-center">
                <MapDisplay
                  mapId={Number(mapId)}
                  className="w-full h-full"
                  showPlayerOverlay
                  isCreator={false}
                  isCreatorViewer={false}
                  showDeployZoneLabel
                  ships={mapShips}
                  shipPositions={mapShipPositions}
                  selectedShipId={selectedShipId}
                  onShipSelect={setSelectedShipId}
                  onShipMove={handleMove}
                  allowSelection
                  selectableShipIds={mapShipPositions.map((p) => p.shipId)}
                  pendingPlacementShipId={pendingPlacementShipId}
                  onDragOver={(row, col, e) => {
                    e.preventDefault();
                    setDragOverPosition({ row, col });
                  }}
                  onDrop={handleDrop}
                  dragOverPosition={dragOverPosition}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  mapIds: number[];
}

/** Gated on AIEncounters.isEncounterEditor — separate permission domain from MAP_ADMIN_ADDRESS. */
export function AIEncountersAdminPanel({ mapIds }: Props) {
  const { isEditor, isLoading } = useIsEncounterEditor();
  const admin = useAIEncountersAdmin();
  const { data: configs, refetch: refetchConfigs } = useGetAllAIShipConfigs();
  const [creating, setCreating] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<number | undefined>(mapIds[0]);
  const [editorAddress, setEditorAddress] = useState("");
  const [editorPending, setEditorPending] = useState(false);

  // mapIds is [] on first render (useGetAllPresetMaps hasn't resolved yet in
  // the caller) — useState(mapIds[0]) only reads that initial value once, so
  // without this, selectedMapId stays stuck at undefined forever once the
  // real map list arrives.
  useEffect(() => {
    if (selectedMapId == null && mapIds.length > 0) {
      setSelectedMapId(mapIds[0]);
    }
  }, [mapIds, selectedMapId]);

  const configList = useMemo(() => configs ?? [], [configs]);

  if (isLoading || !isEditor) return null;

  const handleCreateConfig: React.ComponentProps<typeof ShipConfigForm>["onSubmit"] = async ({
    name,
    mainWeapon,
    armor,
    shields,
    special,
    variant,
    accuracy,
    hull,
    speed,
    archetype,
  }) => {
    setCreating(true);
    try {
      await admin.createAIShipConfig(
        name,
        { mainWeapon, armor, shields, special },
        {
          serialNumber: 0n,
          colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0, h3: 0, s3: 0, l3: 0 },
          variant,
          accuracy,
          hull,
          speed,
        },
        archetype,
      );
      await refetchConfigs();
    } catch (error) {
      console.error("Failed to create AI ship config:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleSetEditor = async (allowed: boolean) => {
    const addr = editorAddress.trim();
    if (!addr.startsWith("0x")) return;
    setEditorPending(true);
    try {
      await admin.setEncounterEditor(addr as `0x${string}`, allowed);
      setEditorAddress("");
    } catch (error) {
      console.error("Failed to update encounter editor:", error);
    } finally {
      setEditorPending(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[AI ENCOUNTERS]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Ship Configs</h5>
        <div className="space-y-1">
          {configList.length === 0 ? (
            <p className="text-xs text-text-muted">No AI ship configs yet.</p>
          ) : (
            configList.map((c) => (
              <div key={c.id.toString()} className="flex justify-between text-xs text-text-secondary">
                <span>{c.name}</span>
                <span className="text-cyan">{ARCHETYPE_NAMES[c.archetype]}</span>
              </div>
            ))
          )}
        </div>
        <ShipConfigForm onSubmit={handleCreateConfig} pending={creating} />
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Map Placements</h5>
        {mapIds.length === 0 ? (
          <p className="text-xs text-text-muted">No preset maps available.</p>
        ) : (
          <>
            <select
              value={selectedMapId ?? ""}
              onChange={(e) => setSelectedMapId(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {mapIds.map((id) => (
                <option key={id} value={id}>Map #{id}</option>
              ))}
            </select>
            {selectedMapId != null && configList.length > 0 ? (
              <MapPlacementsEditor mapId={BigInt(selectedMapId)} configs={configList} />
            ) : selectedMapId != null ? (
              <p className="text-xs text-text-muted">Create a ship config first to place it on a map.</p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Editor Permissions</h5>
        <p className="text-xs text-text-muted">
          No on-chain list of current editors is exposed — this can only add/revoke by address.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={editorAddress}
            onChange={(e) => setEditorAddress(e.target.value)}
            placeholder="0x0000..."
            className={`${inputClass} sm:flex-1`}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(true)}
            className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grant
          </button>
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(false)}
            className="px-4 py-2 rounded-none font-mono border border-warning-red text-warning-red hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

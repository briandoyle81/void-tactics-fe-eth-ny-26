"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  type FleetComposition,
  readFleetCompositionPersisted,
  writeFleetCompositionPersisted,
  newFleetCompositionId,
  fleetCompositionLocalNoticeSessionKey,
  parseFleetCompositionImport,
  buildFleetCompositionExport,
} from "../utils/fleetCompositionStorage";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) —
// fleet-composition preset CRUD, extracted verbatim from ManageNavy.tsx.
// Ship-type-agnostic: everything operates on stringified ship ids
// (`validShipIds`/`addShip`/`removeShip` all take/compare `string`), so
// there's no bigint/number distinction to twin here — see
// fleetCompositionStorage.ts's module doc comment.
//
// `validShipIds`: pass `null` while the caller's ship list is still
// loading, so a momentarily-empty ship list doesn't auto-prune every
// preset's ship ids.
export function useFleetComposition(
  scopeKey: string,
  scopeTag: string,
  validShipIds: Set<string> | null,
) {
  const [fleetCompositions, setFleetCompositions] = useState<FleetComposition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [showLocalNoticeModal, setShowLocalNoticeModal] = useState(false);
  const pendingSelectRef = useRef<{ value: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!scopeKey) {
      setFleetCompositions([]);
      setSelectedId(null);
      setHydrated(false);
      return;
    }
    const persisted = readFleetCompositionPersisted(scopeKey);
    setFleetCompositions(persisted.fleets);
    setSelectedId(persisted.selectedFleetId);
    setHydrated(true);
  }, [scopeKey]);

  useEffect(() => {
    if (!scopeKey || !hydrated) return;
    writeFleetCompositionPersisted(scopeKey, fleetCompositions, selectedId);
  }, [scopeKey, fleetCompositions, hydrated, selectedId]);

  useEffect(() => {
    if (selectedId == null) return;
    if (!fleetCompositions.some((f) => f.id === selectedId)) {
      setSelectedId(null);
    }
  }, [fleetCompositions, selectedId]);

  const fleetCompositionsRef = useRef(fleetCompositions);
  fleetCompositionsRef.current = fleetCompositions;
  useEffect(() => {
    if (selectedId == null) {
      setRenameDraft("");
      return;
    }
    const f = fleetCompositionsRef.current.find((x) => x.id === selectedId);
    setRenameDraft(f?.name ?? "");
  }, [selectedId]);

  // Auto-prune ship ids that are no longer valid (destroyed, unconstructed,
  // sold, etc) — `validShipIds` is caller-computed per render from its own
  // ship type.
  useEffect(() => {
    if (!scopeKey || validShipIds === null) return;
    setFleetCompositions((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((f) => {
        const nextIds = f.shipIds.filter((id) => validShipIds.has(id));
        if (nextIds.length !== f.shipIds.length) changed = true;
        return { ...f, shipIds: nextIds };
      });
      return changed ? next : prev;
    });
  }, [validShipIds, scopeKey]);

  const activeFleet = useMemo(
    () => (selectedId ? fleetCompositions.find((f) => f.id === selectedId) : undefined),
    [selectedId, fleetCompositions],
  );

  const renameIsDirty = useMemo(() => {
    if (!activeFleet || selectedId == null) return false;
    const next = renameDraft.trim() || "Unnamed fleet";
    return next !== activeFleet.name;
  }, [activeFleet, selectedId, renameDraft]);

  const finishSelect = useCallback((v: string) => {
    if (v === "") {
      setSelectedId(null);
      return;
    }
    if (v === "__create__") {
      const id = newFleetCompositionId();
      setFleetCompositions((p) => {
        const n = p.length + 1;
        return [...p, { id, name: `Fleet ${n}`, shipIds: [] }];
      });
      setSelectedId(id);
      return;
    }
    setSelectedId(v);
  }, []);

  const onSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (v === "") {
        finishSelect("");
        return;
      }
      if (
        scopeKey &&
        typeof window !== "undefined" &&
        sessionStorage.getItem(fleetCompositionLocalNoticeSessionKey(scopeKey)) !== "1"
      ) {
        pendingSelectRef.current = { value: v };
        setShowLocalNoticeModal(true);
        return;
      }
      finishSelect(v);
    },
    [scopeKey, finishSelect],
  );

  const acknowledgeLocalNoticeModal = useCallback(() => {
    if (scopeKey) {
      sessionStorage.setItem(fleetCompositionLocalNoticeSessionKey(scopeKey), "1");
    }
    setShowLocalNoticeModal(false);
    const pending = pendingSelectRef.current;
    pendingSelectRef.current = null;
    if (pending) finishSelect(pending.value);
  }, [scopeKey, finishSelect]);

  const cancelLocalNoticeModal = useCallback(() => {
    setShowLocalNoticeModal(false);
    pendingSelectRef.current = null;
  }, []);

  const addShip = useCallback(
    (shipIdStr: string) => {
      if (!selectedId) return;
      setFleetCompositions((prev) =>
        prev.map((f) => {
          if (f.id !== selectedId) return f;
          if (f.shipIds.includes(shipIdStr)) return f;
          return { ...f, shipIds: [...f.shipIds, shipIdStr] };
        }),
      );
    },
    [selectedId],
  );

  const removeShip = useCallback(
    (shipIdStr: string) => {
      if (!selectedId) return;
      setFleetCompositions((prev) =>
        prev.map((f) =>
          f.id === selectedId ? { ...f, shipIds: f.shipIds.filter((id) => id !== shipIdStr) } : f,
        ),
      );
    },
    [selectedId],
  );

  const commitRename = useCallback(() => {
    if (!selectedId) return;
    const name = renameDraft.trim() || "Unnamed fleet";
    setFleetCompositions((prev) => prev.map((f) => (f.id === selectedId ? { ...f, name } : f)));
  }, [selectedId, renameDraft]);

  const deleteActive = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("Delete this fleet preset? It is only stored in this browser.")) {
      return;
    }
    const id = selectedId;
    setFleetCompositions((prev) => prev.filter((f) => f.id !== id));
    setSelectedId(null);
  }, [selectedId]);

  const exportFile = useCallback(
    (filenamePrefix: string) => {
      if (fleetCompositions.length === 0) {
        toast.error("No fleet presets to export");
        return;
      }
      const payload = buildFleetCompositionExport(scopeTag, fleetCompositions);
      const dataStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Fleet presets exported");
    },
    [scopeTag, fleetCompositions],
  );

  const onImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const result = parseFleetCompositionImport(text, scopeTag);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setFleetCompositions((prev) => {
          const byId = new Map<string, FleetComposition>();
          for (const f of prev) byId.set(f.id, f);
          for (const f of result.fleets) byId.set(f.id, f);
          return Array.from(byId.values());
        });
        toast.success(`Imported ${result.fleets.length} fleet preset(s)`);
      };
      reader.readAsText(file);
    },
    [scopeTag],
  );

  return {
    fleetCompositions,
    selectedId,
    activeFleet,
    renameDraft,
    setRenameDraft,
    renameIsDirty,
    showLocalNoticeModal,
    importInputRef,
    onSelectChange,
    acknowledgeLocalNoticeModal,
    cancelLocalNoticeModal,
    addShip,
    removeShip,
    commitRename,
    deleteActive,
    exportFile,
    onImportFileChange,
  };
}

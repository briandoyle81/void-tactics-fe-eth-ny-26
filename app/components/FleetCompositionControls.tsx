"use client";

import type { FleetComposition } from "../utils/fleetCompositionStorage";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// rename/save/delete/threat-total/export/import row, ported verbatim from
// ManageNavy.tsx. `threatTotal` is caller-computed (web3 sums bigint
// `shipData.cost`, web2 sums number `shipData.cost` — see the
// number-native-shared-components rule) and passed in as a plain number.
interface FleetCompositionControlsProps {
  selectedId: string | null;
  activeFleet: FleetComposition | undefined;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onCommitRename: () => void;
  renameIsDirty: boolean;
  threatTotal: number;
  onDeleteActive: () => void;
  fleetCompositions: FleetComposition[];
  onExport: () => void;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FleetCompositionControls({
  selectedId,
  activeFleet,
  renameDraft,
  onRenameDraftChange,
  onCommitRename,
  renameIsDirty,
  threatTotal,
  onDeleteActive,
  fleetCompositions,
  onExport,
  importInputRef,
  onImportFileChange,
}: FleetCompositionControlsProps) {
  return (
    <div
      className="flex flex-col gap-2 border border-solid px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3"
      style={{
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        backgroundColor: "var(--color-near-black)",
        borderRadius: 0,
      }}
    >
      {selectedId != null && activeFleet && (
        <>
          <label
            className="text-xs font-bold uppercase tracking-wider shrink-0"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              color: "var(--color-cyan)",
            }}
          >
            Fleet name
          </label>
          <input
            type="text"
            value={renameDraft}
            onChange={(e) => onRenameDraftChange(e.target.value)}
            onBlur={onCommitRename}
            className="min-h-10 w-full min-w-0 flex-1 px-2 py-1 text-sm sm:min-w-[8rem] sm:max-w-[16rem] sm:flex-none"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              backgroundColor: "var(--color-slate)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-gunmetal)",
              borderRadius: 0,
            }}
          />
          <button
            type="button"
            onClick={onCommitRename}
            disabled={!renameIsDirty}
            className="px-3 py-1.5 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-xs tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{ borderRadius: 0 }}
          >
            [SAVE]
          </button>
          <span
            className="text-sm font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: "var(--color-amber)",
            }}
          >
            Total threat: {threatTotal}
          </span>
          <button
            type="button"
            onClick={onDeleteActive}
            className="px-3 py-1.5 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            [DELETE FLEET]
          </button>
        </>
      )}
      {fleetCompositions.length > 0 && (
        <button
          type="button"
          onClick={onExport}
          className="px-3 py-1.5 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
          style={{ borderRadius: 0 }}
        >
          [EXPORT FLEETS]
        </button>
      )}
      <button
        type="button"
        onClick={() => importInputRef.current?.click()}
        className="px-3 py-1.5 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
        style={{ borderRadius: 0 }}
      >
        [IMPORT FLEETS]
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onImportFileChange}
      />
    </div>
  );
}

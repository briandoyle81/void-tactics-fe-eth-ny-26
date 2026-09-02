"use client";

import React from "react";
import type { MapPosition, ScoringPosition } from "../types/types";
import { MapPreviewCard } from "./MapPreviewCard";

export interface MapPickerMap {
  id: number;
  titleLabel: string;
  blockedPositions: MapPosition[];
  scoringPositions: ScoringPosition[];
  modeLabel?: string;
}

interface MapPickerModalProps {
  maps: MapPickerMap[];
  selectedMapId: number | null;
  onSelect: (mapId: number) => void;
  onClose: () => void;
}

// Shared, number-native map picker for the campaign map editor's mapId
// field — replaces the raw numeric <input> both NodeMapAdminPanel.tsx and
// RoguelikeNodeMapAdminPanel.tsx used. Caller supplies `maps` from whichever
// chain-appropriate list hook applies (useGetAllPresetMaps for web3, the
// web2 maps list for web2) — this component does no data fetching itself,
// same pattern as EnemyFleetPreview.
export function MapPickerModal({ maps, selectedMapId, onSelect, onClose }: MapPickerModalProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return maps;
    return maps.filter((m) => m.id.toString().includes(trimmed) || m.titleLabel.toLowerCase().includes(trimmed.toLowerCase()));
  }, [maps, query]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[500] p-4">
      <div
        className="bg-near-black border-2 p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-none font-mono"
        style={{ borderColor: "var(--color-cyan)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan tracking-wider">[SELECT MAP]</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan hover:text-cyan/80 transition-all duration-200 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by map id or name…"
          className="w-full px-3 py-2 mb-4 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
          style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-text-muted">No maps match &quot;{query}&quot;.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((map) => (
              <div
                key={map.id}
                className="relative"
                style={
                  map.id === selectedMapId
                    ? { outline: "2px solid var(--color-phosphor-green)", outlineOffset: 2 }
                    : undefined
                }
              >
                <MapPreviewCard map={map} modeLabel={map.modeLabel} onEdit={() => onSelect(map.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

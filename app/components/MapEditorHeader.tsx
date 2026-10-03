"use client";

import React from "react";

interface MapEditorHeaderProps {
  title: string;
  onBack: () => void;
  name?: string;
  onNameChange?: (name: string) => void;
  nameDisabled?: boolean;
}

export const MapEditorHeader: React.FC<MapEditorHeaderProps> = ({
  title,
  onBack,
  name,
  onNameChange,
  nameDisabled,
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className="px-4 py-2 bg-steel text-text-primary rounded-none font-mono hover:bg-gunmetal"
      >
        ← Back to Maps
      </button>
      <h2 className="text-xl font-mono text-white">{title}</h2>
    </div>
    {onNameChange !== undefined && (
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary" htmlFor="map-editor-name">
          Name:
        </label>
        <input
          id="map-editor-name"
          type="text"
          value={name ?? ""}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={nameDisabled}
          placeholder="Map name"
          className="w-64 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none disabled:opacity-50"
        />
      </div>
    )}
  </div>
);

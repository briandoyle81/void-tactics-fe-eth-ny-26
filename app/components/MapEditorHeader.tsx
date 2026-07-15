"use client";

import React from "react";

interface MapEditorHeaderProps {
  title: string;
  onBack: () => void;
}

export const MapEditorHeader: React.FC<MapEditorHeaderProps> = ({
  title,
  onBack,
}) => (
  <div className="flex items-center gap-4">
    <button
      onClick={onBack}
      className="px-4 py-2 bg-steel text-text-primary rounded-none font-mono hover:bg-gunmetal"
    >
      ← Back to Maps
    </button>
    <h2 className="text-xl font-mono text-white">{title}</h2>
  </div>
);

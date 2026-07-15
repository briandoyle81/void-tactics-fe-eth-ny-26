"use client";

import React from "react";

interface MapsListShellProps {
  canCreateMaps: boolean;
  onCreateMap: () => void;
  totalMaps: number;
  restrictedMessage: string;
  isEmpty: boolean;
  children: React.ReactNode;
}

export const MapsListShell: React.FC<MapsListShellProps> = ({
  canCreateMaps,
  onCreateMap,
  totalMaps,
  restrictedMessage,
  isEmpty,
  children,
}) => (
  <div className="w-full space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-mono text-white">Maps</h1>
      {canCreateMaps ? (
        <button
          onClick={onCreateMap}
          className="px-4 py-2 border border-phosphor-green text-phosphor-green rounded-none font-mono hover:bg-phosphor-green/10"
        >
          Create New Map
        </button>
      ) : (
        <div className="px-4 py-2 bg-steel text-text-muted rounded-none font-mono cursor-not-allowed">
          Create New Map (Restricted)
        </div>
      )}
    </div>

    <div className="text-sm text-text-muted">
      Total maps: {totalMaps}
      {!canCreateMaps && (
        <div className="mt-2 text-amber">{restrictedMessage}</div>
      )}
    </div>

    {isEmpty ? (
      <div className="text-center py-8 text-text-muted">
        <p>No maps found. Create your first map to get started!</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    )}
  </div>
);

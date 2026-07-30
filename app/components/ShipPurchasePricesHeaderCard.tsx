"use client";

import React from "react";

interface ShipPurchasePricesHeaderCardProps {
  description: React.ReactNode;
  hasUnsavedChanges: boolean;
  unsavedChangesLabel: string;
  actions?: React.ReactNode;
  title?: string;
}

// Shared header card between ShipPurchasePrices.tsx (web3) and
// ShipPurchasePricesWeb2.tsx (web2) admin tabs.
export const ShipPurchasePricesHeaderCard: React.FC<ShipPurchasePricesHeaderCardProps> = ({
  description,
  hasUnsavedChanges,
  unsavedChangesLabel,
  actions,
  title = "Ship pack purchase prices",
}) => (
  <div className="bg-near-black rounded-none p-4 border border-gunmetal">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-mono text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-sm text-text-muted">{description}</p>
        {hasUnsavedChanges ? (
          <p className="text-amber text-xs font-mono mt-2">{unsavedChangesLabel}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  </div>
);

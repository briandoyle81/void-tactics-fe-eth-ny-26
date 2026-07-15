"use client";

import React from "react";

interface ShipPurchaseTierSectionCardProps {
  title: string;
  subtitle: React.ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
  belowSubtitle?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}

// Shared purchase-tier section card between ShipPurchasePrices.tsx (web3)
// and ShipPurchasePricesWeb2.tsx (web2) admin tabs — title/subtitle/
// loading/empty chrome around a PurchaseTierTable. `footer` is a full
// render-prop slot (including its own wrapper markup) since the save
// action differs fundamentally: web3 wraps a TransactionButton with a
// "connect as owner" fallback, web2 uses plain save/reset buttons.
export const ShipPurchaseTierSectionCard: React.FC<ShipPurchaseTierSectionCardProps> = ({
  title,
  subtitle,
  isLoading,
  isEmpty,
  emptyMessage,
  belowSubtitle,
  children,
  footer,
}) => {
  if (isLoading && isEmpty) {
    return (
      <div className="bg-steel rounded-none p-4 border border-gunmetal">
        <h3 className="text-lg font-mono text-text-primary mb-1">{title}</h3>
        <p className="text-text-muted text-sm font-mono">Loading…</p>
      </div>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <div className="bg-steel rounded-none p-4 border border-gunmetal">
        <h3 className="text-lg font-mono text-text-primary mb-1">{title}</h3>
        <p className="text-warning-red text-sm font-mono">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-steel rounded-none p-4 border border-gunmetal">
      <h3 className="text-lg font-mono text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-4">{subtitle}</p>
      {belowSubtitle ? <div className="mb-4">{belowSubtitle}</div> : null}
      {children}
      {footer}
    </div>
  );
};

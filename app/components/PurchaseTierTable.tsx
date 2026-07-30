"use client";

// Shared between ShipPurchasePrices.tsx (web3) and ShipPurchasePricesWeb2.tsx
// (web2) — the tier-editing table markup, ported verbatim from
// ShipPurchasePrices.tsx. Each row carries a `Record<currencyLabel, string>`
// of prices so both 1-currency (web2: USD+UTC in one table via two price
// columns) and 2-currency (web3: one table per contract, one price column
// each) shapes fit the same row type; `currencyLabels` derives the table's
// price columns from the first row's price keys.
export interface PurchaseTierPrice {
  currencyLabel: string;
  value: string;
  onChange?: (value: string) => void;
}

export interface PurchaseTierRowData {
  tierLabel: string;
  shipCount: number;
  onShipCountChange?: (value: number) => void;
  prices: PurchaseTierPrice[];
}

interface PurchaseTierTableProps {
  rows: PurchaseTierRowData[];
  editable: boolean;
  /** Header label for the `shipCount` column — defaults to "Ships / pack".
   * Set this when reusing the table for a non-ship quantity (e.g. "UTC / pack"). */
  quantityLabel?: string;
}

export function PurchaseTierTable({ rows, editable, quantityLabel = "Ships / pack" }: PurchaseTierTableProps) {
  const currencyLabels = rows[0]?.prices.map((p) => p.currencyLabel) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono text-left border-collapse">
        <thead>
          <tr className="border-b border-gunmetal text-text-muted">
            <th className="py-2 pr-4">Tier</th>
            <th className="py-2 pr-4">{quantityLabel}</th>
            {currencyLabels.map((label) => (
              <th key={label} className="py-2 pr-4 last:pr-0">
                Price ({label})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tierLabel} className="border-b border-gunmetal/80">
              <td className="py-2 pr-4 text-cyan">{row.tierLabel}</td>
              <td className="py-2 pr-4">
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={row.shipCount}
                    onChange={(e) => {
                      const v = e.target.value;
                      row.onShipCountChange?.(v === "" ? 0 : Number(v));
                    }}
                    className="w-24 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none"
                  />
                ) : (
                  <span className="text-text-primary">{row.shipCount}</span>
                )}
              </td>
              {row.prices.map((price) => (
                <td key={price.currencyLabel} className="py-2 pr-4 last:pr-0">
                  {editable ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={price.value}
                      onChange={(e) => price.onChange?.(e.target.value)}
                      className="w-full max-w-[14rem] px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none"
                    />
                  ) : (
                    <span className="text-text-primary">{price.value}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

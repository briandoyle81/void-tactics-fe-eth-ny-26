export interface FlowTier {
  displayPrice: string; // shown in UI
  actualAmount: string; // sent to Fireblocks Flow (1/100th of display)
}

// Five tiers matching the Ships contract tier structure (0–4).
export const FLOW_USD_TIERS: FlowTier[] = [
  { displayPrice: "1.99", actualAmount: "0.02" },
  { displayPrice: "3.99", actualAmount: "0.04" },
  { displayPrice: "7.99", actualAmount: "0.08" },
  { displayPrice: "14.99", actualAmount: "0.15" },
  { displayPrice: "24.99", actualAmount: "0.25" },
];

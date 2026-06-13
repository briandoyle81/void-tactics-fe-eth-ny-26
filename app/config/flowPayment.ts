export interface FlowTier {
  displayPrice: string; // shown in UI
  actualAmount: string; // sent to Fireblocks Flow (1/100th of display)
}

// Five tiers matching the Ships contract tier structure (0–4).
export const FLOW_USD_TIERS: FlowTier[] = [
  { displayPrice: "4.99", actualAmount: "0.05" },
  { displayPrice: "9.99", actualAmount: "0.10" },
  { displayPrice: "19.99", actualAmount: "0.20" },
  { displayPrice: "39.99", actualAmount: "0.40" },
  { displayPrice: "79.99", actualAmount: "0.80" },
];

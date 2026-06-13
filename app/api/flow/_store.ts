// Shared in-memory store for pending Flow purchases.
// Scoped to a single server process — acceptable for hackathon use.
export const pendingPurchases = new Map<
  string,
  {
    buyerAddress: string;
    tier: number;
    gameChainId: number;
    fulfilled: boolean;
  }
>();

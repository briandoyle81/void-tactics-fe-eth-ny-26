// Store sub-tabs, kept apart from StoreScreen so the client and HUD can
// read them without loading the Store (it's lazy-loaded).
export type StoreSection = "packs" | "credits" | "cores" | "lottery";

export const STORE_SECTIONS: readonly StoreSection[] = ["packs", "credits", "cores", "lottery"];

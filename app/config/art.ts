// Art for the game client's screens. Each slot is an image under /public
// (e.g. "/art/operations.jpg"); null shows the placeholder backdrop, labeled
// with the slot name in development so it's clear where art goes. Images
// are drawn `cover`, centered — the suggested sizes below are 2x for crisp
// desktop rendering; keep the subject near the center so phone crops work.

export type ArtSlotId =
  | "bootBackdrop"
  | "operations"
  | "operationsBackdrop"
  | "runMapBackdrop"
  | "skirmish"
  | "tournaments"
  | "storeFeatured";

export interface ArtSlotConfig {
  /** What the art should show — the label on the dev placeholder. */
  label: string;
  src: string | null;
}

export const ART_SLOTS: Record<ArtSlotId, ArtSlotConfig> = {
  // Boot screen, full viewport — ~2560×1440.
  bootBackdrop: { label: "Title screen backdrop", src: null },
  // Command Deck layout A, Operations tile — ~1400×900.
  operations: { label: "Operations key art", src: null },
  // Command Deck layout B, full-width panel — ~2560×1100.
  operationsBackdrop: { label: "Full-bleed backdrop: flagship over the operation's sector", src: null },
  // Run map, under the starfield and nodes — ~2560×1200, keep it dark.
  runMapBackdrop: { label: "Sector backdrop", src: null },
  // Command Deck tiles — ~1000×560.
  skirmish: { label: "Skirmish", src: null },
  tournaments: { label: "Tournament trophy", src: null },
  // Command Deck featured store card — ~600×400.
  storeFeatured: { label: "Featured ship pack", src: null },
};

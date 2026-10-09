// Art for the game client's screens. Each slot is an image under /public
// (e.g. "/art/operations.jpg"); null shows the placeholder backdrop, labeled
// with the slot name in development so it's clear where art goes. Images
// are drawn `cover`, centered unless a slot sets `position`. The suggested
// sizes below are 2x for crisp desktop rendering; keep the subject near the
// anchored side (or the center) so phone crops work.

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
  /** CSS background-position for the cover crop. Default "center". */
  position?: string;
}

export const ART_SLOTS: Record<ArtSlotId, ArtSlotConfig> = {
  // Boot screen, full viewport — ~2560×1440.
  bootBackdrop: { label: "Title screen backdrop", src: null },
  // Command Deck layout A, Operations tile — 1796×1200. Pinned to the
  // bottom-left, where the operation's title sits in the art: square-ish
  // tiles (big desktops) show the full height and crop the right side;
  // wider tiles (laptops ~1.6–1.7:1, phones ~2.5:1) crop from the top only.
  operations: {
    label: "Operations key art",
    src: "/img/site-art/shatterd-hive-title.webp",
    position: "left bottom",
  },
  // Command Deck layout B, full-width panel — ~2560×1100.
  operationsBackdrop: { label: "Full-bleed backdrop: flagship over the operation's sector", src: null },
  // Run map, under the starfield and nodes — ~2560×1200, keep it dark.
  runMapBackdrop: { label: "Sector backdrop", src: null },
  // Command Deck tiles — ~1000×560.
  skirmish: { label: "Skirmish", src: "/img/site-art/pvp-title.webp" },
  tournaments: { label: "Tournament trophy", src: null },
  // Command Deck featured store card — ~600×400.
  storeFeatured: { label: "Featured ship pack", src: null },
};

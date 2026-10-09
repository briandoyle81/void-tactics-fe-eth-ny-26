// Player-facing faction names, keyed by ship variant (traits.variant).
// Safe on both client and server.
//
// Belt Consortium: ships bought from asteroid-belt corporations and built by
// their drone factories, which turn out stock loadouts unless paid extra.
// Shattered Hive: gated on the Shattered Hive medal.

export const FACTION_NAMES: Record<number, string> = {
  1: "Belt Consortium",
  2: "Shattered Hive",
};

/** The faction's name, or "Faction N" for a variant without one. */
export function getFactionName(variant: number): string {
  return FACTION_NAMES[variant] ?? `Faction ${variant}`;
}

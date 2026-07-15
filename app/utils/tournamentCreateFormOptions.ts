export const DEADLINE_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "4h", hours: 4 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "7d", hours: 168 },
] as const;

export const MAX_PLAYER_OPTIONS = ["2", "4", "8", "16"] as const;
export type MaxPlayersOption = (typeof MAX_PLAYER_OPTIONS)[number];

export type ThreatScaleOption = "skirmish" | "battle";
export type TurnPaceOption = "immediate" | "correspondence";
export type GameLengthOption = "short" | "medium" | "long";

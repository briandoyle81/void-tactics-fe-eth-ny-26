// Shared by the web3 `TournamentState` and web2 `Web2TournamentState` enums —
// both are numeric enums with identical Registration/Active/Complete/Cancelled
// ordinals (0-3), so display can be keyed by plain number.
export const TOURNAMENT_STATE_LABELS: Record<number, string> = {
  0: "REGISTRATION",
  1: "ACTIVE",
  2: "COMPLETE",
  3: "CANCELLED",
};

export const TOURNAMENT_STATE_COLORS: Record<number, string> = {
  0: "text-cyan border-cyan",
  1: "text-phosphor-green border-phosphor-green",
  2: "text-text-muted border-gunmetal",
  3: "text-warning-red border-warning-red",
};

export function tournamentStateLabel(state: number): string {
  return TOURNAMENT_STATE_LABELS[state] ?? "UNKNOWN";
}

export function tournamentStateColor(state: number): string {
  return TOURNAMENT_STATE_COLORS[state] ?? "text-text-muted border-gunmetal";
}

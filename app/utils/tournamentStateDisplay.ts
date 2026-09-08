// Web3 tournaments gained a `Starting` state (Tournament.sol's post-
// registration randomness-request step, before buildBracket() reveals the
// shuffle and reaches Active) that web2 tournaments have no equivalent of —
// web2 never needed on-chain randomness, so its state ordinals stayed at
// Registration/Active/Complete/Cancelled (0-3) while web3's shifted to fit
// Starting in at ordinal 1. The two enums no longer share an ordinal space,
// so each flow gets its own label/color map instead of one shared
// `Record<number,string>` keyed by raw ordinal.
const WEB3_STATE_LABELS: Record<number, string> = {
  0: "REGISTRATION",
  1: "STARTING",
  2: "ACTIVE",
  3: "COMPLETE",
  4: "CANCELLED",
};

const WEB3_STATE_COLORS: Record<number, string> = {
  0: "text-cyan border-cyan",
  1: "text-cyan border-cyan",
  2: "text-phosphor-green border-phosphor-green",
  3: "text-text-muted border-gunmetal",
  4: "text-warning-red border-warning-red",
};

const WEB2_STATE_LABELS: Record<number, string> = {
  0: "REGISTRATION",
  1: "ACTIVE",
  2: "COMPLETE",
  3: "CANCELLED",
};

const WEB2_STATE_COLORS: Record<number, string> = {
  0: "text-cyan border-cyan",
  1: "text-phosphor-green border-phosphor-green",
  2: "text-text-muted border-gunmetal",
  3: "text-warning-red border-warning-red",
};

export function tournamentStateLabel(
  state: number,
  flow: "web2" | "web3" = "web3"
): string {
  const labels = flow === "web2" ? WEB2_STATE_LABELS : WEB3_STATE_LABELS;
  return labels[state] ?? "UNKNOWN";
}

export function tournamentStateColor(
  state: number,
  flow: "web2" | "web3" = "web3"
): string {
  const colors = flow === "web2" ? WEB2_STATE_COLORS : WEB3_STATE_COLORS;
  return colors[state] ?? "text-text-muted border-gunmetal";
}

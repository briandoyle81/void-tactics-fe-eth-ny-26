// Shared by GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) fleet
// detail modals — the label for a fleet panel depends on whether it's the
// viewer's own fleet, which side (creator/joiner) it belongs to, and whether
// the view is read-only (spectator/replay, which uses creator/joiner wording
// instead of my/hostile wording).
export function gameFleetPanelLabel(params: {
  isMine: boolean;
  sideIsCreator: boolean;
  readOnly: boolean;
}): string {
  if (params.readOnly) {
    return params.sideIsCreator ? "Creator Fleet" : "Joiner Fleet";
  }
  return params.isMine ? "[MY FLEET]" : "[HOSTILE FLEET]";
}

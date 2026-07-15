// Shared by the web3 `LobbyStatus` and web2 `Web2LobbyStatus` enums — both
// are numeric enums with identical Open/FleetSelection/InGame ordinals
// (0-2), so display can be keyed by plain number.
export function lobbyStatusColor(status: number): string {
  switch (status) {
    case 0: // Open
      return "text-phosphor-green";
    case 1: // FleetSelection
      return "text-amber";
    case 2: // InGame
      return "text-warning-red";
    default:
      return "text-text-muted";
  }
}

export function lobbyStatusLabel(status: number): string {
  switch (status) {
    case 0: // Open
      return "OPEN";
    case 1: // FleetSelection
      return "FLEET SELECTION";
    case 2: // InGame
      return "IN GAME";
    default:
      return "UNKNOWN";
  }
}

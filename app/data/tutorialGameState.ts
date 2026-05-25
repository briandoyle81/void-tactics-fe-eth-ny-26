import {
  SimulatedGameState,
  TutorialShipId,
  TutorialShipPosition,
} from "../types/onboarding";
import { Attributes, GRID_DIMENSIONS } from "../types/types";
import {
  TUTORIAL_PLAYER_ADDRESS,
  TUTORIAL_OPPONENT_ADDRESS,
  ALL_TUTORIAL_SHIPS,
} from "./tutorialShips";
import { calculateAttributesFromContracts } from "../utils/shipAttributesCalculator";

// Initial ship positions for tutorial (string IDs for JSON safety).
// Both fleets start 3 squares toward center from the edges for quicker engagement.
const INITIAL_SHIP_POSITIONS: TutorialShipPosition[] = [
  // Player ships (3 squares in from left)
  { shipId: "1001", position: { row: 5, col: 5 }, isCreator: true },
  { shipId: "1002", position: { row: 4, col: 4 }, isCreator: true },
  { shipId: "1003", position: { row: 6, col: 4 }, isCreator: true },

  // Opponent ships (3 squares in from right)
  { shipId: "2001", position: { row: 5, col: 12 }, isCreator: false },
  { shipId: "2002", position: { row: 4, col: 11 }, isCreator: false }, // Will be disabled
  { shipId: "2003", position: { row: 7, col: 14 }, isCreator: false },
];

// Create initial attributes for all ships
function createInitialAttributes(shipId: TutorialShipId): Attributes {
  const idAsNumber = Number(shipId);
  const ship = ALL_TUTORIAL_SHIPS.find((s) => s.id === idAsNumber);
  if (!ship) {
    throw new Error(`Ship ${shipId} not found`);
  }

  const baseAttrs = calculateAttributesFromContracts(ship);

  // Resolute (1001) and Anvil (2002) start with reactor overload.
  if (ship.id === 1001 || ship.id === 2002) {
    return {
      ...baseAttrs,
      reactorCriticalTimer: 2,
    };
  }

  // Sentinel (1003) starts at a fixed 100 HP for tutorial pacing.
  if (ship.id === 1003) {
    return {
      ...baseAttrs,
      hullPoints: 100,
    };
  }

  return baseAttrs;
}

export function createInitialTutorialGameState(): SimulatedGameState {
  // String IDs for tutorial-facing state; number IDs remain only inside tutorialShips
  const allShipIds: TutorialShipId[] = ALL_TUTORIAL_SHIPS.map((s) =>
    s.id.toString(),
  );
  const shipAttributes: Attributes[] = allShipIds.map((id) =>
    createInitialAttributes(id),
  );
  const playerShipIds: TutorialShipId[] = ALL_TUTORIAL_SHIPS.filter(
    (s) => s.owner === TUTORIAL_PLAYER_ADDRESS,
  ).map((s) => s.id.toString());
  const opponentShipIds: TutorialShipId[] = ALL_TUTORIAL_SHIPS.filter(
    (s) => s.owner === TUTORIAL_OPPONENT_ADDRESS,
  ).map((s) => s.id.toString());

  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    gameId: "9999", // Tutorial game ID (string for JSON safety)
    metadata: {
      gameId: "9999",
      creator: TUTORIAL_PLAYER_ADDRESS,
      joiner: TUTORIAL_OPPONENT_ADDRESS,
      creatorFleetId: 1,
      joinerFleetId: 2,
      creatorGoesFirst: true,
      startedAt: nowSeconds,
      winner:
        "0x0000000000000000000000000000000000000000" as typeof TUTORIAL_PLAYER_ADDRESS,
    },
    turnState: {
      currentTurn: TUTORIAL_PLAYER_ADDRESS,
      turnTime: 300, // 5 minutes
      turnStartTime: nowSeconds,
      currentRound: 1,
    },
    gridDimensions: {
      gridWidth: GRID_DIMENSIONS.WIDTH,
      gridHeight: GRID_DIMENSIONS.HEIGHT,
    },
    maxScore: 100,
    creatorScore: 60,
    joinerScore: 70,
    shipIds: allShipIds,
    shipAttributes,
    shipPositions: INITIAL_SHIP_POSITIONS,
    creatorActiveShipIds: playerShipIds,
    joinerActiveShipIds: opponentShipIds,
    creatorMovedShipIds: [],
    joinerMovedShipIds: [],
  };
}

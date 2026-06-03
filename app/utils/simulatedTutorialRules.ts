import { SimulatedGameState, TutorialAction } from "../types/onboarding";
import { ActionType } from "../types/types";

/**
 * When a move (Pass) was applied immediately before shoot/special/assist, keep
 * oldRow/oldCol from that move so last-move UI can draw the movement arrow.
 */
function spatialLastMoveCornersFromPriorPass(
  prev: SimulatedGameState,
  shipId: string,
  currentRow: number,
  currentCol: number,
): { oldRow: number; oldCol: number; newRow: number; newCol: number } {
  const prevLm = prev.lastMove;
  if (
    prevLm &&
    prevLm.shipId === shipId &&
    Number(prevLm.actionType) === ActionType.Pass &&
    (prevLm.oldRow !== prevLm.newRow || prevLm.oldCol !== prevLm.newCol)
  ) {
    return {
      oldRow: prevLm.oldRow,
      oldCol: prevLm.oldCol,
      newRow: currentRow,
      newCol: currentCol,
    };
  }
  return {
    oldRow: currentRow,
    oldCol: currentCol,
    newRow: currentRow,
    newCol: currentCol,
  };
}

/**
 * Pure rules engine for the simulated tutorial game.
 * Takes a previous SimulatedGameState and a TutorialAction, and returns
 * the next SimulatedGameState without any React or tutorial-step concerns.
 */
export function applyTutorialAction(
  prev: SimulatedGameState,
  action: TutorialAction,
): SimulatedGameState {
  const newState: SimulatedGameState = { ...prev };

  switch (action.type) {
    case "moveShip": {
      if (!action.shipId || !action.position) break;

      // Retreat/Flee: ship exits the battlefield from its current tile.
      if (action.actionType === ActionType.Retreat) {
        const retreatPos = newState.shipPositions.find(
          (pos) => pos.shipId === action.shipId,
        );
        if (!retreatPos) break;

        newState.shipPositions = newState.shipPositions.filter(
          (pos) => pos.shipId !== action.shipId,
        );
        newState.creatorActiveShipIds = newState.creatorActiveShipIds.filter(
          (id) => id !== action.shipId,
        );
        newState.joinerActiveShipIds = newState.joinerActiveShipIds.filter(
          (id) => id !== action.shipId,
        );
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: retreatPos.position.row,
          oldCol: retreatPos.position.col,
          newRow: -1,
          newCol: -1,
          actionType: ActionType.Retreat,
        };
        if (!newState.creatorMovedShipIds.includes(action.shipId)) {
          newState.creatorMovedShipIds = [
            ...newState.creatorMovedShipIds,
            action.shipId,
          ];
        }
        break;
      }

      const shipPosIndex = newState.shipPositions.findIndex(
        (pos) => pos.shipId === action.shipId,
      );
      const oldPosition =
        shipPosIndex !== -1
          ? newState.shipPositions[shipPosIndex].position
          : null;

      if (shipPosIndex !== -1) {
        newState.shipPositions = [...newState.shipPositions];
        newState.shipPositions[shipPosIndex] = {
          ...newState.shipPositions[shipPosIndex],
          position: action.position,
        };
      }

      if (oldPosition) {
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: oldPosition.row,
          oldCol: oldPosition.col,
          newRow: action.position.row,
          newCol: action.position.col,
          actionType: ActionType.Pass,
        };
      }

      if (!newState.creatorMovedShipIds.includes(action.shipId)) {
        newState.creatorMovedShipIds = [
          ...newState.creatorMovedShipIds,
          action.shipId,
        ];
      }

      // Simulated tutorial: scores are round-end totals (see initial state), not
      // incremented when a ship enters a scoring zone. Live play awards zones at
      // round end; the HUD here stays aligned with that teaching.
      break;
    }

    case "shoot": {
      if (!action.shipId || !action.targetShipId) break;

      const shooterPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (shooterPos) {
        const { row, col } = shooterPos.position;
        const corners = spatialLastMoveCornersFromPriorPass(
          prev,
          action.shipId,
          row,
          col,
        );
        newState.lastMove = {
          shipId: action.shipId,
          ...corners,
          actionType: ActionType.Shoot,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };

        const attackerIndex = newState.shipIds.findIndex(
          (id) => id === action.shipId,
        );
        if (attackerIndex !== -1) {
          const attackerAttrs = newState.shipAttributes[attackerIndex];
          const wasAlreadyDisabled = targetAttrs.hullPoints === 0;

          if (!wasAlreadyDisabled) {
            const baseDamage = attackerAttrs.gunDamage;
            const damageReductionPercent = targetAttrs.damageReduction;
            const reducedDamage = Math.max(
              1,
              baseDamage -
                Math.floor((baseDamage * damageReductionPercent) / 100),
            );
            targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - reducedDamage);
          } else {
            // Shooting an already-disabled ship increments its reactor timer
            targetAttrs.reactorCriticalTimer = (targetAttrs.reactorCriticalTimer || 0) + 1;
            if (targetAttrs.reactorCriticalTimer >= 3) {
              newState.creatorActiveShipIds = newState.creatorActiveShipIds.filter(
                (id) => id !== action.targetShipId,
              );
              newState.joinerActiveShipIds = newState.joinerActiveShipIds.filter(
                (id) => id !== action.targetShipId,
              );
              newState.shipPositions = newState.shipPositions.filter(
                (p) => p.shipId !== action.targetShipId,
              );
            }
          }

          newAttributes[targetIndex] = targetAttrs;
          newState.shipAttributes = newAttributes;
        }
      }
      break;
    }

    case "useSpecial": {
      if (!action.shipId || !action.targetShipId) break;

      const actorPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (actorPos) {
        const { row, col } = actorPos.position;
        const corners = spatialLastMoveCornersFromPriorPass(
          prev,
          action.shipId,
          row,
          col,
        );
        newState.lastMove = {
          shipId: action.shipId,
          ...corners,
          actionType: ActionType.Special,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];

        const targetAttrs = { ...newAttributes[targetIndex] };

        if (action.specialType === 1) {
          targetAttrs.statusEffects = [
            ...(targetAttrs.statusEffects || []),
            1,
          ];
        } else if (action.specialType === 2) {
          const healAmount = 30;
          targetAttrs.hullPoints = Math.min(
            targetAttrs.maxHullPoints,
            targetAttrs.hullPoints + healAmount,
          );
        }

        newAttributes[targetIndex] = targetAttrs;
        newState.shipAttributes = newAttributes;
      }
      break;
    }

    case "assist": {
      if (!action.shipId || !action.targetShipId) break;

      const actorPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (actorPos) {
        const { row, col } = actorPos.position;
        const corners = spatialLastMoveCornersFromPriorPass(
          prev,
          action.shipId,
          row,
          col,
        );
        newState.lastMove = {
          shipId: action.shipId,
          ...corners,
          actionType: ActionType.Assist,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };

        const healAmount = 20;
        targetAttrs.hullPoints = Math.min(
          targetAttrs.maxHullPoints,
          targetAttrs.hullPoints + healAmount,
        );
        targetAttrs.reactorCriticalTimer = 0;

        newAttributes[targetIndex] = targetAttrs;
        newState.shipAttributes = newAttributes;
      }
      break;
    }

    case "claimPoints": {
      break;
    }
  }

  return newState;
}


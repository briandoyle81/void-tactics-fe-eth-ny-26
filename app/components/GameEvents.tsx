"use client";

import React from "react";
import { ActionType, LastMove } from "../types/types";

interface LastMoveDisplayProps {
  lastMove: LastMove | undefined;
  shipMap: Map<
    number,
    { name: string; owner?: string; equipment?: { special: number } }
  >;
  address?: string;
  appendDestroyedText?: boolean;
  debugSuffix?: string;
}

/** Format last move text. Uses only cached shipMap (no blockchain fetch) for names. */
function formatLastMoveDescription(
  lastMove: LastMove,
  shipMap: Map<
    number,
    { name: string; owner?: string; equipment?: { special: number } }
  >,
  address?: string,
  appendDestroyedText?: boolean,
  debugSuffix?: string,
): string {
  const ship = shipMap.get(lastMove.shipId);
  const shipName = ship?.name ?? `Ship #${lastMove.shipId}`;
  const moved =
    lastMove.oldRow !== lastMove.newRow || lastMove.oldCol !== lastMove.newCol;

  let description = "";

  // Retreat is never a move: only "retreated from" position
  if (lastMove.actionType === ActionType.Retreat) {
    description = `${shipName} retreated from Row ${lastMove.oldRow}, Col ${lastMove.oldCol}`;
    return description;
  }

  if (moved) {
    description = `${shipName} moved to Row: ${lastMove.newRow}, Col: ${lastMove.newCol}`;
  }

  if (lastMove.actionType === ActionType.Shoot) {
    if (lastMove.targetShipId === 0) {
      description += moved ? " and fired AOE" : `${shipName} fired AOE`;
    } else {
      const targetShip = shipMap.get(lastMove.targetShipId);
      const targetName = targetShip?.name ?? `Ship #${lastMove.targetShipId}`;
      description += moved
        ? ` and fired on ${targetName}`
        : `${shipName} fired on ${targetName}`;
    }
  } else if (lastMove.actionType === ActionType.Special) {
    if (lastMove.targetShipId === 0) {
      description += moved
        ? " and used special ability (AOE)"
        : `${shipName} used special ability (AOE)`;
    } else {
      const targetShip = shipMap.get(lastMove.targetShipId);
      const targetName = targetShip?.name ?? `Ship #${lastMove.targetShipId}`;
      const isEmp = ship?.equipment?.special === 1;
      if (isEmp) {
        description += moved
          ? ` and hit ${targetName} with EMP`
          : `${shipName} hit ${targetName} with EMP`;
      } else {
        description += moved
          ? ` and used special ability on ${targetName}`
          : `${shipName} used special ability on ${targetName}`;
      }
    }
  } else if (lastMove.actionType === ActionType.Ram) {
    const targetShip = lastMove.targetShipId ? shipMap.get(lastMove.targetShipId) : null;
    const targetName = targetShip?.name ?? (lastMove.targetShipId ? `Ship #${lastMove.targetShipId}` : "a disabled ship");
    description += moved
      ? ` and rammed ${targetName}`
      : `${shipName} rammed ${targetName}`;
  } else if (lastMove.actionType === ActionType.Pass) {
    description = moved ? `${description} and passed` : `${shipName} passed`;
  } else if (lastMove.actionType === ActionType.ClaimPoints) {
    description += moved
      ? " and claimed points"
      : `${shipName} claimed points`;
  }

  const finalDescription = description || `${shipName} (no action)`;
  const withDestroyedText = appendDestroyedText
    ? `${finalDescription}, destroying it!`
    : finalDescription;
  return debugSuffix ? `${withDestroyedText} ${debugSuffix}` : withDestroyedText;
}

export function GameEvents({
  lastMove,
  shipMap,
  address,
  appendDestroyedText = false,
  debugSuffix,
}: LastMoveDisplayProps) {
  if (!lastMove || lastMove.shipId === 0) {
    return (
      <div className="border border-purple bg-black/40 p-4">
        <h3 className="text-lg font-bold text-purple mb-2">
          Last Move
        </h3>
        <p className="text-text-muted text-sm">No move yet.</p>
      </div>
    );
  }

  const description = formatLastMoveDescription(
    lastMove,
    shipMap,
    address,
    appendDestroyedText,
    debugSuffix,
  );
  const ship = shipMap.get(lastMove.shipId);
  const isMyShip = address && ship?.owner === address;

  return (
    <div className="border border-purple bg-black/40 p-4">
      <h3 className="text-lg font-bold text-purple mb-2">
        Last Move
      </h3>
      <div
        className={`p-2 rounded-none text-sm ${
          isMyShip
            ? "border-l-2 border-l-phosphor-green bg-steel/30"
            : "border-l-2 border-l-warning-red bg-steel/30"
        }`}
      >
        <span className="text-text-primary">{description}</span>
      </div>
    </div>
  );
}

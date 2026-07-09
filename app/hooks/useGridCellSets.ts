import { useMemo } from "react";

interface UseGridCellSetsParams {
  movementRange: readonly { row: number; col: number }[];
  shootingRange: readonly { row: number; col: number }[];
  effectiveShootingRange: readonly { row: number; col: number }[];
  validTargets: readonly { shipId: number }[];
  effectiveValidTargets: readonly { shipId: number }[];
  assistableTargets: readonly { shipId: number }[];
  assistableTargetsFromStart: readonly { shipId: number }[];
  tutorialHighlightCells?: readonly { row: number; col: number }[];
}

export function useGridCellSets({
  movementRange,
  shootingRange,
  effectiveShootingRange,
  validTargets,
  effectiveValidTargets,
  assistableTargets,
  assistableTargetsFromStart,
  tutorialHighlightCells,
}: UseGridCellSetsParams) {
  const movementTileSet = useMemo(
    () => new Set(movementRange.map((p) => `${p.row},${p.col}`)),
    [movementRange],
  );
  const shootingTileSet = useMemo(
    () => new Set(shootingRange.map((p) => `${p.row},${p.col}`)),
    [shootingRange],
  );
  const effectiveShootingTileSet = useMemo(
    () => new Set(effectiveShootingRange.map((p) => `${p.row},${p.col}`)),
    [effectiveShootingRange],
  );
  const validTargetIdSet = useMemo(
    () => new Set(validTargets.map((t) => t.shipId)),
    [validTargets],
  );
  const effectiveValidTargetIdSet = useMemo(
    () => new Set(effectiveValidTargets.map((t) => t.shipId)),
    [effectiveValidTargets],
  );
  const assistableTargetIdSet = useMemo(
    () => new Set(assistableTargets.map((t) => t.shipId)),
    [assistableTargets],
  );
  const assistableTargetsFromStartIdSet = useMemo(
    () => new Set(assistableTargetsFromStart.map((t) => t.shipId)),
    [assistableTargetsFromStart],
  );
  const tutorialHighlightKeySet = useMemo(() => {
    if (!tutorialHighlightCells?.length) return null;
    return new Set(tutorialHighlightCells.map((p) => `${p.row},${p.col}`));
  }, [tutorialHighlightCells]);

  return {
    movementTileSet,
    shootingTileSet,
    effectiveShootingTileSet,
    validTargetIdSet,
    effectiveValidTargetIdSet,
    assistableTargetIdSet,
    assistableTargetsFromStartIdSet,
    tutorialHighlightKeySet,
  };
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Attributes, GRID_DIMENSIONS, Ship } from "../types/types";
import { GridShipPosition } from "../types/gridDisplay";
import { generateRandomShip } from "../utils/generateRandomShip";
import { calculateAttributesFromContracts } from "../utils/shipAttributesCalculator";
import { toGameplayShip, toGridShip } from "../utils/toGridDisplay";
import { useGameplayInteraction } from "../hooks/useGameplayInteraction";
import { useDamageCalculationWeb2 } from "../hooks/useDamageCalculationWeb2";
import { GameGrid } from "./GameGrid";
import { GameBoardLayout } from "./GameBoardLayout";

// Info-page replacement for missile-clip.gif: a small, non-interactive
// autoplay loop built from the SAME real components/state machine the
// in-game tutorial (SimulatedGameDisplay.tsx) uses — <GameGrid> +
// <GameBoardLayout> driven by the shared `useGameplayInteraction` hook —
// just with synthetic local ships instead of live chain/tutorial data, and
// a timer stepping through the same setters a player's clicks would call
// (select ship -> propose move -> lock target) instead of onClick handlers.
// Every pixel (range highlights, weapon selector, confirm bar, target
// reticle, weapon-fire beam, nebula obstacle tiles) is real GameGrid
// rendering, not reimplemented.
//
// GameGrid's own CSS grid template is hardcoded to the real board size
// (`grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)]`), so this must
// use the real GRID_DIMENSIONS — a smaller synthetic grid only fills a
// corner of that fixed template and renders broken.
//
// Renders at the real board's normal (unzoomed, scale-1) size — cells, ship
// art, and the weapon-selector/confirm-bar UI are exactly the pixel sizes
// they'd be in a live game — then a smaller `overflow: hidden` viewport
// crops down to just the close-up region via plain position offsets (no
// CSS transform scale), panned to the scripted action. `pointer-events-none`
// makes the whole thing strictly view-only, since this sits on a marketing
// page and shouldn't be clickable/draggable/wheel-zoomable at all.
const GRID_WIDTH = GRID_DIMENSIONS.WIDTH;
const GRID_HEIGHT = GRID_DIMENSIONS.HEIGHT;

const ALLY_ID = 1;
const ENEMY_ID = 2;
// Purely decorative background ships (never selected/targeted) — atmosphere,
// matching real screenshots always showing a few other fleets nearby.
const BG_ALLY_1_ID = 3;
const BG_ALLY_2_ID = 4;
const BG_ENEMY_1_ID = 5;
const BG_ENEMY_2_ID = 6;

const ALLY_START = { row: 5, col: 3 };
const ALLY_DEST = { row: 5, col: 7 };
const ENEMY_POS = { row: 4, col: 9 };
const BG_ALLY_1_POS = { row: 1, col: 4 };
const BG_ALLY_2_POS = { row: 9, col: 4 };
const BG_ENEMY_1_POS = { row: 1, col: 11 };
const BG_ENEMY_2_POS = { row: 2, col: 12 };

// Floors so the scripted move/shot always fall inside the real computed
// movement/shooting range regardless of the ship's randomly rolled
// equipment (never lowers a naturally-better roll — see the Math.max below).
const DEMO_MIN_MOVEMENT = 5;
const DEMO_MIN_RANGE = 4;

// GameGrid always renders the full 17x11 board at whatever real size its
// container gives it — cells, ship art, and the weapon-selector/confirm-bar
// UI (fixed-px Tailwind sizes) all come out at their true, correctly
// proportioned sizes this way, unlike a CSS `transform: scale()` zoom, which
// visually inflates the UI right along with the cells. So: render the real
// board at a genuinely larger size (CROP_SCALE× the visible viewport, via
// real width/height, not a transform), then crop down to just the close-up
// region with `overflow: hidden` on a smaller viewport, positioned via plain
// offsets (not a transform) so nothing inside gets visually rescaled.
const VISIBLE_COLS = 10;
const CROP_SCALE = GRID_WIDTH / VISIBLE_COLS;
// Board-fraction coordinates (not cell indices) of the point to center in
// the cropped viewport — anchored on the destination cell.
const FOCUS_COL = ALLY_DEST.col;
const FOCUS_ROW = 4.5;
const FOCUS_X_FRACTION = FOCUS_COL / GRID_WIDTH;
const FOCUS_Y_FRACTION = FOCUS_ROW / GRID_HEIGHT;

const DEMO_PLAYER_ADDRESS =
  "0x1111111111111111111111111111111111111a" as `0x${string}`;
const DEMO_ENEMY_ADDRESS =
  "0x2222222222222222222222222222222222222b" as `0x${string}`;

const EMPTY_MOVED_SET = new Set<number>();

const POSITIONS: GridShipPosition[] = [
  { shipId: ALLY_ID, position: ALLY_START, isCreator: true, status: 0 },
  { shipId: ENEMY_ID, position: ENEMY_POS, isCreator: false, status: 0 },
  { shipId: BG_ALLY_1_ID, position: BG_ALLY_1_POS, isCreator: true, status: 0 },
  { shipId: BG_ALLY_2_ID, position: BG_ALLY_2_POS, isCreator: true, status: 0 },
  {
    shipId: BG_ENEMY_1_ID,
    position: BG_ENEMY_1_POS,
    isCreator: false,
    status: 0,
  },
  {
    shipId: BG_ENEMY_2_ID,
    position: BG_ENEMY_2_POS,
    isCreator: false,
    status: 0,
  },
];

// Nebula/asteroid obstacle tiles (GameGridCell renders these with the real
// nebula-tile.png art) scattered for atmosphere — matches real screenshots
// never showing a flat empty void. Kept off the ally's move path (row 5,
// cols 3-7) and away from the ally/enemy/background ship cells themselves.
const BLOCKED_CELLS: Array<{ row: number; col: number }> = [
  { row: 3, col: 4 },
  { row: 8, col: 5 },
  { row: 0, col: 10 },
  { row: 7, col: 11 },
  { row: 2, col: 6 },
  { row: 9, col: 9 },
];

const BLOCKED_GRID: boolean[][] = Array.from({ length: GRID_HEIGHT }, () =>
  Array(GRID_WIDTH).fill(false),
);
for (const { row, col } of BLOCKED_CELLS) {
  BLOCKED_GRID[row][col] = true;
}
const SCORING_GRID: number[][] = Array.from({ length: GRID_HEIGHT }, () =>
  Array(GRID_WIDTH).fill(0),
);
const ONLY_ONCE_GRID: boolean[][] = Array.from({ length: GRID_HEIGHT }, () =>
  Array(GRID_WIDTH).fill(false),
);

// select ship -> propose move -> lock target -> pause -> reset
const PHASE_DURATIONS = [1000, 1000, 1600, 2600, 700];

function buildDemoShips() {
  const ally: Ship = {
    ...generateRandomShip(ALLY_ID, 1),
    owner: DEMO_PLAYER_ADDRESS,
  };
  const enemy: Ship = {
    ...generateRandomShip(ENEMY_ID, 1),
    owner: DEMO_ENEMY_ADDRESS,
  };
  const bgAlly1: Ship = {
    ...generateRandomShip(BG_ALLY_1_ID, 1),
    owner: DEMO_PLAYER_ADDRESS,
  };
  const bgAlly2: Ship = {
    ...generateRandomShip(BG_ALLY_2_ID, 1),
    owner: DEMO_PLAYER_ADDRESS,
  };
  const bgEnemy1: Ship = {
    ...generateRandomShip(BG_ENEMY_1_ID, 1),
    owner: DEMO_ENEMY_ADDRESS,
  };
  const bgEnemy2: Ship = {
    ...generateRandomShip(BG_ENEMY_2_ID, 1),
    owner: DEMO_ENEMY_ADDRESS,
  };

  const allyBaseAttrs = calculateAttributesFromContracts(ally);
  const allyAttrs: Attributes = {
    ...allyBaseAttrs,
    movement: Math.max(allyBaseAttrs.movement, DEMO_MIN_MOVEMENT),
    range: Math.max(allyBaseAttrs.range, DEMO_MIN_RANGE),
  };
  const enemyAttrs = calculateAttributesFromContracts(enemy);
  const bgAlly1Attrs = calculateAttributesFromContracts(bgAlly1);
  const bgAlly2Attrs = calculateAttributesFromContracts(bgAlly2);
  const bgEnemy1Attrs = calculateAttributesFromContracts(bgEnemy1);
  const bgEnemy2Attrs = calculateAttributesFromContracts(bgEnemy2);

  return {
    ally,
    enemy,
    bgAlly1,
    bgAlly2,
    bgEnemy1,
    bgEnemy2,
    allyAttrs,
    enemyAttrs,
    bgAlly1Attrs,
    bgAlly2Attrs,
    bgEnemy1Attrs,
    bgEnemy2Attrs,
  };
}

export function TacticalTargetingPreview() {
  const [ships, setShips] = useState<ReturnType<typeof buildDemoShips> | null>(
    null,
  );
  const [phase, setPhase] = useState(0);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<number | null>(null);

  // Ship art/attributes use Math.random() — generate client-side only,
  // after mount, to avoid a hydration mismatch (same pattern as
  // HeroShipShowcase.tsx).
  useEffect(() => {
    setShips(buildDemoShips());
  }, []);

  const attributesById = useMemo(() => {
    const map = new Map<number, Attributes>();
    if (ships) {
      map.set(ALLY_ID, ships.allyAttrs);
      map.set(ENEMY_ID, ships.enemyAttrs);
      map.set(BG_ALLY_1_ID, ships.bgAlly1Attrs);
      map.set(BG_ALLY_2_ID, ships.bgAlly2Attrs);
      map.set(BG_ENEMY_1_ID, ships.bgEnemy1Attrs);
      map.set(BG_ENEMY_2_ID, ships.bgEnemy2Attrs);
    }
    return map;
  }, [ships]);
  const getShipAttributes = useCallback(
    (shipId: number) => attributesById.get(shipId) ?? null,
    [attributesById],
  );

  const gameplayShipMap = useMemo(() => {
    const map = new Map(
      ships
        ? [
            [ALLY_ID, toGameplayShip(ships.ally)],
            [ENEMY_ID, toGameplayShip(ships.enemy)],
            [BG_ALLY_1_ID, toGameplayShip(ships.bgAlly1)],
            [BG_ALLY_2_ID, toGameplayShip(ships.bgAlly2)],
            [BG_ENEMY_1_ID, toGameplayShip(ships.bgEnemy1)],
            [BG_ENEMY_2_ID, toGameplayShip(ships.bgEnemy2)],
          ]
        : [],
    );
    return map;
  }, [ships]);
  const gridShipMap = useMemo(() => {
    const map = new Map(
      ships
        ? [
            [ALLY_ID, toGridShip(ships.ally)],
            [ENEMY_ID, toGridShip(ships.enemy)],
            [BG_ALLY_1_ID, toGridShip(ships.bgAlly1)],
            [BG_ALLY_2_ID, toGridShip(ships.bgAlly2)],
            [BG_ENEMY_1_ID, toGridShip(ships.bgEnemy1)],
            [BG_ENEMY_2_ID, toGridShip(ships.bgEnemy2)],
          ]
        : [],
    );
    return map;
  }, [ships]);

  const interaction = useGameplayInteraction({
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    shipMap: gameplayShipMap,
    getShipAttributes,
    allShipPositions: POSITIONS,
    aliveShipPositions: POSITIONS,
    movedShipIdsSet: EMPTY_MOVED_SET,
    playerAddress: DEMO_PLAYER_ADDRESS,
    currentTurn: DEMO_PLAYER_ADDRESS,
    isGameOver: false,
    isCurrentPlayerTurn: true,
    isSubmitting: false,
    blockedGrid: BLOCKED_GRID,
    lastMove: null,
    selectedShipId,
    setSelectedShipId,
    draggedShipId,
    setDraggedShipId,
    selectedShipSpecialRange: undefined,
    selectedShipSpecialData: null,
    draggedShipSpecialRange: undefined,
  });

  const calculateDamage = useDamageCalculationWeb2({
    selectedShipId: interaction.selectedShipId,
    getShipAttributes,
    selectedWeaponType: interaction.selectedWeaponType,
    specialData: interaction.specialData,
    specialType: interaction.specialType,
  });

  const { resetSelection, setPreviewPosition, setTargetShipId } = interaction;

  // Autoplay driver — calls the exact same setters a player's clicks would,
  // just on a timer instead of onClick.
  useEffect(() => {
    if (phase === 0) resetSelection();
    else if (phase === 1) setSelectedShipId(ALLY_ID);
    else if (phase === 2) setPreviewPosition(ALLY_DEST);
    else if (phase === 3) setTargetShipId(ENEMY_ID);
  }, [phase, resetSelection, setPreviewPosition, setTargetShipId]);

  useEffect(() => {
    const t = setTimeout(
      () => setPhase((p) => (p + 1) % PHASE_DURATIONS.length),
      PHASE_DURATIONS[phase],
    );
    return () => clearTimeout(t);
  }, [phase]);

  if (!ships) {
    return <div className="h-[320px] w-full bg-near-black md:h-[400px]" />;
  }

  return (
    // Outer crop viewport: fixed size, clips overflow. The inner content div
    // is rendered at its real, unscaled size (CROP_SCALE× wider/taller than
    // this viewport, via actual width/height — not a CSS transform), so
    // cells/ships come out bigger while the weapon-selector/confirm-bar UI's
    // fixed-px sizing stays exactly what it'd be in a live game. `flex` on
    // the inner div is load-bearing — GameBoardLayout's own div declares no
    // height (it just shrinks to content), so GameGrid's internal `h-full`
    // chain has nothing definite to resolve against unless its immediate
    // parent is a flex container — default `align-items: stretch` is what
    // gives GameBoardLayout's div (and everything GameGrid computes from it)
    // an actual definite height instead of collapsing after layout settles.
    <div className="relative h-[320px] w-full overflow-hidden md:h-[400px]">
      <div
        className="absolute flex"
        style={{
          width: `${CROP_SCALE * 100}%`,
          aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}`,
          left: `${50 - FOCUS_X_FRACTION * CROP_SCALE * 100}%`,
          top: `${50 - FOCUS_Y_FRACTION * CROP_SCALE * 100}%`,
        }}
      >
        <GameBoardLayout isCurrentPlayerTurn={true}>
          <GameGrid
            grid={interaction.displayGrid}
            allShipPositions={POSITIONS}
            shipMap={gridShipMap}
            selectedShipId={interaction.selectedShipId}
            previewPosition={interaction.previewPosition}
            targetShipId={interaction.targetShipId}
            selectedWeaponType={interaction.selectedWeaponType}
            hoveredCell={interaction.hoveredCell}
            draggedShipId={interaction.draggedShipId}
            dragOverCell={interaction.dragOverCell}
            movementRange={interaction.movementRange}
            shootingRange={interaction.shootingRange}
            validTargets={interaction.validTargets}
            labelTargets={interaction.labelTargets}
            assistableTargets={interaction.assistableTargets}
            assistableTargetsFromStart={interaction.assistableTargetsFromStart}
            dragShootingRange={interaction.dragShootingRange}
            dragValidTargets={interaction.dragValidTargets}
            isCurrentPlayerTurn={true}
            isShipOwnedByCurrentPlayer={interaction.isShipOwnedByCurrentPlayer}
            movedShipIdsSet={EMPTY_MOVED_SET}
            specialType={interaction.specialType}
            blockedGrid={BLOCKED_GRID}
            scoringGrid={SCORING_GRID}
            onlyOnceGrid={ONLY_ONCE_GRID}
            calculateDamage={calculateDamage}
            getShipAttributes={getShipAttributes}
            disableTooltips={true}
            address={DEMO_PLAYER_ADDRESS}
            currentTurn={DEMO_PLAYER_ADDRESS}
            setSelectedShipId={interaction.setSelectedShipId}
            setPreviewPosition={interaction.setPreviewPosition}
            setTargetShipId={interaction.setTargetShipId}
            setSelectedWeaponType={interaction.setSelectedWeaponType}
            setHoveredCell={interaction.setHoveredCell}
            setDraggedShipId={interaction.setDraggedShipId}
            setDragOverCell={interaction.setDragOverCell}
            hoverShootingRange={interaction.hoverShootingRange}
            hoverValidTargets={interaction.hoverValidTargets}
            onMoveTileHover={interaction.onMoveTileHover}
            showConfirmWidget={interaction.showConfirmWidget}
            confirmWidgetLabel={interaction.confirmWidgetLabel}
            onCancelMove={interaction.handleCancelMove}
            renderShipCard={() => null}
          />
        </GameBoardLayout>
      </div>

      {/* Click-blocker: GameGridWeaponSelector/GameGridConfirmWidget/the HOLD
          button explicitly set pointer-events-auto on themselves (needed so
          they stay clickable over cells that intentionally ignore clicks in
          a real game), which would override a plain pointer-events-none on
          an ancestor. Sitting on top in stacking order, above everything
          GameGrid renders, is what actually guarantees this whole preview is
          strictly view-only on the Info page. */}
      <div className="absolute inset-0 z-[999]" aria-hidden />
    </div>
  );
}

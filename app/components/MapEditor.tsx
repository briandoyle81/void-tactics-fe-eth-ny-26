"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  MapEditorState,
  MapPosition,
  ScoringPosition,
  GRID_DIMENSIONS,
} from "../types/types";
import {
  MapTileContents,
  MapTileLegend,
  mapTileClass,
  type MapTileLook,
  type ZoneSide,
} from "./MapTileVisual";
import { DEFAULT_DEPLOYMENT_COLS } from "../utils/deploymentZone";

// Data-source-agnostic — the initial map data and the save action are both
// supplied by the caller (contract reads/writes for web3's Maps.tsx, REST
// for web2's MapsWeb2.tsx) so this ~700-line grid editor (tile painting,
// drag, symmetry, keyboard shortcuts) stays a single shared component
// instead of being forked per mode.
interface MapEditorRenderSaveButtonArgs {
  blockedPositions: MapPosition[];
  impassablePositions: MapPosition[];
  scoringPositions: ScoringPosition[];
  /** Deployment zones (empty = the side uses the default column band). Only meaningful when `canEditZones`. */
  creatorZonePositions: MapPosition[];
  joinerZonePositions: MapPosition[];
  /** Non-null blocks saving; render/disable your save control accordingly. */
  validationError: string | null;
  /** Call once your save action succeeds — clears the local draft and calls onSaveSuccess. */
  onSuccess: () => void;
}

interface MapEditorProps {
  mapId?: number;
  initialBlockedPositions?: MapPosition[];
  initialImpassablePositions?: MapPosition[];
  initialScoringPositions?: ScoringPosition[];
  initialCreatorZonePositions?: MapPosition[];
  initialJoinerZonePositions?: MapPosition[];
  /**
   * "editable": zone tools are live. "saveFirst": shown disabled with a
   * "save the map first" note (web3 zones are per-map setters, so a new map
   * needs an id first). Omitted: no zone tools at all.
   */
  zoneEditing?: "editable" | "saveFirst";
  onSaveSuccess?: () => void;
  onCancel?: () => void;
  canEdit?: boolean;
  renderSaveButton: (args: MapEditorRenderSaveButtonArgs) => React.ReactNode;
}


const isZoneTool = (tool: string | null | undefined): tool is ZoneSide =>
  tool === "creatorZone" || tool === "joinerZone";

const emptyBoolGrid = () =>
  Array.from({ length: GRID_DIMENSIONS.HEIGHT }, () => Array(GRID_DIMENSIONS.WIDTH).fill(false) as boolean[]);

function gridFromPositions(positions: MapPosition[] | undefined): boolean[][] {
  const grid = emptyBoolGrid();
  (positions ?? []).forEach((p) => {
    const row = Number(p.row);
    const col = Number(p.col);
    if (row >= 0 && row < GRID_DIMENSIONS.HEIGHT && col >= 0 && col < GRID_DIMENSIONS.WIDTH) {
      grid[row][col] = true;
    }
  });
  return grid;
}

function positionsFromGrid(grid: boolean[][]): MapPosition[] {
  const positions: MapPosition[] = [];
  grid.forEach((cells, row) => cells.forEach((on, col) => on && positions.push({ row, col })));
  return positions;
}

export function MapEditor({
  mapId,
  initialBlockedPositions,
  initialImpassablePositions,
  initialScoringPositions,
  initialCreatorZonePositions,
  initialJoinerZonePositions,
  zoneEditing,
  onSaveSuccess,
  onCancel,
  canEdit = true,
  renderSaveButton,
}: MapEditorProps) {
  const isEditing = mapId !== undefined;
  const blockedPositions = initialBlockedPositions;
  const impassablePositions = initialImpassablePositions;
  const scoringPositions = initialScoringPositions;

  // Initialize editor state
  const [editorState, setEditorState] = useState<MapEditorState>(() => {
    // Only load from localStorage when creating a new map (not editing)
    if (!isEditing && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mapEditorState");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate the structure and dimensions before using it
          // impassableTiles is validated only if present — older cached
          // drafts (pre-2026-09-23) won't have it, and fall back to an
          // all-false grid below rather than being discarded entirely.
          const hasValidImpassable =
            !parsed.impassableTiles ||
            (Array.isArray(parsed.impassableTiles) &&
              parsed.impassableTiles.length === GRID_DIMENSIONS.HEIGHT &&
              parsed.impassableTiles[0]?.length === GRID_DIMENSIONS.WIDTH);
          if (
            parsed.blockedTiles &&
            parsed.scoringTiles &&
            parsed.onlyOnceTiles &&
            Array.isArray(parsed.blockedTiles) &&
            Array.isArray(parsed.scoringTiles) &&
            Array.isArray(parsed.onlyOnceTiles) &&
            parsed.blockedTiles.length === GRID_DIMENSIONS.HEIGHT &&
            parsed.blockedTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
            parsed.scoringTiles.length === GRID_DIMENSIONS.HEIGHT &&
            parsed.scoringTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
            parsed.onlyOnceTiles.length === GRID_DIMENSIONS.HEIGHT &&
            parsed.onlyOnceTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
            hasValidImpassable
          ) {
            return {
              blockedTiles: parsed.blockedTiles,
              impassableTiles:
                parsed.impassableTiles ||
                Array(GRID_DIMENSIONS.HEIGHT)
                  .fill(null)
                  .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
              scoringTiles: parsed.scoringTiles,
              onlyOnceTiles: parsed.onlyOnceTiles,
              selectedTool: parsed.selectedTool || "score",
              selectedScoreValue: parsed.selectedScoreValue || 1,
              selectedOnlyOnce: parsed.selectedOnlyOnce || false,
              symmetryMode: parsed.symmetryMode || "none",
            };
          } else {
            // Clear invalid cached data
            localStorage.removeItem("mapEditorState");
          }
        }
      } catch (error) {
        console.warn(
          "Failed to load map editor state from localStorage:",
          error
        );
        // Clear corrupted cache
        localStorage.removeItem("mapEditorState");
      }
    }

    // Default state if no saved state or loading failed
    const blockedTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
    const impassableTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
    const scoringTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0));
    const onlyOnceTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));

    return {
      blockedTiles,
      impassableTiles,
      scoringTiles,
      onlyOnceTiles,
      selectedTool: "score" as const,
      selectedScoreValue: 1,
      selectedOnlyOnce: false,
      symmetryMode: "none" as const,
    };
  });

  // Track mouse drag state for block tool
  const [isDragging, setIsDragging] = useState(false);
  const [dragTool, setDragTool] = useState<"block" | "impassable" | ZoneSide | null>(null);

  // Deployment zones live outside MapEditorState (they aren't part of the
  // cached create-mode draft — zones can only be set on an existing map).
  const [zones, setZones] = useState<Record<ZoneSide, boolean[][]>>(() => ({
    creatorZone: emptyBoolGrid(),
    joinerZone: emptyBoolGrid(),
  }));
  const canEditZones = zoneEditing === "editable";
  useEffect(() => {
    if (!canEditZones) return;
    setZones({
      creatorZone: gridFromPositions(initialCreatorZonePositions),
      joinerZone: gridFromPositions(initialJoinerZonePositions),
    });
  }, [canEditZones, initialCreatorZonePositions, initialJoinerZonePositions]);


  // Load map data when editing
  useEffect(() => {
    if (isEditing && blockedPositions && scoringPositions) {
      // Initialize arrays
      const newBlockedTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
      const newImpassableTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
      const newScoringTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0));
      const newOnlyOnceTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));

      // Set blocked positions
      if (Array.isArray(blockedPositions)) {
        blockedPositions.forEach((pos: MapPosition) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_DIMENSIONS.HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_DIMENSIONS.WIDTH
          ) {
            newBlockedTiles[pos.row][pos.col] = true;
          }
        });
      }

      // Set impassable positions
      if (Array.isArray(impassablePositions)) {
        impassablePositions.forEach((pos: MapPosition) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_DIMENSIONS.HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_DIMENSIONS.WIDTH
          ) {
            newImpassableTiles[pos.row][pos.col] = true;
          }
        });
      }

      // Set scoring positions
      if (Array.isArray(scoringPositions)) {
        scoringPositions.forEach((pos: ScoringPosition) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_DIMENSIONS.HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_DIMENSIONS.WIDTH
          ) {
            newScoringTiles[pos.row][pos.col] = pos.points;
            newOnlyOnceTiles[pos.row][pos.col] = pos.onlyOnce;
          }
        });
      }

      setEditorState((prev) => ({
        ...prev,
        blockedTiles: newBlockedTiles,
        impassableTiles: newImpassableTiles,
        scoringTiles: newScoringTiles,
        onlyOnceTiles: newOnlyOnceTiles,
      }));
    }
  }, [isEditing, blockedPositions, impassablePositions, scoringPositions]);

  // Save editor state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mapEditorState", JSON.stringify(editorState));
      } catch (error) {
        console.warn("Failed to save map editor state to localStorage:", error);
      }
    }
  }, [editorState]);

  // Calculate radial symmetry positions
  const getRadialSymmetryPositions = useCallback((row: number, col: number) => {
    // For even dimensions, center is between tiles
    // Center line is between (HEIGHT/2 - 1) and (HEIGHT/2)
    const centerRow = (GRID_DIMENSIONS.HEIGHT - 1) / 2; // 5 for 11 rows
    const centerCol = (GRID_DIMENSIONS.WIDTH - 1) / 2; // 8 for 17 cols

    // Calculate relative position from center
    const relRow = row - centerRow;
    const relCol = col - centerCol;

    // Generate exactly 2 positions: original and opposite (both x and y flipped)
    const positions = [
      { row, col }, // Original position
      {
        row: Math.round(centerRow - relRow),
        col: Math.round(centerCol - relCol),
      }, // Opposite in both x and y
    ];

    // Filter out positions that are out of bounds
    return positions.filter(
      (pos) =>
        pos.row >= 0 &&
        pos.row < GRID_DIMENSIONS.HEIGHT &&
        pos.col >= 0 &&
        pos.col < GRID_DIMENSIONS.WIDTH
    );
  }, []);

  // Paint (or clear) zone tiles. A tile belongs to at most one side; with
  // radial symmetry the mirrored tile goes to the OPPOSITE side, so the two
  // fleets get matching start areas.
  const paintZone = useCallback(
    (side: ZoneSide, row: number, col: number, value: boolean, radial: boolean) => {
      setZones((prev) => {
        const next = { creatorZone: prev.creatorZone.map((r) => [...r]), joinerZone: prev.joinerZone.map((r) => [...r]) };
        const set = (target: ZoneSide, r: number, c: number) => {
          const other: ZoneSide = target === "creatorZone" ? "joinerZone" : "creatorZone";
          next[target][r][c] = value;
          if (value) next[other][r][c] = false;
        };
        set(side, row, col);
        if (radial) {
          const mirror = getRadialSymmetryPositions(row, col)[1];
          if (mirror && (mirror.row !== row || mirror.col !== col)) {
            set(side === "creatorZone" ? "joinerZone" : "creatorZone", mirror.row, mirror.col);
          }
        }
        return next;
      });
    },
    [getRadialSymmetryPositions],
  );

  // Handle tile click
  const handleTileClick = useCallback(
    (row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      setEditorState((prev) => {
        // Create deep copies of the arrays to avoid mutation
        const newBlockedTiles = prev.blockedTiles.map((rowArray) => [
          ...rowArray,
        ]);
        const newImpassableTiles = prev.impassableTiles.map((rowArray) => [
          ...rowArray,
        ]);
        const newScoringTiles = prev.scoringTiles.map((rowArray) => [
          ...rowArray,
        ]);
        const newOnlyOnceTiles = prev.onlyOnceTiles.map((rowArray) => [
          ...rowArray,
        ]);

        // Get positions to modify (including symmetry if enabled)
        const positions =
          prev.symmetryMode === "radial"
            ? getRadialSymmetryPositions(row, col)
            : [{ row, col }];

        positions.forEach(({ row: posRow, col: posCol }) => {
          // "block"/"impassable" are handled entirely by
          // handleTileMouseDown/handleTileMouseEnter (paint-to-true on
          // click or drag) + handleTileRightClick (toggle off) — a click
          // always fires mousedown then click, so a toggle branch here
          // would immediately undo mousedown's paint on every single,
          // non-dragged click.
          if (prev.selectedTool === "score") {
            // Toggle scoring - if already scoring, clear it; otherwise set it
            if (prev.scoringTiles[posRow][posCol] > 0) {
              // Clear scoring tile
              newScoringTiles[posRow][posCol] = 0;
              newOnlyOnceTiles[posRow][posCol] = false;
            } else {
              // Set scoring tile
              newScoringTiles[posRow][posCol] = prev.selectedScoreValue;
              newOnlyOnceTiles[posRow][posCol] = prev.selectedOnlyOnce;
            }
          } else if (prev.selectedTool === "erase") {
            // Clear everything
            newBlockedTiles[posRow][posCol] = false;
            newImpassableTiles[posRow][posCol] = false;
            newScoringTiles[posRow][posCol] = 0;
            newOnlyOnceTiles[posRow][posCol] = false;
          }
        });

        return {
          ...prev,
          blockedTiles: newBlockedTiles,
          impassableTiles: newImpassableTiles,
          scoringTiles: newScoringTiles,
          onlyOnceTiles: newOnlyOnceTiles,
        };
      });
      if (editorState.selectedTool === "erase" && canEditZones) {
        const radial = editorState.symmetryMode === "radial";
        const targets = radial ? getRadialSymmetryPositions(row, col) : [{ row, col }];
        setZones((prev) => {
          const next = { creatorZone: prev.creatorZone.map((r) => [...r]), joinerZone: prev.joinerZone.map((r) => [...r]) };
          targets.forEach(({ row: r, col: c }) => {
            next.creatorZone[r][c] = false;
            next.joinerZone[r][c] = false;
          });
          return next;
        });
      }
    },
    [getRadialSymmetryPositions, canEdit, canEditZones, editorState.selectedTool, editorState.symmetryMode]
  );

  // Handle tile mouse down for drag start
  const handleTileMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      e.preventDefault();
      if (isZoneTool(editorState.selectedTool)) {
        if (!canEditZones) return;
        const side = editorState.selectedTool;
        setIsDragging(true);
        setDragTool(side);
        paintZone(side, row, col, true, editorState.symmetryMode === "radial");
        return;
      }
      if (editorState.selectedTool === "block" || editorState.selectedTool === "impassable") {
        const tool = editorState.selectedTool;
        setIsDragging(true);
        setDragTool(tool);

        // Paint the first tile without toggling
        setEditorState((prev) => {
          const key = tool === "block" ? "blockedTiles" : "impassableTiles";
          const newTiles = prev[key].map((rowArray) => [...rowArray]);

          const positions =
            prev.symmetryMode === "radial"
              ? getRadialSymmetryPositions(row, col)
              : [{ row, col }];

          positions.forEach(({ row: posRow, col: posCol }) => {
            newTiles[posRow][posCol] = true;
          });

          return {
            ...prev,
            [key]: newTiles,
          };
        });
      }
      // For non-paintable tools, don't do anything here - let onClick handle it
    },
    [editorState.selectedTool, editorState.symmetryMode, getRadialSymmetryPositions, canEdit, canEditZones, paintZone]
  );

  // Handle tile mouse enter for drag painting
  const handleTileMouseEnter = useCallback(
    (row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      if (isDragging && isZoneTool(dragTool)) {
        paintZone(dragTool, row, col, true, editorState.symmetryMode === "radial");
        return;
      }
      if (isDragging && (dragTool === "block" || dragTool === "impassable")) {
        const key = dragTool === "block" ? "blockedTiles" : "impassableTiles";
        setEditorState((prev) => {
          // Create deep copy of the arrays
          const newTiles = prev[key].map((rowArray) => [...rowArray]);

          // Get positions to modify (including symmetry if enabled)
          const positions =
            prev.symmetryMode === "radial"
              ? getRadialSymmetryPositions(row, col)
              : [{ row, col }];

          positions.forEach(({ row: posRow, col: posCol }) => {
            // Paint mode
            newTiles[posRow][posCol] = true;
          });

          return {
            ...prev,
            [key]: newTiles,
          };
        });
      }
    },
    [isDragging, dragTool, getRadialSymmetryPositions, canEdit, paintZone, editorState.symmetryMode]
  );

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTool(null);
  }, []);

  // Handle keyboard events and global mouse up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDragging(false);
        setDragTool(null);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragTool(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, []);

  // Handle tile right-click — toggles blocking, unless the impassable tool
  // is the one currently active, in which case it toggles impassable
  // instead. This is the actual way to turn either OFF for a single tile:
  // see handleTileClick's comment for why a left-click toggle doesn't work.
  const handleTileRightClick = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      e.preventDefault();
      if (isZoneTool(editorState.selectedTool)) {
        if (canEditZones) {
          const side = editorState.selectedTool;
          paintZone(side, row, col, !zones[side][row][col], false);
        }
        return;
      }
      setEditorState((prev) => {
        if (prev.selectedTool === "impassable") {
          const newImpassableTiles = prev.impassableTiles.map((rowArray) => [
            ...rowArray,
          ]);
          newImpassableTiles[row][col] = !prev.impassableTiles[row][col];
          return {
            ...prev,
            impassableTiles: newImpassableTiles,
          };
        }
        const newBlockedTiles = prev.blockedTiles.map((rowArray) => [
          ...rowArray,
        ]);
        newBlockedTiles[row][col] = !prev.blockedTiles[row][col];
        return {
          ...prev,
          blockedTiles: newBlockedTiles,
        };
      });
    },
    [canEdit, canEditZones, editorState.selectedTool, paintZone, zones]
  );

  // Convert editor state to contract format
  const getBlockedPositions = useCallback((): MapPosition[] => {
    const positions: MapPosition[] = [];
    for (let row = 0; row < GRID_DIMENSIONS.HEIGHT; row++) {
      for (let col = 0; col < GRID_DIMENSIONS.WIDTH; col++) {
        if (editorState.blockedTiles[row][col]) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }, [editorState.blockedTiles]);

  const getImpassablePositions = useCallback((): MapPosition[] => {
    const positions: MapPosition[] = [];
    for (let row = 0; row < GRID_DIMENSIONS.HEIGHT; row++) {
      for (let col = 0; col < GRID_DIMENSIONS.WIDTH; col++) {
        if (editorState.impassableTiles[row][col]) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }, [editorState.impassableTiles]);

  const getScoringPositions = useCallback((): ScoringPosition[] => {
    const positions: ScoringPosition[] = [];
    for (let row = 0; row < GRID_DIMENSIONS.HEIGHT; row++) {
      for (let col = 0; col < GRID_DIMENSIONS.WIDTH; col++) {
        if (editorState.scoringTiles[row][col] > 0) {
          positions.push({
            row,
            col,
            points: editorState.scoringTiles[row][col],
            onlyOnce: editorState.onlyOnceTiles[row][col],
          });
        }
      }
    }
    return positions;
  }, [editorState.scoringTiles, editorState.onlyOnceTiles]);

  // Clear saved state from localStorage
  const clearSavedState = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mapEditorState");
      } catch (error) {
        console.warn(
          "Failed to clear map editor state from localStorage:",
          error
        );
      }
    }
  }, []);

  // Validation shown/enforced by whatever save control the caller renders.
  const validationError =
    !isEditing &&
    getBlockedPositions().length === 0 &&
    getScoringPositions().length === 0
      ? "Please add some blocked or scoring tiles before creating a map."
      : null;

  // Handle a successful save (contract tx for web3, REST call for web2).
  const handleSaveSuccess = useCallback(() => {
    clearSavedState();
    onSaveSuccess?.();
  }, [clearSavedState, onSaveSuccess]);

  // Clear all tiles
  const clearAll = useCallback(() => {
    if (canEditZones) setZones({ creatorZone: emptyBoolGrid(), joinerZone: emptyBoolGrid() });
    setEditorState((prev) => ({
      ...prev,
      blockedTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
      impassableTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
      scoringTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0)),
      onlyOnceTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
    }));
  }, [canEditZones]);

  // Download map as JSON file
  const downloadMap = useCallback(() => {
    const mapData = {
      version: "1.0",
      gridDimensions: GRID_DIMENSIONS,
      blockedTiles: editorState.blockedTiles,
      impassableTiles: editorState.impassableTiles,
      scoringTiles: editorState.scoringTiles,
      onlyOnceTiles: editorState.onlyOnceTiles,
      metadata: {
        name: isEditing ? `Map ${mapId}` : "New Map",
        createdAt: new Date().toISOString(),
        createdBy: "Map Editor",
      },
    };

    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `map_${isEditing ? mapId : "new"}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [editorState, isEditing, mapId]);

  // Upload map from JSON file
  const uploadMap = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const mapData = JSON.parse(e.target?.result as string);

          // Validate the map data structure. impassableTiles is optional
          // (older exported files predate it) — falls back to all-false.
          if (
            mapData.blockedTiles &&
            mapData.scoringTiles &&
            mapData.onlyOnceTiles &&
            Array.isArray(mapData.blockedTiles) &&
            Array.isArray(mapData.scoringTiles) &&
            Array.isArray(mapData.onlyOnceTiles)
          ) {
            // Check if dimensions match
            const hasValidImpassable =
              !mapData.impassableTiles ||
              (Array.isArray(mapData.impassableTiles) &&
                mapData.impassableTiles.length === GRID_DIMENSIONS.HEIGHT &&
                mapData.impassableTiles[0]?.length === GRID_DIMENSIONS.WIDTH);
            if (
              mapData.blockedTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.blockedTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
              mapData.scoringTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.scoringTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
              mapData.onlyOnceTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.onlyOnceTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
              hasValidImpassable
            ) {
              setEditorState((prev) => ({
                ...prev,
                blockedTiles: mapData.blockedTiles,
                impassableTiles:
                  mapData.impassableTiles ||
                  Array(GRID_DIMENSIONS.HEIGHT)
                    .fill(null)
                    .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
                scoringTiles: mapData.scoringTiles,
                onlyOnceTiles: mapData.onlyOnceTiles,
              }));
              alert("Map loaded successfully!");
            } else {
              alert(
                "Map dimensions don't match the current grid size (60x40)."
              );
            }
          } else {
            alert("Invalid map file format.");
          }
        } catch (error) {
          alert(
            "Error reading map file. Please make sure it's a valid JSON file."
          );
          console.error("Error parsing map file:", error);
        }
      };
      reader.readAsText(file);

      // Reset the input so the same file can be selected again
      event.target.value = "";
    },
    []
  );

  // Get tile class based on state
  const zoneHasCustom: Record<ZoneSide, boolean> = {
    creatorZone: zones.creatorZone.some((r) => r.some(Boolean)),
    joinerZone: zones.joinerZone.some((r) => r.some(Boolean)),
  };

  // What a tile shows — same format as the mini-map preview (MapTileVisual).
  const tileLook = (row: number, col: number): MapTileLook => {
    const look: MapTileLook = {
      blocked: !!editorState.blockedTiles[row]?.[col],
      impassable: !!editorState.impassableTiles[row]?.[col],
      score: editorState.scoringTiles[row]?.[col] ?? 0,
      onlyOnce: !!editorState.onlyOnceTiles[row]?.[col],
    };
    if (zoneEditing) {
      for (const side of ["creatorZone", "joinerZone"] as const) {
        const band = side === "creatorZone" ? DEFAULT_DEPLOYMENT_COLS.creator : DEFAULT_DEPLOYMENT_COLS.joiner;
        const inZone = zoneHasCustom[side]
          ? zones[side][row][col]
          : col >= band.colMin && col <= band.colMax;
        if (inZone) {
          look.zone = { side, isDefault: !zoneHasCustom[side] };
          break;
        }
      }
    }
    return look;
  };

  const getTileClass = (row: number, col: number) =>
    `w-full h-full aspect-square cursor-pointer hover:border-white transition-colors ${mapTileClass(tileLook(row, col))}`;

  return (
    <div className="w-full space-y-4">
      {/* Authorization Notice */}
      {!canEdit && (
        <div className="p-4 bg-amber/10 border border-amber/30">
          <div className="flex items-center gap-2 text-amber">
            <span className="font-mono font-bold text-sm">[!]</span>
            <span className="font-mono text-sm">
              READ-ONLY MODE: You are not authorized to edit maps. Only
              authorized addresses can modify maps.
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 p-4 bg-steel">
        <div className="flex gap-2">
          <button
            onClick={() =>
              setEditorState((prev) => ({ ...prev, selectedTool: "score" }))
            }
            disabled={!canEdit}
            className={`px-3 py-2 rounded-none text-sm font-mono ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : editorState.selectedTool === "score"
                ? "bg-gunmetal text-white"
                : "bg-steel text-text-secondary hover:bg-gunmetal"
            }`}
          >
            Set Points
          </button>
          <button
            onClick={() =>
              setEditorState((prev) => ({ ...prev, selectedTool: "block" }))
            }
            disabled={!canEdit}
            className={`px-3 py-2 rounded-none text-sm font-mono ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : editorState.selectedTool === "block"
                ? "bg-gunmetal text-white"
                : "bg-steel text-text-secondary hover:bg-gunmetal"
            }`}
          >
            Toggle Block
          </button>
          <button
            onClick={() =>
              setEditorState((prev) => ({ ...prev, selectedTool: "impassable" }))
            }
            disabled={!canEdit}
            className={`px-3 py-2 rounded-none text-sm font-mono ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : editorState.selectedTool === "impassable"
                ? "bg-amber text-black"
                : "bg-steel text-text-secondary hover:bg-gunmetal"
            }`}
          >
            Toggle Impassable
          </button>
          {zoneEditing &&
            (["creatorZone", "joinerZone"] as const).map((side) => {
              const disabled = !canEdit || !canEditZones;
              return (
                <button
                  key={side}
                  onClick={() => setEditorState((prev) => ({ ...prev, selectedTool: side }))}
                  disabled={disabled}
                  title={
                    zoneEditing === "saveFirst"
                      ? "Save the map first — deployment zones are set on an existing map."
                      : "Click or drag to add tiles, right-click to remove. Empty = default columns."
                  }
                  className={`px-3 py-2 rounded-none text-sm font-mono ${
                    disabled
                      ? "bg-steel text-text-muted cursor-not-allowed"
                      : editorState.selectedTool === side
                        ? side === "creatorZone"
                          ? "bg-cyan text-black"
                          : "bg-warning-red text-white"
                        : "bg-steel text-text-secondary hover:bg-gunmetal"
                  }`}
                >
                  {side === "creatorZone" ? "Creator Zone" : "Joiner Zone"}
                </button>
              );
            })}
          <button
            onClick={() =>
              setEditorState((prev) => ({ ...prev, selectedTool: "erase" }))
            }
            disabled={!canEdit}
            className={`px-3 py-2 rounded-none text-sm font-mono ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : editorState.selectedTool === "erase"
                ? "bg-gunmetal text-white"
                : "bg-steel text-text-secondary hover:bg-gunmetal"
            }`}
          >
            Erase
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Symmetry:</label>
          <button
            onClick={() =>
              setEditorState((prev) => ({
                ...prev,
                symmetryMode:
                  prev.symmetryMode === "radial" ? "none" : "radial",
              }))
            }
            disabled={!canEdit}
            className={`px-3 py-2 rounded-none text-sm font-mono ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : editorState.symmetryMode === "radial"
                ? "bg-purple text-white"
                : "bg-steel text-text-secondary hover:bg-gunmetal"
            }`}
          >
            {editorState.symmetryMode === "radial" ? "Radial ON" : "Radial OFF"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Points:</label>
          <input
            type="number"
            min="1"
            max="255"
            value={editorState.selectedScoreValue}
            onChange={(e) =>
              setEditorState((prev) => ({
                ...prev,
                selectedScoreValue: Math.max(
                  1,
                  Math.min(255, parseInt(e.target.value) || 1)
                ),
              }))
            }
            disabled={!canEdit}
            className={`w-16 px-2 py-1 rounded-none text-sm ${
              !canEdit
                ? "bg-steel text-text-muted cursor-not-allowed"
                : "bg-steel text-white"
            }`}
          />
          <label className="flex items-center gap-1 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={editorState.selectedOnlyOnce}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  selectedOnlyOnce: e.target.checked,
                }))
              }
              disabled={!canEdit}
              className={`rounded-none ${!canEdit ? "cursor-not-allowed" : ""}`}
            />
            Once only
          </label>
        </div>

        <button
          onClick={clearAll}
          disabled={!canEdit}
          className={`px-3 py-2 rounded-none text-sm font-mono ${
            !canEdit
              ? "bg-steel text-text-muted cursor-not-allowed"
              : "bg-warning-red/20 text-warning-red border border-warning-red hover:bg-warning-red/30"
          }`}
        >
          Clear All
        </button>
      </div>

      {/* Grid Info and Legend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-cyan font-mono">
            Grid: {GRID_DIMENSIONS.WIDTH} × {GRID_DIMENSIONS.HEIGHT} tiles
          </div>
          <div className="text-xs text-text-muted">
            Total: {GRID_DIMENSIONS.WIDTH * GRID_DIMENSIONS.HEIGHT} tiles
          </div>
        </div>

        {zoneEditing === "saveFirst" && (
          <div className="text-xs text-text-muted">
            Deployment zones can be set once this map is saved.
          </div>
        )}
        <div className="text-xs text-amber">
          Current tool: {editorState.selectedTool} | Points:{" "}
          {editorState.selectedScoreValue} | Once only:{" "}
          {editorState.selectedOnlyOnce ? "Yes" : "No"} | Symmetry:{" "}
          {editorState.symmetryMode === "radial" ? "Radial" : "None"}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <MapTileLegend showZones={!!zoneEditing} />
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-near-black border border-gunmetal"></div>
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-near-black border border-gunmetal relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-cyan"></div>
              </div>
            </div>
            <span>Center lines</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-near-black border border-gunmetal relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-cyan/40"></div>
              </div>
            </div>
            <span>Reference lines (faint)</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-near-black w-full relative flex justify-center p-1">
        <div
          key={`grid-${editorState.blockedTiles.length}-${editorState.scoringTiles.length}`}
          className="grid relative gap-0 grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)] w-full"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={getTileClass(row, col)}
                  onClick={() => {
                    // Only handle click if not dragging
                    if (!isDragging) {
                      handleTileClick(row, col);
                    }
                  }}
                  onMouseDown={(e) => handleTileMouseDown(e, row, col)}
                  onMouseEnter={() => handleTileMouseEnter(row, col)}
                  onContextMenu={(e) => handleTileRightClick(e, row, col)}
                  onDragStart={(e) => e.preventDefault()}
                  style={{ userSelect: "none" }}
                  title={`Row: ${row}, Col: ${col}${
                    editorState.blockedTiles[row][col] ? ", Blocked (LOS)" : ""
                  }${
                    editorState.impassableTiles[row][col] ? ", Impassable (movement)" : ""
                  }${zones.creatorZone[row][col] ? ", Creator deployment zone" : ""}${
                    zones.joinerZone[row][col] ? ", Joiner deployment zone" : ""
                  }${
                    editorState.scoringTiles[row][col] > 0
                      ? `, Score: ${editorState.scoringTiles[row][col]}${
                          editorState.onlyOnceTiles[row][col]
                            ? " (once only)"
                            : " (reusable)"
                        }`
                      : ""
                  }`}
                >
                  <MapTileContents look={tileLook(row, col)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Grid reference lines overlay */}
        <div className="absolute pointer-events-none inset-0">
          {/* Vertical reference lines */}
          {/* Center column edges (left and right of column 8) */}
          <div
            className="absolute bg-cyan"
            style={{
              left: `${(8 / GRID_DIMENSIONS.WIDTH) * 100}%`,
              top: 0,
              width: "2px",
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />
          <div
            className="absolute bg-cyan"
            style={{
              left: `${(9 / GRID_DIMENSIONS.WIDTH) * 100}%`,
              top: 0,
              width: "2px",
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />
          <div
            className="absolute bg-cyan"
            style={{
              left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`,
              top: 0,
              width: "2px",
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />

          {/* Red emphasis lines - Creator/Joiner boundaries */}
          <div
            className="absolute bg-warning-red"
            style={{
              left: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Right boundary of creator zone (after column 3, before column 4)
              top: 0,
              width: "2px",
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />
          <div
            className="absolute bg-warning-red"
            style={{
              left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Start of joiner zone (columns 13-16)
              top: 0,
              width: "2px",
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />

          {/* Reference columns */}
          {[3, 5, 11, 14].map((col) => (
            <div
              key={`v-${col}`}
              className="absolute bg-cyan/40"
              style={{
                left: `${(col / GRID_DIMENSIONS.WIDTH) * 100}%`,
                top: 0,
                width: "1px",
                height: "100%",
                transform: "translateX(-50%)",
                opacity: 0.6,
              }}
            />
          ))}

          {/* Horizontal reference lines */}
          {/* Center row edges (top and bottom of row 5) */}
          <div
            className="absolute bg-cyan"
            style={{
              left: 0,
              top: `${(5 / GRID_DIMENSIONS.HEIGHT) * 100}%`,
              width: "100%",
              height: "2px",
              transform: "translateY(-50%)",
            }}
          />
          <div
            className="absolute bg-cyan"
            style={{
              left: 0,
              top: `${(6 / GRID_DIMENSIONS.HEIGHT) * 100}%`,
              width: "100%",
              height: "2px",
              transform: "translateY(-50%)",
            }}
          />

          {/* Reference rows */}
          {[1, 9].map((row) => (
            <div
              key={`h-${row}`}
              className="absolute bg-cyan/40"
              style={{
                left: 0,
                top: `${(row / GRID_DIMENSIONS.HEIGHT) * 100}%`,
                width: "100%",
                height: "1px",
                transform: "translateY(-50%)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={clearSavedState}
          className="px-4 py-2 border border-amber text-amber rounded-none font-mono hover:bg-amber/10"
        >
          Clear Saved
        </button>
        <button
          onClick={downloadMap}
          className="px-4 py-2 border border-cyan text-cyan rounded-none font-mono hover:bg-cyan/10"
        >
          Download Map
        </button>
        <label className="px-4 py-2 border border-purple text-purple rounded-none font-mono hover:bg-purple/10 cursor-pointer">
          Upload Map
          <input
            type="file"
            accept=".json"
            onChange={uploadMap}
            className="hidden"
          />
        </label>
        <button
          onClick={clearAll}
          className="px-4 py-2 border border-warning-red text-warning-red rounded-none font-mono hover:bg-warning-red/10"
        >
          Clear All
        </button>
        {canEdit &&
          renderSaveButton({
            blockedPositions: getBlockedPositions(),
            impassablePositions: getImpassablePositions(),
            scoringPositions: getScoringPositions(),
            creatorZonePositions: positionsFromGrid(zones.creatorZone),
            joinerZonePositions: positionsFromGrid(zones.joinerZone),
            validationError,
            onSuccess: handleSaveSuccess,
          })}
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-steel text-text-primary rounded-none font-mono hover:bg-gunmetal"
        >
          Cancel
        </button>
      </div>

      <div className="text-xs text-text-muted space-y-1">
        <div>
          <strong>Instructions:</strong>
        </div>
        <div>
          • <strong>Left-click</strong> with &quot;Set Points&quot; tool to
          add/remove scoring tiles
        </div>
        <div>
          • <strong>Left-click or drag</strong> with &quot;Toggle
          Block&quot; to paint blocking (LOS); <strong>right-click</strong>{" "}
          a tile to un-block it
        </div>
        <div>
          • <strong>Left-click or drag</strong> with &quot;Toggle
            Impassable&quot; to paint movement-blocking terrain, independent
          of blocking (LOS); a ship can&apos;t land on or cross it, but can
          still shoot through it. <strong>Right-click</strong> a tile to
          clear it
        </div>
        <div>
          • <strong>Left-click</strong> with &quot;Erase&quot; tool to clear
          everything
        </div>
        <div>
          • Set point value and &quot;once only&quot; option above before
          placing scoring tiles
        </div>
      </div>
    </div>
  );
}

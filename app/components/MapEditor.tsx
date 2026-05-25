"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  MapEditorState,
  MapPosition,
  ScoringPosition,
  GRID_DIMENSIONS,
} from "../types/types";
import {
  useMapsContract,
  useGetPresetMap,
  useGetPresetScoringMap,
} from "../hooks/useMapsContract";
import { TransactionButton } from "./TransactionButton";

interface MapEditorProps {
  mapId?: number;
  onSave?: () => void;
  onCancel?: () => void;
  canEdit?: boolean;
}

export function MapEditor({
  mapId,
  onSave,
  onCancel,
  canEdit = true,
}: MapEditorProps) {
  const isEditing = mapId !== undefined;
  const mapsContract = useMapsContract();

  // Load map data when editing
  const { data: blockedPositions } = useGetPresetMap(mapId || 0, {
    chainSource: "picker",
  });
  const { data: scoringPositions } = useGetPresetScoringMap(mapId || 0, {
    chainSource: "picker",
  });

  // Initialize editor state
  const [editorState, setEditorState] = useState<MapEditorState>(() => {
    // Only load from localStorage when creating a new map (not editing)
    if (!isEditing && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mapEditorState");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate the structure and dimensions before using it
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
            parsed.onlyOnceTiles[0]?.length === GRID_DIMENSIONS.WIDTH
          ) {
            return {
              blockedTiles: parsed.blockedTiles,
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
    const scoringTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0));
    const onlyOnceTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));

    return {
      blockedTiles,
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
  const [dragTool, setDragTool] = useState<"block" | null>(null);

  // Load map data when editing
  useEffect(() => {
    if (isEditing && blockedPositions && scoringPositions) {
      // Initialize arrays
      const newBlockedTiles = Array(GRID_DIMENSIONS.HEIGHT)
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
        scoringTiles: newScoringTiles,
        onlyOnceTiles: newOnlyOnceTiles,
      }));
    }
  }, [isEditing, blockedPositions, scoringPositions]);

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
          if (prev.selectedTool === "block") {
            // Toggle blocking
            newBlockedTiles[posRow][posCol] =
              !prev.blockedTiles[posRow][posCol];
          } else if (prev.selectedTool === "score") {
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
            newScoringTiles[posRow][posCol] = 0;
            newOnlyOnceTiles[posRow][posCol] = false;
          }
        });

        return {
          ...prev,
          blockedTiles: newBlockedTiles,
          scoringTiles: newScoringTiles,
          onlyOnceTiles: newOnlyOnceTiles,
        };
      });
    },
    [getRadialSymmetryPositions, canEdit]
  );

  // Handle tile mouse down for drag start
  const handleTileMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      e.preventDefault();
      if (editorState.selectedTool === "block") {
        setIsDragging(true);
        setDragTool("block");

        // Paint the first tile without toggling
        setEditorState((prev) => {
          const newBlockedTiles = prev.blockedTiles.map((rowArray) => [
            ...rowArray,
          ]);

          const positions =
            prev.symmetryMode === "radial"
              ? getRadialSymmetryPositions(row, col)
              : [{ row, col }];

          positions.forEach(({ row: posRow, col: posCol }) => {
            newBlockedTiles[posRow][posCol] = true;
          });

          return {
            ...prev,
            blockedTiles: newBlockedTiles,
          };
        });
      }
      // For non-block tools, don't do anything here - let onClick handle it
    },
    [editorState.selectedTool, getRadialSymmetryPositions, canEdit]
  );

  // Handle tile mouse enter for drag painting
  const handleTileMouseEnter = useCallback(
    (row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      if (isDragging && dragTool === "block") {
        setEditorState((prev) => {
          // Create deep copy of the arrays
          const newBlockedTiles = prev.blockedTiles.map((rowArray) => [
            ...rowArray,
          ]);

          // Get positions to modify (including symmetry if enabled)
          const positions =
            prev.symmetryMode === "radial"
              ? getRadialSymmetryPositions(row, col)
              : [{ row, col }];

          positions.forEach(({ row: posRow, col: posCol }) => {
            // Set blocking to true (paint mode)
            newBlockedTiles[posRow][posCol] = true;
          });

          return {
            ...prev,
            blockedTiles: newBlockedTiles,
          };
        });
      }
    },
    [isDragging, dragTool, getRadialSymmetryPositions, canEdit]
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

  // Handle tile right-click for blocking
  const handleTileRightClick = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't allow editing if not authorized
      if (!canEdit) {
        return;
      }

      e.preventDefault();
      setEditorState((prev) => {
        // Create deep copy of the blocked tiles array
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
    [canEdit]
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

  // Prepare data for transaction
  const getTransactionData = useCallback(() => {
    const blockedPositions = getBlockedPositions();
    const scoringPositions = getScoringPositions();

    if (isEditing) {
      return {
        functionName: "updatePresetMap" as const,
        args: [Number(mapId), blockedPositions, scoringPositions],
      };
    } else {
      return {
        functionName: "createPresetMap" as const,
        args: [blockedPositions, scoringPositions],
      };
    }
  }, [isEditing, mapId, getBlockedPositions, getScoringPositions]);

  // Validate before transaction
  const validateBeforeTransaction = useCallback(() => {
    const blockedPositions = getBlockedPositions();
    const scoringPositions = getScoringPositions();

    if (
      !isEditing &&
      blockedPositions.length === 0 &&
      scoringPositions.length === 0
    ) {
      return "Please add some blocked or scoring tiles before creating a map.";
    }

    return true;
  }, [isEditing, getBlockedPositions, getScoringPositions]);

  // Handle successful transaction
  const handleTransactionSuccess = useCallback(() => {
    clearSavedState();
    onSave?.();
  }, [clearSavedState, onSave]);

  // Clear all tiles
  const clearAll = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      blockedTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
      scoringTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0)),
      onlyOnceTiles: Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false)),
    }));
  }, []);

  // Download map as JSON file
  const downloadMap = useCallback(() => {
    const mapData = {
      version: "1.0",
      gridDimensions: GRID_DIMENSIONS,
      blockedTiles: editorState.blockedTiles,
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

          // Validate the map data structure
          if (
            mapData.blockedTiles &&
            mapData.scoringTiles &&
            mapData.onlyOnceTiles &&
            Array.isArray(mapData.blockedTiles) &&
            Array.isArray(mapData.scoringTiles) &&
            Array.isArray(mapData.onlyOnceTiles)
          ) {
            // Check if dimensions match
            if (
              mapData.blockedTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.blockedTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
              mapData.scoringTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.scoringTiles[0]?.length === GRID_DIMENSIONS.WIDTH &&
              mapData.onlyOnceTiles.length === GRID_DIMENSIONS.HEIGHT &&
              mapData.onlyOnceTiles[0]?.length === GRID_DIMENSIONS.WIDTH
            ) {
              setEditorState((prev) => ({
                ...prev,
                blockedTiles: mapData.blockedTiles,
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
  const getTileClass = (row: number, col: number) => {
    // Bounds checking to prevent errors
    if (
      row < 0 ||
      row >= GRID_DIMENSIONS.HEIGHT ||
      col < 0 ||
      col >= GRID_DIMENSIONS.WIDTH ||
      !editorState.blockedTiles[row] ||
      !editorState.scoringTiles[row] ||
      !editorState.onlyOnceTiles[row]
    ) {
      return "w-full h-full aspect-square cursor-pointer hover:border-white transition-colors border-0 outline outline-1 outline-gunmetal bg-near-black";
    }

    const isBlocked = editorState.blockedTiles[row][col];
    const scoreValue = editorState.scoringTiles[row][col];
    const isOnlyOnce = editorState.onlyOnceTiles[row][col];

    let baseClass =
      "w-full h-full aspect-square cursor-pointer hover:border-white transition-colors";

    // Set border thickness based on blocking status
    if (isBlocked) {
      baseClass += " border-0 shadow-[inset_0_0_0_2px_rgb(168,85,247)]";
    } else {
      baseClass += " border-0 outline outline-1 outline-gunmetal";
    }

    // Set background color based on scoring status
    if (scoreValue > 0) {
      if (isOnlyOnce) {
        baseClass += " bg-amber"; // once-only scoring
      } else {
        baseClass += " bg-cyan"; // reusable scoring
      }
    } else {
      // Empty
      baseClass += " bg-near-black";
    }

    return baseClass;
  };

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

        <div className="text-xs text-amber">
          Current tool: {editorState.selectedTool} | Points:{" "}
          {editorState.selectedScoreValue} | Once only:{" "}
          {editorState.selectedOnlyOnce ? "Yes" : "No"} | Symmetry:{" "}
          {editorState.symmetryMode === "radial" ? "Radial" : "None"}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-near-black border-2 border-purple"></div>
            <span>Blocked (LOS) - Thick purple border</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-cyan border border-gunmetal"></div>
            <span>Scoring (reusable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-amber border border-gunmetal"></div>
            <span>Scoring (once only)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-cyan border-2 border-purple"></div>
            <span>Blocked + Scoring</span>
          </div>
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

        <div className="text-xs text-text-muted space-y-1">
          <div>
            <strong>Instructions:</strong>
          </div>
          <div>
            • <strong>Left-click</strong> with &quot;Set Points&quot; tool to
            add/remove scoring tiles
          </div>
          <div>
            • <strong>Right-click</strong> any tile to toggle blocking (LOS)
          </div>
          <div>
            • <strong>Left-click</strong> with &quot;Toggle Block&quot; tool to
            toggle blocking
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
                    editorState.scoringTiles[row][col] > 0
                      ? `, Score: ${editorState.scoringTiles[row][col]}${
                          editorState.onlyOnceTiles[row][col]
                            ? " (once only)"
                            : " (reusable)"
                        }`
                      : ""
                  }`}
                >
                  {/* Score value display */}
                  {editorState.scoringTiles[row][col] > 0 && (
                    <div
                      className={`flex items-center justify-center text-lg font-bold text-black w-full h-full`}
                    >
                      {editorState.scoringTiles[row][col]}
                    </div>
                  )}
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
        <TransactionButton
          transactionId={`map-${isEditing ? "update" : "create"}-${
            mapId || "new"
          }`}
          contractAddress={mapsContract.address}
          abi={mapsContract.abi}
          functionName={getTransactionData().functionName}
          args={getTransactionData().args}
          onSuccess={handleTransactionSuccess}
          validateBeforeTransaction={validateBeforeTransaction}
          disabled={!canEdit}
          className={`px-4 py-2 rounded-none font-mono ${
            !canEdit
              ? "bg-steel text-text-muted cursor-not-allowed"
              : "border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
          }`}
        >
          {isEditing ? "Update Map" : "Create Map"}
        </TransactionButton>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-steel text-text-primary rounded-none font-mono hover:bg-gunmetal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { type FleetFilters, DEFAULT_FLEET_FILTERS } from "../utils/fleetFilters";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// fleet-selection ship-list filter panel (rarity/cost/equipment filters +
// the accuracy/hull/speed drag-range sliders), ported verbatim from
// Lobbies.tsx. Self-contained: owns its own drag-slider mouse-tracking
// state, only needs `filters`/`onFiltersChange` from the caller.
type SliderField = "minAccuracy" | "maxAccuracy" | "minHull" | "maxHull" | "minSpeed" | "maxSpeed";

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
  onThumbMouseDown: (e: React.MouseEvent, type: SliderField) => void;
  minField: SliderField;
  maxField: SliderField;
}

function RangeSlider({ label, min, max, lowLabel, midLabel, highLabel, onThumbMouseDown, minField, maxField }: RangeSliderProps) {
  return (
    <div>
      <label className="block text-text-muted mb-2 font-medium">
        {label}: {min} - {max}
      </label>
      <div className="range-slider-container">
        <div className="range-slider-track"></div>
        <div
          className="range-slider-fill"
          style={{
            left: `calc(10px + ${(min / 2) * (100 - 4.5)}%)`,
            width: `calc(${((max - min) / 2) * (100 - 4.5)}%)`,
          }}
        ></div>
        <div
          className="range-slider-thumb"
          style={{ left: `calc(10px + ${(min / 2) * (100 - 4.5)}%)` }}
          onMouseDown={(e) => onThumbMouseDown(e, minField)}
        ></div>
        <div
          className="range-slider-thumb"
          style={{ left: `calc(10px + ${(max / 2) * (100 - 4.5)}%)` }}
          onMouseDown={(e) => onThumbMouseDown(e, maxField)}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-text-muted mt-2 px-2">
        <span className="font-medium">{lowLabel}</span>
        <span className="font-medium">{midLabel}</span>
        <span className="font-medium">{highLabel}</span>
      </div>
    </div>
  );
}

interface FleetFilterPanelProps {
  filters: FleetFilters;
  onFiltersChange: (updater: (prev: FleetFilters) => FleetFilters) => void;
  onClose: () => void;
  shownCount: number;
  totalCount: number;
  /** Web3-only "IN-GAME PROPERTIES" toggle slot — no web2 equivalent yet. */
  extraToggle?: React.ReactNode;
}

export function FleetFilterPanel({ filters, onFiltersChange, onClose, shownCount, totalCount, extraToggle }: FleetFilterPanelProps) {
  const [dragging, setDragging] = useState<{
    type: SliderField | null;
    container: HTMLElement | null;
  }>({ type: null, container: null });

  const handleThumbMouseDown = (e: React.MouseEvent, type: SliderField) => {
    e.preventDefault();
    const container = (e.target as HTMLElement).closest(".range-slider-container") as HTMLElement;
    if (!container) return;
    setDragging({ type, container });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.type || !dragging.container) return;

      const rect = dragging.container.getBoundingClientRect();
      const containerWidth = rect.width - 20;
      const halfThumbWidth = 9;
      const availableWidth = containerWidth - halfThumbWidth;
      const relativeX = e.clientX - rect.left - 10;
      const percentage = Math.max(0, Math.min(1, relativeX / availableWidth));
      const newValue = Math.round(percentage * 2);
      const clampedValue = Math.max(0, Math.min(2, newValue));

      const type = dragging.type;
      if (type.includes("min")) {
        const maxType = type.replace("min", "max") as SliderField;
        onFiltersChange((prev) => {
          const maxValue = prev[maxType] as number;
          return clampedValue <= maxValue ? { ...prev, [type]: clampedValue } : prev;
        });
      } else {
        const minType = type.replace("max", "min") as SliderField;
        onFiltersChange((prev) => {
          const minValue = prev[minType] as number;
          return clampedValue >= minValue ? { ...prev, [type]: clampedValue } : prev;
        });
      }
    },
    [dragging, onFiltersChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging({ type: null, container: null });
  }, []);

  useEffect(() => {
    if (dragging.type) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[410]" onClick={onClose}>
      <div
        className="bg-near-black border border-cyan rounded-none p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-cyan">FILTERS</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Rarity Filters */}
          <div>
            <label className="block text-text-muted mb-1">Rarity</label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showCommon}
                  onChange={(e) => onFiltersChange((prev) => ({ ...prev, showCommon: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-text-muted">Common</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showShiny}
                  onChange={(e) => onFiltersChange((prev) => ({ ...prev, showShiny: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-amber">Shiny ★</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showUnavailable}
                  onChange={(e) => onFiltersChange((prev) => ({ ...prev, showUnavailable: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-amber">Show Unavailable</span>
              </label>
            </div>
          </div>

          {/* Threat Range */}
          <div>
            <label className="block text-text-muted mb-1">Threat Range</label>
            <div className="space-y-1">
              <input
                type="number"
                placeholder="Min"
                value={filters.minCost}
                onChange={(e) => onFiltersChange((prev) => ({ ...prev, minCost: parseInt(e.target.value) || 0 }))}
                className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxCost}
                onChange={(e) => onFiltersChange((prev) => ({ ...prev, maxCost: parseInt(e.target.value) || 10000 }))}
                className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
              />
            </div>
          </div>

          {/* Equipment Filters */}
          <div>
            <label className="block text-text-muted mb-1">Equipment</label>
            <div className="space-y-1">
              <select
                value={filters.weaponType}
                onChange={(e) => onFiltersChange((prev) => ({ ...prev, weaponType: e.target.value }))}
                className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
              >
                <option value="all">All Weapons</option>
                <option value="laser">Laser</option>
                <option value="cannon">Cannon</option>
                <option value="plasma">Plasma</option>
                <option value="missile">Missile</option>
              </select>
              <select
                value={filters.defenseType}
                onChange={(e) => onFiltersChange((prev) => ({ ...prev, defenseType: e.target.value }))}
                className="w-full px-2 py-1 bg-black border border-gunmetal rounded-none text-xs"
              >
                <option value="all">All Defense</option>
                <option value="shield">Shields</option>
                <option value="armor">Armor</option>
              </select>
            </div>
          </div>

          <RangeSlider
            label="Accuracy"
            min={filters.minAccuracy}
            max={filters.maxAccuracy}
            lowLabel="Poor (0)"
            midLabel="Average (1)"
            highLabel="Excellent (2)"
            onThumbMouseDown={handleThumbMouseDown}
            minField="minAccuracy"
            maxField="maxAccuracy"
          />
          <RangeSlider
            label="Hull"
            min={filters.minHull}
            max={filters.maxHull}
            lowLabel="Weak (0)"
            midLabel="Standard (1)"
            highLabel="Reinforced (2)"
            onThumbMouseDown={handleThumbMouseDown}
            minField="minHull"
            maxField="maxHull"
          />
          <RangeSlider
            label="Speed"
            min={filters.minSpeed}
            max={filters.maxSpeed}
            lowLabel="Slow (0)"
            midLabel="Normal (1)"
            highLabel="Fast (2)"
            onThumbMouseDown={handleThumbMouseDown}
            minField="minSpeed"
            maxField="maxSpeed"
          />

          {extraToggle && <div className="col-span-2 md:col-span-3">{extraToggle}</div>}
        </div>

        <div className="mt-3 flex justify-between items-center text-xs">
          <span className="text-text-muted">
            Showing {shownCount} of {totalCount} ships
          </span>
          <button
            onClick={() => onFiltersChange(() => DEFAULT_FLEET_FILTERS)}
            className="text-cyan hover:text-cyan/80 underline"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

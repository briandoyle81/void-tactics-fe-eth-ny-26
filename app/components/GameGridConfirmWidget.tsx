"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { Attributes, getMainWeaponName, getSpecialName } from "../types/types";
import { shipHasActivatableSpecial } from "../utils/specialConfigWeb2";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { STYLE_LABEL } from "../styles/fontStyles";
import { useFactionAbilityIsHeal } from "../hooks/useFactionAbilityIsHeal";
import { canOfferFactionAbility } from "./GameGridWeaponSelector";
import type { ConfirmWidgetAnchor } from "../utils/gameGridRanges";

interface GameGridConfirmWidgetProps {
  confirmWidgetAnchor: NonNullable<ConfirmWidgetAnchor>;
  confirmWidgetLabel: string;
  onConfirmMove: () => void;
  onCancelMove: () => void;
  /** When provided, replaces the default confirm button (e.g. pass a TransactionButton). */
  confirmButton?: React.ReactNode;
  selectedShipId: number | null;
  shipMap: Map<number, GridShip>;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  targetShipId: number | null;
  isRammingMovePreview: boolean;
  /** Non-null (== selectedShipId) whenever the selection is in retreat mode
   * — see GameGridWeaponSelector.tsx's matching prop. */
  retreatPrepShipId?: number | null;
  isFactionAbilitySupported?: boolean;
  factionAbilityRange?: number;
  previewPosition?: { row: number; col: number } | null;
  movementRange: readonly { row: number; col: number }[];
  grid: (GridShipPosition | null)[][];
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  getShipAttributes: (shipId: number) => Attributes | null;
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setTargetShipId: (id: number | null) => void;
  clipRootRef?: React.RefObject<HTMLDivElement | null>;
  zoomScale?: number;
  onMoveVertical: (side: "above" | "below") => void;
}

export function GameGridConfirmWidget({
  confirmWidgetAnchor,
  confirmWidgetLabel,
  onConfirmMove,
  onCancelMove,
  confirmButton,
  selectedShipId,
  shipMap,
  selectedWeaponType,
  specialType,
  targetShipId: _targetShipId,
  isRammingMovePreview,
  retreatPrepShipId = null,
  isFactionAbilitySupported = false,
  factionAbilityRange,
  previewPosition = null,
  movementRange,
  grid,
  isShipOwnedByCurrentPlayer,
  getShipAttributes,
  setSelectedWeaponType,
  setTargetShipId,
  clipRootRef,
  zoomScale = 1,
  onMoveVertical,
}: GameGridConfirmWidgetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [clamp, setClamp] = useState({ x: 0, y: 0 });
  const [fits, setFits] = useState({
    above: confirmWidgetAnchor.destRow > 0,
    below: confirmWidgetAnchor.destRow < 10,
  });

  useLayoutEffect(() => {
    const widget = rootRef.current;
    if (!widget) return;
    const wRect = widget.getBoundingClientRect();
    const scale = zoomScale > 0 ? zoomScale : 1;
    const unclamped = {
      left: wRect.left - clamp.x * scale,
      right: wRect.right - clamp.x * scale,
      top: wRect.top - clamp.y * scale,
      bottom: wRect.bottom - clamp.y * scale,
      height: wRect.height,
      width: wRect.width,
    };
    const clipEl = clipRootRef?.current;
    const clipRect = clipEl?.getBoundingClientRect();
    const pad = 4;
    const view = {
      left: Math.max(clipRect?.left ?? 0, 0) + pad,
      top: Math.max(clipRect?.top ?? 0, 0) + pad,
      right: Math.min(clipRect?.right ?? window.innerWidth, window.innerWidth) - pad,
      bottom: Math.min(clipRect?.bottom ?? window.innerHeight, window.innerHeight) - pad,
    };

    const gridInner = widget.closest("[data-grid-inner]");
    const cell = gridInner?.querySelector(
      `[data-grid-row="${confirmWidgetAnchor.destRow}"][data-grid-col="${confirmWidgetAnchor.destCol}"]`,
    ) as HTMLElement | null;
    const nextFits = cell
      ? (() => {
          const cRect = cell.getBoundingClientRect();
          const gap = 3;
          return {
            above: cRect.top - gap - unclamped.height >= view.top,
            below: cRect.bottom + gap + unclamped.height <= view.bottom,
          };
        })()
      : {
          above: confirmWidgetAnchor.destRow > 0,
          below: confirmWidgetAnchor.destRow < 10,
        };
    setFits((prev) =>
      prev.above === nextFits.above && prev.below === nextFits.below
        ? prev
        : nextFits,
    );

    let dx = 0;
    let dy = 0;
    if (unclamped.left < view.left) dx += view.left - unclamped.left;
    if (unclamped.right + dx > view.right) dx -= unclamped.right + dx - view.right;
    if (unclamped.top < view.top) dy += view.top - unclamped.top;
    if (unclamped.bottom + dy > view.bottom) dy -= unclamped.bottom + dy - view.bottom;
    const localX = dx / scale;
    const localY = dy / scale;
    setClamp((prev) =>
      prev.x === localX && prev.y === localY ? prev : { x: localX, y: localY },
    );
  }, [
    clamp.x,
    clamp.y,
    clipRootRef,
    confirmWidgetAnchor.destCol,
    confirmWidgetAnchor.destRow,
    confirmWidgetAnchor.left,
    confirmWidgetAnchor.side,
    confirmWidgetAnchor.top,
    confirmWidgetAnchor.transform,
    zoomScale,
  ]);

  const currentShip = selectedShipId != null ? shipMap.get(selectedShipId) : null;
  const { isHeal: currentShipFactionAbilityIsHeal } = useFactionAbilityIsHeal(
    currentShip?.traits.variant,
  );

  const embeddedWeaponSelector = (() => {
    if (isRammingMovePreview) return null;
    const ship = selectedShipId ? shipMap.get(selectedShipId) : null;
    if (!ship) return null;
    // A ship in retreat mode (forced for 0hp, or voluntarily toggled) can
    // only submit Retreat this turn — see GameGridWeaponSelector.tsx's
    // matching guard.
    if (retreatPrepShipId != null) {
      return null;
    }
    const hasSpecial = shipHasActivatableSpecial(ship);
    const hasLegacyRamTarget = movementRange.some(({ row: r, col: c }) => {
      const cell = grid[r]?.[c];
      if (!cell || cell.isPreview) return false;
      if (isShipOwnedByCurrentPlayer(cell.shipId)) return false;
      return (getShipAttributes(cell.shipId)?.hullPoints ?? 1) === 0;
    });
    const hasFactionAbilityTarget = canOfferFactionAbility({
      isFactionAbilitySupported,
      factionAbilityIsHeal: currentShipFactionAbilityIsHeal,
      factionAbilityRange,
      origins: previewPosition ? [previewPosition] : [...movementRange],
      grid,
      isShipOwnedByCurrentPlayer,
      getShipAttributes,
    });
    const showFactionAbility = hasFactionAbilityTarget || (
      !isFactionAbilitySupported && hasLegacyRamTarget
    );
    const weapons: { value: "weapon" | "special" | "ram"; label: string }[] = [
      ...(showFactionAbility
        ? [{ value: "ram" as const, label: currentShipFactionAbilityIsHeal ? "REPAIR" : "RAM" }]
        : []),
      { value: "weapon", label: getMainWeaponName(ship.equipment.mainWeapon, ship.traits.variant) },
      ...(hasSpecial ? [{ value: "special" as const, label: getSpecialName(ship.equipment.special, ship.traits.variant) }] : []),
    ];
    return (
      <div className="flex border-b" style={{ borderColor: "var(--color-gunmetal)" }}>
        {weapons.map(({ value, label }) => {
          const isActive = selectedWeaponType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSelectedWeaponType(value);
                if (value === "special" && specialType === 3) {
                  setTargetShipId(0);
                } else if (selectedWeaponType === "special" && specialType === 3) {
                  setTargetShipId(null);
                }
              }}
              className="flex-1 px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors duration-100"
              style={{
                ...STYLE_LABEL,
                color: isActive ? "var(--color-cyan)" : "var(--color-text-muted)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-cyan) 14%, transparent)"
                  : "transparent",
                borderRight:
                  value !== weapons[weapons.length - 1].value
                    ? "1px solid var(--color-gunmetal)"
                    : "none",
                borderRadius: 0,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  })();

  const flipTo: "above" | "below" =
    confirmWidgetAnchor.side === "above" ? "below" : "above";
  const canFlip = flipTo === "above" ? fits.above : fits.below;
  const clampTransform =
    clamp.x !== 0 || clamp.y !== 0
      ? ` translate(${clamp.x}px, ${clamp.y}px)`
      : "";

  return (
    <div
      ref={rootRef}
      className="absolute z-[195] pointer-events-auto"
      style={{
        left: confirmWidgetAnchor.left,
        top: confirmWidgetAnchor.top,
        transform: `${confirmWidgetAnchor.transform}${clampTransform}`,
        filter:
          "drop-shadow(0 4px 14px color-mix(in srgb, var(--color-phosphor-green) 35%, transparent))",
      }}
    >
      <div className="flex">
        <button
          type="button"
          aria-label={flipTo === "above" ? "Move submit above" : "Move submit below"}
          title={flipTo === "above" ? "Move above" : "Move below"}
          disabled={!canFlip}
          onClick={() => {
            if (!canFlip) return;
            onMoveVertical(flipTo);
          }}
          className="flex w-6 shrink-0 items-center justify-center text-[10px] transition-colors duration-100"
          style={{
            ...STYLE_LABEL,
            color: canFlip ? "var(--color-cyan)" : "var(--color-text-muted)",
            backgroundColor: "var(--color-near-black)",
            border: "2px solid var(--color-gunmetal)",
            borderRight: "none",
            borderTopColor: "var(--color-steel)",
            borderLeftColor: "var(--color-steel)",
            borderRadius: 0,
            opacity: canFlip ? 1 : 0.4,
            cursor: canFlip ? "pointer" : "not-allowed",
            clipPath:
              "polygon(0 calc(10px + 1.5rem), 100% 10px, 100% 100%, 0 100%)",
            paddingTop: "calc(10px + 0.75rem)",
          }}
        >
          {flipTo === "above" ? "▲" : "▼"}
        </button>
      <div
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
          border: "2px solid var(--color-gunmetal)",
          borderTopColor: "var(--color-cyan)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
          clipPath:
            "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
          minWidth: "7.5rem",
        }}
      >
        {embeddedWeaponSelector}
        <div className="flex">
          {confirmButton ?? (
            <button
              type="button"
              onClick={onConfirmMove}
              className="flex-[2] px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors duration-100"
              style={{
                ...STYLE_LABEL,
                color: "var(--color-phosphor-green)",
                backgroundColor:
                  "color-mix(in srgb, var(--color-phosphor-green) 10%, transparent)",
                borderRight: "1px solid var(--color-gunmetal)",
                borderRadius: 0,
                letterSpacing: "0.14em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--color-phosphor-green) 22%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--color-phosphor-green) 10%, transparent)";
              }}
            >
              {confirmWidgetLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancelMove}
            className="px-3 py-2 text-sm font-bold transition-colors duration-100"
            style={{
              ...STYLE_LABEL,
              color: "var(--color-text-muted)",
              backgroundColor: "transparent",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-warning-red)";
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--color-warning-red) 12%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ✕
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

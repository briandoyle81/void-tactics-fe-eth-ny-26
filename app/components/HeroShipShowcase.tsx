"use client";

import React, { useEffect, useMemo, useState } from "react";
import { renderShip } from "../utils/shipRenderer";
import { Ship, Attributes } from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";
import { SHIP_IMAGE_RANK_STAR_BOX } from "./ShipImage";
import {
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";

// Random ship names for hero showcase
const SHIP_NAMES = [
  "Vanguard",
  "Nexus",
  "Aurora",
  "Stellar",
  "Quantum",
  "Nebula",
  "Eclipse",
  "Horizon",
  "Vortex",
  "Titan",
  "Phoenix",
  "Apex",
  "Nova",
  "Catalyst",
  "Odyssey",
  "Spectre",
  "Raven",
  "Falcon",
  "Viper",
  "Cobra",
  "Thunder",
  "Storm",
  "Tempest",
  "Blade",
  "Saber",
  "Reaper",
  "Wraith",
  "Phantom",
  "Shadow",
  "Ghost",
  "Hunter",
  "Predator",
  "Scorpion",
  "Vulture",
  "Hawk",
  "Eagle",
  "Dragon",
  "Wyvern",
  "Leviathan",
  "Kraken",
  "Behemoth",
  "Colossus",
  "Goliath",
  "Atlas",
  "Hercules",
  "Zeus",
  "Ares",
  "Apollo",
  "Artemis",
  "Athena",
];

import { calculateAttributesFromContracts } from "../utils/shipAttributesCalculator";

// Generate a random ship
function generateRandomShip(index: number): Ship {
  const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];

  // Every 5th ship gets rank 3-5
  let shipsDestroyed = Math.floor(Math.random() * 10); // Default rank 1
  if (index % 5 === 0) {
    const rank = Math.floor(Math.random() * 3) + 3; // Rank 3, 4, or 5
    if (rank === 3) {
      shipsDestroyed = Math.floor(Math.random() * 70) + 30; // 30-99
    } else if (rank === 4) {
      shipsDestroyed = Math.floor(Math.random() * 200) + 100; // 100-299
    } else {
      shipsDestroyed = Math.floor(Math.random() * 700) + 300; // 300-999
    }
  }

  // Random equipment
  const mainWeapon = Math.floor(Math.random() * 4);
  const armor = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
  const shields =
    armor === 0
      ? Math.random() > 0.5
        ? Math.floor(Math.random() * 3) + 1
        : 0
      : 0;
  const special = Math.floor(Math.random() * 4);

  // Random traits
  const accuracy = Math.floor(Math.random() * 3);
  const hull = Math.floor(Math.random() * 3);
  const speed = Math.floor(Math.random() * 3);
  const variant = Math.floor(Math.random() * 10);

  // Random colors
  const h1 = Math.floor(Math.random() * 360);
  const s1 = Math.floor(Math.random() * 100);
  const l1 = Math.floor(Math.random() * 100);
  const h2 = Math.floor(Math.random() * 360);
  const s2 = Math.floor(Math.random() * 100);
  const l2 = Math.floor(Math.random() * 100);

  // 20% chance of being shiny
  const shiny = Math.random() < 0.2;

  return {
    name,
    id: Number(index),
    equipment: {
      mainWeapon,
      armor,
      shields,
      special,
    },
    traits: {
      serialNumber: Number(index),
      colors: {
        h1,
        s1,
        l1,
        h2,
        s2,
        l2,
      },
      variant,
      accuracy,
      hull,
      speed,
    },
    shipData: {
      shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: Number(0),
      modifiedCount: 0,
      isFree: false,
    },
    owner: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };
}

type HeroShipShowcaseAlign = "start" | "center" | "end";

export const HeroShipShowcase: React.FC<{
  seedOffset?: number;
  intervalMs?: number;
  align?: HeroShipShowcaseAlign;
  side?: "allied" | "enemy";
  flipLayout?: boolean;
}> = ({
  seedOffset = 0,
  intervalMs = 10000,
  align = "end",
  side = "allied",
  flipLayout = false,
}) => {
  // Rotate ships every N milliseconds
  const [shipIndex, setShipIndex] = useState(seedOffset);

  useEffect(() => {
    const interval = setInterval(() => {
      setShipIndex((prev) => prev + 1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  // Generate current hero ship
  const heroShip = useMemo(() => generateRandomShip(shipIndex), [shipIndex]);

  // Calculate attributes for the ship
  const shipAttributes = useMemo<Attributes>(
    () => calculateAttributesFromContracts(heroShip),
    [heroShip],
  );

  // Calculate ship rank
  const shipRank = useMemo(() => calculateShipRank(heroShip), [heroShip]);

  // Render the hero ship
  const heroShipImage = useMemo(() => {
    try {
      return renderShip(heroShip);
    } catch (error) {
      console.error("Error rendering hero ship:", error);
      return null;
    }
  }, [heroShip]);

  const gridPlacementClass =
    align === "center"
      ? "mx-auto max-w-3xl"
      : align === "end"
        ? "ml-auto max-w-3xl"
        : "";

  const accent = side === "enemy" ? "var(--color-warning-red)" : "var(--color-cyan)";
  const accentBorderClass = side === "enemy" ? "border-warning-red" : "border-cyan";
  const accentTextClass = side === "enemy" ? "text-warning-red" : "text-cyan";
  const accentSoftBorderClass =
    side === "enemy" ? "border-warning-red/30" : "border-cyan/30";
  const accentDividerClass =
    side === "enemy" ? "border-warning-red/20" : "border-cyan/20";
  const accentGlow = side === "enemy" ? "rgba(255, 77, 77, 0.4)" : "rgba(86, 214, 255, 0.4)";
  const accentInset = side === "enemy" ? "rgba(255, 77, 77, 0.1)" : "rgba(86, 214, 255, 0.1)";
  const flipSprite = side === "allied";


  /** Narrow stats column, wider art (~36% / ~64%). Flip column fr order when art is on the left. */
  const intelGridCols = flipLayout
    ? "grid-cols-[minmax(0,3.5fr)_minmax(0,2fr)]"
    : "grid-cols-[minmax(0,2fr)_minmax(0,3.5fr)]";

  return (
    <div
      className={`grid w-full min-w-0 items-stretch gap-2 sm:gap-3 ${intelGridCols} ${gridPlacementClass}`}
    >
      {/* Stats panel (left when not flipLayout; right when enemy flipLayout) */}
      <div
        className={`flex min-w-0 max-w-full flex-col ${flipLayout ? "order-2" : "order-1"}`}
      >
        <div
          className={`corner-bracket flex h-full min-w-0 flex-col gap-2 border-2 ${accentBorderClass} bg-black/60 p-2 sm:gap-3 sm:p-3 md:p-4`}
          style={{
            borderRadius: 0,
            "--bracket-color": accent,
          } as React.CSSProperties}
        >
          {/* Ship name */}
          <div className="mb-1.5 md:mb-2">
            <h3
              className="truncate text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl"
              style={{
                fontFamily:
                  "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: accent,
              }}
            >
              {heroShip.name}
            </h3>
          </div>

          {/* Equipment */}
          <div
            className={`mb-1.5 border-b pb-1.5 md:mb-2 md:pb-2 ${accentDividerClass}`}
            style={{
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <div className="space-y-0.5 text-xs leading-tight sm:text-sm md:text-base">
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 opacity-60">Weapon:</span>
                <span className={`min-w-0 truncate text-right ${accentTextClass}`}>
                  {getMainWeaponName(heroShip.equipment.mainWeapon)}
                </span>
              </div>
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 opacity-60">
                  {heroShip.equipment.shields > 0 ? "Shields:" : "Armor:"}
                </span>
                <span className={`min-w-0 truncate text-right ${accentTextClass}`}>
                  {heroShip.equipment.armor > 0
                    ? getArmorName(heroShip.equipment.armor)
                    : heroShip.equipment.shields > 0
                      ? getShieldName(heroShip.equipment.shields)
                      : "None"}
                </span>
              </div>
              <div className="flex min-w-0 justify-between gap-2">
                <span className="shrink-0 opacity-60">Special:</span>
                <span className={`min-w-0 truncate text-right ${accentTextClass}`}>
                  {heroShip.equipment.special > 0
                    ? getSpecialName(heroShip.equipment.special)
                    : "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Combat stats */}
          <div className="space-y-0">
            <div className="data-readout">
              <span className="data-readout-label">Range</span>
              <span className="font-bold text-phosphor-green font-mono text-xs">
                {shipAttributes.range}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Damage</span>
              <span className="font-bold text-warning-red font-mono text-xs">
                {shipAttributes.gunDamage}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Hull</span>
              <span className="font-bold text-amber font-mono text-xs">
                {shipAttributes.hullPoints}/{shipAttributes.maxHullPoints}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Move</span>
              <span className={`font-bold font-mono text-xs ${side === "enemy" ? "text-warning-red" : "text-cyan"}`}>
                {shipAttributes.movement}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Defense</span>
              <span className="font-bold text-amber font-mono text-xs">
                {shipAttributes.damageReduction}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ship art: wider column; square uses full column width (taller than stats when art is large) */}
      <div
        className={`flex min-h-0 min-w-0 flex-col items-start justify-center ${flipLayout ? "order-1" : "order-2"}`}
      >
        {heroShipImage ? (
          <div
            className={`corner-bracket relative flex aspect-square w-full max-w-full items-center justify-center border-2 bg-black/40 p-1.5 sm:p-2 md:p-4 ${accentSoftBorderClass}`}
            style={{
              borderRadius: 0,
              "--bracket-color": accent,
            } as React.CSSProperties}
          >
            {/* Flip wrapper matches ShipCard tooltip: art + rank stars + glow mirror together */}
            <div
              className="relative h-full w-full min-h-0 flex-1 [container-type:size]"
              style={flipSprite ? { transform: "scaleX(-1)" } : undefined}
            >
              <img
                src={heroShipImage}
                alt={heroShip.name}
                className="h-full w-full object-contain"
                style={{
                  imageRendering: "pixelated",
                  filter: `drop-shadow(0 0 20px ${accentGlow})`,
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                  boxShadow: `inset 0 0 60px ${accentInset}`,
                }}
              />
              {heroShip.shipData.constructed && (
                <div
                  className="pointer-events-none absolute right-[2.5%] top-[5%] z-10 leading-none text-amber"
                  style={{
                    fontSize: SHIP_IMAGE_RANK_STAR_BOX,
                  }}
                  role="img"
                  aria-label={`Combat rank ${shipRank.rank} of 6`}
                >
                  {Array.from({ length: shipRank.rank }, (_, i) => (
                    <span key={i} aria-hidden>
                      ⭐
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`corner-bracket flex aspect-square w-full max-w-full items-center justify-center border-2 bg-black/40 ${accentSoftBorderClass}`}
            style={{
              borderRadius: 0,
              "--bracket-color": accent,
            } as React.CSSProperties}
          >
            <p
              className="text-sm opacity-50 sm:text-base md:text-lg"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-text-muted)",
              }}
            >
              Loading ship...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


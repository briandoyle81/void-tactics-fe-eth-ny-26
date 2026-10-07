"use client";

import { useCallback } from "react";
import ManageNavy from "../ManageNavy";
import ManageNavyWeb2 from "../ManageNavyWeb2";
import DroneStorefront from "../DroneStorefront";
import DroneStorefrontWeb2 from "../DroneStorefrontWeb2";
import { FreeShipsCard } from "../FreeShipsCard";
import { SubTabs } from "../SubTabs";
import { LoadoutsWeb3 } from "./LoadoutsWeb3";
import { LoadoutsWeb2 } from "./LoadoutsWeb2";
import { useAppMode } from "../../hooks/useAppMode";

// The Fleet tab (hangar): the ship collection, saved loadouts, and
// Progression — the Drone Core ladder that permanently adds free ships to
// every claim (also sold in Store › Drone Cores).

export type FleetSection = "ships" | "loadouts" | "progression";

export const FLEET_SECTIONS: readonly FleetSection[] = ["ships", "loadouts", "progression"];

const SECTION_LABELS: Record<FleetSection, string> = {
  ships: "Ships",
  loadouts: "Loadouts",
  progression: "Progression",
};

export function FleetHangar({
  section,
  onSection,
}: {
  section: FleetSection;
  onSection: (section: FleetSection) => void;
}) {
  const isWeb2 = useAppMode() === "web2";
  const openShips = useCallback(() => onSection("ships"), [onSection]);

  return (
    <div className="w-full">
      <SubTabs
        label="Fleet sections"
        tabs={FLEET_SECTIONS.map((id) => ({ id, label: SECTION_LABELS[id] }))}
        active={section}
        onSelect={onSection}
      />
      {section === "ships" && (isWeb2 ? <ManageNavyWeb2 /> : <ManageNavy />)}
      {section === "loadouts" &&
        (isWeb2 ? <LoadoutsWeb2 onOpenShips={openShips} /> : <LoadoutsWeb3 onOpenShips={openShips} />)}
      {section === "progression" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Drone Core ladder">
            <h3
              className="mb-3 text-xl font-bold uppercase tracking-wider text-cyan"
              style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
            >
              Drone Core ladder
            </h3>
            {isWeb2 ? <DroneStorefrontWeb2 /> : <DroneStorefront />}
          </section>
          <FreeShipsCard />
        </div>
      )}
    </div>
  );
}

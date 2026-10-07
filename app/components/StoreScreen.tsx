"use client";

import Store from "./Store";
import StoreWeb2 from "./StoreWeb2";
import UTCPurchasePanel from "./UTCPurchasePanel";
import UTCPurchasePanelWeb2 from "./UTCPurchasePanelWeb2";
import DroneStorefront from "./DroneStorefront";
import DroneStorefrontWeb2 from "./DroneStorefrontWeb2";
import { UtcLotteryPanel } from "./UtcLotteryPanel";
import { SubTabs } from "./SubTabs";
import { useAppMode } from "../hooks/useAppMode";

// The Store: what you're buying, by sub-tab. Payment is chosen at checkout
// (ship packs) or by the item itself (credits, cores). The HUD's + buttons
// open the matching sub-tab.

export type StoreSection = "packs" | "credits" | "cores" | "lottery";

export const STORE_SECTIONS: readonly StoreSection[] = ["packs", "credits", "cores", "lottery"];

const SECTION_LABELS: Record<StoreSection, string> = {
  packs: "Ship packs",
  credits: "Credits (UTC)",
  cores: "Drone Cores",
  lottery: "Lottery",
};

export function StoreScreen({
  section,
  onSection,
}: {
  section: StoreSection;
  onSection: (section: StoreSection) => void;
}) {
  const isWeb2 = useAppMode() === "web2";
  // The UTC lottery is a Uniswap pool hook — wallet players only.
  const sections = STORE_SECTIONS.filter((s) => !(isWeb2 && s === "lottery"));
  const active = sections.includes(section) ? section : "packs";

  return (
    <div className="w-full">
      <SubTabs
        label="Store sections"
        tabs={sections.map((id) => ({ id, label: SECTION_LABELS[id] }))}
        active={active}
        onSelect={onSection}
      />
      {active === "packs" && (isWeb2 ? <StoreWeb2 /> : <Store />)}
      {active === "credits" && (isWeb2 ? <UTCPurchasePanelWeb2 /> : <UTCPurchasePanel />)}
      {active === "cores" && (isWeb2 ? <DroneStorefrontWeb2 /> : <DroneStorefront />)}
      {active === "lottery" && <UtcLotteryPanel />}
    </div>
  );
}

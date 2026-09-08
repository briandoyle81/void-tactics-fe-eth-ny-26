import type { Web2Ship } from "../types/web2Ship";
import { calculateTutorialThreatPoints } from "./tutorialShipBuilder";
import { ARCHETYPE_LABEL } from "./aiShipConfig";
import type { Archetype } from "../types/types";

export interface AIShipConfigWeb2 {
  id: number;
  name: string;
  equipment: { mainWeapon: number; armor: number; shields: number; special: number };
  traits: {
    serialNumber: number;
    colors: { h1: number; s1: number; l1: number; h2: number; s2: number; l2: number };
    variant: number;
    accuracy: number;
    hull: number;
    speed: number;
  };
  archetype: Archetype;
}

// Web2 counterpart to aiShipConfig.ts's aiConfigToPreviewShip — same
// inert-placeholder-fields approach for a config that has no materialized
// ship yet, but for AIShipConfigWeb2 instead of web3's AIShipConfig. Their
// equipment/traits shapes are already identical (web2 ships never had the
// h3/s3/l3 color channels web3's richer Colors type carries), so this needs
// no field-picking adapter, unlike the web3 version.
export function aiConfigToPreviewShipWeb2(config: AIShipConfigWeb2, idOverride?: number): Web2Ship {
  return {
    name: config.name || ARCHETYPE_LABEL[config.archetype],
    id: idOverride ?? config.id,
    equipment: config.equipment,
    traits: config.traits,
    shipData: {
      shipsDestroyed: 0,
      costsVersion: 0,
      // Same threat/cost formula as real player ships and web3's AI preview
      // ships (calculateTutorialThreatPoints is chain-agnostic — plain
      // equipment/traits in, a number out).
      cost: calculateTutorialThreatPoints(config.equipment, {
        accuracy: config.traits.accuracy,
        hull: config.traits.hull,
        speed: config.traits.speed,
      }),
      shiny: false,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0,
      modifiedCount: 0,
      isFree: false,
    },
    owner: "ai-player-void-tactics",
  };
}

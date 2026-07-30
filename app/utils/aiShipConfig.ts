import { Archetype, type AIShipConfig, type Ship } from "../types/types";
import { calculateTutorialThreatPoints } from "./tutorialShipBuilder";

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  [Archetype.Grunt]: "Grunt",
  [Archetype.Aggressor]: "Aggressor",
  [Archetype.Sniper]: "Sniper",
  [Archetype.Support]: "Support",
  [Archetype.Turtle]: "Turtle",
  [Archetype.Rammer]: "Rammer",
};

// AI encounters only have an AIShipConfig (archetype template), not a
// materialized on-chain ship — there's no owner/shipData to render with
// (real AI ship instances only exist once a match actually starts, via
// ShipsRouter). ShipImage just needs equipment/traits/colors to paint the
// art, so this fills in inert placeholders for the fields that don't apply
// to a template. `idOverride` lets callers that mix these into a list of
// real player ships (e.g. NodeMatchModal's deployment map) avoid id
// collisions between AIShipConfig ids and the player's own ship ids —
// callers that never mix the two (e.g. CampaignNodePreview's fleet-preview
// grid) can omit it and use the config id as-is.
export function aiConfigToPreviewShip(config: AIShipConfig, idOverride?: bigint): Ship {
  return {
    name: config.name || ARCHETYPE_LABEL[config.archetype],
    id: idOverride ?? config.id,
    equipment: config.equipment,
    traits: {
      serialNumber: config.traits.serialNumber,
      colors: {
        h1: config.traits.colors.h1,
        s1: config.traits.colors.s1,
        l1: config.traits.colors.l1,
        h2: config.traits.colors.h2,
        s2: config.traits.colors.s2,
        l2: config.traits.colors.l2,
      },
      variant: config.traits.variant,
      accuracy: config.traits.accuracy,
      hull: config.traits.hull,
      speed: config.traits.speed,
    },
    shipData: {
      shipsDestroyed: 0,
      costsVersion: 0,
      // Same threat/cost formula as real player ships (ShipAttributes.calculateShipCost) —
      // AI ships never construct on-chain, so there's no stored cost to read.
      cost: calculateTutorialThreatPoints(config.equipment, {
        accuracy: config.traits.accuracy,
        hull: config.traits.hull,
        speed: config.traits.speed,
      }),
      shiny: false,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0n,
    },
    owner: "0x0000000000000000000000000000000000000000",
  };
}

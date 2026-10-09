// Fleet tab sub-sections, kept apart from FleetHangar so the client can
// read them without loading the hangar (it's lazy-loaded).
export type FleetSection = "ships" | "loadouts" | "progression";

export const FLEET_SECTIONS: readonly FleetSection[] = ["ships", "loadouts", "progression"];

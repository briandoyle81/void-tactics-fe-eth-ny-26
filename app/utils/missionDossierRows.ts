import type { MissionDossierRow } from "../components/MissionDossier";
import { formatDec } from "./formatDec";
import { getFactionName } from "../config/factions";

// Dossier rows for MissionNodePanel, shared by the web3 and web2 previews.
// Number-native: callers convert bigint node fields before calling. Enemy
// size/threat isn't a row — MissionDossier's force bars show it.

interface CombatFields {
  maxScore: number;
  /** The player is always the creator side in single-player. */
  creatorGoesFirst: boolean;
}

function combatRows(f: CombatFields): MissionDossierRow[] {
  return [
    { label: "Objective", value: `Score ${f.maxScore} VP or destroy the enemy fleet` },
    { label: "Initiative", value: f.creatorGoesFirst ? "You move first" : "Enemy moves first" },
  ];
}

/**
 * A roguelike node's assigned win effects with their current global values;
 * a field is null when the node doesn't have that effect.
 */
export interface RoguelikeVictoryEffects {
  healAboveFloorPercent: number | null;
  decBonus: number | null;
  shipGrant: { variant: number; tier: number } | null;
}

export const NO_VICTORY_EFFECTS: RoguelikeVictoryEffects = {
  healAboveFloorPercent: null,
  decBonus: null,
  shipGrant: null,
};

export function roguelikeCombatDossierRows(
  f: CombatFields & {
    autoHealPercent: number;
    victoryEffects: RoguelikeVictoryEffects;
    isCleared: boolean;
  },
): MissionDossierRow[] {
  const rows = combatRows(f);
  // Auto-heal and Heal Above Floor are both "raise to at least N% of max"
  // floors, applied one after the other, so the higher one is what you get.
  const healFloor = Math.max(f.autoHealPercent, f.victoryEffects.healAboveFloorPercent ?? 0);
  if (healFloor > 0) {
    rows.push({ label: "On victory", value: `Hulls patched to at least ${healFloor}%`, tone: "good" });
  }
  if (f.victoryEffects.decBonus != null && f.victoryEffects.decBonus > 0) {
    rows.push({ label: "Reward", value: `+${formatDec(f.victoryEffects.decBonus)} DEC`, tone: "good" });
  }
  if (f.victoryEffects.shipGrant) {
    const { variant, tier } = f.victoryEffects.shipGrant;
    rows.push({ label: "Reward", value: `New ship: ${getFactionName(variant)}, tier ${tier}`, tone: "good" });
  }
  rows.push({ label: "Stakes", value: "Defeat or retreat ends the run", tone: "warning" });
  if (f.isCleared) rows.push({ label: "Status", value: "Cleared", tone: "good" });
  return rows;
}

export function roguelikeResupplyDossierRows(f: { costCapOverride: number }): MissionDossierRow[] {
  const rows: MissionDossierRow[] = [
    { label: "Objective", value: "Resupply: repair hulls and adjust your roster" },
  ];
  if (f.costCapOverride > 0) {
    rows.push({ label: "New cost cap", value: String(f.costCapOverride) });
  }
  return rows;
}

export function campaignDossierRows(
  f: CombatFields & { requiredVariant: number; unlocked: boolean; completed: boolean },
): MissionDossierRow[] {
  const rows = combatRows(f);
  if (f.requiredVariant > 0) rows.push({ label: "Fleet", value: `${getFactionName(f.requiredVariant)} only` });
  if (f.completed) rows.push({ label: "Status", value: "Completed", tone: "good" });
  else if (!f.unlocked) rows.push({ label: "Status", value: "Locked", tone: "warning" });
  return rows;
}

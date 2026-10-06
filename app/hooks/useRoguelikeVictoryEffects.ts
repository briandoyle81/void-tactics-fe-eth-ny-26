"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import {
  useDECBonusAmount,
  useHealAboveFloorPercent,
  useRoguelikeNodeWinEffects,
  useShipGrantConfig,
  useWinEffectAddresses,
} from "./useWinEffects";
import {
  NO_VICTORY_EFFECTS,
  type RoguelikeVictoryEffects,
} from "../utils/missionDossierRows";

/** Web3: a roguelike node's win effects with their current on-chain values. */
export function useRoguelikeVictoryEffects(nodeId: bigint | undefined): RoguelikeVictoryEffects {
  const { data: effectAddresses } = useRoguelikeNodeWinEffects(nodeId);
  const addressByKey = useWinEffectAddresses();
  const { data: decBonus } = useDECBonusAmount();
  const { data: healToPercent } = useHealAboveFloorPercent();
  const shipGrant = useShipGrantConfig();

  return useMemo(() => {
    if (!effectAddresses || effectAddresses.length === 0) return NO_VICTORY_EFFECTS;
    const assigned = new Set(effectAddresses.map((a) => a.toLowerCase()));
    const has = (key: string) => !!addressByKey[key] && assigned.has(addressByKey[key].toLowerCase());
    return {
      healAboveFloorPercent:
        has("HEAL_ABOVE_FLOOR_WIN_EFFECT") && healToPercent != null ? Number(healToPercent) : null,
      decBonus: has("DEC_BONUS_WIN_EFFECT") && decBonus != null ? Number(decBonus) : null,
      shipGrant:
        has("SHIP_GRANT_WIN_EFFECT") && shipGrant.variant != null && shipGrant.tier != null
          ? { variant: Number(shipGrant.variant), tier: Number(shipGrant.tier) }
          : null,
    };
  }, [effectAddresses, addressByKey, decBonus, healToPercent, shipGrant.variant, shipGrant.tier]);
}

interface PublicWinEffectsSettings {
  decBonusAmount: number;
  healAboveFloorPercent: number;
  shipGrantVariant: number;
  shipGrantTier: number;
}

/** Web2: a roguelike node's win effects (keys from RoguelikeNode.winEffects) with current values. */
export function useRoguelikeVictoryEffectsWeb2(
  winEffects: readonly string[] | undefined,
): RoguelikeVictoryEffects {
  const hasAny = !!winEffects && winEffects.length > 0;
  const { data: settings } = useQuery({
    queryKey: ["win-effects-settings", "public"],
    queryFn: () => apiFetch<PublicWinEffectsSettings>("/api/win-effects-settings"),
    enabled: hasAny,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!hasAny || !settings) return NO_VICTORY_EFFECTS;
    return {
      healAboveFloorPercent: winEffects!.includes("HEAL_ABOVE_FLOOR_WIN_EFFECT")
        ? settings.healAboveFloorPercent
        : null,
      decBonus: winEffects!.includes("DEC_BONUS_WIN_EFFECT") ? settings.decBonusAmount : null,
      shipGrant: winEffects!.includes("SHIP_GRANT_WIN_EFFECT")
        ? { variant: settings.shipGrantVariant, tier: settings.shipGrantTier }
        : null,
    };
  }, [hasAny, settings, winEffects]);
}

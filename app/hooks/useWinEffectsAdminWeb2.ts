"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { WinEffectsSettings } from "../lib/winEffectsWeb2";

// Web2 counterpart to useWinEffects.ts/useWinEffectsAdmin.ts — Prisma-backed
// reads/writes against /api/admin/win-effects-settings instead of the
// Game/PvPMatch/Tournament/DECBonusWinEffect/ShipGrantWinEffect contract
// calls. One settings object backs all three admin surfaces
// (GameAdminPanelWeb2, PvPMatchAdminPanelWeb2, TournamentWinEffectsAdminPanelWeb2)
// plus the global effect-config rows in RoguelikeSettingsModalWeb2.
export function useWinEffectsAdminWeb2() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "win-effects-settings", "web2"],
    queryFn: () => apiFetch<WinEffectsSettings>("/api/admin/win-effects-settings"),
  });

  const update = useCallback(
    async (patch: Partial<WinEffectsSettings>) => {
      await apiMutate("/api/admin/win-effects-settings", "PUT", patch);
      await queryClient.invalidateQueries({ queryKey: ["admin", "win-effects-settings", "web2"] });
    },
    [queryClient],
  );

  return { settings: data, isLoading, update };
}

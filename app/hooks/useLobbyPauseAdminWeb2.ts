"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { LobbySettings } from "../lib/lobbySettings";

// Admin-only mutation for the web2 lobby-creation pause kill-switch (see
// app/lib/lobbySettings.ts). Current value is read via
// useLobbiesWeb2().paused (from GET /api/lobbies/player-state, public to
// any signed-in user); this hook only exposes the admin-gated write.
export function useLobbyPauseAdminWeb2() {
  const queryClient = useQueryClient();

  const setPaused = useCallback(async (paused: boolean) => {
    await apiMutate("/api/admin/lobby-settings", "PUT", { paused });
    await queryClient.invalidateQueries({ queryKey: ["lobby-player-state", "web2"] });
  }, [queryClient]);

  return { setPaused };
}

// Admin-only read/write for the full lobby settings object — used by
// LobbyAdminPanelWeb2.tsx, the web2 counterpart to LobbyAdminPanel.tsx's
// stale-lobby-threshold control (Lobbies.sol's setStaleLobbyThreshold).
export function useLobbySettingsAdminWeb2() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "lobby-settings", "web2"],
    queryFn: () => apiFetch<LobbySettings>("/api/admin/lobby-settings"),
  });

  const setStaleLobbyThresholdDays = useCallback(
    async (staleLobbyThresholdDays: number) => {
      await apiMutate("/api/admin/lobby-settings", "PUT", { staleLobbyThresholdDays });
      await queryClient.invalidateQueries({ queryKey: ["admin", "lobby-settings", "web2"] });
      await queryClient.invalidateQueries({ queryKey: ["lobby-player-state", "web2"] });
    },
    [queryClient],
  );

  return { settings: data, isLoading, setStaleLobbyThresholdDays };
}

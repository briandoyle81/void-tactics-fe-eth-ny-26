"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "../lib/apiMutate";

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

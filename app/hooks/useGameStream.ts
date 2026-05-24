"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Subscribe to server-sent events for a game.
 * Invalidates the ["games", gameId] React Query cache when the server pushes an update,
 * so both players see moves within ~2s without the client polling on a short interval.
 */
export function useGameStream(gameId: number, enabled = true) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || gameId <= 0) return;

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;

    const connect = () => {
      const es = new EventSource(`/api/games/${gameId}/stream`);
      esRef.current = es;

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(e.data) as { type: string };
          if (payload.type === "update" || payload.type === "done") {
            queryClient.invalidateQueries({ queryKey: ["games", gameId] });
            queryClient.invalidateQueries({ queryKey: ["games", "player"] });
          }
          if (payload.type === "done") {
            es.close();
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Reconnect with capped exponential backoff
        retryDelay = Math.min(retryDelay * 2, 30000);
        retryTimeout = setTimeout(connect, retryDelay);
      };

      es.onopen = () => {
        retryDelay = 1000; // reset on successful connect
      };
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [gameId, enabled, queryClient]);
}

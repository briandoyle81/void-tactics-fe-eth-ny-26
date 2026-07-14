import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/auth";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 25000; // < 30s to keep connection alive

type GamePollUpdate = { updatedAt: Date; phase: string } | null; // null = game gone

interface GamePollEntry {
  lastUpdatedAt: number;
  intervalId: ReturnType<typeof setInterval>;
  subscribers: Set<(latest: GamePollUpdate) => void>;
}

// Coalesce DB polling per game, not per SSE connection — a game typically
// has two connected viewers (both players); without this, each connection
// ran its own 2s setInterval against the DB, so polling load scaled with
// connection count instead of with distinct actively-viewed games. Shared
// per-process state, cleaned up once the last subscriber for a game leaves.
const gamePollers = new Map<number, GamePollEntry>();

function subscribeToGamePoll(
  gameId: number,
  initialUpdatedAtMs: number,
  onUpdate: (latest: GamePollUpdate) => void,
): () => void {
  let entry = gamePollers.get(gameId);
  if (!entry) {
    const newEntry: GamePollEntry = {
      lastUpdatedAt: initialUpdatedAtMs,
      subscribers: new Set(),
      intervalId: setInterval(async () => {
        let latest;
        try {
          latest = await prisma.game.findUnique({
            where: { id: gameId },
            select: { updatedAt: true, phase: true },
          });
        } catch {
          return; // transient DB error — leave the shared poll running
        }
        if (!latest) {
          for (const cb of newEntry.subscribers) cb(null);
          clearInterval(newEntry.intervalId);
          gamePollers.delete(gameId);
          return;
        }
        const latestMs = latest.updatedAt.getTime();
        if (latestMs > newEntry.lastUpdatedAt) {
          newEntry.lastUpdatedAt = latestMs;
          for (const cb of newEntry.subscribers) cb(latest);
          if (latest.phase !== "ACTIVE") {
            clearInterval(newEntry.intervalId);
            gamePollers.delete(gameId);
          }
        }
      }, POLL_INTERVAL_MS),
    };
    entry = newEntry;
    gamePollers.set(gameId, entry);
  }
  entry.subscribers.add(onUpdate);

  return () => {
    const current = gamePollers.get(gameId);
    if (!current) return;
    current.subscribers.delete(onUpdate);
    if (current.subscribers.size === 0) {
      clearInterval(current.intervalId);
      gamePollers.delete(gameId);
    }
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const gameId = Number(id);
  if (isNaN(gameId)) return new Response("Invalid id", { status: 400 });

  // Verify this user is a player in this game
  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      OR: [{ player1Id: userId! }, { player2Id: userId! }],
    },
    select: { updatedAt: true, phase: true },
  });
  if (!game) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;

      const send = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
        unsubscribe?.();
        clearInterval(heartbeatInterval);
      };

      // Shared per-game poll (see subscribeToGamePoll) instead of a private
      // setInterval per connection.
      unsubscribe = subscribeToGamePoll(gameId, game.updatedAt.getTime(), (latest) => {
        if (closed) return;
        if (!latest) { close(); return; }
        send(JSON.stringify({ type: "update", gameId }));
        if (latest.phase !== "ACTIVE") {
          send(JSON.stringify({ type: "done", gameId }));
          close();
        }
      });

      // Keep-alive heartbeat
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          unsubscribe?.();
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}

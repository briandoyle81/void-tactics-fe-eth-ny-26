import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 25000; // < 30s to keep connection alive

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

  let lastUpdatedAt = game.updatedAt.getTime();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

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
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
      };

      // Poll DB for state changes
      const pollInterval = setInterval(async () => {
        if (closed) return;
        try {
          const latest = await prisma.game.findUnique({
            where: { id: gameId },
            select: { updatedAt: true, phase: true },
          });
          if (!latest) { close(); return; }

          const latestTime = latest.updatedAt.getTime();
          if (latestTime > lastUpdatedAt) {
            lastUpdatedAt = latestTime;
            send(JSON.stringify({ type: "update", gameId }));
            if (latest.phase !== "ACTIVE") {
              send(JSON.stringify({ type: "done", gameId }));
              close();
            }
          }
        } catch {
          close();
        }
      }, POLL_INTERVAL_MS);

      // Keep-alive heartbeat
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(pollInterval);
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

import { NextRequest, NextResponse } from "next/server";

// In-memory pointer store: "gameId:player" → rawBlobId
// Ephemeral — process restart clears it. Used only for mid-game multi-device access.
// Completed games use on-chain blobId from GameBlobRegistry instead.
const pointers = new Map<string, string>();

function key(gameId: string, player: string) {
  return `${gameId.toLowerCase()}:${player.toLowerCase()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gameId = searchParams.get("gameId");
  const player = searchParams.get("player");
  if (!gameId || !player) {
    return NextResponse.json({ error: "Missing gameId or player" }, { status: 400 });
  }
  const rawBlobId = pointers.get(key(gameId, player));
  if (!rawBlobId) {
    return NextResponse.json({ rawBlobId: null }, { status: 200 });
  }
  return NextResponse.json({ rawBlobId });
}

export async function POST(req: NextRequest) {
  const { gameId, player, rawBlobId } = (await req.json()) as {
    gameId: string;
    player: string;
    rawBlobId: string;
  };
  if (!gameId || !player || !rawBlobId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  pointers.set(key(gameId, player), rawBlobId);
  return NextResponse.json({ ok: true });
}

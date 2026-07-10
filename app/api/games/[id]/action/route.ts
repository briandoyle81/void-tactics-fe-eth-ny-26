import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { applyGameAction, GameActionError, type GameActionInput } from "../../../../lib/gameEngineWeb2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const gameId = Number(id);
  if (isNaN(gameId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: GameActionInput;
  try {
    body = (await req.json()) as GameActionInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shipId, row, col, actionType, targetShipId } = body;
  const specialType = body.specialType ?? 0;

  // Validate numeric fields — reject NaN, floats, and out-of-range enums
  if (!Number.isInteger(shipId) || shipId <= 0) return NextResponse.json({ error: "Invalid shipId" }, { status: 400 });
  if (!Number.isInteger(row) || row < 0 || row > 99) return NextResponse.json({ error: "Invalid row" }, { status: 400 });
  if (!Number.isInteger(col) || col < 0 || col > 99) return NextResponse.json({ error: "Invalid col" }, { status: 400 });
  if (!Number.isInteger(actionType) || actionType < 0 || actionType > 6) return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  if (!Number.isInteger(targetShipId) || targetShipId < 0) return NextResponse.json({ error: "Invalid targetShipId" }, { status: 400 });
  if (!Number.isInteger(specialType) || specialType < 0 || specialType > 3) return NextResponse.json({ error: "Invalid specialType" }, { status: 400 });

  try {
    const newState = await applyGameAction(gameId, userId!, { shipId, row, col, actionType, targetShipId, specialType });
    return NextResponse.json(newState);
  } catch (e) {
    if (e instanceof GameActionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

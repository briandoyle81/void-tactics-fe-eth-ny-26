import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

// GET /api/user/me — the signed-in user's UTC balance. Web2-mode counterpart
// to reading a wallet's native-token balance in the header (see Header.tsx's
// "Flow Balance" widget) — there was previously no way for a web2 player to
// see their credit balance before spending it.
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { creditBalance: true, decBalance: true, droneCoreTier: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    creditBalance: user.creditBalance,
    decBalance: user.decBalance,
    droneCoreTier: user.droneCoreTier,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { creditBalance: true },
  });

  return NextResponse.json({ balance: user?.creditBalance ?? 0 });
}

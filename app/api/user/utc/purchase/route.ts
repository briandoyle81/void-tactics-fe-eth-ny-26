import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAuth } from "@/app/lib/auth";

export const UTC_PACKAGES = [
  { id: 0, utcAmount: 500,  priceUsdCents: 499  },
  { id: 1, utcAmount: 1200, priceUsdCents: 999  },
  { id: 2, utcAmount: 2500, priceUsdCents: 1999 },
] as const;

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { packageId } = await req.json() as { packageId: number };
  const pkg = UTC_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId! },
    data: { creditBalance: { increment: pkg.utcAmount } },
    select: { creditBalance: true },
  });

  return NextResponse.json({ balance: user.creditBalance, added: pkg.utcAmount });
}

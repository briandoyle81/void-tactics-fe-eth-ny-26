import { type NextRequest, NextResponse } from "next/server";
import { getUnresolvedMints } from "@/app/lib/mintLog";

// Simple token to prevent public access — set ADMIN_SECRET in env.
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function GET(req: NextRequest) {
  if (ADMIN_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const unresolved = getUnresolvedMints();
  return NextResponse.json({ count: unresolved.length, unresolved });
}

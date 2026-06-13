import { NextResponse } from "next/server";
import { WORLD_RP_ID } from "@/app/config/tournament";

const PORTAL_URL = `https://developer.world.org/api/v4/proof-context/${WORLD_RP_ID}`;

export async function GET() {
  const apiKey = process.env.WORLD_ID_API_KEY;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  try {
    const res = await fetch(PORTAL_URL, { headers, next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      console.error("[world-id/rp-context] portal error", res.status, body);
      return NextResponse.json(
        { error: "Failed to obtain proof context from World ID portal" },
        { status: 502 },
      );
    }
    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[world-id/rp-context] fetch error", err);
    return NextResponse.json({ error: "Network error reaching World ID portal" }, { status: 502 });
  }
}

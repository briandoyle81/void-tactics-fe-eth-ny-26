import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-server";
import { WORLD_RP_ID, WORLD_ACTION } from "@/app/config/tournament";

export async function GET() {
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  if (!signingKeyHex) {
    console.error("[world-id/rp-context] WORLD_RP_SIGNING_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex,
      action: WORLD_ACTION,
      ttl: 300, // 5 minutes
    });

    return NextResponse.json({
      rp_id: WORLD_RP_ID,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
      signature: sig,
    });
  } catch (err) {
    console.error("[world-id/rp-context] signing error", err);
    return NextResponse.json({ error: "Failed to generate proof context" }, { status: 500 });
  }
}

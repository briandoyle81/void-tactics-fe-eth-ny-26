import { NextRequest, NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-server";
import { WORLD_RP_ID, WORLD_ACTION, WORLD_SELFIE_CHECK_ACTION } from "@/app/config/tournament";

// Actions this route is allowed to sign a context for — an explicit allowlist rather than
// accepting an arbitrary client-supplied action string.
const ALLOWED_ACTIONS = new Set<string>([WORLD_ACTION, WORLD_SELFIE_CHECK_ACTION]);

export async function GET(req: NextRequest) {
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  if (!signingKeyHex) {
    console.error("[world-id/rp-context] WORLD_RP_SIGNING_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const requestedAction = req.nextUrl.searchParams.get("action") ?? WORLD_ACTION;
  if (!ALLOWED_ACTIONS.has(requestedAction)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex,
      action: requestedAction,
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

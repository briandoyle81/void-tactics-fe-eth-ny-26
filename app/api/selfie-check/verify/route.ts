import { type NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, isAddress, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { WORLD_APP_ID, WORLD_SELFIE_CHECK_ACTION } from "@/app/config/tournament";
import { CONTRACT_ADDRESSES_BY_CHAIN_ID } from "@/app/config/contracts";

// Selfie Check has no on-chain proof-verification path (unlike Orb-level World ID, which
// Tournament.sol verifies on-chain directly) — verification is this one off-chain REST call
// against World's own API. See
// docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §3 and the request/
// response shape confirmed 2026-09-18 against docs.world.org's own OpenAPI spec
// (api-reference/developer-portal/verify-legacy): POST /api/v2/verify/{app_id}.
const WORLD_VERIFY_URL = `https://developer.world.org/api/v2/verify/${WORLD_APP_ID}`;

// Same backend wallet already authorized to mint ships (app/api/flow/fulfill/route.ts) is also
// granted setAuthorizedVerifier on SelfieCheckEligibilityProvider per
// docs/eth-global-remote/eth-global-remote-strategy-v2.md's Pick 2 section — reusing it rather
// than provisioning a second backend signer, per that explicit decision.
const rawKey = process.env.SHIP_MINTER_PRIVATE_KEY ?? "";
const VERIFIER_KEY = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

const MARK_VERIFIED_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_player", type: "address" },
      { internalType: "bytes32", name: "_nullifierHash", type: "bytes32" },
    ],
    name: "markVerified",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface WorldVerifySuccess {
  success: true;
  action: string;
  nullifier_hash: string;
  created_at: string;
}

interface WorldVerifyFailure {
  code: string;
  detail: string;
  attribute: string | null;
}

export async function POST(req: NextRequest) {
  const { player, merkle_root, nullifier_hash, proof } = (await req.json()) as {
    player?: string;
    merkle_root?: string;
    nullifier_hash?: string;
    proof?: string;
  };

  if (!player || !isAddress(player)) {
    return NextResponse.json({ error: "Missing or invalid player address" }, { status: 400 });
  }
  if (!merkle_root || !nullifier_hash || !proof) {
    return NextResponse.json({ error: "Missing proof fields" }, { status: 400 });
  }
  if (!isHex(nullifier_hash) || nullifier_hash.length !== 66) {
    // markVerified takes bytes32 — reject anything that can't be one up front.
    return NextResponse.json({ error: "Malformed nullifier_hash" }, { status: 400 });
  }

  // Verify the Selfie Check proof off-chain against World's API.
  let verifyRes: Response;
  try {
    verifyRes = await fetch(WORLD_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nullifier_hash,
        proof,
        merkle_root,
        verification_level: "selfie",
        action: WORLD_SELFIE_CHECK_ACTION,
      }),
    });
  } catch (err) {
    console.error("[selfie-check/verify] World API request failed:", err);
    return NextResponse.json({ error: "Could not reach World ID verification service" }, { status: 502 });
  }

  const verifyBody = (await verifyRes.json()) as WorldVerifySuccess | WorldVerifyFailure;
  if (!verifyRes.ok || !("success" in verifyBody) || !verifyBody.success) {
    const detail = "detail" in verifyBody ? verifyBody.detail : "Verification failed";
    console.error("[selfie-check/verify] World verification rejected:", verifyBody);
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  if (!VERIFIER_KEY || VERIFIER_KEY === "0x") {
    console.error("[selfie-check/verify] SHIP_MINTER_PRIVATE_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const providerAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
    .SELFIE_CHECK_ELIGIBILITY_PROVIDER as `0x${string}`;
  if (!providerAddress || providerAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      { error: "SelfieCheckEligibilityProvider is not deployed on this network" },
      { status: 500 },
    );
  }

  try {
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    const account = privateKeyToAccount(VERIFIER_KEY);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

    const hash = await walletClient.writeContract({
      address: providerAddress,
      abi: MARK_VERIFIED_ABI,
      functionName: "markVerified",
      args: [player as `0x${string}`, verifyBody.nullifier_hash as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[selfie-check/verify] markVerified failed:", message);
    return NextResponse.json({ error: `On-chain verification failed: ${message}` }, { status: 500 });
  }
}

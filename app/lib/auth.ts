import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextResponse } from "next/server";
import { createPublicClient, http, recoverMessageAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { WEB2_ADMIN_EMAILS } from "../config/alpha";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import {
  buildNodeContentSignMessage,
  buildNodeContentSyncSignMessage,
  buildNodeContentPublishSignMessage,
} from "../utils/nodeContentSignMessage";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: any) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
};

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id as string, error: null };
}

/** Web2-mode counterpart to a wallet-address admin check (see MAP_ADMIN_ADDRESS
 * / contract-owner reads) — gates admin API routes on the signed-in Google
 * account's email being in WEB2_ADMIN_EMAILS. */
export async function requireWeb2Admin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !WEB2_ADMIN_EMAILS.includes(email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null };
}

const NODE_CONTENT_CONTRACT_KEY = {
  CAMPAIGN: "NODE_MAP",
  ROGUELIKE: "ROGUELIKE_NODE_MAP",
} as const;

/**
 * Gate for PUT /api/node-content — node title/description is chain-agnostic
 * (see the NodeContent model's doc-comment in schema.prisma), but its
 * *editors* aren't: a web3-connected admin has no NextAuth session at all
 * (requireWeb2Admin alone 403s them even though they hold a real on-chain
 * isNodeEditor/isRoguelikeNodeEditor role), and this app has no existing
 * wallet-signature API-auth pattern to reuse. Accepts either:
 *  - an existing web2 admin session (requireWeb2Admin), or
 *  - a wallet signature over buildNodeContentSignMessage(...) (proving the
 *    caller controls `address`) plus an on-chain read confirming that
 *    address actually holds the editor role for the given graphType.
 * The signed message embeds the content itself, not just an id, so a
 * captured signature can't be replayed to write different content later —
 * deliberately not a full nonce/session flow, since this is low-stakes
 * flavor text, not a financial or gameplay-critical write.
 */
export async function requireNodeContentEditor(body: {
  graphType?: unknown;
  nodeId?: unknown;
  title?: unknown;
  description?: unknown;
  address?: unknown;
  signature?: unknown;
}) {
  const web2 = await requireWeb2Admin();
  if (!web2.error) return { error: null };

  const forbidden = { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const graphType = body.graphType === "CAMPAIGN" || body.graphType === "ROGUELIKE" ? body.graphType : null;
  const nodeId = Number(body.nodeId);
  const title = typeof body.title === "string" ? body.title : "";
  const description = typeof body.description === "string" ? body.description : "";
  const address = typeof body.address === "string" ? body.address : null;
  const signature = typeof body.signature === "string" ? body.signature : null;
  if (!graphType || !Number.isInteger(nodeId) || !address || !signature) return forbidden;

  const message = buildNodeContentSignMessage({ graphType, nodeId, title, description });
  const recovered = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  }).catch(() => null);
  if (!recovered || recovered.toLowerCase() !== address.toLowerCase()) return forbidden;

  const contractKey = NODE_CONTENT_CONTRACT_KEY[graphType];
  const contractAddress = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id][contractKey] as `0x${string}`;
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const isEditor = await publicClient
    .readContract({
      address: contractAddress,
      abi: CONTRACT_ABIS[contractKey],
      functionName: "isNodeEditor",
      args: [address as `0x${string}`],
    })
    .catch(() => false);
  if (!isEditor) return forbidden;

  return { error: null };
}

const NODE_CONTENT_REGISTRY_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .NODE_CONTENT_REGISTRY as `0x${string}`;

/**
 * Gate for POST /api/node-content/sync and /api/node-content/publish — the
 * batch counterpart to requireNodeContentEditor above. Accepts either:
 *  - an existing web2 admin session (requireWeb2Admin), or
 *  - a wallet signature over buildNodeContentSyncSignMessage (action
 *    "sync") or buildNodeContentPublishSignMessage (action "publish"),
 *    plus an on-chain read confirming that address holds isNodeEditor on
 *    NodeContentRegistry specifically (its own allowlist — not NodeMap's
 *    or RoguelikeNodeMap's, which gate different things).
 * Unlike requireNodeContentEditor, the signed message can't embed the full
 * content being published (a ~100-node batch would make an unreadable
 * wallet prompt) — the caller (publish/route.ts) is responsible for
 * verifying the contentHash it put in the message actually matches what's
 * about to be written before calling this.
 */
export async function requireNodeContentPublisher(
  body: {
    graphType?: unknown;
    nodeIds?: unknown;
    contentHash?: unknown;
    address?: unknown;
    signature?: unknown;
  },
  action: "sync" | "publish",
  // Only meaningful for action "publish" — the caller's own server-computed
  // hash of the exact rows about to be published (see publish/route.ts).
  // The signed message must embed this same value, or the request is
  // rejected: a wallet that signed approval for stale content (someone
  // else published in the meantime) shouldn't have that signature applied
  // to different content than what it actually saw and approved.
  expectedContentHash?: string,
) {
  const web2 = await requireWeb2Admin();
  if (!web2.error) return { error: null };

  const forbidden = { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const graphType = body.graphType === "CAMPAIGN" || body.graphType === "ROGUELIKE" ? body.graphType : null;
  const nodeIds = Array.isArray(body.nodeIds) ? body.nodeIds.map(Number) : null;
  const address = typeof body.address === "string" ? body.address : null;
  const signature = typeof body.signature === "string" ? body.signature : null;
  if (
    !graphType ||
    !nodeIds ||
    nodeIds.length === 0 ||
    nodeIds.some((id) => !Number.isInteger(id)) ||
    !address ||
    !signature
  )
    return forbidden;

  let message: string;
  if (action === "sync") {
    message = buildNodeContentSyncSignMessage({ graphType, nodeIds });
  } else {
    const contentHash = typeof body.contentHash === "string" ? body.contentHash : null;
    if (!contentHash || contentHash !== expectedContentHash) return forbidden;
    message = buildNodeContentPublishSignMessage({ graphType, nodeIds, contentHash });
  }

  const recovered = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  }).catch(() => null);
  if (!recovered || recovered.toLowerCase() !== address.toLowerCase()) return forbidden;

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const isEditor = await publicClient
    .readContract({
      address: NODE_CONTENT_REGISTRY_ADDRESS,
      abi: CONTRACT_ABIS.NODE_CONTENT_REGISTRY,
      functionName: "isNodeEditor",
      args: [address as `0x${string}`],
    })
    .catch(() => false);
  if (!isEditor) return forbidden;

  return { error: null };
}

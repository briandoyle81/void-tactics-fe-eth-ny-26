import { keccak256, toHex } from "viem";

// Shared between the client (signs this with the connected wallet before
// PUTting to /api/node-content) and the server (verifies the signature
// recovers to an address holding the matching on-chain editor role — see
// app/lib/auth.ts's requireNodeContentEditor). Must stay byte-for-byte
// identical on both sides or verification will always fail. Includes the
// actual content being saved (not just graphType/nodeId) so a captured
// signature can't be replayed to write different content later — cheap
// scoping given this is intentionally not a full nonce/session flow (low-
// stakes flavor text, not a financial or gameplay-critical write).
export function buildNodeContentSignMessage(params: {
  graphType: "CAMPAIGN" | "ROGUELIKE";
  nodeId: number;
  title: string;
  description: string;
}): string {
  return [
    "Save node content",
    `graphType: ${params.graphType}`,
    `nodeId: ${params.nodeId}`,
    `title: ${params.title}`,
    `description: ${params.description}`,
  ].join("\n");
}

// Batch counterparts of buildNodeContentSignMessage, used by
// requireNodeContentPublisher (app/lib/auth.ts) to let a wallet-only admin
// (holding isNodeEditor on NodeContentRegistry but no web2/Google admin
// session) drive /api/node-content/sync and /api/node-content/publish —
// see NodeContentPublishPanel.tsx, which signs whichever of these applies
// whenever a wallet is connected. nodeIds are sorted before joining so the
// message (and therefore the signature) doesn't depend on array order.

export function buildNodeContentSyncSignMessage(params: {
  graphType: "CAMPAIGN" | "ROGUELIKE";
  nodeIds: number[];
}): string {
  const sortedIds = [...params.nodeIds].sort((a, b) => a - b);
  return [
    "Sync node content from chain",
    `graphType: ${params.graphType}`,
    `nodeIds: ${sortedIds.join(",")}`,
  ].join("\n");
}

// Publish embeds a contentHash (see computeNodeContentBatchHash) rather
// than the full title/description of every node being published — with up
// to ~100 nodes/campaign, embedding full text directly would make the
// wallet's signing prompt an unreadable wall of text. The hash still pins
// the signature to exact content: the server independently recomputes it
// from its own DB query of the dirty rows about to be published and
// rejects the request if it doesn't match what was signed (see
// publish/route.ts), so a captured signature can't be replayed against
// different content, same anti-replay property as the single-node scheme.
export function buildNodeContentPublishSignMessage(params: {
  graphType: "CAMPAIGN" | "ROGUELIKE";
  nodeIds: number[];
  contentHash: string;
}): string {
  const sortedIds = [...params.nodeIds].sort((a, b) => a - b);
  return [
    "Publish node content to chain",
    `graphType: ${params.graphType}`,
    `nodeIds: ${sortedIds.join(",")}`,
    `contentHash: ${params.contentHash}`,
  ].join("\n");
}

// Deterministic hash over exactly the (nodeId, title, description) tuples
// being published, independent of input array order (sorted by nodeId
// first). JSON.stringify over a structured array-of-arrays (rather than a
// flat delimited string) avoids field-boundary collisions a title/
// description containing the delimiter character could otherwise cause.
// Called identically by the client (NodeContentPublishPanel, before
// signing) and the server (publish/route.ts, on its own fresh DB read) —
// must stay byte-for-byte identical on both sides, same requirement as the
// message builders above.
export function computeNodeContentBatchHash(
  rows: { nodeId: number; title: string; description: string }[],
): `0x${string}` {
  const sorted = [...rows].sort((a, b) => a.nodeId - b.nodeId);
  const canonical = JSON.stringify(sorted.map((r) => [r.nodeId, r.title, r.description]));
  return keccak256(toHex(canonical));
}

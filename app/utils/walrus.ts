export const EPOCHS_LIVE = 1;
export const EPOCHS_ARCHIVE = 15;

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

// bigint JSON serialization
export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? { __bigint: value.toString() } : value;
}

export function jsonReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__bigint" in (value as object)) {
    return BigInt((value as { __bigint: string }).__bigint);
  }
  return value;
}

export function serializeBlob(data: unknown): string {
  return JSON.stringify(data, jsonReplacer);
}

export function deserializeBlob<T>(json: string): T {
  return JSON.parse(json, jsonReviver) as T;
}

/** Upload JSON to Walrus. Returns { rawBlobId, blobIdHex }. */
export async function uploadToWalrus(
  data: unknown,
  epochs: number
): Promise<{ rawBlobId: string; blobIdHex: `0x${string}` }> {
  const body = serializeBlob(data);
  const res = await fetch(
    `${PUBLISHER}/v1/blobs?epochs=${epochs}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(`Walrus upload failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data?: {
      newlyCreated?: { blobObject?: { blobId?: string } };
      alreadyCertified?: { blobId?: string };
    };
  };
  const rawBlobId =
    json.data?.newlyCreated?.blobObject?.blobId ??
    json.data?.alreadyCertified?.blobId;
  if (!rawBlobId) {
    throw new Error(`Walrus upload: unexpected response shape: ${JSON.stringify(json)}`);
  }
  const blobIdHex = base64urlToHex(rawBlobId);
  return { rawBlobId, blobIdHex };
}

/** Fetch a blob from Walrus by rawBlobId and deserialize. */
export async function fetchFromWalrus<T>(rawBlobId: string): Promise<T> {
  const res = await fetch(`${AGGREGATOR}/v1/blobs/${rawBlobId}`);
  if (!res.ok) {
    throw new Error(`Walrus fetch failed: ${res.status}`);
  }
  const text = await res.text();
  return deserializeBlob<T>(text);
}

/** Convert a 43-char base64url blobId to a 0x-prefixed 32-byte hex string for on-chain use. */
export function base64urlToHex(b64url: string): `0x${string}` {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  const binary = atob(padded);
  const hex = Array.from(binary)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padStart(64, "0")}` as `0x${string}`;
}

/** Convert a 0x-prefixed 32-byte hex string back to a base64url blobId. */
export function hexToBase64url(hex: `0x${string}`): string {
  const raw = hex.slice(2);
  const bytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

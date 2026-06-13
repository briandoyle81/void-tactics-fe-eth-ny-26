import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "data", "mint-log.jsonl");

export type MintLogStatus = "attempting" | "minted" | "failed";

export interface MintLogEntry {
  transactionId: string;
  tier: number;
  buyerAddress: string;
  gameChainId: number;
  status: MintLogStatus;
  timestamp: string;
  mintTxHash?: string;
  error?: string;
}

function append(entry: MintLogEntry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
}

export function logAttempt(fields: Omit<MintLogEntry, "status" | "timestamp">) {
  append({ ...fields, status: "attempting", timestamp: new Date().toISOString() });
}

export function logMinted(transactionId: string, mintTxHash: string) {
  append({ transactionId, tier: 0, buyerAddress: "", gameChainId: 0, status: "minted", timestamp: new Date().toISOString(), mintTxHash });
}

export function logFailed(transactionId: string, error: string) {
  append({ transactionId, tier: 0, buyerAddress: "", gameChainId: 0, status: "failed", timestamp: new Date().toISOString(), error });
}

/** Returns all transactions whose last recorded status is not "minted". */
export function getUnresolvedMints(): MintLogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  const latest = new Map<string, MintLogEntry>();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as MintLogEntry;
      // Keep the earliest "attempting" entry (has full fields) merged with the latest status
      const prev = latest.get(entry.transactionId);
      if (!prev) {
        latest.set(entry.transactionId, entry);
      } else {
        // Merge: preserve full fields from the "attempting" entry, update status/outcome fields
        latest.set(entry.transactionId, { ...prev, ...entry, tier: prev.tier || entry.tier, buyerAddress: prev.buyerAddress || entry.buyerAddress, gameChainId: prev.gameChainId || entry.gameChainId });
      }
    } catch {
      // skip malformed lines
    }
  }
  return [...latest.values()].filter((e) => e.status !== "minted");
}

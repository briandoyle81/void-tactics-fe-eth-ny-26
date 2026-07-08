const STORAGE_KEY_PREFIX = "voidtactics:gameRecord:";

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

/** Persists a game record to localStorage, keyed by gameId. */
export function saveGameRecord(gameId: string, record: unknown): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${gameId}`, serializeBlob(record));
  } catch {
    // Storage full or unavailable — recording is best-effort, not critical path.
  }
}

/** Reads a game record back from localStorage. Returns null if not found on this device. */
export function loadGameRecord<T>(gameId: string): T | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${gameId}`);
    if (!raw) return null;
    return deserializeBlob<T>(raw);
  } catch {
    return null;
  }
}

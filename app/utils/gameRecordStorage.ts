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

type PendingRecordSave = { gameId: string; record: unknown };
let pendingRecordSave: PendingRecordSave | null = null;
let pendingRecordSaveHandle: number | null = null;

function writeGameRecord(gameId: string, record: unknown): void {
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${gameId}`,
      serializeBlob(record),
    );
  } catch {
    // Storage full or unavailable — recording is best-effort, not critical path.
  }
}

function flushPendingGameRecord(): void {
  pendingRecordSaveHandle = null;
  const job = pendingRecordSave;
  pendingRecordSave = null;
  if (!job) return;
  writeGameRecord(job.gameId, job.record);
}

/** Persists a game record to localStorage, keyed by gameId. */
export function saveGameRecord(
  gameId: string,
  record: unknown,
  options?: { immediate?: boolean },
): void {
  if (typeof window === "undefined") return;
  if (options?.immediate) {
    pendingRecordSave = null;
    if (pendingRecordSaveHandle != null) {
      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(pendingRecordSaveHandle);
      } else {
        window.clearTimeout(pendingRecordSaveHandle);
      }
      pendingRecordSaveHandle = null;
    }
    writeGameRecord(gameId, record);
    return;
  }

  pendingRecordSave = { gameId, record };
  if (pendingRecordSaveHandle != null) return;
  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb)
      : (cb: () => void) => window.setTimeout(cb, 0);
  pendingRecordSaveHandle = schedule(flushPendingGameRecord);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingGameRecord);
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

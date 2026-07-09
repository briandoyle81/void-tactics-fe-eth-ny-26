// Kept as thin wrappers so callers don't need mass-updated imports.
// All values are plain numbers now; no special encoding needed.

export function stringifyWithBigint(value: unknown): string {
  return JSON.stringify(value);
}

export function parseWithBigint<T>(json: string): T {
  return JSON.parse(json) as T;
}

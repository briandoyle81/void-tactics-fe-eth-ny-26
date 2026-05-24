const BIGINT_PREFIX = "__bigint__";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bigintReplacer(_key: string, value: any) {
  if (typeof value === "bigint") return `${BIGINT_PREFIX}${value.toString()}`;
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bigintReviver(_key: string, value: any) {
  if (typeof value === "string" && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length));
  }
  return value;
}

export function stringifyWithBigint(value: unknown): string {
  return JSON.stringify(value, bigintReplacer);
}

export function parseWithBigint<T>(json: string): T {
  return JSON.parse(json, bigintReviver) as T;
}

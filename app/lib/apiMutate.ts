import { parseWithBigint, stringifyWithBigint } from "./bigintJson";

type Method = "POST" | "PUT" | "DELETE" | "PATCH";

export async function apiMutate<T = unknown>(
  url: string,
  method: Method = "POST",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? stringifyWithBigint(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try { message = JSON.parse(text)?.error ?? message; } catch { /* ignore */ }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  return parseWithBigint<T>(text);
}

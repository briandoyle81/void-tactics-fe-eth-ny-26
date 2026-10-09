import posthog from "posthog-js";

// Counts Base Sepolia RPC requests by JSON-RPC method, to check the cost
// estimate against real usage (Ankr bills per request). Dev: a console
// summary every minute. Production: a sampled `rpc_usage` PostHog event
// every 5 minutes from ~10% of sessions. Live totals: window.__vtRpcUsage.

const DEV = process.env.NODE_ENV === "development";
const REPORT_INTERVAL_MS = DEV ? 60_000 : 5 * 60_000;
const PROD_SAMPLE_RATE = 0.1;

const sessionSampled = DEV || Math.random() < PROD_SAMPLE_RATE;
let windowCounts: Record<string, number> = {};
const sessionCounts: Record<string, number> = {};
let timer: ReturnType<typeof setInterval> | null = null;

function bump(method: string) {
  windowCounts[method] = (windowCounts[method] ?? 0) + 1;
  sessionCounts[method] = (sessionCounts[method] ?? 0) + 1;
}

function report() {
  const total = Object.values(windowCounts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    if (DEV) {
      const byMethod = Object.entries(windowCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([m, n]) => `${m} ${n}`)
        .join(", ");
      console.info(`[rpc] ${total} requests in the last minute: ${byMethod}`);
    } else {
      posthog.capture("rpc_usage", {
        total,
        interval_s: REPORT_INTERVAL_MS / 1000,
        by_method: windowCounts,
        hidden: document.visibilityState === "hidden",
      });
    }
  }
  windowCounts = {};
}

/**
 * Hook for viem's http transport `onFetchRequest`. Counts each JSON-RPC
 * call in the request (a batch counts every call, as the provider bills).
 */
export function recordRpcRequest(request: Request): void {
  if (typeof window === "undefined" || !sessionSampled) return;
  if (!timer) {
    timer = setInterval(report, REPORT_INTERVAL_MS);
    (window as unknown as { __vtRpcUsage: Record<string, number> }).__vtRpcUsage = sessionCounts;
  }
  void request
    .clone()
    .json()
    .then((body: unknown) => {
      const calls = Array.isArray(body) ? body : [body];
      for (const call of calls) bump((call as { method?: string })?.method ?? "unknown");
    })
    .catch(() => bump("unknown"));
}

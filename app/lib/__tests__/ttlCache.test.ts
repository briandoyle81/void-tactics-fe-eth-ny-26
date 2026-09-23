import { describe, it, expect, vi } from "vitest";
import { createKeyedTtlCache } from "../ttlCache";

describe("createKeyedTtlCache", () => {
  it("caches independently per key", async () => {
    const fetcher = vi.fn(async (key: number) => `value-${key}`);
    const cache = createKeyedTtlCache(fetcher, 10_000);

    expect(await cache.get(1)).toBe("value-1");
    expect(await cache.get(2)).toBe("value-2");
    expect(await cache.get(1)).toBe("value-1");
    // One fetch per distinct key, not per call.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("de-dupes concurrent in-flight fetches for the same key", async () => {
    let resolveFetch: (v: string) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cache = createKeyedTtlCache(fetcher, 10_000);

    const p1 = cache.get("k");
    const p2 = cache.get("k");
    resolveFetch!("shared");

    expect(await p1).toBe("shared");
    expect(await p2).toBe("shared");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidate(key) clears only that key", async () => {
    const fetcher = vi.fn(async (key: number) => `value-${key}-${fetcher.mock.calls.length}`);
    const cache = createKeyedTtlCache(fetcher, 10_000);

    await cache.get(1);
    await cache.get(2);
    cache.invalidate(1);

    await cache.get(1); // re-fetched
    await cache.get(2); // still cached

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("invalidate() with no key clears every entry", async () => {
    const fetcher = vi.fn(async (key: number) => `value-${key}`);
    const cache = createKeyedTtlCache(fetcher, 10_000);

    await cache.get(1);
    await cache.get(2);
    cache.invalidate();

    await cache.get(1);
    await cache.get(2);

    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

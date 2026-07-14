/**
 * Small in-process TTL cache with in-flight de-duplication (concurrent
 * misses share one fetch instead of stampeding the DB). Used for
 * admin-editable Config rows and map tile data — values that change rarely
 * (only via an explicit admin action) but were otherwise being read from
 * Postgres on every request of hot paths like ship listing and per-move
 * game-action processing.
 *
 * Per-process, best-effort only: on a multi-instance deployment each
 * instance holds its own cache, so a write is only guaranteed to be visible
 * on the instance that served it (plus everyone else within `ttlMs`) unless
 * `invalidate()` is also called there — acceptable for admin-tunable
 * gameplay config, not used for anything requiring strong consistency.
 */
export function createTtlCache<T>(fetcher: () => Promise<T>, ttlMs: number) {
  let cached: { value: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  const get = async (): Promise<T> => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.value;
    if (pending) return pending;
    pending = fetcher()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  const invalidate = () => {
    cached = null;
  };

  return { get, invalidate };
}

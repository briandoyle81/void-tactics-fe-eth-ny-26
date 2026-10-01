/**
 * Poll until `predicate` is true or `timeoutMs` elapses. Used after a
 * confirmed onchain write so a crypto button stays busy until the UI that
 * write should produce (new lobby in the list, refreshed navy, etc.) is
 * actually on screen.
 */
export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const intervalMs = options?.intervalMs ?? 400;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return predicate();
}

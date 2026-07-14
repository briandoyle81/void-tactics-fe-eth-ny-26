/**
 * Thrown inside an interactive `prisma.$transaction(async (tx) => ...)`
 * callback when an atomic conditional balance decrement (a `updateMany`
 * with `creditBalance: { gte: cost }` in its `where`) affects zero rows —
 * i.e. the balance check and the debit happened in the same statement, so
 * concurrent requests can't both pass a stale pre-check and both spend.
 * Throwing here rolls back the whole transaction; the caller catches this
 * specific class to return a clean 402 instead of a generic 500.
 */
export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient balance");
  }
}

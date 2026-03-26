/**
 * Simple in-memory token bucket rate limiter.
 * Works per-instance on Vercel serverless — good enough for personal use.
 * Each cold start resets the buckets, so this is lenient by design.
 */

const tokenBuckets = new Map<
  string,
  { tokens: number; lastRefill: number }
>();

/**
 * Check and consume a rate limit token.
 *
 * @param key - Unique identifier (e.g., `${userId}:${endpoint}`)
 * @param maxTokens - Maximum tokens (burst capacity)
 * @param refillRate - Tokens added per second
 * @returns `{ success, remaining }` — success is false if rate limited
 */
export function rateLimit(
  key: string,
  maxTokens: number,
  refillRate: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  let bucket = tokenBuckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    tokenBuckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return { success: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  return { success: true, remaining: Math.floor(bucket.tokens) };
}

/**
 * Clean up stale buckets to prevent memory leaks in long-running instances.
 * Call periodically or let Vercel's cold starts handle it.
 */
export function pruneStale(maxAgeMs: number = 600_000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [key, bucket] of tokenBuckets) {
    if (bucket.lastRefill < cutoff) {
      tokenBuckets.delete(key);
    }
  }
}

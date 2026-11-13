/**
 * Process-local sliding-window rate limiter.
 *
 * This is deliberately simple for the pilot. In a multi-instance deployment
 * replace the store with Redis (or an edge WAF) — the interface stays the same.
 */

type Bucket = { hits: number[]; blockedUntil: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  blockMs = windowMs,
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, bucket] of buckets) {
      if (bucket.hits.every((t) => now - t > windowMs) && bucket.blockedUntil < now) {
        buckets.delete(k);
      }
    }
  }

  const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 };

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    bucket.blockedUntil = now + blockMs;
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

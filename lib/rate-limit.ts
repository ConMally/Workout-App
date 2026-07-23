// Simple in-memory, fixed-window rate limiter keyed by client IP.
//
// NOTE: This is per-server-process. It resets on restart/redeploy and does
// not coordinate across multiple instances (e.g. serverless functions on
// Vercel can each have their own memory, so a determined client could get
// more requests than the limit by hitting different instances). For real
// production traffic, replace this with a shared store like Upstash Redis
// or Vercel KV. It's a reasonable, dependency-free starting point for a
// first version.

interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 30;

// The generator is fully local now (no external API cost), but the endpoint
// still does real work per request, so rate limiting stays on in production.
// In development it only gets in the way of testing (e.g. clicking
// Regenerate repeatedly), so it's disabled entirely there.
const RATE_LIMITING_ENABLED = process.env.NODE_ENV !== "development";

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  if (!RATE_LIMITING_ENABLED) {
    return { allowed: true };
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

// Periodic cleanup so the map doesn't grow forever on a long-running server.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}, WINDOW_MS);
cleanupInterval.unref?.();

/**
 * In-memory sliding-window rate limiter.
 *
 * Demo-grade: state lives inside a single serverless function instance, so it
 * acts as a first line of defence against rapid-fire spam from one client. It
 * is not shared across instances — a multi-instance deployment should back this
 * with a shared store (e.g. Redis / Upstash) using the same interface.
 *
 * The core `checkRateLimit` is pure with respect to time (the clock is passed
 * in) so it can be unit-tested deterministically.
 */

export interface RateLimitResult {
  /** True when the caller has exceeded the budget for the current window. */
  limited: boolean;
  /** How many more requests are allowed in the current window. */
  remaining: number;
  /** Milliseconds until the oldest request leaves the window (0 if allowed). */
  retryAfterMs: number;
}

/** key -> timestamps (ms) of requests that are still inside the window. */
const buckets = new Map<string, number[]>();

/**
 * Record a request for `key` and report whether it is within budget.
 *
 * @param key      Identifier to rate-limit on (e.g. client IP).
 * @param limit    Maximum number of requests allowed per window.
 * @param windowMs Length of the sliding window in milliseconds.
 * @param now      Current time in ms (injectable for deterministic tests).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const windowStart = now - windowMs;

  // Drop timestamps that have fallen out of the window (also bounds memory).
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts >= windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  return {
    limited: false,
    remaining: limit - timestamps.length,
    retryAfterMs: 0,
  };
}

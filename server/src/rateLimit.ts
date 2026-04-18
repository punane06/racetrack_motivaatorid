// Simple in-memory rate limiter for /state/reset endpoint
// Allows max N resets per IP per interval (e.g., 3 per 10 minutes)

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

const RESET_LIMIT = 3;
const RESET_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const resetRateLimit: Record<string, RateLimitEntry> = {};

export function checkResetRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = resetRateLimit[ip];
  if (!entry || now - entry.lastReset > RESET_WINDOW_MS) {
    resetRateLimit[ip] = { count: 1, lastReset: now };
    return true;
  }
  if (entry.count < RESET_LIMIT) {
    entry.count++;
    entry.lastReset = now;
    return true;
  }
  return false;
}

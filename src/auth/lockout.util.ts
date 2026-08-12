const MAX_BACKOFF_SECONDS = 15 * 60;

export function computeLockoutUntil(failedLoginCount: number, now: Date = new Date()): Date {
  const delaySeconds = Math.min(2 ** failedLoginCount, MAX_BACKOFF_SECONDS);
  return new Date(now.getTime() + delaySeconds * 1000);
}

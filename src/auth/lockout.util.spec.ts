import { computeLockoutUntil } from './lockout.util';

describe('computeLockoutUntil', () => {
  it('grows the backoff window as failed attempts increase', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const after1 = computeLockoutUntil(1, now).getTime() - now.getTime();
    const after2 = computeLockoutUntil(2, now).getTime() - now.getTime();
    expect(after2).toBeGreaterThan(after1);
  });

  it('caps the backoff at 15 minutes', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const result = computeLockoutUntil(30, now);
    expect(result.getTime() - now.getTime()).toBe(15 * 60 * 1000);
  });
});

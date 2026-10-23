import { computeDateKey } from '../../src/helpers/getToday';

describe('computeDateKey', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const result = computeDateKey(new Date('2026-10-23T12:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the correct IST date (UTC+5:30) for a UTC midnight time', () => {
    // 2026-10-22T23:00:00Z → IST is 2026-10-23T04:30:00 → day is 2026-10-23
    const result = computeDateKey(new Date('2026-10-22T23:00:00Z'));
    expect(result).toBe('2026-10-23');
  });

  it('returns the correct IST date for early UTC (still previous day in IST)', () => {
    // 2026-10-23T17:30:00Z → IST is 2026-10-23T23:00:00 → day is 2026-10-23
    const result = computeDateKey(new Date('2026-10-23T17:30:00Z'));
    expect(result).toBe('2026-10-23');
  });

  it('correctly handles IST midnight boundary (18:30 UTC = 00:00 IST next day)', () => {
    // 2026-10-22T18:30:00Z → IST is 2026-10-23T00:00:00 → day is 2026-10-23
    const result = computeDateKey(new Date('2026-10-22T18:30:00Z'));
    expect(result).toBe('2026-10-23');
  });

  it('applies positive day offset', () => {
    const result = computeDateKey(new Date('2026-10-23T12:00:00Z'), 3);
    expect(result).toBe('2026-10-26');
  });

  it('applies negative day offset', () => {
    const result = computeDateKey(new Date('2026-10-23T12:00:00Z'), -2);
    expect(result).toBe('2026-10-21');
  });

  it('handles zero offset (default)', () => {
    const result = computeDateKey(new Date('2026-10-23T12:00:00Z'), 0);
    // Should be IST date for this UTC time
    expect(result).toBe('2026-10-23');
  });

  it('handles month rollover with positive offset', () => {
    const result = computeDateKey(new Date('2026-10-30T12:00:00Z'), 3);
    expect(result).toBe('2026-11-02');
  });

  it('handles year rollover with positive offset', () => {
    const result = computeDateKey(new Date('2026-12-30T12:00:00Z'), 5);
    expect(result).toBe('2027-01-04');
  });

  it('handles month rollover with negative offset', () => {
    const result = computeDateKey(new Date('2026-11-02T12:00:00Z'), -3);
    expect(result).toBe('2026-10-30');
  });
});

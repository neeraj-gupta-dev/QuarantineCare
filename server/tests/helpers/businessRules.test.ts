import {
  isFever,
  toFahrenheit,
  toCelsius,
  calcFeverFreeStreak,
  isReadyForDischarge,
  hasTemperatureToday,
  hasDoctorVisitToday,
  canDoctorVisit,
  prevDay,
  formatDayKey,
  FEVER_THRESHOLD_F,
  DISCHARGE_STREAK_DAYS,
  ReadingForStreak,
} from '../../src/helpers/businessRules';

// ─── isFever ─────────────────────────────────────────────────────────────────

describe('isFever', () => {
  it('returns false for 100.3°F (below threshold)', () => {
    expect(isFever(100.3)).toBe(false);
  });

  it('returns true for exactly 100.4°F (at threshold)', () => {
    expect(isFever(100.4)).toBe(true);
  });

  it('returns true for 100.5°F (above threshold)', () => {
    expect(isFever(100.5)).toBe(true);
  });

  it('returns false for normal body temp 98.6°F', () => {
    expect(isFever(98.6)).toBe(false);
  });

  it('returns true for high fever 103.0°F', () => {
    expect(isFever(103.0)).toBe(true);
  });

  it('exports the fever threshold constant as 100.4', () => {
    expect(FEVER_THRESHOLD_F).toBe(100.4);
  });
});

// ─── Temperature conversions ─────────────────────────────────────────────────

describe('toFahrenheit', () => {
  it('converts 0°C to 32°F', () => {
    expect(toFahrenheit(0)).toBe(32);
  });

  it('converts 100°C to 212°F', () => {
    expect(toFahrenheit(100)).toBe(212);
  });

  it('converts 38°C (fever threshold) to ~100°F', () => {
    // 38 * 9/5 + 32 = 100.4 → rounded to 100
    expect(toFahrenheit(38)).toBe(100);
  });

  it('converts 37°C (normal) to ~99°F', () => {
    expect(toFahrenheit(37)).toBe(99);
  });
});

describe('toCelsius', () => {
  it('converts 32°F to 0°C', () => {
    expect(toCelsius(32)).toBe(0);
  });

  it('converts 212°F to 100°C', () => {
    expect(toCelsius(212)).toBe(100);
  });

  it('converts 100.4°F to 38°C', () => {
    expect(toCelsius(100.4)).toBe(38);
  });

  it('converts 98.6°F to ~37°C', () => {
    expect(toCelsius(98.6)).toBe(37);
  });
});

// ─── prevDay ─────────────────────────────────────────────────────────────────

describe('prevDay', () => {
  it('returns the previous day', () => {
    expect(prevDay('2026-10-23')).toBe('2026-10-22');
  });

  it('handles month boundary', () => {
    expect(prevDay('2026-11-01')).toBe('2026-10-31');
  });

  it('handles year boundary', () => {
    expect(prevDay('2026-01-01')).toBe('2025-12-31');
  });
});

// ─── formatDayKey ────────────────────────────────────────────────────────────

describe('formatDayKey', () => {
  it('formats a date as YYYY-MM-DD with zero-padded month and day', () => {
    expect(formatDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats double-digit month and day', () => {
    expect(formatDayKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });
});

// ─── calcFeverFreeStreak ─────────────────────────────────────────────────────

describe('calcFeverFreeStreak', () => {
  it('returns 0 for empty readings', () => {
    expect(calcFeverFreeStreak([])).toBe(0);
  });

  it('returns 0 when the most recent reading is a fever', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 101.5 }, // fever on most recent day
    ];
    expect(calcFeverFreeStreak(readings)).toBe(0);
  });

  it('returns 1 for a single fever-free reading', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-23', valueF: 98.6 },
    ];
    expect(calcFeverFreeStreak(readings)).toBe(1);
  });

  it('returns 2 for two consecutive fever-free days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-21', valueF: 101.0 }, // fever
      { dayKey: '2026-10-22', valueF: 98.0 },
      { dayKey: '2026-10-23', valueF: 98.5 },
    ];
    expect(calcFeverFreeStreak(readings)).toBe(2);
  });

  it('returns 3 for three consecutive fever-free days (discharge ready)', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-20', valueF: 102.0 }, // fever
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    expect(calcFeverFreeStreak(readings)).toBe(3);
  });

  it('returns 5 for a long streak of fever-free days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-19', valueF: 98.0 },
      { dayKey: '2026-10-20', valueF: 97.5 },
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    expect(calcFeverFreeStreak(readings)).toBe(5);
  });

  it('breaks streak on a gap in calendar days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-20', valueF: 98.0 }, // gap: 10-21 missing
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    // Only 22 and 23 are consecutive
    expect(calcFeverFreeStreak(readings)).toBe(2);
  });

  it('handles readings provided in unsorted order', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-23', valueF: 99.0 },
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
    ];
    expect(calcFeverFreeStreak(readings)).toBe(3);
  });

  it('counts correctly when fever is mid-history', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-19', valueF: 98.0 },
      { dayKey: '2026-10-20', valueF: 101.0 }, // fever breaks it
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    // Streak from 21→22→23 = 3
    expect(calcFeverFreeStreak(readings)).toBe(3);
  });
});

// ─── isReadyForDischarge ─────────────────────────────────────────────────────

describe('isReadyForDischarge', () => {
  it('returns false for fewer than 3 fever-free days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-22', valueF: 98.0 },
      { dayKey: '2026-10-23', valueF: 98.5 },
    ];
    expect(isReadyForDischarge(readings)).toBe(false);
  });

  it('returns true for exactly 3 consecutive fever-free days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    expect(isReadyForDischarge(readings)).toBe(true);
  });

  it('returns true for more than 3 consecutive fever-free days', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-19', valueF: 97.8 },
      { dayKey: '2026-10-20', valueF: 98.0 },
      { dayKey: '2026-10-21', valueF: 98.0 },
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    expect(isReadyForDischarge(readings)).toBe(true);
  });

  it('returns false when streak is broken by a fever', () => {
    const readings: ReadingForStreak[] = [
      { dayKey: '2026-10-20', valueF: 98.0 },
      { dayKey: '2026-10-21', valueF: 101.5 }, // fever
      { dayKey: '2026-10-22', valueF: 98.2 },
      { dayKey: '2026-10-23', valueF: 99.0 },
    ];
    expect(isReadyForDischarge(readings)).toBe(false);
  });

  it('exports the required streak constant as 3', () => {
    expect(DISCHARGE_STREAK_DAYS).toBe(3);
  });
});

// ─── hasTemperatureToday ─────────────────────────────────────────────────────

describe('hasTemperatureToday', () => {
  it('returns true when a reading exists for today', () => {
    const readings = [
      { dayKey: '2026-10-22' },
      { dayKey: '2026-10-23' },
    ];
    expect(hasTemperatureToday(readings, '2026-10-23')).toBe(true);
  });

  it('returns false when no reading exists for today', () => {
    const readings = [
      { dayKey: '2026-10-21' },
      { dayKey: '2026-10-22' },
    ];
    expect(hasTemperatureToday(readings, '2026-10-23')).toBe(false);
  });

  it('returns false for empty readings', () => {
    expect(hasTemperatureToday([], '2026-10-23')).toBe(false);
  });
});

// ─── hasDoctorVisitToday ─────────────────────────────────────────────────────

describe('hasDoctorVisitToday', () => {
  it('returns true when a visit exists for today', () => {
    const visits = [{ dayKey: '2026-10-23' }];
    expect(hasDoctorVisitToday(visits, '2026-10-23')).toBe(true);
  });

  it('returns false when no visit exists for today', () => {
    const visits = [{ dayKey: '2026-10-22' }];
    expect(hasDoctorVisitToday(visits, '2026-10-23')).toBe(false);
  });
});

// ─── canDoctorVisit ──────────────────────────────────────────────────────────

describe('canDoctorVisit', () => {
  it('returns false when no temperature has been recorded today', () => {
    const readings = [{ dayKey: '2026-10-22' }];
    expect(canDoctorVisit(readings, '2026-10-23')).toBe(false);
  });

  it('returns true after temperature is recorded for today', () => {
    const readings = [
      { dayKey: '2026-10-22' },
      { dayKey: '2026-10-23' },
    ];
    expect(canDoctorVisit(readings, '2026-10-23')).toBe(true);
  });

  it('returns false for empty readings', () => {
    expect(canDoctorVisit([], '2026-10-23')).toBe(false);
  });
});

/**
 * Pure business-rule helpers for QuarantineCare.
 * These are free of side effects and DB calls — easy to unit-test.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Fever threshold in °F. Anything >= this is considered a fever. */
export const FEVER_THRESHOLD_F = 100.4;

/** Number of consecutive fever-free calendar days required for discharge. */
export const DISCHARGE_STREAK_DAYS = 3;

// ─── Temperature conversions ─────────────────────────────────────────────────

/** Returns true if the temperature (in °F) meets or exceeds the fever threshold. */
export function isFever(tempF: number): boolean {
  return tempF >= FEVER_THRESHOLD_F;
}

/** Celsius → Fahrenheit, rounded to 1 decimal. */
export function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

/** Fahrenheit → Celsius, rounded to 1 decimal. */
export function toCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9 * 10) / 10;
}

// ─── Date helpers (pure) ─────────────────────────────────────────────────────

/** Subtract one calendar day from a YYYY-MM-DD string and return a new string. */
export function prevDay(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1);
  return formatDayKey(date);
}

/** Format a Date object as YYYY-MM-DD. */
export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Fever-free streak ──────────────────────────────────────────────────────

export interface ReadingForStreak {
  dayKey: string;
  valueF: number;
}

/**
 * Calculate the number of consecutive fever-free calendar days ending at the
 * most-recent reading.
 *
 * Rules:
 * - Readings are sorted newest → oldest.
 * - The streak counts only while each reading is fever-free AND the days are
 *   consecutive (no gap days).
 * - If the most-recent reading is a fever, the streak is 0.
 */
export function calcFeverFreeStreak(readings: ReadingForStreak[]): number {
  if (readings.length === 0) return 0;

  // Sort descending by dayKey (most recent first)
  const sorted = [...readings].sort((a, b) => b.dayKey.localeCompare(a.dayKey));

  let streak = 0;
  let expectedDay: string | null = null;

  for (const reading of sorted) {
    // If this reading is a fever, the streak is broken
    if (isFever(reading.valueF)) break;

    // If we're expecting a specific day and this isn't it, there's a gap
    if (expectedDay !== null && reading.dayKey !== expectedDay) break;

    streak++;
    expectedDay = prevDay(reading.dayKey);
  }

  return streak;
}

// ─── Discharge readiness ─────────────────────────────────────────────────────

/**
 * A patient is ready for discharge after DISCHARGE_STREAK_DAYS (3) consecutive
 * calendar days with no fever.
 */
export function isReadyForDischarge(readings: ReadingForStreak[]): boolean {
  return calcFeverFreeStreak(readings) >= DISCHARGE_STREAK_DAYS;
}

// ─── Daily workflow checks ───────────────────────────────────────────────────

/** Has this patient already had a (non-correction) temperature reading today? */
export function hasTemperatureToday(
  readings: { dayKey: string }[],
  today: string
): boolean {
  return readings.some((r) => r.dayKey === today);
}

/** Has this patient already had a doctor visit today? */
export function hasDoctorVisitToday(
  visits: { dayKey: string }[],
  today: string
): boolean {
  return visits.some((v) => v.dayKey === today);
}

/**
 * A doctor can only visit a patient after the nurse has taken a temperature
 * reading for that day.
 */
export function canDoctorVisit(
  readings: { dayKey: string }[],
  today: string
): boolean {
  return hasTemperatureToday(readings, today);
}

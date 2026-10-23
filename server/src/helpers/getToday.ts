import Setting from '../models/Setting';

/**
 * Compute a YYYY-MM-DD date key in Asia/Kolkata timezone with an optional day offset.
 * This is the pure (non-DB) core — exported separately for unit testing.
 */
export function computeDateKey(now: Date = new Date(), offsetDays: number = 0): string {
  // Get the date parts in IST (Asia/Kolkata, UTC+5:30, no DST)
  const istString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  // istString is "YYYY-MM-DD" in en-CA locale
  const [year, month, day] = istString.split('-').map(Number);

  // Create a local date and shift by offset
  const shifted = new Date(year, month - 1, day + offsetDays);

  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Canonical "today" for all business logic.
 * Reads the `dayOffset` setting from the DB (defaults to 0), then
 * returns the current date key in Asia/Kolkata adjusted by that offset.
 *
 * IMPORTANT: Every piece of business logic that needs "today" MUST call this
 * function. Never use `new Date()` directly.
 */
export async function getToday(): Promise<string> {
  let offset = 0;
  try {
    const setting = await Setting.findOne({ key: 'dayOffset' }).lean();
    if (setting && typeof setting.value === 'number') {
      offset = setting.value;
    }
  } catch {
    // If DB isn't connected yet, fall back to 0 offset
  }
  return computeDateKey(new Date(), offset);
}

/**
 * Returns a Date object representing the start of "today" (midnight IST).
 */
export async function getTodayDate(): Promise<Date> {
  const key = await getToday();
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

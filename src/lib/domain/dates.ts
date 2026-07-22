/**
 * Pure date helpers for deadline + retention engines (ISO date strings YYYY-MM-DD).
 * Avoid timezone surprises by working in UTC calendar components.
 */

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
}

export function compareIso(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso).getTime();
  const b = parseIsoDate(toIso).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** fiscalYearEnd is MM-DD (e.g. 12-31). Returns Form 990 due date for the FY ending in `year`. */
export function form990DueDate(fiscalYearEnd: string, year: number): string {
  const [mm, dd] = fiscalYearEnd.split("-").map(Number);
  // FY ends year-mm-dd; due = 15th day of 5th month after FY end
  const fyEnd = new Date(Date.UTC(year, mm - 1, dd));
  const due = new Date(Date.UTC(fyEnd.getUTCFullYear(), fyEnd.getUTCMonth() + 5, 15));
  return toIsoDate(due);
}

export function dateInYear(year: number, month: number, day: number): string {
  return toIsoDate(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Recurring FS calendar (handbook Part 2) — pure expansion into dated tasks.
 * Dollar amounts / IRS thresholds stay configurable elsewhere.
 */
import {
  addDays,
  compareIso,
  dateInYear,
  form990DueDate,
  todayIso,
} from "./dates";

export type TaskCategory =
  | "retention"
  | "assessment"
  | "audit"
  | "990"
  | "365"
  | "bonding"
  | "supply"
  | "comp"
  | "member"
  | "general";

export type DeadlineOccurrence = {
  /** Stable key for dedupe across cron runs */
  key: string;
  name: string;
  category: TaskCategory;
  dueDate: string;
  detail: string;
  leadDays: number;
};

export type ExpandOptions = {
  /** Inclusive start (default: today) */
  from?: string;
  /** Inclusive end (default: from + horizonDays) */
  to?: string;
  horizonDays?: number;
  fiscalYearEnd?: string; // MM-DD
  now?: Date;
};

/**
 * Built-in recurring obligations for a Financial Secretary.
 * Expand for a calendar year range — not stored as RRULE strings (those are optional DB overrides).
 */
export function expandBuiltinDeadlines(opts: ExpandOptions = {}): DeadlineOccurrence[] {
  const now = opts.now ?? new Date();
  const from = opts.from ?? todayIso(now);
  const to =
    opts.to ??
    addDays(from, opts.horizonDays ?? 120);
  const fyEnd = opts.fiscalYearEnd ?? "12-31";

  const years = yearSpan(from, to);
  const out: DeadlineOccurrence[] = [];

  for (const year of years) {
    // Assessment levies Jan 1 & Jul 1
    out.push(
      occ(
        `levy-jan-${year}`,
        `Assessment levy date (Jan ${year})`,
        "assessment",
        dateInYear(year, 1, 1),
        "Per Capita, Catholic Advertising, Culture of Life assessed on total membership (excl. honorary life & disabled). Verify amounts in Settings.",
        7,
      ),
      occ(
        `levy-jul-${year}`,
        `Assessment levy date (Jul ${year})`,
        "assessment",
        dateInYear(year, 7, 1),
        "Per Capita, Catholic Advertising, Culture of Life assessed. Verify amounts in Settings.",
        7,
      ),
      // Pay-by Apr 10 / Oct 10
      occ(
        `payby-apr-${year}`,
        `Supreme assessments pay-by (Apr 10, ${year})`,
        "assessment",
        dateInYear(year, 4, 10),
        "Pay Per Capita / CA / Culture of Life. Council auto-suspend risk if arrearage ≥ $50 on any account. 100-day grace per levy.",
        30,
      ),
      occ(
        `payby-oct-${year}`,
        `Supreme assessments pay-by (Oct 10, ${year})`,
        "assessment",
        dateInYear(year, 10, 10),
        "Pay Per Capita / CA / Culture of Life. Hard-alert well before $50 arrearage auto-suspension.",
        30,
      ),
      // Semi-annual audit — due in Jan & Jul (prep window)
      occ(
        `audit-jan-${year}`,
        `Semi-annual audit #1295 (Jan ${year})`,
        "audit",
        dateInYear(year, 1, 31),
        "GK + trustees perform audit. FS gathers records. Frozen roster dated Jan 1. Bond void if last two audits not on file.",
        21,
      ),
      occ(
        `audit-jul-${year}`,
        `Semi-annual audit #1295 (Jul ${year})`,
        "audit",
        dateInYear(year, 7, 31),
        "GK + trustees perform audit. FS gathers records. Frozen roster dated Jul 1.",
        21,
      ),
      // Form 365 by Aug 1
      occ(
        `form365-${year}`,
        `Form 365 Service Program Personnel (due Aug 1, ${year})`,
        "365",
        dateInYear(year, 8, 1),
        "GK owns filing via Member Management; FS nudges. Due at Supreme Aug 1.",
        21,
      ),
      // Bonding Mar/Apr
      occ(
        `bonding-mar-${year}`,
        `Bonding charge window (Mar ${year})`,
        "bonding",
        dateInYear(year, 3, 15),
        "Bond runs Mar 1 → end of Feb. Confirm last two #1295 audits on file or bond is void.",
        14,
      ),
      occ(
        `bonding-apr-${year}`,
        `Bonding charge posts (Apr ${year})`,
        "bonding",
        dateInYear(year, 4, 15),
        "Review bonding on Council Statement. Additional coverage $7/thousand.",
        7,
      ),
      // Roster reconcile after Jan/Jul
      occ(
        `roster-jan-${year}`,
        `Roster reconcile after Jan ${year} freeze`,
        "member",
        dateInYear(year, 1, 15),
        "Import weekly roster export; Member Management updates post Tuesdays.",
        7,
      ),
      occ(
        `roster-jul-${year}`,
        `Roster reconcile after Jul ${year} freeze`,
        "member",
        dateInYear(year, 7, 15),
        "Import weekly roster export after mid-year freeze.",
        7,
      ),
      // Form 990 for FY ending in `year`
      occ(
        `form990-fy${year}`,
        `Form 990 due (FY ending ${year})`,
        "990",
        form990DueDate(fyEnd, year),
        "US councils 501(c)(8). Due 15th day of 5th month after FY end. Miss 3 consecutive years → lose tax-exempt status. Verify current IRS receipt thresholds.",
        45,
      ),
    );

    // Monthly Council Statement (1st of each month)
    for (let month = 1; month <= 12; month++) {
      out.push(
        occ(
          `statement-${year}-${String(month).padStart(2, "0")}`,
          `Review Council Statement (${month}/${year})`,
          "assessment",
          dateInYear(year, month, 1),
          "Review monthly Council Statement; read at next meeting. Watch arrearage approaching $50 auto-suspension.",
          3,
        ),
      );
    }
  }

  return out
    .filter((o) => compareIso(o.dueDate, from) >= 0 && compareIso(o.dueDate, to) <= 0)
    .sort((a, b) => compareIso(a.dueDate, b.dueDate));
}

/**
 * Occurrences that should already have a task (within lead window or overdue).
 */
export function occurrencesNeedingTasks(
  occurrences: DeadlineOccurrence[],
  today: string,
): DeadlineOccurrence[] {
  return occurrences.filter((o) => {
    const leadStart = addDays(o.dueDate, -o.leadDays);
    return compareIso(today, o.dueDate) <= 0
      ? compareIso(today, leadStart) >= 0
      : true; // overdue still needs attention if we expand past due
  });
}

function occ(
  key: string,
  name: string,
  category: TaskCategory,
  dueDate: string,
  detail: string,
  leadDays: number,
): DeadlineOccurrence {
  return { key, name, category, dueDate, detail, leadDays };
}

function yearSpan(from: string, to: string): number[] {
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  const years: number[] = [];
  for (let y = y0; y <= y1; y++) years.push(y);
  // Include prior year for 990 that might fall in early months
  if (!years.includes(y0 - 1)) years.unshift(y0 - 1);
  return years;
}

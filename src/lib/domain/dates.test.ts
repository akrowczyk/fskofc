import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  form990DueDate,
  parseIsoDate,
  toIsoDate,
} from "./dates";

describe("dates", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-15", 30)).toBe("2026-02-14");
    expect(addDays("2026-01-01", 60)).toBe("2026-03-02");
  });

  it("computes 990 due = 15th of 5th month after FY end", () => {
    // FY ends 2025-12-31 → due 2026-05-15
    expect(form990DueDate("12-31", 2025)).toBe("2026-05-15");
    // FY ends Jun 30, 2025 → Nov 15, 2025
    expect(form990DueDate("06-30", 2025)).toBe("2025-11-15");
  });

  it("daysBetween is signed", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-01-31", "2026-01-01")).toBe(-30);
  });

  it("round-trips ISO", () => {
    const d = parseIsoDate("2026-07-22");
    expect(toIsoDate(d)).toBe("2026-07-22");
  });
});

import { describe, expect, it } from "vitest";
import { expandBuiltinDeadlines } from "./deadlines";

describe("expandBuiltinDeadlines", () => {
  it("includes spring and fall assessment pay-by dates in range", () => {
    const occ = expandBuiltinDeadlines({
      from: "2026-01-01",
      to: "2026-12-31",
      fiscalYearEnd: "12-31",
    });
    const keys = occ.map((o) => o.key);
    expect(keys).toContain("payby-apr-2026");
    expect(keys).toContain("payby-oct-2026");
    expect(keys).toContain("form365-2026");
    expect(keys).toContain("form185-2026");
    expect(keys).toContain("audit-1295a-2026");
    expect(keys).not.toContain("audit-jan-2026");
    expect(keys).not.toContain("audit-jul-2026");
    expect(keys).toContain("cash-handoff-jun-2026");
    expect(keys).toContain("form990-fy2025"); // FY ending 2025 due in 2026
  });

  it("Form 365 is due June 30 (not the old handbook August 1)", () => {
    const occ = expandBuiltinDeadlines({
      from: "2026-06-01",
      to: "2026-06-30",
    });
    const f365 = occ.find((o) => o.key === "form365-2026");
    expect(f365?.dueDate).toBe("2026-06-30");
    expect(f365?.category).toBe("365");
    const f185 = occ.find((o) => o.key === "form185-2026");
    expect(f185?.dueDate).toBe("2026-06-30");
  });

  it("annual 1295A is due August 15 for the June 30 period", () => {
    const occ = expandBuiltinDeadlines({
      from: "2026-08-01",
      to: "2026-08-31",
    });
    const audit = occ.find((o) => o.key === "audit-1295a-2026");
    expect(audit?.dueDate).toBe("2026-08-15");
    expect(audit?.category).toBe("audit");
  });

  it("form990 due date for calendar FY is May 15", () => {
    const occ = expandBuiltinDeadlines({
      from: "2026-05-01",
      to: "2026-05-31",
      fiscalYearEnd: "12-31",
    });
    const f990 = occ.find((o) => o.key === "form990-fy2025");
    expect(f990?.dueDate).toBe("2026-05-15");
    expect(f990?.category).toBe("990");
  });

  it("respects horizon window", () => {
    const occ = expandBuiltinDeadlines({
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(occ.every((o) => o.dueDate >= "2026-03-01" && o.dueDate <= "2026-03-31")).toBe(
      true,
    );
    expect(occ.some((o) => o.key.startsWith("statement-2026-03"))).toBe(true);
  });
});

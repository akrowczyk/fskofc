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
    expect(keys).toContain("audit-jan-2026");
    expect(keys).toContain("form990-fy2025"); // FY ending 2025 due in 2026
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

import { describe, expect, it } from "vitest";
import {
  auditPeriodLabel,
  coerceWorksheet,
  emptyWorksheet,
  mergeChecklist,
  sumMoney,
  worksheetTotals,
} from "./audit-worksheet";
import { parseCouncilEin } from "./ein";

describe("1295A worksheet", () => {
  it("labels the annual period", () => {
    expect(auditPeriodLabel(2026)).toBe("Period ending June 30, 2026");
  });

  it("totals balance sheet and cash-flow sections", () => {
    const w = emptyWorksheet({ year: 2026 });
    w.currentAssets.checkingAccount = 100.1;
    w.currentAssets.savingsAccount = 50;
    w.liabilities.unpaidBills = 20;
    w.investments.mutualFunds = 200;
    w.property.realEstate = 5;
    w.incoming.dues = 30;
    w.incoming.eventRevenues = 10;
    w.outgoing.supplies = 4;
    const t = worksheetTotals(w);
    expect(t.currentAssets).toBe(150.1);
    expect(t.liabilities).toBe(20);
    expect(t.investments).toBe(200);
    expect(t.property).toBe(5);
    expect(t.otherAssets).toBe(205);
    expect(t.incoming).toBe(40);
    expect(t.outgoing).toBe(4);
  });

  it("ignores legacy Schedule B/C blobs", () => {
    const w = coerceWorksheet(
      { lines: [{ label: "Dues receipts", amount: 12 }] },
      { year: 2026, ein: "12-3456789" },
    );
    expect(w.version).toBe("1295A");
    expect(w.ein).toBe("12-3456789");
    expect(sumMoney(w.currentAssets)).toBe(0);
  });

  it("round-trips a saved 1295A payload", () => {
    const saved = emptyWorksheet({ year: 2025 });
    saved.incoming.dues = 99;
    saved.hasKccfAccount = "yes";
    saved.reviewedBy.grandKnight = true;
    const again = coerceWorksheet(JSON.parse(JSON.stringify(saved)));
    expect(again.periodEndingYear).toBe(2025);
    expect(again.incoming.dues).toBe(99);
    expect(again.hasKccfAccount).toBe("yes");
    expect(again.reviewedBy.grandKnight).toBe(true);
  });

  it("keeps new checklist keys when merging old saves", () => {
    const merged = mergeChecklist({
      "Bank statements for the period": true,
      "Obsolete key": true,
    });
    expect(merged["Bank statements for the period"]).toBe(true);
    expect(merged["Ready to enter in Officers Online (do not mail worksheet to Supreme)"]).toBe(
      false,
    );
    expect(
      merged["FS report of vouchers (Member Billing / Print Center; FS + GK signed)"],
    ).toBe(false);
    expect(merged["Obsolete key"]).toBeUndefined();
  });
});

describe("parseCouncilEin", () => {
  it("accepts blank or NN-NNNNNNN", () => {
    expect(parseCouncilEin("")).toEqual({ ok: true, ein: null });
    expect(parseCouncilEin("12-3456789")).toEqual({ ok: true, ein: "12-3456789" });
  });

  it("rejects malformed values", () => {
    expect(parseCouncilEin("123456789").ok).toBe(false);
    expect(parseCouncilEin("12-345678").ok).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calculateCompensation, sumSchedule } from "./compensation";

describe("calculateCompensation", () => {
  it("computes 8% council + certs and 1099 flag", () => {
    const r = calculateCompensation({
      duesCollected: 10000,
      compPercent: 8,
      insuranceCerts: 50,
    });
    expect(r.compFromCouncil).toBe(800);
    expect(r.compFromSupreme).toBe(20);
    expect(r.total).toBe(820);
    expect(r.form1099Expected).toBe(true);
  });

  it("waives council portion", () => {
    const r = calculateCompensation({
      duesCollected: 5000,
      compPercent: 10,
      insuranceCerts: 10,
      waived: true,
    });
    expect(r.compFromCouncil).toBe(0);
    expect(r.compFromSupreme).toBe(4);
    expect(r.form1099Expected).toBe(false);
  });

  it("clamps percent to 8–10", () => {
    expect(
      calculateCompensation({
        duesCollected: 1000,
        compPercent: 5,
        insuranceCerts: 0,
      }).compFromCouncil,
    ).toBe(80);
  });
});

describe("sumSchedule", () => {
  it("sums lines", () => {
    expect(
      sumSchedule([
        { label: "a", amount: 10.5 },
        { label: "b", amount: 20 },
      ]),
    ).toBe(30.5);
  });
});

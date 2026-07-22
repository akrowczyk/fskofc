import { describe, expect, it } from "vitest";
import { containsTaxId, rejectTaxIdFields } from "./pii-guard";

describe("containsTaxId", () => {
  it("rejects classic SSN formats", () => {
    expect(containsTaxId("123-45-6789")).toBe(true);
    expect(containsTaxId("123 45 6789")).toBe(true);
    expect(containsTaxId("SSN 123456789")).toBe(true);
  });

  it("rejects EIN", () => {
    expect(containsTaxId("12-3456789")).toBe(true);
  });

  it("rejects labeled tax IDs", () => {
    expect(containsTaxId("SSN: 123-45-6789")).toBe(true);
    expect(containsTaxId("tax id 987654321")).toBe(true);
  });

  it("allows normal member text", () => {
    expect(containsTaxId("John Smith")).toBe(false);
    expect(containsTaxId("Wood Dale, IL 60191")).toBe(false);
    expect(containsTaxId("Member #10325-0042")).toBe(false);
    expect(containsTaxId("Call after 5pm")).toBe(false);
    expect(containsTaxId("Dues $30 for 2026")).toBe(false);
  });

  it("handles empty", () => {
    expect(containsTaxId(null)).toBe(false);
    expect(containsTaxId("")).toBe(false);
  });
});

describe("rejectTaxIdFields", () => {
  it("passes clean member payload", () => {
    const result = rejectTaxIdFields({
      firstName: "Joseph",
      lastName: "McGivney",
      notes: "Prefers email; wife is Mary",
      phone: "630-555-0100",
    });
    expect(result.ok).toBe(true);
  });

  it("fails when notes embed SSN", () => {
    const result = rejectTaxIdFields({
      firstName: "Test",
      notes: "SSN on file 123-45-6789 — remove this",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("notes");
    }
  });
});

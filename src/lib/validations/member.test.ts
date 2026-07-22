import { describe, expect, it } from "vitest";
import { formatZodError } from "./format-errors";
import { memberFormSchema } from "./member";

describe("memberFormSchema", () => {
  const base = {
    memberNumber: "123",
    firstName: "Joseph",
    lastName: "Smith",
    contactPref: "email",
    memberType: "associate",
    status: "active",
  };

  it("accepts empty optional degree and dues", () => {
    const r = memberFormSchema.safeParse({
      ...base,
      degree: null,
      duesRate: null,
      email: "",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty string degree from form", () => {
    const r = memberFormSchema.safeParse({
      ...base,
      degree: "",
      duesRate: "",
    });
    expect(r.success).toBe(true);
  });

  it("explains invalid email", () => {
    const r = memberFormSchema.safeParse({
      ...base,
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = formatZodError(r.error);
      expect(msg.toLowerCase()).toMatch(/email/);
      expect(msg.toLowerCase()).not.toBe("invalid input");
    }
  });

  it("explains missing first name", () => {
    const r = memberFormSchema.safeParse({
      ...base,
      firstName: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = formatZodError(r.error);
      expect(msg.toLowerCase()).toMatch(/first name/);
    }
  });

  it("explains degree out of range", () => {
    const r = memberFormSchema.safeParse({
      ...base,
      degree: "9",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = formatZodError(r.error);
      expect(msg.toLowerCase()).toMatch(/degree/);
      expect(msg).toMatch(/1 and 4|between/i);
    }
  });
});

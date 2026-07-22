import { z } from "zod";
import { emptyToNull } from "./format-errors";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .nullable()
    .or(z.literal(""));

export const memberFormSchema = z.object({
  memberNumber: z
    .string()
    .trim()
    .min(1, "Member number is required")
    .max(50, "Member number must be at most 50 characters"),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be at most 100 characters"),
  addressLine1: optionalText(200, "Address"),
  addressLine2: optionalText(200, "Address line 2"),
  city: optionalText(100, "City"),
  state: optionalText(40, "State"),
  zip: optionalText(20, "ZIP"),
  phone: optionalText(40, "Phone"),
  email: z
    .union([
      z.literal(""),
      z.null(),
      z.string().email("Email must look like name@example.com"),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  contactPref: z.enum(["email", "mail", "phone", "none"], {
    error: "Contact preference must be email, mail, phone, or none",
  }),
  memberType: z.enum(
    [
      "associate",
      "insurance",
      "inactive",
      "honorary",
      "honorary_life",
      "disabled",
    ],
    {
      error: "Member type is not a valid option",
    },
  ),
  degree: z.preprocess(
    emptyToNull,
    z
      .union([
        z.null(),
        z.coerce
          .number({ error: "Degree must be a number from 1 to 4" })
          .int("Degree must be a whole number")
          .min(1, "Degree must be between 1 and 4")
          .max(4, "Degree must be between 1 and 4"),
      ])
      .optional(),
  ),
  joinDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  status: z.enum(
    ["active", "suspended", "withdrawn", "deceased", "transferred"],
    { error: "Status is not a valid option" },
  ),
  duesRate: z.preprocess(
    emptyToNull,
    z
      .union([
        z.null(),
        z.coerce
          .number({ error: "Dues rate must be a number" })
          .min(0, "Dues rate cannot be negative"),
      ])
      .optional(),
  ),
  notes: optionalText(5000, "Notes"),
  addressRestricted: z
    .union([
      z.boolean(),
      z.literal("on"),
      z.literal("true"),
      z.literal("false"),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

export type MemberFormInput = z.infer<typeof memberFormSchema>;

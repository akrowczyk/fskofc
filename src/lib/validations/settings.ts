import { z } from "zod";
import { emptyToNull } from "./format-errors";

export const councilSettingsSchema = z.object({
  councilNumber: z
    .string()
    .trim()
    .min(1, "Council number is required")
    .max(20, "Council number must be at most 20 characters"),
  councilName: z
    .string()
    .trim()
    .min(1, "Council name is required")
    .max(200, "Council name must be at most 200 characters"),
  fiscalYearEnd: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "Fiscal year end must be MM-DD (e.g. 12-31)"),
  gkName: z.string().max(200).optional().nullable(),
  ddName: z.string().max(200).optional().nullable(),
  trusteeNames: z.string().optional().nullable(),
  fromEmail: z
    .union([
      z.literal(""),
      z.null(),
      z.string().email("From email must look like name@example.com"),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  mailingAddress: z.string().max(1000).optional().nullable(),
  compPercent: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "Compensation % must be a number" })
      .min(8, "Compensation % must be between 8 and 10")
      .max(10, "Compensation % must be between 8 and 10"),
  ),
  duesDefault: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "Default dues must be a number" })
      .min(5, "Default dues must be at least $5"),
  ),
  duesUnder26: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "Dues under 26 must be a number" })
      .min(3, "Dues under 26 must be at least $3"),
  ),
  bondingNote: z.string().max(2000).optional().nullable(),
});

export type CouncilSettingsInput = z.infer<typeof councilSettingsSchema>;

export const assessmentConfigRowSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  verifiedAt: z.string().optional().nullable(),
});

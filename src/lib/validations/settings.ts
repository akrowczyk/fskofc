import { z } from "zod";

export const councilSettingsSchema = z.object({
  councilNumber: z.string().min(1).max(20),
  councilName: z.string().min(1).max(200),
  fiscalYearEnd: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "Use MM-DD (e.g. 12-31)"),
  gkName: z.string().max(200).optional().nullable(),
  ddName: z.string().max(200).optional().nullable(),
  trusteeNames: z.string().optional().nullable(), // comma-separated in form
  fromEmail: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional()
    .nullable(),
  mailingAddress: z.string().max(1000).optional().nullable(),
  compPercent: z.coerce.number().min(8).max(10),
  duesDefault: z.coerce.number().min(5),
  duesUnder26: z.coerce.number().min(3),
  bondingNote: z.string().max(2000).optional().nullable(),
});

export type CouncilSettingsInput = z.infer<typeof councilSettingsSchema>;

export const assessmentConfigRowSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  verifiedAt: z.string().optional().nullable(), // YYYY-MM-DD
});

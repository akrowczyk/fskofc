import { z } from "zod";

export const memberFormSchema = z.object({
  memberNumber: z.string().min(1, "Member number required").max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .nullable(),
  contactPref: z.enum(["email", "mail", "phone", "none"]).default("email"),
  memberType: z
    .enum([
      "associate",
      "insurance",
      "inactive",
      "honorary",
      "honorary_life",
      "disabled",
    ])
    .default("associate"),
  degree: z.coerce.number().int().min(1).max(4).optional().nullable(),
  joinDate: z.string().optional().nullable(),
  status: z
    .enum(["active", "suspended", "withdrawn", "deceased", "transferred"])
    .default("active"),
  duesRate: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  addressRestricted: z
    .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

export type MemberFormInput = z.infer<typeof memberFormSchema>;

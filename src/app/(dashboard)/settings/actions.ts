"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { assessmentConfig, auditLog, councilSettings } from "@/db/schema";
import { rejectTaxIdFields } from "@/lib/domain/pii-guard";
import { ASSESSMENT_DEFAULTS_2009 } from "@/lib/domain/assessment-defaults";
import { councilSettingsSchema } from "@/lib/validations/settings";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function saveCouncilSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireFs();

  const raw = {
    councilNumber: String(formData.get("councilNumber") ?? ""),
    councilName: String(formData.get("councilName") ?? ""),
    fiscalYearEnd: String(formData.get("fiscalYearEnd") ?? ""),
    gkName: String(formData.get("gkName") ?? "") || null,
    ddName: String(formData.get("ddName") ?? "") || null,
    trusteeNames: String(formData.get("trusteeNames") ?? "") || null,
    fromEmail: String(formData.get("fromEmail") ?? "") || null,
    mailingAddress: String(formData.get("mailingAddress") ?? "") || null,
    compPercent: formData.get("compPercent"),
    duesDefault: formData.get("duesDefault"),
    duesUnder26: formData.get("duesUnder26"),
    bondingNote: String(formData.get("bondingNote") ?? "") || null,
  };

  const pii = rejectTaxIdFields({
    councilName: raw.councilName,
    gkName: raw.gkName,
    ddName: raw.ddName,
    trusteeNames: raw.trusteeNames,
    mailingAddress: raw.mailingAddress,
    bondingNote: raw.bondingNote,
  });
  if (!pii.ok) {
    return { ok: false, error: pii.reason };
  }

  const parsed = councilSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const data = parsed.data;
  const trustees = (data.trusteeNames ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const db = getDb();
  const existing = await db.select().from(councilSettings).limit(1);

  const values = {
    councilNumber: data.councilNumber,
    councilName: data.councilName,
    fiscalYearEnd: data.fiscalYearEnd,
    gkName: data.gkName,
    ddName: data.ddName,
    trusteeNames: trustees,
    fromEmail: data.fromEmail || null,
    mailingAddress: data.mailingAddress,
    compPercent: String(data.compPercent),
    duesDefault: String(data.duesDefault),
    duesUnder26: String(data.duesUnder26),
    bondingNote: data.bondingNote,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db
      .update(councilSettings)
      .set(values)
      .where(eq(councilSettings.id, existing[0].id));
  } else {
    await db.insert(councilSettings).values(values);
  }

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "settings.update",
    entity: "council_settings",
    detail: { councilNumber: data.councilNumber },
  });

  revalidatePath("/settings");
  return { ok: true, message: "Settings saved." };
}

export async function seedAssessmentDefaults(): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  const existing = await db.select().from(assessmentConfig).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "Assessment config already seeded." };
  }

  await db.insert(assessmentConfig).values(
    ASSESSMENT_DEFAULTS_2009.map((row) => ({
      kind: row.kind,
      amount: row.amount,
      effectiveFrom: "2009-01-01",
      verifiedAt: null,
      note: "Seeded from 2009 handbook — verify against current Supreme figures",
    })),
  );

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "assessment_config.seed",
    entity: "assessment_config",
  });

  revalidatePath("/settings");
  return { ok: true, message: "2009 assessment defaults seeded." };
}

export async function markAssessmentVerified(
  id: string,
): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  await db
    .update(assessmentConfig)
    .set({ verifiedAt: today })
    .where(eq(assessmentConfig.id, id));

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "assessment_config.verify",
    entity: "assessment_config",
    entityId: id,
  });

  revalidatePath("/settings");
  return { ok: true, message: "Marked verified." };
}

export async function updateAssessmentAmount(
  id: string,
  amount: number,
): Promise<ActionResult> {
  const user = await requireFs();
  if (!(amount > 0)) {
    return { ok: false, error: "Amount must be positive." };
  }
  const db = getDb();
  await db
    .update(assessmentConfig)
    .set({ amount: String(amount), verifiedAt: null })
    .where(eq(assessmentConfig.id, id));

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "assessment_config.update",
    entity: "assessment_config",
    entityId: id,
    detail: { amount },
  });

  revalidatePath("/settings");
  return { ok: true, message: "Amount updated — re-verify when confirmed." };
}

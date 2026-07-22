"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, compRecords, councilSettings } from "@/db/schema";
import { calculateCompensation } from "@/lib/domain/compensation";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function listCompRecords() {
  await requireFs();
  return getDb().select().from(compRecords).orderBy(desc(compRecords.year));
}

export async function saveCompRecord(formData: FormData): Promise<ActionResult> {
  const user = await requireFs();
  const year = Number(formData.get("year"));
  const duesCollected = Number(formData.get("duesCollected"));
  let compPercent = Number(formData.get("compPercent"));
  const insuranceCerts = Number(formData.get("insuranceCerts"));
  const waived = formData.get("waived") === "true" || formData.get("waived") === "on";
  const w9OnFile =
    formData.get("w9OnFile") === "true" || formData.get("w9OnFile") === "on";
  const note = String(formData.get("note") ?? "") || null;
  const id = String(formData.get("id") ?? "") || null;

  if (!year || Number.isNaN(duesCollected)) {
    return { ok: false, error: "Year and dues collected required." };
  }

  const db = getDb();
  if (!compPercent) {
    const settings = await db.select().from(councilSettings).limit(1);
    compPercent = Number(settings[0]?.compPercent ?? 8);
  }

  const calc = calculateCompensation({
    duesCollected,
    compPercent,
    insuranceCerts: insuranceCerts || 0,
    waived,
  });

  const values = {
    year,
    duesCollected: String(duesCollected),
    compPercent: String(compPercent),
    compFromCouncil: String(calc.compFromCouncil),
    insuranceCerts: insuranceCerts || 0,
    compFromSupreme: String(calc.compFromSupreme),
    waived,
    w9OnFile,
    form1099Expected: calc.form1099Expected,
    note: note ?? calc.note,
  };

  if (id) {
    await db.update(compRecords).set(values).where(eq(compRecords.id, id));
  } else {
    await db.insert(compRecords).values(values);
  }

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "comp.save",
    entity: "comp_records",
    detail: { year, total: calc.total, form1099: calc.form1099Expected },
  });

  revalidatePath("/compensation");
  return {
    ok: true,
    message: `Council $${calc.compFromCouncil} + Supreme $${calc.compFromSupreme} = $${calc.total}${calc.form1099Expected ? " (1099 expected)" : ""}`,
  };
}

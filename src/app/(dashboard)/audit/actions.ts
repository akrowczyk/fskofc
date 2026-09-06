"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import {
  auditLog,
  auditPeriods,
  councilSettings,
  filingRecords,
} from "@/db/schema";
import {
  auditPeriodLabel,
  coerceWorksheet,
  DEFAULT_AUDIT_CHECKLIST,
  defaultAuditPeriodYear,
  emptyWorksheet,
  mergeChecklist,
  validateWorksheetEin,
  worksheetPiiFields,
  type Audit1295AWorksheet,
} from "@/lib/domain/audit-worksheet";
import { form990DueDate, todayIso } from "@/lib/domain/dates";
import { rejectTaxIdFields } from "@/lib/domain/pii-guard";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

async function loadCouncilDefaults() {
  const rows = await getDb().select().from(councilSettings).limit(1);
  const s = rows[0];
  return {
    ein: s?.councilEin ?? null,
    gkName: s?.gkName ?? null,
    fromEmail: s?.fromEmail ?? null,
  };
}

export async function listAuditPeriods() {
  await requireFs();
  return getDb().select().from(auditPeriods).orderBy(desc(auditPeriods.createdAt));
}

export async function createAuditPeriod(label: string): Promise<ActionResult> {
  const user = await requireFs();
  const year = defaultAuditPeriodYear();
  const trimmed = label.trim() || auditPeriodLabel(year);
  const defaults = await loadCouncilDefaults();
  const worksheet = emptyWorksheet({
    year,
    ein: defaults.ein,
    gkName: defaults.gkName,
    fromEmail: defaults.fromEmail,
  });
  const db = getDb();
  const [row] = await db
    .insert(auditPeriods)
    .values({
      label: trimmed,
      status: "open",
      gatheredChecklist: { ...DEFAULT_AUDIT_CHECKLIST },
      scheduleB: worksheet,
      scheduleC: {},
    })
    .returning({ id: auditPeriods.id });
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "audit.create",
    entity: "audit_periods",
    entityId: row.id,
  });
  revalidatePath("/audit");
  return { ok: true, id: row.id };
}

export async function updateAuditPeriod(
  id: string,
  data: {
    checklist?: Record<string, boolean>;
    worksheet?: Audit1295AWorksheet;
    notes?: string;
    status?: string;
  },
): Promise<ActionResult> {
  const user = await requireFs();
  const defaults = await loadCouncilDefaults();
  const worksheet = data.worksheet
    ? coerceWorksheet(data.worksheet, {
        ein: defaults.ein,
        gkName: defaults.gkName,
        fromEmail: defaults.fromEmail,
      })
    : undefined;

  if (worksheet) {
    const ein = validateWorksheetEin(worksheet);
    if (!ein.ok) return { ok: false, error: ein.error };
    worksheet.ein = ein.ein ?? "";
    const pii = rejectTaxIdFields(worksheetPiiFields(worksheet));
    if (!pii.ok) return { ok: false, error: pii.reason };
    if (data.notes) {
      const notesPii = rejectTaxIdFields({ notes: data.notes });
      if (!notesPii.ok) return { ok: false, error: notesPii.reason };
    }
  }

  const db = getDb();
  const patch: {
    gatheredChecklist?: Record<string, boolean>;
    scheduleB?: Audit1295AWorksheet;
    notes?: string;
    status?: string;
  } = {};
  if (data.checklist) patch.gatheredChecklist = mergeChecklist(data.checklist);
  if (worksheet) patch.scheduleB = worksheet;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.status !== undefined) patch.status = data.status;

  await db.update(auditPeriods).set(patch).where(eq(auditPeriods.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "audit.update",
    entity: "audit_periods",
    entityId: id,
  });
  revalidatePath("/audit");
  return { ok: true, message: "Saved." };
}

export async function listFilings() {
  await requireFs();
  return getDb()
    .select()
    .from(filingRecords)
    .orderBy(desc(filingRecords.dueDate));
}

export async function seedYearFilings(year: number): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  const rows = [
    {
      kind: "audit_1295" as const,
      periodLabel: `1295A period ending Jun 30, ${year}`,
      dueDate: `${year}-08-15`,
      status: "upcoming" as const,
      note: "File in Officers Online. Do not mail the worksheet to Supreme.",
    },
    {
      kind: "form_365" as const,
      periodLabel: String(year),
      dueDate: `${year}-08-01`,
      status: "upcoming" as const,
    },
    {
      kind: "form_990" as const,
      periodLabel: `FY ${year - 1}`,
      dueDate: form990DueDate("12-31", year - 1),
      status: "upcoming" as const,
      note: "990-N if gross receipts normally ≤ $50,000; longer form at $50,000+.",
    },
    {
      kind: "bonding_renewal" as const,
      periodLabel: `${year}`,
      dueDate: `${year}-03-15`,
      status: "upcoming" as const,
      note: "Bond void if last two annual 1295A audits not on file at Supreme",
    },
  ];

  for (const r of rows) {
    await db.insert(filingRecords).values(r);
  }
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "filings.seed",
    entity: "filing_records",
    detail: { year },
  });
  revalidatePath("/audit");
  return { ok: true, message: `Seeded filings for ${year}.` };
}

export async function markFilingFiled(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(filingRecords)
    .set({ status: "filed", filedDate: todayIso() })
    .where(eq(filingRecords.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "filings.filed",
    entity: "filing_records",
    entityId: id,
  });
  revalidatePath("/audit");
  return { ok: true };
}

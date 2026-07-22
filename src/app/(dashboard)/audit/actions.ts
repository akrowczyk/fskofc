"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, auditPeriods, filingRecords } from "@/db/schema";
import {
  DEFAULT_AUDIT_CHECKLIST,
  type ScheduleBLine,
} from "@/lib/domain/compensation";
import { form990DueDate, todayIso } from "@/lib/domain/dates";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

export async function listAuditPeriods() {
  await requireFs();
  return getDb().select().from(auditPeriods).orderBy(desc(auditPeriods.createdAt));
}

export async function createAuditPeriod(label: string): Promise<ActionResult> {
  const user = await requireFs();
  if (!label.trim()) return { ok: false, error: "Label required" };
  const db = getDb();
  const [row] = await db
    .insert(auditPeriods)
    .values({
      label: label.trim(),
      status: "open",
      gatheredChecklist: { ...DEFAULT_AUDIT_CHECKLIST },
      scheduleB: {
        lines: [
          { label: "Dues receipts", amount: 0 },
          { label: "Other receipts", amount: 0 },
          { label: "Disbursements", amount: 0 },
        ] satisfies ScheduleBLine[],
      },
      scheduleC: {
        lines: [
          { label: "Cash on hand", amount: 0 },
          { label: "Bank balances", amount: 0 },
          { label: "Other assets", amount: 0 },
          { label: "Liabilities", amount: 0 },
        ] satisfies ScheduleBLine[],
      },
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
    scheduleB?: { lines: ScheduleBLine[] };
    scheduleC?: { lines: ScheduleBLine[] };
    notes?: string;
    status?: string;
  },
): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(auditPeriods)
    .set({
      gatheredChecklist: data.checklist,
      scheduleB: data.scheduleB,
      scheduleC: data.scheduleC,
      notes: data.notes,
      status: data.status,
    })
    .where(eq(auditPeriods.id, id));
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
  const existing = await db.select().from(filingRecords).limit(1);
  // allow re-seed only if empty for simplicity — still insert year-specific
  const rows = [
    {
      kind: "audit_1295" as const,
      periodLabel: `${year}-H1 (Jan)`,
      dueDate: `${year}-01-31`,
      status: "upcoming" as const,
    },
    {
      kind: "audit_1295" as const,
      periodLabel: `${year}-H2 (Jul)`,
      dueDate: `${year}-07-31`,
      status: "upcoming" as const,
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
    },
    {
      kind: "bonding_renewal" as const,
      periodLabel: `${year}`,
      dueDate: `${year}-03-15`,
      status: "upcoming" as const,
      note: "Bond void if last two #1295 audits not on file",
    },
  ];

  for (const r of rows) {
    await db.insert(filingRecords).values(r);
  }
  void existing;
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



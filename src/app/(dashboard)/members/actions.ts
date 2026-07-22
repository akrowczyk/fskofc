"use server";

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, members } from "@/db/schema";
import {
  MEMBER_PII_SCAN_FIELDS,
  rejectTaxIdFields,
} from "@/lib/domain/pii-guard";
import { memberFormSchema } from "@/lib/validations/member";
import { formatZodError } from "@/lib/validations/format-errors";
import { parseRosterWorkbook } from "@/lib/roster/import";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

function formToFields(formData: FormData) {
  return {
    memberNumber: String(formData.get("memberNumber") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? "") || null,
    addressLine2: String(formData.get("addressLine2") ?? "") || null,
    city: String(formData.get("city") ?? "") || null,
    state: String(formData.get("state") ?? "") || null,
    zip: String(formData.get("zip") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    contactPref: String(formData.get("contactPref") ?? "email"),
    memberType: String(formData.get("memberType") ?? "associate"),
    degree: formData.get("degree") || null,
    joinDate: String(formData.get("joinDate") ?? "") || null,
    status: String(formData.get("status") ?? "active"),
    duesRate: formData.get("duesRate") || null,
    notes: String(formData.get("notes") ?? "") || null,
    addressRestricted: formData.get("addressRestricted"),
  };
}

export async function upsertMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireFs();
  const id = String(formData.get("id") ?? "") || null;
  const raw = formToFields(formData);

  const piiScan: Record<string, string | null | undefined> = {};
  for (const key of MEMBER_PII_SCAN_FIELDS) {
    piiScan[key] = (raw as Record<string, unknown>)[key] as string | null;
  }
  const pii = rejectTaxIdFields(piiScan);
  if (!pii.ok) return { ok: false, error: pii.reason };

  const parsed = memberFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: formatZodError(parsed.error),
    };
  }
  const data = parsed.data;
  const db = getDb();

  const values = {
    memberNumber: data.memberNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone,
    email: data.email || null,
    contactPref: data.contactPref,
    memberType: data.memberType,
    degree: data.degree ?? null,
    joinDate: data.joinDate || null,
    status: data.status,
    duesRate: data.duesRate != null ? String(data.duesRate) : null,
    notes: data.notes,
    addressRestricted: data.addressRestricted ?? false,
    source: id ? undefined : "manual",
    updatedAt: new Date(),
  };

  try {
    if (id) {
      await db
        .update(members)
        .set(values)
        .where(eq(members.id, id));
      await db.insert(auditLog).values({
        actor: user.email!,
        action: "member.update",
        entity: "members",
        entityId: id,
      });
      revalidatePath("/members");
      revalidatePath(`/members/${id}`);
      return { ok: true, message: "Member updated.", id };
    }

    const [inserted] = await db
      .insert(members)
      .values({
        ...values,
        source: "manual",
      })
      .returning({ id: members.id });

    await db.insert(auditLog).values({
      actor: user.email!,
      action: "member.create",
      entity: "members",
      entityId: inserted.id,
    });
    revalidatePath("/members");
    return { ok: true, message: "Member created.", id: inserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        error: "A member with that member number already exists.",
      };
    }
    return { ok: false, error: msg };
  }
}

export async function importRoster(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireFs();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a roster Excel file (.xlsx)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, skipped, warnings } = parseRosterWorkbook(buffer);
  if (rows.length === 0) {
    return {
      ok: false,
      error:
        warnings[0] ??
        "No members found in file. Expected columns: member number, name.",
    };
  }

  const db = getDb();
  let upserted = 0;
  const now = new Date();

  for (const row of rows) {
    const pii = rejectTaxIdFields({
      memberNumber: row.memberNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      addressLine1: row.addressLine1,
      notes: null,
      email: row.email,
      phone: row.phone,
    });
    if (!pii.ok) {
      return {
        ok: false,
        error: `Row ${row.memberNumber}: ${pii.reason}`,
      };
    }

    const existing = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.memberNumber, row.memberNumber))
      .limit(1);

    const payload = {
      memberNumber: row.memberNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      zip: row.zip,
      phone: row.phone,
      email: row.email,
      memberType: row.memberType ?? ("associate" as const),
      degree: row.degree ?? null,
      joinDate: row.joinDate,
      status: row.status ?? ("active" as const),
      addressRestricted: row.addressRestricted,
      source: "roster_import",
      syncedAt: now,
      updatedAt: now,
    };

    if (existing[0]) {
      // Preserve phone/email/notes if import lacks them (official export has no contact)
      const current = await db
        .select()
        .from(members)
        .where(eq(members.id, existing[0].id))
        .limit(1);
      const cur = current[0];
      await db
        .update(members)
        .set({
          ...payload,
          phone: payload.phone || cur?.phone,
          email: payload.email || cur?.email,
          notes: cur?.notes,
          contactPref: cur?.contactPref ?? "email",
          duesRate: cur?.duesRate,
        })
        .where(eq(members.id, existing[0].id));
    } else {
      await db.insert(members).values(payload);
    }
    upserted++;
  }

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "member.roster_import",
    entity: "members",
    detail: { upserted, skipped, fileName: file.name },
  });

  revalidatePath("/members");
  return {
    ok: true,
    message: `Imported ${upserted} member(s)${skipped ? `, skipped ${skipped}` : ""}.`,
  };
}

export async function searchMembers(query: string) {
  await requireFs();
  const db = getDb();
  const q = query.trim();
  if (!q) {
    return db
      .select()
      .from(members)
      .orderBy(members.lastName, members.firstName)
      .limit(100);
  }
  const pattern = `%${q}%`;
  return db
    .select()
    .from(members)
    .where(
      or(
        ilike(members.lastName, pattern),
        ilike(members.firstName, pattern),
        ilike(members.memberNumber, pattern),
        ilike(members.email, pattern),
        ilike(members.phone, pattern),
      ),
    )
    .orderBy(members.lastName, members.firstName)
    .limit(100);
}

export async function getMember(id: string) {
  await requireFs();
  const db = getDb();
  const rows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function countMembers() {
  await requireFs();
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members);
  return row?.count ?? 0;
}

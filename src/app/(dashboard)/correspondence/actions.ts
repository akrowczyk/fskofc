"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, correspondence, councilSettings, members } from "@/db/schema";
import { renderEmailTemplate, type EmailTemplateId } from "@/lib/email/templates";
import { sendApprovedEmail } from "@/lib/email/resend";
import { buildLetterPdf, type LetterTemplate } from "@/lib/pdf/letters";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

export async function listCorrespondence() {
  await requireFs();
  const db = getDb();
  return db
    .select({
      item: correspondence,
      member: members,
    })
    .from(correspondence)
    .leftJoin(members, eq(correspondence.memberId, members.id))
    .orderBy(desc(correspondence.createdAt))
    .limit(200);
}

export async function createEmailDraft(formData: FormData): Promise<ActionResult> {
  const user = await requireFs();
  const memberId = String(formData.get("memberId") ?? "");
  const template = String(formData.get("template") ?? "dues_reminder") as EmailTemplateId;
  const customSubject = String(formData.get("subject") ?? "") || undefined;
  const customBody = String(formData.get("body") ?? "") || undefined;

  if (!memberId) return { ok: false, error: "Select a member." };

  const db = getDb();
  const m = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m[0]) return { ok: false, error: "Member not found." };
  if (m[0].contactPref === "none") {
    return { ok: false, error: "Member contact preference is none." };
  }
  if (!m[0].email && template !== "custom") {
    return { ok: false, error: "Member has no email — use mail channel or add email." };
  }

  const settings = await db.select().from(councilSettings).limit(1);
  const rendered = renderEmailTemplate(template, m[0], {
    councilName: settings[0]?.councilName
      ? `${settings[0].councilName} ${settings[0].councilNumber}`
      : undefined,
    customSubject,
    customBody,
  });

  const [row] = await db
    .insert(correspondence)
    .values({
      memberId,
      channel: "email",
      template: template as "welcome",
      subject: customSubject ?? rendered.subject,
      body: customBody ?? rendered.body,
      status: "needs_approval",
      createdBy: user.email!,
    })
    .returning({ id: correspondence.id });

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "correspondence.draft",
    entity: "correspondence",
    entityId: row.id,
  });

  revalidatePath("/correspondence");
  return { ok: true, message: "Draft created — needs approval.", id: row.id };
}

export async function approveAndSend(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  const rows = await db
    .select({ item: correspondence, member: members })
    .from(correspondence)
    .leftJoin(members, eq(correspondence.memberId, members.id))
    .where(eq(correspondence.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "Not found." };
  if (row.item.channel !== "email") {
    return { ok: false, error: "Only email can be sent via Resend." };
  }
  if (!["needs_approval", "approved", "failed"].includes(row.item.status)) {
    return { ok: false, error: `Cannot send from status ${row.item.status}.` };
  }
  if (!row.member?.email) return { ok: false, error: "No recipient email." };
  if (row.member.contactPref === "none") {
    return { ok: false, error: "Contact preference is none." };
  }

  await db
    .update(correspondence)
    .set({ status: "approved" })
    .where(eq(correspondence.id, id));

  const settings = await db.select().from(councilSettings).limit(1);
  const result = await sendApprovedEmail({
    to: row.member.email,
    subject: row.item.subject ?? "Message from council",
    body: row.item.body ?? "",
    from: settings[0]?.fromEmail ?? process.env.RESEND_FROM,
  });

  if (result.error) {
    await db
      .update(correspondence)
      .set({ status: "failed", error: result.error })
      .where(eq(correspondence.id, id));
    await db.insert(auditLog).values({
      actor: user.email!,
      action: "correspondence.send_failed",
      entity: "correspondence",
      entityId: id,
      detail: { error: result.error },
    });
    revalidatePath("/correspondence");
    return { ok: false, error: result.error };
  }

  await db
    .update(correspondence)
    .set({
      status: "sent",
      sentAt: new Date(),
      resendId: result.id,
      error: null,
    })
    .where(eq(correspondence.id, id));

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "correspondence.sent",
    entity: "correspondence",
    entityId: id,
    detail: { resendId: result.id },
  });

  revalidatePath("/correspondence");
  return { ok: true, message: "Email sent." };
}

export async function queueMailLetter(formData: FormData): Promise<ActionResult> {
  const user = await requireFs();
  const memberId = String(formData.get("memberId") ?? "");
  const letterType = String(formData.get("letterType") ?? "423") as LetterTemplate;
  if (!memberId) return { ok: false, error: "Select a member." };

  const db = getDb();
  const [row] = await db
    .insert(correspondence)
    .values({
      memberId,
      channel: "mail",
      template: letterType,
      subject: `Letter ${letterType}`,
      body: `Print and mail ${letterType}`,
      status: "queued",
      createdBy: user.email!,
    })
    .returning({ id: correspondence.id });

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "correspondence.queue_mail",
    entity: "correspondence",
    entityId: row.id,
  });

  revalidatePath("/correspondence");
  return { ok: true, message: "Added to mail queue.", id: row.id };
}

export async function markMailed(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(correspondence)
    .set({ status: "mailed", mailedAt: new Date() })
    .where(eq(correspondence.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "correspondence.mailed",
    entity: "correspondence",
    entityId: id,
  });
  revalidatePath("/correspondence");
  return { ok: true, message: "Marked mailed." };
}

export async function dismissCorrespondence(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(correspondence)
    .set({ status: "failed", error: "Dismissed" })
    .where(eq(correspondence.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "correspondence.dismiss",
    entity: "correspondence",
    entityId: id,
  });
  revalidatePath("/correspondence");
  return { ok: true };
}

/** Generate PDF bytes as base64 for download route */
export async function getLetterPdfBase64(id: string): Promise<
  | { ok: true; base64: string; filename: string }
  | { ok: false; error: string }
> {
  await requireFs();
  const db = getDb();
  const rows = await db
    .select({ item: correspondence, member: members })
    .from(correspondence)
    .leftJoin(members, eq(correspondence.memberId, members.id))
    .where(eq(correspondence.id, id))
    .limit(1);
  if (!rows[0]?.member) return { ok: false, error: "Not found" };
  const template = rows[0].item.template as LetterTemplate;
  if (!["423", "424", "KA1", "1845", "welcome"].includes(template)) {
    return { ok: false, error: "Not a letter template" };
  }
  const settings = await db.select().from(councilSettings).limit(1);
  const bytes = await buildLetterPdf(template, rows[0].member, {
    councilName: settings[0]
      ? `${settings[0].councilName} ${settings[0].councilNumber}`
      : undefined,
    gkName: settings[0]?.gkName ?? undefined,
  });
  return {
    ok: true,
    base64: Buffer.from(bytes).toString("base64"),
    filename: `${template}-${rows[0].member.memberNumber}.pdf`,
  };
}

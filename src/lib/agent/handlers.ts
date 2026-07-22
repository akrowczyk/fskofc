import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLog,
  correspondence,
  members,
  retentionCases,
  tasks,
} from "@/db/schema";
import { todayIso } from "@/lib/domain/dates";
import {
  computeNextAction,
  OPEN_RETENTION_STATES,
  type RetentionState,
} from "@/lib/domain/retention";
import { renderEmailTemplate, type EmailTemplateId } from "@/lib/email/templates";
import { searchHandbook, searchHandbookLocal } from "@/lib/rag/retrieve";
import { toolInputSchemas } from "./tools";

const FORM_BLURBS: Record<string, string> = {
  "423":
    "First Notice (#423): mailed ~15 days before billing period. Official via Member Billing when used.",
  "424":
    "Second Notice (#424): if unpaid 30 days after first notice.",
  KA1: "Knight Alert (#KA1): after second notice +30 days unpaid; GK + trustees; personal contact assigned.",
  "1845":
    "Notice of Intent to Suspend: FS + GK; copies to member, Supreme, SD, DD, file. +60d Form 100 eligible; +90d void.",
  "100":
    "Form 100 member transactions including suspension. Requires #1845 on file 60 days for suspension.",
  "157": "Order on Treasurer: pay moneys to Treasurer; GK countersign.",
  "1295": "Semi-annual audit (Jan & Jul) by GK + trustees.",
  "365": "Service Program Personnel Report; due Aug 1; GK owns.",
  "990":
    "Federal Form 990; due 15th day of 5th month after FY end. Verify IRS thresholds.",
  "185": "Officer elections report via Member Management.",
};

export async function runAgentTool(
  name: string,
  rawInput: unknown,
  actor: string,
): Promise<unknown> {
  switch (name) {
    case "search_handbook": {
      const { query } = toolInputSchemas.search_handbook.parse(rawInput);
      try {
        return { passages: await searchHandbook(query) };
      } catch {
        return { passages: searchHandbookLocal(query), note: "local seed" };
      }
    }
    case "explain_form": {
      const { form_number } = toolInputSchemas.explain_form.parse(rawInput);
      const key = form_number.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
      const normalized = key.startsWith("KA") ? "KA1" : key.replace(/^0+/, "") || key;
      const blurb =
        FORM_BLURBS[normalized] ??
        FORM_BLURBS[form_number] ??
        "No built-in blurb; try search_handbook.";
      const passages = searchHandbookLocal(form_number, 3);
      return { form: form_number, explanation: blurb, passages };
    }
    case "list_due_items": {
      const { timeframe } = toolInputSchemas.list_due_items.parse(rawInput);
      const db = getDb();
      const open = await db.select().from(tasks).where(eq(tasks.status, "open"));
      const today = todayIso();
      const week = addDays(today, 7);
      let filtered = open;
      if (timeframe === "today") {
        filtered = open.filter((t) => t.dueDate === today || (t.dueDate && t.dueDate < today));
      } else if (timeframe === "week") {
        filtered = open.filter(
          (t) => t.dueDate && t.dueDate <= week,
        );
      }
      return {
        count: filtered.length,
        items: filtered.slice(0, 40).map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          category: t.category,
          overdue: t.dueDate ? t.dueDate < today : false,
        })),
      };
    }
    case "search_members": {
      const { q } = toolInputSchemas.search_members.parse(rawInput);
      const db = getDb();
      const pattern = `%${q}%`;
      const rows = await db
        .select({
          id: members.id,
          memberNumber: members.memberNumber,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          phone: members.phone,
          status: members.status,
          contactPref: members.contactPref,
        })
        .from(members)
        .where(
          or(
            ilike(members.lastName, pattern),
            ilike(members.firstName, pattern),
            ilike(members.memberNumber, pattern),
            ilike(members.email, pattern),
          ),
        )
        .limit(20);
      return { members: rows };
    }
    case "get_retention_status": {
      const input = toolInputSchemas.get_retention_status.parse(rawInput);
      const db = getDb();
      let memberId = input.member_id;
      if (!memberId && input.member_number) {
        const m = await db
          .select({ id: members.id })
          .from(members)
          .where(eq(members.memberNumber, input.member_number))
          .limit(1);
        memberId = m[0]?.id;
      }
      if (!memberId) return { error: "member_id or member_number required" };
      const cases = await db
        .select()
        .from(retentionCases)
        .where(
          and(
            eq(retentionCases.memberId, memberId),
            // open only prefer
          ),
        )
        .limit(5);
      const open = cases.filter((c) =>
        OPEN_RETENTION_STATES.includes(c.state as RetentionState),
      );
      const c = open[0] ?? cases[0];
      if (!c) return { status: "no_case" };
      const next = computeNextAction({
        state: c.state as RetentionState,
        firstNoticeDate: c.firstNoticeDate,
        secondNoticeDate: c.secondNoticeDate,
        knightAlertDate: c.knightAlertDate,
        personalContactBy: c.personalContactBy,
        personalContactReport: c.personalContactReport,
        intent1845ProcessedDate: c.intent1845ProcessedDate,
        suspensionEligibleOn: c.suspensionEligibleOn,
        voidOn: c.voidOn,
        resolution: c.resolution,
      });
      return { case: c, nextAction: next };
    }
    case "create_task": {
      const input = toolInputSchemas.create_task.parse(rawInput);
      const db = getDb();
      const [row] = await db
        .insert(tasks)
        .values({
          title: input.title,
          detail: input.detail,
          dueDate: input.due_date,
          category: (input.category as "general") ?? "general",
          source: "agent",
          status: "open",
        })
        .returning({ id: tasks.id });
      await log(actor, "agent.create_task", "tasks", row.id);
      return { created: row };
    }
    case "complete_task": {
      const { id } = toolInputSchemas.complete_task.parse(rawInput);
      const db = getDb();
      await db
        .update(tasks)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(tasks.id, id));
      await log(actor, "agent.complete_task", "tasks", id);
      return { ok: true, id };
    }
    case "draft_email": {
      const input = toolInputSchemas.draft_email.parse(rawInput);
      const db = getDb();
      const m = await db
        .select()
        .from(members)
        .where(eq(members.id, input.member_id))
        .limit(1);
      if (!m[0]) return { error: "Member not found" };
      if (m[0].contactPref === "none" || m[0].contactPref === "mail") {
        return {
          error: `Member contact preference is ${m[0].contactPref}; use mail queue or update preference.`,
        };
      }
      if (!m[0].email) return { error: "Member has no email on file" };
      const purpose = input.purpose as EmailTemplateId;
      const rendered = renderEmailTemplate(
        ["welcome", "dues_reminder", "event", "insurance_referral", "custom"].includes(
          purpose,
        )
          ? purpose
          : "custom",
        m[0],
        { customSubject: input.subject, customBody: input.body },
      );
      const [row] = await db
        .insert(correspondence)
        .values({
          memberId: m[0].id,
          channel: "email",
          template: (["welcome", "dues_reminder", "event", "insurance_referral", "custom"].includes(
            purpose,
          )
            ? purpose
            : "custom") as "custom",
          subject: input.subject ?? rendered.subject,
          body: input.body ?? rendered.body,
          status: "needs_approval",
          createdBy: actor,
        })
        .returning({ id: correspondence.id, status: correspondence.status });
      await log(actor, "agent.draft_email", "correspondence", row.id, {
        memberId: m[0].id,
      });
      return {
        correspondence: row,
        note: "Draft created with needs_approval — human must approve before send.",
      };
    }
    case "queue_mail_task": {
      const input = toolInputSchemas.queue_mail_task.parse(rawInput);
      const letter = input.letter_type.replace("#", "") as
        | "423"
        | "424"
        | "KA1"
        | "1845"
        | "welcome";
      const allowed = ["423", "424", "KA1", "1845", "welcome"];
      if (!allowed.includes(letter)) {
        return { error: `letter_type must be one of ${allowed.join(", ")}` };
      }
      const db = getDb();
      const m = await db
        .select()
        .from(members)
        .where(eq(members.id, input.member_id))
        .limit(1);
      if (!m[0]) return { error: "Member not found" };
      const [row] = await db
        .insert(correspondence)
        .values({
          memberId: m[0].id,
          channel: "mail",
          template: letter,
          subject: `Print letter ${letter}`,
          body: `Queued ${letter} letter for ${m[0].firstName} ${m[0].lastName}`,
          status: "queued",
          createdBy: actor,
        })
        .returning({ id: correspondence.id });
      await db.insert(tasks).values({
        title: `Mail letter ${letter} to ${m[0].lastName}, ${m[0].firstName}`,
        detail: `Correspondence ${row.id}. Print PDF from Correspondence → To Mail.`,
        category: "retention",
        source: "agent",
        status: "open",
        relatedMemberId: m[0].id,
        dueDate: todayIso(),
      });
      await log(actor, "agent.queue_mail", "correspondence", row.id);
      return {
        correspondenceId: row.id,
        note: "Mail queued — print PDF and mark mailed after sending. Not filed with Supreme.",
      };
    }
    case "open_retention_case": {
      const { member_id } = toolInputSchemas.open_retention_case.parse(rawInput);
      const db = getDb();
      const existingOpen = (
        await db
          .select()
          .from(retentionCases)
          .where(eq(retentionCases.memberId, member_id))
      ).find((c) => OPEN_RETENTION_STATES.includes(c.state as RetentionState));
      if (existingOpen) {
        return { error: "Open case exists", caseId: existingOpen.id };
      }
      const [row] = await db
        .insert(retentionCases)
        .values({ memberId: member_id, state: "current" })
        .returning({ id: retentionCases.id });
      await log(actor, "agent.open_retention", "retention_cases", row.id);
      return { caseId: row.id };
    }
    case "advance_case": {
      const input = toolInputSchemas.advance_case.parse(rawInput);
      const db = getDb();
      const rows = await db
        .select()
        .from(retentionCases)
        .where(eq(retentionCases.id, input.case_id))
        .limit(1);
      if (!rows[0]) return { error: "Case not found" };
      const { applyTransition } = await import("@/lib/domain/retention");
      const next = applyTransition(
        {
          state: rows[0].state as RetentionState,
          firstNoticeDate: rows[0].firstNoticeDate,
          secondNoticeDate: rows[0].secondNoticeDate,
          knightAlertDate: rows[0].knightAlertDate,
          personalContactBy: rows[0].personalContactBy,
          personalContactReport: rows[0].personalContactReport,
          intent1845ProcessedDate: rows[0].intent1845ProcessedDate,
          suspensionEligibleOn: rows[0].suspensionEligibleOn,
          voidOn: rows[0].voidOn,
          resolution: rows[0].resolution,
        },
        input.to_state as RetentionState,
      );
      await db
        .update(retentionCases)
        .set({
          state: next.state,
          firstNoticeDate: next.firstNoticeDate,
          secondNoticeDate: next.secondNoticeDate,
          knightAlertDate: next.knightAlertDate,
          personalContactBy: next.personalContactBy,
          personalContactReport: next.personalContactReport,
          intent1845ProcessedDate: next.intent1845ProcessedDate,
          suspensionEligibleOn: next.suspensionEligibleOn,
          voidOn: next.voidOn,
          resolution: next.resolution as "paid" | "plan" | "suspended" | "expired" | "other" | null,
          closedAt: next.closedAt ? new Date() : rows[0].closedAt,
        })
        .where(eq(retentionCases.id, input.case_id));
      await log(actor, "agent.advance_case", "retention_cases", input.case_id, {
        to: input.to_state,
      });
      return { ok: true, state: next.state };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function log(
  actor: string,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: Record<string, unknown>,
) {
  try {
    const db = getDb();
    await db.insert(auditLog).values({
      actor,
      action,
      entity,
      entityId,
      detail,
    });
  } catch {
    // ignore
  }
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

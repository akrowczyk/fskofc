"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, members, retentionCases, tasks } from "@/db/schema";
import { todayIso } from "@/lib/domain/dates";
import {
  applyTransition,
  computeNextAction,
  OPEN_RETENTION_STATES,
  type RetentionCaseInput,
  type RetentionState,
} from "@/lib/domain/retention";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

function toInput(c: typeof retentionCases.$inferSelect): RetentionCaseInput {
  return {
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
  };
}

export async function listRetentionCases(opts?: { includeClosed?: boolean }) {
  await requireFs();
  const db = getDb();
  const rows = await db
    .select({
      case: retentionCases,
      member: members,
    })
    .from(retentionCases)
    .innerJoin(members, eq(retentionCases.memberId, members.id))
    .orderBy(desc(retentionCases.openedAt));

  const today = todayIso();
  return rows
    .filter((r) =>
      opts?.includeClosed
        ? true
        : OPEN_RETENTION_STATES.includes(r.case.state as RetentionState),
    )
    .map((r) => {
      const next = computeNextAction(toInput(r.case), today);
      return {
        ...r.case,
        member: r.member,
        nextAction: next,
      };
    });
}

export async function getRetentionCase(id: string) {
  await requireFs();
  const db = getDb();
  const rows = await db
    .select({
      case: retentionCases,
      member: members,
    })
    .from(retentionCases)
    .innerJoin(members, eq(retentionCases.memberId, members.id))
    .where(eq(retentionCases.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const next = computeNextAction(toInput(rows[0].case), todayIso());
  return { ...rows[0], nextAction: next };
}

export async function openRetentionCase(
  memberId: string,
): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();

  const openExisting = await db
    .select({ id: retentionCases.id })
    .from(retentionCases)
    .where(
      and(
        eq(retentionCases.memberId, memberId),
        inArray(retentionCases.state, OPEN_RETENTION_STATES),
      ),
    )
    .limit(1);

  if (openExisting[0]) {
    return {
      ok: false,
      error: "An open retention case already exists for this member.",
    };
  }

  const [inserted] = await db
    .insert(retentionCases)
    .values({
      memberId,
      state: "current",
    })
    .returning({ id: retentionCases.id });

  await refreshCaseTask(inserted.id);

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "retention.open",
    entity: "retention_cases",
    entityId: inserted.id,
    detail: { memberId },
  });

  revalidatePath("/retention");
  revalidatePath("/");
  return { ok: true, message: "Retention case opened.", id: inserted.id };
}

export async function advanceRetentionCase(
  caseId: string,
  toState: RetentionState,
  form?: {
    personalContactBy?: string;
    personalContactReport?: string;
    resolution?: string;
    resolutionNote?: string;
    intent1845ProcessedDate?: string;
  },
): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  const rows = await db
    .select()
    .from(retentionCases)
    .where(eq(retentionCases.id, caseId))
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, error: "Case not found." };

  const next = applyTransition(toInput(current), toState, {
    today: todayIso(),
    personalContactBy: form?.personalContactBy,
    personalContactReport: form?.personalContactReport,
    resolution: form?.resolution,
    resolutionNote: form?.resolutionNote,
    intent1845ProcessedDate: form?.intent1845ProcessedDate,
  });

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
      resolution: next.resolution as
        | "paid"
        | "plan"
        | "suspended"
        | "expired"
        | "other"
        | null,
      resolutionNote: next.resolutionNote ?? current.resolutionNote,
      closedAt: next.closedAt ? new Date() : current.closedAt,
    })
    .where(eq(retentionCases.id, caseId));

  await refreshCaseTask(caseId);

  await db.insert(auditLog).values({
    actor: user.email!,
    action: "retention.advance",
    entity: "retention_cases",
    entityId: caseId,
    detail: { from: current.state, to: toState },
  });

  revalidatePath("/retention");
  revalidatePath(`/retention/${caseId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  return { ok: true, message: `Advanced to ${toState}.` };
}

export async function listMembersForSelect() {
  await requireFs();
  const db = getDb();
  return db
    .select({
      id: members.id,
      memberNumber: members.memberNumber,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
    })
    .from(members)
    .orderBy(members.lastName, members.firstName)
    .limit(500);
}

async function refreshCaseTask(caseId: string) {
  const db = getDb();
  const rows = await db
    .select({
      case: retentionCases,
      member: members,
    })
    .from(retentionCases)
    .innerJoin(members, eq(retentionCases.memberId, members.id))
    .where(eq(retentionCases.id, caseId))
    .limit(1);
  if (!rows[0]) return;

  const c = rows[0].case;
  const next = computeNextAction(toInput(c), todayIso());

  // Dismiss open auto retention tasks for this case
  await db
    .update(tasks)
    .set({ status: "dismissed", completedAt: new Date() })
    .where(
      and(
        eq(tasks.relatedCaseId, caseId),
        eq(tasks.source, "auto"),
        eq(tasks.status, "open"),
      ),
    );

  if (next.isTerminal || !next.code || next.code === "terminal") return;

  const memberName = `${rows[0].member.lastName}, ${rows[0].member.firstName}`;
  const key = `retention:${caseId}:${next.code}`;

  const existing = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.externalKey, key))
    .limit(1);

  const payload = {
    title: `[Retention] ${memberName}: ${next.label}`,
    detail: next.detail,
    category: "retention" as const,
    dueDate: next.dueDate,
    status: "open" as const,
    source: "auto" as const,
    externalKey: key,
    relatedMemberId: c.memberId,
    relatedCaseId: caseId,
    completedAt: null as Date | null,
  };

  if (existing[0]) {
    await db
      .update(tasks)
      .set({ ...payload, status: "open", completedAt: null })
      .where(eq(tasks.id, existing[0].id));
  } else {
    await db.insert(tasks).values(payload);
  }
}

/**
 * Daily engine: expand deadline rules → tasks; refresh retention case tasks;
 * build digest payload. Pure orchestration over DB + domain libs.
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLog,
  councilSettings,
  members,
  retentionCases,
  tasks,
} from "@/db/schema";
import { expandBuiltinDeadlines } from "@/lib/domain/deadlines";
import { todayIso } from "@/lib/domain/dates";
import {
  computeNextAction,
  OPEN_RETENTION_STATES,
  type RetentionCaseInput,
  type RetentionState,
} from "@/lib/domain/retention";

export type DailyEngineResult = {
  ranAt: string;
  today: string;
  deadlinesCreated: number;
  deadlinesUpdated: number;
  retentionTasksUpserted: number;
  openTasks: number;
  overdueTasks: number;
  openCases: number;
  digest: DigestPayload;
};

export type DigestPayload = {
  today: string;
  dueToday: Array<{ title: string; category: string; dueDate: string | null }>;
  dueThisWeek: Array<{ title: string; category: string; dueDate: string | null }>;
  overdue: Array<{ title: string; category: string; dueDate: string | null }>;
  retentionNeedingAction: Array<{
    caseId: string;
    memberName: string;
    state: string;
    nextAction: string;
    dueDate: string | null;
    overdue: boolean;
  }>;
  pendingApprovals: number;
};

export async function runDailyEngine(now: Date = new Date()): Promise<DailyEngineResult> {
  const db = getDb();
  const today = todayIso(now);

  // Fiscal year end from settings
  let fiscalYearEnd = "12-31";
  try {
    const settings = await db.select().from(councilSettings).limit(1);
    if (settings[0]?.fiscalYearEnd) fiscalYearEnd = settings[0].fiscalYearEnd;
  } catch {
    // schema may not be pushed yet in some envs
  }

  // ─── Deadline expansion ──────────────────────────────────────────────────
  const occurrences = expandBuiltinDeadlines({
    now,
    fiscalYearEnd,
    horizonDays: 120,
  });

  let deadlinesCreated = 0;
  let deadlinesUpdated = 0;

  for (const occ of occurrences) {
    const key = `deadline:${occ.key}`;
    const existing = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.externalKey, key))
      .limit(1);

    if (existing[0]) {
      if (existing[0].status === "open") {
        await db
          .update(tasks)
          .set({
            title: occ.name,
            detail: occ.detail,
            dueDate: occ.dueDate,
            category: occ.category,
          })
          .where(eq(tasks.id, existing[0].id));
        deadlinesUpdated++;
      }
      continue;
    }

    // Only create if within lead window or due within horizon (all occurrences already filtered)
    await db.insert(tasks).values({
      title: occ.name,
      detail: occ.detail,
      category: occ.category,
      dueDate: occ.dueDate,
      status: "open",
      source: "auto",
      externalKey: key,
    });
    deadlinesCreated++;
  }

  // ─── Retention case tasks ────────────────────────────────────────────────
  let retentionTasksUpserted = 0;
  const openCasesRows = await db
    .select({
      case: retentionCases,
      member: members,
    })
    .from(retentionCases)
    .innerJoin(members, eq(retentionCases.memberId, members.id))
    .where(inArray(retentionCases.state, OPEN_RETENTION_STATES));

  const retentionNeedingAction: DigestPayload["retentionNeedingAction"] = [];

  for (const row of openCasesRows) {
    const c = row.case;
    const input: RetentionCaseInput = {
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
    const next = computeNextAction(input, today);
    if (next.isTerminal) continue;

    const memberName = `${row.member.lastName}, ${row.member.firstName}`;
    const key = `retention:${c.id}:${next.code}`;
    const title = `[Retention] ${memberName}: ${next.label}`;

    const existing = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.externalKey, key))
      .limit(1);

    const payload = {
      title,
      detail: next.detail,
      category: "retention" as const,
      dueDate: next.dueDate,
      status: "open" as const,
      source: "auto" as const,
      externalKey: key,
      relatedMemberId: c.memberId,
      relatedCaseId: c.id,
    };

    if (existing[0]) {
      await db.update(tasks).set(payload).where(eq(tasks.id, existing[0].id));
    } else {
      // Dismiss older auto tasks for this case (stale next-action codes)
      await db
        .update(tasks)
        .set({ status: "dismissed", completedAt: new Date() })
        .where(
          and(
            eq(tasks.relatedCaseId, c.id),
            eq(tasks.source, "auto"),
            eq(tasks.status, "open"),
            ne(tasks.externalKey, key),
          ),
        );
      await db.insert(tasks).values(payload);
    }
    retentionTasksUpserted++;

    retentionNeedingAction.push({
      caseId: c.id,
      memberName,
      state: c.state,
      nextAction: next.label,
      dueDate: next.dueDate,
      overdue: next.overdue,
    });
  }

  // ─── Digest from open tasks ──────────────────────────────────────────────
  const openTaskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "open"));

  const dueToday = openTaskRows
    .filter((t) => t.dueDate === today)
    .map((t) => ({
      title: t.title,
      category: t.category,
      dueDate: t.dueDate,
    }));

  const weekEnd = addDaysLocal(today, 7);
  const dueThisWeek = openTaskRows
    .filter(
      (t) =>
        t.dueDate &&
        t.dueDate > today &&
        t.dueDate <= weekEnd,
    )
    .map((t) => ({
      title: t.title,
      category: t.category,
      dueDate: t.dueDate,
    }));

  const overdue = openTaskRows
    .filter((t) => t.dueDate && t.dueDate < today)
    .map((t) => ({
      title: t.title,
      category: t.category,
      dueDate: t.dueDate,
    }));

  let pendingApprovals = 0;
  try {
    const { correspondence } = await import("@/db/schema");
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(correspondence)
      .where(eq(correspondence.status, "needs_approval"));
    pendingApprovals = row?.count ?? 0;
  } catch {
    pendingApprovals = 0;
  }

  const digest: DigestPayload = {
    today,
    dueToday,
    dueThisWeek,
    overdue,
    retentionNeedingAction,
    pendingApprovals,
  };

  await db.insert(auditLog).values({
    actor: "system:cron",
    action: "cron.daily",
    entity: "tasks",
    detail: {
      deadlinesCreated,
      deadlinesUpdated,
      retentionTasksUpserted,
      openTasks: openTaskRows.length,
      overdue: overdue.length,
    },
  });

  return {
    ranAt: now.toISOString(),
    today,
    deadlinesCreated,
    deadlinesUpdated,
    retentionTasksUpserted,
    openTasks: openTaskRows.length,
    overdueTasks: overdue.length,
    openCases: openCasesRows.length,
    digest,
  };
}

function addDaysLocal(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatDigestText(d: DigestPayload): string {
  const lines: string[] = [
    `FS Companion digest — ${d.today}`,
    "",
    `Overdue (${d.overdue.length})`,
    ...d.overdue.map((t) => `  • [${t.dueDate}] ${t.title}`),
    "",
    `Due today (${d.dueToday.length})`,
    ...d.dueToday.map((t) => `  • ${t.title}`),
    "",
    `Due this week (${d.dueThisWeek.length})`,
    ...d.dueThisWeek.map((t) => `  • [${t.dueDate}] ${t.title}`),
    "",
    `Retention cases (${d.retentionNeedingAction.length})`,
    ...d.retentionNeedingAction.map(
      (c) =>
        `  • ${c.memberName}: ${c.nextAction}${c.overdue ? " [OVERDUE]" : c.dueDate ? ` (due ${c.dueDate})` : ""}`,
    ),
    "",
    `Pending correspondence approvals: ${d.pendingApprovals}`,
    "",
  ];
  return lines.join("\n");
}

export async function sendDigestEmail(
  digest: DigestPayload,
  to: string,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, error: "RESEND_API_KEY or RESEND_FROM not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `FS Companion digest — ${digest.today}`,
      text: formatDigestText(digest),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { sent: false, error: body };
  }
  return { sent: true };
}

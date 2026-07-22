"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, tasks } from "@/db/schema";
import { runDailyEngine } from "@/lib/engine/daily";
import { todayIso } from "@/lib/domain/dates";

async function requireFs() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function listOpenTasks() {
  await requireFs();
  const db = getDb();
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "open"))
    .orderBy(asc(tasks.dueDate), asc(tasks.title));
}

export async function completeTask(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(tasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tasks.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "task.complete",
    entity: "tasks",
    entityId: id,
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  return { ok: true, message: "Task completed." };
}

export async function dismissTask(id: string): Promise<ActionResult> {
  const user = await requireFs();
  const db = getDb();
  await db
    .update(tasks)
    .set({ status: "dismissed", completedAt: new Date() })
    .where(eq(tasks.id, id));
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "task.dismiss",
    entity: "tasks",
    entityId: id,
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function createManualTask(formData: FormData): Promise<ActionResult> {
  const user = await requireFs();
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "") || null;
  const category = String(formData.get("category") ?? "general") as
    | "general"
    | "retention"
    | "assessment"
    | "audit"
    | "990"
    | "365"
    | "bonding"
    | "supply"
    | "comp"
    | "member";

  if (!title) return { ok: false, error: "Title required." };

  const db = getDb();
  await db.insert(tasks).values({
    title,
    detail,
    dueDate,
    category,
    status: "open",
    source: "manual",
  });
  await db.insert(auditLog).values({
    actor: user.email!,
    action: "task.create",
    entity: "tasks",
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  return { ok: true, message: "Task created." };
}

export async function runEngineNow(): Promise<ActionResult> {
  await requireFs();
  try {
    const result = await runDailyEngine();
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/retention");
    return {
      ok: true,
      message: `Engine ran: +${result.deadlinesCreated} deadlines, ${result.retentionTasksUpserted} retention tasks, ${result.overdueTasks} overdue.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Engine failed",
    };
  }
}

export async function getTaskSummary() {
  await requireFs();
  const db = getDb();
  const today = todayIso();
  const open = await db.select().from(tasks).where(eq(tasks.status, "open"));
  return {
    open: open.length,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
    dueToday: open.filter((t) => t.dueDate === today).length,
    dueSoon: open.filter(
      (t) => t.dueDate && t.dueDate > today && t.dueDate <= addDays(today, 7),
    ).length,
    tasks: open.sort((a, b) => {
      const ad = a.dueDate ?? "9999";
      const bd = b.dueDate ?? "9999";
      return ad.localeCompare(bd);
    }),
  };
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

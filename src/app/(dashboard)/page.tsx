import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  ShieldAlert,
  Users,
} from "lucide-react";
import { MirrorBanner } from "@/components/mirror-banner";
import { RunEngineButton, TaskRowActions } from "@/components/task-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { todayIso } from "@/lib/domain/dates";
import { STATE_LABELS, type RetentionState } from "@/lib/domain/retention";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "FS";
  const today = todayIso();

  let taskSummary: {
    open: number;
    overdue: number;
    dueToday: number;
    dueSoon: number;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      category: string;
    }>;
  } | null = null;
  let openCases: Array<{
    id: string;
    state: string;
    memberName: string;
    nextLabel: string;
    overdue: boolean;
    dueDate: string | null;
  }> = [];
  let memberCount = 0;
  let pendingApprovals = 0;
  let dbOk = false;

  if (process.env.DATABASE_URL) {
    try {
      const { getTaskSummary } = await import("./tasks/actions");
      const { listRetentionCases } = await import("./retention/actions");
      const { countMembers } = await import("./members/actions");
      const { eq } = await import("drizzle-orm");
      const { getDb } = await import("@/db");
      const { correspondence } = await import("@/db/schema");
      taskSummary = await getTaskSummary();
      const cases = await listRetentionCases({ includeClosed: false });
      openCases = cases.slice(0, 8).map((c) => ({
        id: c.id,
        state: c.state,
        memberName: `${c.member.lastName}, ${c.member.firstName}`,
        nextLabel: c.nextAction.label,
        overdue: c.nextAction.overdue,
        dueDate: c.nextAction.dueDate,
      }));
      memberCount = await countMembers();
      const pending = await getDb()
        .select()
        .from(correspondence)
        .where(eq(correspondence.status, "needs_approval"));
      pendingApprovals = pending.length;
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }

  const topTasks = taskSummary?.tasks.slice(0, 8) ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Welcome, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Holy Ghost Council 10325 · What needs you today
          </p>
        </div>
        {dbOk ? <RunEngineButton /> : null}
      </div>

      <MirrorBanner />

      {!dbOk ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Connect Neon to go live</CardTitle>
            <CardDescription>
              Set <code className="text-xs">DATABASE_URL</code>, run{" "}
              <code className="text-xs">pnpm db:push</code>, then refresh
              deadlines. Until then, navigation and auth still work.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/calendar"
          title="Open tasks"
          value={taskSummary?.open ?? "—"}
          icon={CheckCircle2}
          hint={
            taskSummary
              ? `${taskSummary.overdue} overdue · ${taskSummary.dueToday} today`
              : "Calendar"
          }
        />
        <StatCard
          href="/retention"
          title="Retention cases"
          value={openCases.length || (dbOk ? 0 : "—")}
          icon={ShieldAlert}
          hint="Cadence needing action"
        />
        <StatCard
          href="/members"
          title="Members"
          value={dbOk ? memberCount : "—"}
          icon={Users}
          hint="Contact mirror"
        />
        <StatCard
          href="/correspondence"
          title="Approvals"
          value={dbOk ? pendingApprovals : "—"}
          icon={Mail}
          hint="Drafts needing approval"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">What&apos;s due</CardTitle>
              <CardDescription>Open tasks by due date</CardDescription>
            </div>
            <Link
              href="/calendar"
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {topTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No open tasks.{" "}
                {dbOk
                  ? "Click Refresh deadlines to expand the FS calendar."
                  : "Connect the database first."}
              </p>
            ) : (
              <ul className="divide-y">
                {topTasks.map((t) => {
                  const overdue = t.dueDate && t.dueDate < today;
                  return (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {t.dueDate ?? "No date"} · {t.category}
                          {overdue ? (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-[10px]"
                            >
                              overdue
                            </Badge>
                          ) : null}
                        </p>
                      </div>
                      <TaskRowActions id={t.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Retention</CardTitle>
              <CardDescription>Open delinquency cases</CardDescription>
            </div>
            <Link
              href="/retention"
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              Tracker
            </Link>
          </CardHeader>
          <CardContent>
            {openCases.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No open retention cases. Open one from the Retention page when a
                member is delinquent.
              </p>
            ) : (
              <ul className="divide-y">
                {openCases.map((c) => (
                  <li key={c.id} className="py-2.5">
                    <Link
                      href={`/retention/${c.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {c.memberName}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {STATE_LABELS[c.state as RetentionState] ?? c.state}
                      {" · "}
                      {c.nextLabel}
                      {c.overdue ? (
                        <Badge
                          variant="destructive"
                          className="ml-2 text-[10px]"
                        >
                          overdue
                        </Badge>
                      ) : c.dueDate ? (
                        <span> · due {c.dueDate}</span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4" />
            Engine status
          </CardTitle>
          <CardDescription>
            Daily cron at <code className="text-xs">/api/cron/daily</code>{" "}
            expands assessment/audit/990/365/bonding deadlines, refreshes
            retention tasks, and emails a digest when Resend is configured.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function StatCard({
  href,
  title,
  value,
  icon: Icon,
  hint,
}: {
  href: string;
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl tabular-nums text-primary">
            {value}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

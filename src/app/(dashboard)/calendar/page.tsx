import { RunEngineButton, TaskRowActions } from "@/components/task-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createManualTask, getTaskSummary } from "../tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayIso } from "@/lib/domain/dates";

export default async function CalendarPage() {
  let summary: Awaited<ReturnType<typeof getTaskSummary>> | null = null;
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      summary = await getTaskSummary();
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load tasks.";
    }
  }

  const today = todayIso();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            Calendar & tasks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Recurring FS deadlines expanded by the daily engine, plus manual
            to-dos.
          </p>
        </div>
        <RunEngineButton />
      </div>

      {error ? (
        <p className="text-destructive text-sm">
          {error} Run <code className="text-xs">pnpm db:push</code> if schema
          is missing.
        </p>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Open" value={summary.open} />
          <Stat label="Overdue" value={summary.overdue} alert />
          <Stat label="Due today" value={summary.dueToday} />
          <Stat label="Due this week" value={summary.dueSoon} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open tasks</CardTitle>
          <CardDescription>
            Auto tasks use stable keys so cron refreshes instead of duplicating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!summary?.tasks.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No open tasks. Click “Refresh deadlines” to expand the
                      calendar.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.tasks.map((t) => {
                    const overdue = t.dueDate && t.dueDate < today;
                    const dueToday = t.dueDate === today;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {t.dueDate ?? "—"}
                          {overdue ? (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-[10px]"
                            >
                              overdue
                            </Badge>
                          ) : dueToday ? (
                            <Badge className="ml-2 bg-accent text-accent-foreground text-[10px]">
                              today
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{t.title}</p>
                          {t.detail ? (
                            <p className="text-muted-foreground line-clamp-2 text-xs">
                              {t.detail}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {t.category}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {t.source}
                        </TableCell>
                        <TableCell>
                          <TaskRowActions id={t.id} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add manual task</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              "use server";
              await createManualTask(fd);
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                defaultValue="general"
              >
                <option value="general">General</option>
                <option value="assessment">Assessment</option>
                <option value="audit">Audit</option>
                <option value="990">990</option>
                <option value="365">365</option>
                <option value="bonding">Bonding</option>
                <option value="member">Member</option>
                <option value="retention">Retention</option>
                <option value="supply">Supply</option>
                <option value="comp">Compensation</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="detail">Detail</Label>
              <Input id="detail" name="detail" />
            </div>
            <div>
              <Button type="submit">Add task</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <Card className={alert && value > 0 ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={`text-2xl tabular-nums ${alert && value > 0 ? "text-destructive" : "text-primary"}`}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

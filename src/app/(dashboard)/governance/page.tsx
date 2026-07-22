import { desc } from "drizzle-orm";
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
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";

export default async function GovernancePage() {
  const session = await auth();
  if (!session?.user) return null;

  let rows: (typeof auditLog.$inferSelect)[] = [];
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      rows = await getDb()
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(150);
    } catch (e) {
      error = e instanceof Error ? e.message : "Load failed";
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Governance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Audit log of sends, queues, state changes, and agent actions. Records
          retention: Form 100 3–7 years; correspondence/accounting 3 years;
          always obliterate tax IDs (never store them here).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records retention reminders</CardTitle>
          <CardDescription>
            When destroying paper/digital Form 100 or correspondence: obliterate
            all tax ID digits including last four. Do not request SSNs at council
            level.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      No events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {r.createdAt.toISOString().slice(0, 19)}
                      </TableCell>
                      <TableCell className="text-xs">{r.actor}</TableCell>
                      <TableCell className="text-sm">{r.action}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.entity}
                        {r.entityId ? `:${r.entityId.slice(0, 8)}` : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

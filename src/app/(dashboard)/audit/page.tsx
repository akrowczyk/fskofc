import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { listAuditPeriods, listFilings } from "./actions";
import {
  AuditPeriodEditor,
  CreateAuditForm,
  MarkFiledButton,
  SeedFilingsButton,
} from "./audit-client";

export default async function AuditPage() {
  let periods: Awaited<ReturnType<typeof listAuditPeriods>> = [];
  let filings: Awaited<ReturnType<typeof listFilings>> = [];
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      [periods, filings] = await Promise.all([listAuditPeriods(), listFilings()]);
    } catch (e) {
      error = e instanceof Error ? e.message : "Load failed";
    }
  }

  const auditsOnFile = filings.filter(
    (f) => f.kind === "audit_1295" && f.status === "filed",
  ).length;
  const bondRisk = auditsOnFile < 2;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Audit prep & filings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Companion worksheets for #1295 and deadline trackers for 990 / 365 /
          bonding. Not the official audit form.
        </p>
      </div>

      {bondRisk ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Bonding risk</AlertTitle>
          <AlertDescription>
            Fewer than two filed #1295 audits recorded here. Bond is void if the
            last two audits are not on file at Supreme — confirm on Officers
            Online.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Filing tracker</CardTitle>
            <CardDescription>990, 365, audit, bonding</CardDescription>
          </div>
          <SeedFilingsButton />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    No filings — seed this year to start.
                  </TableCell>
                </TableRow>
              ) : (
                filings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.kind}</TableCell>
                    <TableCell className="text-sm">{f.periodLabel}</TableCell>
                    <TableCell className="font-mono text-xs">{f.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{f.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {f.status !== "filed" ? (
                        <MarkFiledButton id={f.id} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {f.filedDate}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit periods</CardTitle>
          <CardDescription>
            Checklist + Schedule B/C worksheets (prep only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CreateAuditForm />
          {periods.map((p) => (
            <AuditPeriodEditor
              key={p.id}
              period={{
                id: p.id,
                label: p.label,
                status: p.status,
                notes: p.notes,
                gatheredChecklist:
                  (p.gatheredChecklist as Record<string, boolean>) ?? {},
                scheduleB: p.scheduleB as { lines?: { label: string; amount: number }[] },
                scheduleC: p.scheduleC as { lines?: { label: string; amount: number }[] },
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { AlertTriangle, FileSpreadsheet } from "lucide-react";
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
import { IRS_990N_GROSS_RECEIPTS } from "@/lib/domain/assessment-defaults";

const FILING_LABELS: Record<string, string> = {
  audit_1295: "1295A audit",
  form_990: "Form 990",
  form_365: "Form 365",
  bonding_renewal: "Bonding",
};

export default async function AuditPage() {
  let periods: Awaited<ReturnType<typeof listAuditPeriods>> = [];
  let filings: Awaited<ReturnType<typeof listFilings>> = [];
  let defaults = { ein: null as string | null, gkName: null as string | null, fromEmail: null as string | null };
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      const { getDb } = await import("@/db");
      const { councilSettings } = await import("@/db/schema");
      const [p, f, settingsRows] = await Promise.all([
        listAuditPeriods(),
        listFilings(),
        getDb().select().from(councilSettings).limit(1),
      ]);
      periods = p;
      filings = f;
      const s = settingsRows[0];
      defaults = {
        ein: s?.councilEin ?? null,
        gkName: s?.gkName ?? null,
        fromEmail: s?.fromEmail ?? null,
      };
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
          Prep worksheet for the Annual Council Audit Report (1295A). File the
          official report in Officers Online — this is not the filing.
        </p>
      </div>

      <Alert>
        <FileSpreadsheet className="size-4" />
        <AlertTitle>Do not mail this worksheet to Supreme</AlertTitle>
        <AlertDescription>
          Period ending June 30; due August 15. Enter the Annual Council Audit
          Report in Officers Online (or kofc.org/forms). Trustees conduct the
          audit; FS gathers records and should be available. Signatures: Grand
          Knight and at least two of three trustees.
        </AlertDescription>
      </Alert>

      {bondRisk ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Bonding risk</AlertTitle>
          <AlertDescription>
            Fewer than two filed 1295A audits recorded here. Bond is void if the
            last two audits are not on file at Supreme — confirm on Officers
            Online.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form 990 (US)</CardTitle>
          <CardDescription>
            Each council needs its own EIN and must file annually. 990-N
            (online) if gross receipts normally ≤ $
            {IRS_990N_GROSS_RECEIPTS.toLocaleString()}; longer form at $
            {IRS_990N_GROSS_RECEIPTS.toLocaleString()}+. Missing three
            consecutive years can lose tax-exempt status. Questions: Tax.EIN@KofC.org
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Filing tracker</CardTitle>
            <CardDescription>990, 365 (Jun 30), 1295A, bonding</CardDescription>
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
                    <TableCell className="text-sm">
                      {FILING_LABELS[f.kind] ?? f.kind}
                    </TableCell>
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
          <CardTitle className="text-base">1295A worksheets</CardTitle>
          <CardDescription>
            Line items match the Annual Council Audit Worksheet. Totals are
            prep only.
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
                scheduleB: p.scheduleB,
              }}
              defaults={defaults}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

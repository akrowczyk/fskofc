import Link from "next/link";
import {
  RetentionGuardrails,
  RetentionInfoBanner,
} from "@/components/retention-guardrails";
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
import { STATE_LABELS, type RetentionState } from "@/lib/domain/retention";
import { listMembersForSelect, listRetentionCases } from "./actions";
import { OpenCaseForm } from "./open-case-form";

export default async function RetentionPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;
  const includeClosed = closed === "1";

  let cases: Awaited<ReturnType<typeof listRetentionCases>> = [];
  let members: Awaited<ReturnType<typeof listMembersForSelect>> = [];
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      [cases, members] = await Promise.all([
        listRetentionCases({ includeClosed }),
        listMembersForSelect(),
      ]);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load cases.";
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Retention cases</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Delinquency cadence: #423 → #424 → KA1 → personal contact → #1845 →
          Form 100.
        </p>
      </div>

      <RetentionInfoBanner />
      <RetentionGuardrails />

      {error ? (
        <p className="text-destructive text-sm">
          {error} Ensure schema is applied (
          <code className="text-xs">pnpm db:push</code>).
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open a case</CardTitle>
          <CardDescription>
            One open case per member. Re-delinquency after #1845 void starts a
            new case.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenCaseForm members={members} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">
          {includeClosed ? "All cases" : "Open cases"}
        </h2>
        <Link
          href={includeClosed ? "/retention" : "/retention?closed=1"}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {includeClosed ? "Show open only" : "Include closed"}
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-8 text-center"
                >
                  No cases yet.
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/retention/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.member.lastName}, {c.member.firstName}
                    </Link>
                    <p className="text-muted-foreground font-mono text-xs">
                      #{c.member.memberNumber}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {STATE_LABELS[c.state as RetentionState] ?? c.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.nextAction.label}
                    {c.nextAction.overdue ? (
                      <Badge variant="destructive" className="ml-2 text-[10px]">
                        overdue
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.nextAction.dueDate ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

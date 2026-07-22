import { MirrorBanner } from "@/components/mirror-banner";
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
import { listMembersForSelect } from "../retention/actions";
import { listCorrespondence } from "./actions";
import {
  CorrespondenceActions,
  DraftEmailForm,
  QueueMailForm,
  StatusBadge,
} from "./correspondence-client";

export default async function CorrespondencePage() {
  let rows: Awaited<ReturnType<typeof listCorrespondence>> = [];
  let members: Awaited<ReturnType<typeof listMembersForSelect>> = [];
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      [rows, members] = await Promise.all([
        listCorrespondence(),
        listMembersForSelect(),
      ]);
    } catch (e) {
      error = e instanceof Error ? e.message : "Load failed";
    }
  }

  const pending = rows.filter((r) =>
    ["needs_approval", "queued"].includes(r.item.status),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Correspondence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Approval-gated email and printable letters. Nothing sends without your
          approval. Official #423/#424/#1845 filings remain via kofc.org tools.
        </p>
      </div>

      <MirrorBanner />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft email</CardTitle>
            <CardDescription>
              Creates status <code className="text-xs">needs_approval</code>.
              Supplemental only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DraftEmailForm members={members} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue snail mail</CardTitle>
            <CardDescription>
              Generates printable PDF for #423 / #424 / KA1 / #1845 / welcome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QueueMailForm members={members} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Queue ({pending.length} needing action)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No correspondence yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ item, member }) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {member
                          ? `${member.lastName}, ${member.firstName}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {item.channel}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.template}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                        {item.error ? (
                          <p className="text-destructive max-w-[120px] truncate text-[10px]">
                            {item.error}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs">
                        {item.subject}
                      </TableCell>
                      <TableCell>
                        <CorrespondenceActions
                          row={{
                            item: {
                              ...item,
                              createdAt: item.createdAt,
                            },
                            member,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

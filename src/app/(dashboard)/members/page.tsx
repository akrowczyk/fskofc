import Link from "next/link";
import { MirrorBanner } from "@/components/mirror-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportForm } from "./import-form";
import { searchMembers } from "./actions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let list: Awaited<ReturnType<typeof searchMembers>> = [];
  let dbError = false;

  if (!process.env.DATABASE_URL) {
    dbError = true;
  } else {
    try {
      list = await searchMembers(q ?? "");
    } catch {
      dbError = true;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Members</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Contact mirror for Council 10325. Phone/email live here — not in
            Member Management.
          </p>
        </div>
        <Button render={<Link href="/members/new" />}>Add member</Button>
      </div>

      <MirrorBanner />

      {dbError ? (
        <p className="text-destructive text-sm">
          Database unavailable. Set DATABASE_URL and run{" "}
          <code className="text-xs">pnpm db:push</code>.
        </p>
      ) : null}

      <ImportForm />

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, member #, email, phone…"
          className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Member #</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No members yet. Import a roster or add one manually.
                </TableCell>
              </TableRow>
            ) : (
              list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/members/${m.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {m.lastName}, {m.firstName}
                    </Link>
                    {m.addressRestricted ? (
                      <Badge variant="outline" className="ml-2 text-xs">
                        *
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.memberNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {m.email || m.phone || "—"}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {m.memberType?.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {m.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {list.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Showing {list.length} member(s)
          {q ? ` matching “${q}”` : ""}.
        </p>
      ) : null}
    </div>
  );
}

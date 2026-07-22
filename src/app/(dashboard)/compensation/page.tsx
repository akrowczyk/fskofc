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
import { Badge } from "@/components/ui/badge";
import { listCompRecords, saveCompRecord } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db";
import { councilSettings } from "@/db/schema";

export default async function CompensationPage() {
  let records: Awaited<ReturnType<typeof listCompRecords>> = [];
  let defaultPct = "8";
  let error: string | null = null;

  if (!process.env.DATABASE_URL) {
    error = "DATABASE_URL not set.";
  } else {
    try {
      records = await listCompRecords();
      const settings = await getDb().select().from(councilSettings).limit(1);
      if (settings[0]?.compPercent) defaultPct = String(settings[0].compPercent);
    } catch (e) {
      error = e instanceof Error ? e.message : "Load failed";
    }
  }

  const year = new Date().getFullYear();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Compensation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          8–10% of dues collected (council) + $0.40 per insurance certificate
          (Supreme). 1099 if total &gt; $599.99. W-9 must be on file at Supreme.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record year</CardTitle>
          <CardDescription>
            Dues only — not initiation fees. Verify cert count from Supreme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              "use server";
              await saveCompRecord(fd);
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" name="year" type="number" defaultValue={year} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compPercent">Comp % (8–10)</Label>
              <Input
                id="compPercent"
                name="compPercent"
                type="number"
                step="0.01"
                defaultValue={defaultPct}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duesCollected">Dues collected ($)</Label>
              <Input
                id="duesCollected"
                name="duesCollected"
                type="number"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceCerts">Insurance certificates</Label>
              <Input
                id="insuranceCerts"
                name="insuranceCerts"
                type="number"
                defaultValue={0}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="waived" value="true" />
              Waive council portion
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="w9OnFile" value="true" />
              W-9 on file at Supreme
            </label>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" />
            </div>
            <Button type="submit">Save & calculate</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Dues</TableHead>
                <TableHead>Council</TableHead>
                <TableHead>Supreme</TableHead>
                <TableHead>1099</TableHead>
                <TableHead>W-9</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    No records yet.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.year}</TableCell>
                    <TableCell>${r.duesCollected}</TableCell>
                    <TableCell>
                      ${r.compFromCouncil}
                      {r.waived ? " (waived)" : ` @ ${r.compPercent}%`}
                    </TableCell>
                    <TableCell>
                      ${r.compFromSupreme} ({r.insuranceCerts} certs)
                    </TableCell>
                    <TableCell>
                      {r.form1099Expected ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.w9OnFile ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importRoster, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Importing…" : "Import roster"}
    </Button>
  );
}

export function ImportForm() {
  const [state, action] = useActionState(
    importRoster,
    null as ActionResult | null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import roster (Excel)</CardTitle>
        <CardDescription>
          Weekly Member Management export (.xlsx). Upserts by member number;
          preserves local phone/email/notes when the export omits them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="file">Roster file</Label>
            <Input id="file" name="file" type="file" accept=".xlsx,.xls,.csv" required />
          </div>
          <Submit />
        </form>
        {state?.ok === false ? (
          <p className="text-destructive mt-2 text-sm">{state.error}</p>
        ) : null}
        {state?.ok === true ? (
          <p className="mt-2 text-sm text-green-700">{state.message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

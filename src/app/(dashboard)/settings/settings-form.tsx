"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CouncilSettings } from "@/db/schema";
import { saveCouncilSettings, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </Button>
  );
}

export function SettingsForm({
  settings,
}: {
  settings: CouncilSettings | null;
}) {
  const [state, formAction] = useActionState(
    saveCouncilSettings,
    null as ActionResult | null,
  );

  const trustees = Array.isArray(settings?.trusteeNames)
    ? (settings.trusteeNames as string[]).join(", ")
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Council identity</CardTitle>
        <CardDescription>
          Holy Ghost Council 10325 defaults. Comp % is council-set (8–10% of
          dues collected only).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="councilNumber">Council number</Label>
            <Input
              id="councilNumber"
              name="councilNumber"
              defaultValue={settings?.councilNumber ?? "10325"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="councilName">Council name</Label>
            <Input
              id="councilName"
              name="councilName"
              defaultValue={settings?.councilName ?? "Holy Ghost Council"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiscalYearEnd">Fiscal year end (MM-DD)</Label>
            <Input
              id="fiscalYearEnd"
              name="fiscalYearEnd"
              defaultValue={settings?.fiscalYearEnd ?? "12-31"}
              placeholder="12-31"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From email (Resend)</Label>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              defaultValue={settings?.fromEmail ?? ""}
              placeholder="fs@example.org"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gkName">Grand Knight</Label>
            <Input
              id="gkName"
              name="gkName"
              defaultValue={settings?.gkName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ddName">District Deputy</Label>
            <Input
              id="ddName"
              name="ddName"
              defaultValue={settings?.ddName ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trusteeNames">Trustees (comma-separated)</Label>
            <Input
              id="trusteeNames"
              name="trusteeNames"
              defaultValue={trustees}
              placeholder="Name One, Name Two, Name Three"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mailingAddress">Mailing address</Label>
            <Textarea
              id="mailingAddress"
              name="mailingAddress"
              defaultValue={settings?.mailingAddress ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compPercent">FS compensation % (8–10)</Label>
            <Input
              id="compPercent"
              name="compPercent"
              type="number"
              step="0.01"
              min={8}
              max={10}
              defaultValue={settings?.compPercent ?? "8"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duesDefault">Default dues ($/yr, ≥5)</Label>
            <Input
              id="duesDefault"
              name="duesDefault"
              type="number"
              step="0.01"
              min={5}
              defaultValue={settings?.duesDefault ?? "30"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duesUnder26">Dues under 26 ($/yr, ≥3)</Label>
            <Input
              id="duesUnder26"
              name="duesUnder26"
              type="number"
              step="0.01"
              min={3}
              defaultValue={settings?.duesUnder26 ?? "15"}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bondingNote">Bonding notes</Label>
            <Textarea
              id="bondingNote"
              name="bondingNote"
              defaultValue={settings?.bondingNote ?? ""}
              rows={2}
              placeholder="Bond void if last two audits (#1295) not on file at Supreme."
            />
          </div>

          {state?.ok === false ? (
            <p className="text-destructive sm:col-span-2 text-sm">
              {state.error}
            </p>
          ) : null}
          {state?.ok === true ? (
            <p className="text-sm text-green-700 sm:col-span-2">
              {state.message}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

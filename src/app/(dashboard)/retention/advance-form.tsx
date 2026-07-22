"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RetentionState } from "@/lib/domain/retention";
import { STATE_LABELS } from "@/lib/domain/retention";
import { advanceRetentionCase } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdvanceForm({
  caseId,
  allowedTransitions,
  suggested,
}: {
  caseId: string;
  allowedTransitions: RetentionState[];
  suggested: RetentionState | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (allowedTransitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Case is terminal — no further advances.
      </p>
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const to = String(fd.get("toState")) as RetentionState;
        start(async () => {
          const result = await advanceRetentionCase(caseId, to, {
            personalContactBy: String(fd.get("personalContactBy") ?? "") || undefined,
            personalContactReport:
              String(fd.get("personalContactReport") ?? "") || undefined,
            resolution: String(fd.get("resolution") ?? "") || undefined,
            resolutionNote: String(fd.get("resolutionNote") ?? "") || undefined,
            intent1845ProcessedDate:
              String(fd.get("intent1845ProcessedDate") ?? "") || undefined,
          });
          if (!result.ok) alert(result.error);
          else router.refresh();
        });
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="toState">Advance to</Label>
        <select
          id="toState"
          name="toState"
          required
          defaultValue={suggested ?? allowedTransitions[0]}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          {allowedTransitions.map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
              {suggested === s ? " (suggested)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalContactBy">Personal contact by</Label>
        <Input id="personalContactBy" name="personalContactBy" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="intent1845ProcessedDate">
          #1845 processed date (if filing)
        </Label>
        <Input
          id="intent1845ProcessedDate"
          name="intent1845ProcessedDate"
          type="date"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="personalContactReport">Personal contact report</Label>
        <Textarea id="personalContactReport" name="personalContactReport" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="resolution">Resolution (if closing)</Label>
        <select
          id="resolution"
          name="resolution"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue=""
        >
          <option value="">—</option>
          <option value="paid">Paid</option>
          <option value="plan">Payment plan</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resolutionNote">Resolution note</Label>
        <Input id="resolutionNote" name="resolutionNote" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Advance case"}
        </Button>
      </div>
    </form>
  );
}

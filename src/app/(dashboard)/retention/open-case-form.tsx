"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { openRetentionCase } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function OpenCaseForm({
  members,
}: {
  members: Array<{
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
  }>;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Import or add members first, then open a retention case.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const memberId = String(fd.get("memberId"));
        start(async () => {
          const r = await openRetentionCase(memberId);
          if (!r.ok) alert(r.error);
          else if (r.id) router.push(`/retention/${r.id}`);
          else router.refresh();
        });
      }}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="memberId">Member</Label>
        <select
          id="memberId"
          name="memberId"
          required
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select member…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.lastName}, {m.firstName} (#{m.memberNumber})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Opening…" : "Open case"}
      </Button>
    </form>
  );
}

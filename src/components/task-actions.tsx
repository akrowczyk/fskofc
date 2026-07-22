"use client";

import { useTransition } from "react";
import { completeTask, dismissTask, runEngineNow } from "@/app/(dashboard)/tasks/actions";
import { Button } from "@/components/ui/button";

export function TaskRowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        size="xs"
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => { await completeTask(id); })}
      >
        Done
      </Button>
      <Button
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => start(async () => { await dismissTask(id); })}
      >
        Dismiss
      </Button>
    </div>
  );
}

export function RunEngineButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runEngineNow();
          if (!r.ok) alert(r.error);
          else if (r.message) {
            /* page revalidates */
          }
        })
      }
    >
      {pending ? "Running…" : "Refresh deadlines"}
    </Button>
  );
}

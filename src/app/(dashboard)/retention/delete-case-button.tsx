"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRetentionCase } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteCaseButton({
  caseId,
  memberLabel,
  variant = "detail",
}: {
  caseId: string;
  memberLabel: string;
  /** detail = full button; row = compact for list */
  variant?: "detail" | "row";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onDelete() {
    const ok = window.confirm(
      `Delete the retention case for ${memberLabel}?\n\nThis cannot be undone. Linked tasks for this case will also be removed. The member record is not deleted.`,
    );
    if (!ok) return;

    start(async () => {
      const result = await deleteRetentionCase(caseId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.push("/retention");
      router.refresh();
    });
  }

  if (variant === "row") {
    return (
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={pending}
        onClick={onDelete}
      >
        {pending ? "…" : "Delete"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={onDelete}
    >
      {pending ? "Deleting…" : "Delete case"}
    </Button>
  );
}

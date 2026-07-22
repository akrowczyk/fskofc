"use client";

import { useTransition } from "react";
import type { assessmentConfig } from "@/db/schema";
import {
  markAssessmentVerified,
  seedAssessmentDefaults,
  updateAssessmentAmount,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSESSMENT_DEFAULTS_2009 } from "@/lib/domain/assessment-defaults";

type Row = typeof assessmentConfig.$inferSelect;

const LABELS: Record<string, string> = Object.fromEntries(
  ASSESSMENT_DEFAULTS_2009.map((r) => [r.kind, r.label]),
);

export function AssessmentPanel({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supreme assessment amounts</CardTitle>
        <CardDescription>
          Seeded from the 2009 handbook. Treat as defaults — verify against
          current Supreme Council figures before relying on them for payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              No assessment config yet. Seed the 2009 defaults (per capita
              $1.75, Catholic Advertising $0.50, Culture of Life $1.00).
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await seedAssessmentDefaults();
                })
              }
            >
              Seed 2009 defaults
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {LABELS[row.kind] ?? row.kind}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Effective {row.effectiveFrom}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                  {row.verifiedAt ? (
                    <Badge variant="secondary" className="mt-1">
                      Verified {row.verifiedAt}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 border-accent text-accent-foreground">
                      Unverified — check Supreme
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const amount = Number(fd.get("amount"));
                      start(async () => {
                        await updateAssessmentAmount(row.id, amount);
                      });
                    }}
                  >
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      min={0.01}
                      defaultValue={row.amount}
                      className="w-24"
                    />
                    <Button type="submit" size="sm" variant="outline" disabled={pending}>
                      Update
                    </Button>
                  </form>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await markAssessmentVerified(row.id);
                      })
                    }
                  >
                    Mark verified
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

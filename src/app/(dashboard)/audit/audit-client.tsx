"use client";

import { useState, useTransition } from "react";
import {
  createAuditPeriod,
  markFilingFiled,
  seedYearFilings,
  updateAuditPeriod,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScheduleBLine } from "@/lib/domain/compensation";

export function CreateAuditForm() {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createAuditPeriod(String(fd.get("label") ?? ""));
        });
      }}
    >
      <Input
        name="label"
        placeholder='e.g. 2026-H1 (Jan)'
        required
        className="max-w-xs"
      />
      <Button type="submit" disabled={pending}>
        New period
      </Button>
    </form>
  );
}

export function SeedFilingsButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await seedYearFilings(new Date().getFullYear());
        })
      }
    >
      Seed this year&apos;s filings
    </Button>
  );
}

export function MarkFiledButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      disabled={pending}
      onClick={() => start(async () => { await markFilingFiled(id); })}
    >
      Mark filed
    </Button>
  );
}

export function AuditPeriodEditor({
  period,
}: {
  period: {
    id: string;
    label: string;
    status: string;
    notes: string | null;
    gatheredChecklist: Record<string, boolean> | null;
    scheduleB: { lines?: ScheduleBLine[] } | null;
    scheduleC: { lines?: ScheduleBLine[] } | null;
  };
}) {
  const [pending, start] = useTransition();
  const [checklist, setChecklist] = useState(
    period.gatheredChecklist ?? {},
  );
  const [notes, setNotes] = useState(period.notes ?? "");
  const [bLines, setBLines] = useState<ScheduleBLine[]>(
    period.scheduleB?.lines ?? [],
  );
  const [cLines, setCLines] = useState<ScheduleBLine[]>(
    period.scheduleC?.lines ?? [],
  );

  const bTotal = bLines.reduce((s, l) => s + Number(l.amount || 0), 0);
  const cTotal = cLines.reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">{period.label}</h3>
        <span className="text-muted-foreground text-xs">{period.status}</span>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Records checklist</p>
        <ul className="space-y-1">
          {Object.keys(checklist).map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!checklist[key]}
                onChange={(e) =>
                  setChecklist((c) => ({ ...c, [key]: e.target.checked }))
                }
              />
              {key}
            </li>
          ))}
        </ul>
      </div>

      <ScheduleEditor
        title="Schedule B (cash transactions) — prep only"
        lines={bLines}
        onChange={setBLines}
        total={bTotal}
      />
      <ScheduleEditor
        title="Schedule C (assets/liabilities) — prep only"
        lines={cLines}
        onChange={setCLines}
        total={cTotal}
      />

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await updateAuditPeriod(period.id, {
              checklist,
              scheduleB: { lines: bLines },
              scheduleC: { lines: cLines },
              notes,
            });
          })
        }
      >
        {pending ? "Saving…" : "Save period"}
      </Button>
    </div>
  );
}

function ScheduleEditor({
  title,
  lines,
  onChange,
  total,
}: {
  title: string;
  lines: ScheduleBLine[];
  onChange: (l: ScheduleBLine[]) => void;
  total: number;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={line.label}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, label: e.target.value };
                onChange(next);
              }}
            />
            <Input
              type="number"
              step="0.01"
              className="w-28"
              value={line.amount}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, amount: Number(e.target.value) };
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Total: ${total.toFixed(2)} (worksheet only — not official #1295)
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
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
import {
  CURRENT_ASSET_FIELDS,
  INCOMING_FIELDS,
  INVESTMENT_FIELDS,
  LIABILITY_FIELDS,
  OUTGOING_FIELDS,
  PROPERTY_FIELDS,
  auditPeriodLabel,
  coerceWorksheet,
  defaultAuditPeriodYear,
  mergeChecklist,
  worksheetTotals,
  type Audit1295AWorksheet,
  type MoneyField,
  type YesNo,
} from "@/lib/domain/audit-worksheet";

export type WorksheetDefaults = {
  ein: string | null;
  gkName: string | null;
  fromEmail: string | null;
};

export function CreateAuditForm() {
  const [pending, start] = useTransition();
  const year = defaultAuditPeriodYear();
  return (
    <form
      className="flex flex-wrap gap-2"
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
        defaultValue={auditPeriodLabel(year)}
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
      onClick={() =>
        start(async () => {
          await markFilingFiled(id);
        })
      }
    >
      Mark filed
    </Button>
  );
}

export function AuditPeriodEditor({
  period,
  defaults,
}: {
  period: {
    id: string;
    label: string;
    status: string;
    notes: string | null;
    gatheredChecklist: Record<string, boolean> | null;
    scheduleB: unknown;
  };
  defaults: WorksheetDefaults;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(() =>
    mergeChecklist(period.gatheredChecklist),
  );
  const [notes, setNotes] = useState(period.notes ?? "");
  const [w, setW] = useState<Audit1295AWorksheet>(() =>
    coerceWorksheet(period.scheduleB, {
      ein: defaults.ein,
      gkName: defaults.gkName,
      fromEmail: defaults.fromEmail,
    }),
  );

  const totals = useMemo(() => worksheetTotals(w), [w]);

  return (
    <div className="space-y-6 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-primary">{period.label}</h3>
        <span className="text-muted-foreground text-xs">{period.status}</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Jurisdiction">
          <Input
            value={w.jurisdiction}
            onChange={(e) => setW({ ...w, jurisdiction: e.target.value })}
          />
        </Field>
        <Field label="Period ending June 30">
          <Input
            type="number"
            value={w.periodEndingYear}
            onChange={(e) =>
              setW({ ...w, periodEndingYear: Number(e.target.value) || w.periodEndingYear })
            }
          />
        </Field>
        <Field label="KofC Charitable Fund (KCCF) council account">
          <YesNoSelect
            value={w.hasKccfAccount}
            onChange={(hasKccfAccount) => setW({ ...w, hasKccfAccount })}
          />
        </Field>
        <Field
          label="Council EIN"
          hint="Organizational EIN only. Questions: Tax.EIN@KofC.org"
        >
          <Input
            value={w.ein}
            placeholder="12-3456789"
            autoComplete="off"
            onChange={(e) => setW({ ...w, ein: e.target.value })}
          />
        </Field>
        <Field
          label="IRS Form 990 filed this year?"
          hint="Every US council must file a Form 990 annually."
        >
          <YesNoSelect
            value={w.form990Filed}
            onChange={(form990Filed) => setW({ ...w, form990Filed })}
          />
        </Field>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium">Records to gather</p>
        <ul className="space-y-1">
          {Object.keys(checklist).map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!checklist[key]}
                onChange={(e) =>
                  setChecklist((c) => ({ ...c, [key]: e.target.checked }))
                }
              />
              <span>{key}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">
          Council balance sheet
        </h4>
        <div className="grid gap-6 md:grid-cols-2">
          <MoneySection
            title="Current assets"
            fields={CURRENT_ASSET_FIELDS}
            values={w.currentAssets}
            total={totals.currentAssets}
            onChange={(currentAssets) => setW({ ...w, currentAssets })}
            otherNote={w.currentAssetOtherNote}
            otherNoteLabel='Clarify “Other” current assets'
            onOtherNote={(currentAssetOtherNote) =>
              setW({ ...w, currentAssetOtherNote })
            }
          />
          <MoneySection
            title="Liabilities"
            fields={LIABILITY_FIELDS}
            values={w.liabilities}
            total={totals.liabilities}
            onChange={(liabilities) => setW({ ...w, liabilities })}
            otherNote={w.liabilityOtherNote}
            otherNoteLabel='Clarify “Other” liabilities'
            onOtherNote={(liabilityOtherNote) =>
              setW({ ...w, liabilityOtherNote })
            }
          />
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">Other assets</h4>
        <div className="grid gap-6 md:grid-cols-2">
          <MoneySection
            title="Investments"
            fields={INVESTMENT_FIELDS}
            values={w.investments}
            total={totals.investments}
            onChange={(investments) => setW({ ...w, investments })}
            otherNote={w.investmentOtherNote}
            otherNoteLabel='Clarify “Other” investments'
            onOtherNote={(investmentOtherNote) =>
              setW({ ...w, investmentOtherNote })
            }
          />
          <MoneySection
            title="Property (>$5K)"
            fields={PROPERTY_FIELDS}
            values={w.property}
            total={totals.property}
            onChange={(property) => setW({ ...w, property })}
            otherNote={w.propertyOtherNote}
            otherNoteLabel='Clarify “Other” property'
            onOtherNote={(propertyOtherNote) =>
              setW({ ...w, propertyOtherNote })
            }
          />
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">
          Statement of cash flows
        </h4>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Cash on hand — beginning of period">
            <MoneyInput
              value={w.cashOnHandBegin}
              onChange={(cashOnHandBegin) => setW({ ...w, cashOnHandBegin })}
            />
          </Field>
          <Field label="Cash on hand — end of period">
            <MoneyInput
              value={w.cashOnHandEnd}
              onChange={(cashOnHandEnd) => setW({ ...w, cashOnHandEnd })}
            />
          </Field>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <MoneySection
            title="Incoming cash flows"
            fields={INCOMING_FIELDS}
            values={w.incoming}
            total={totals.incoming}
            onChange={(incoming) => setW({ ...w, incoming })}
            otherNote={w.incomingOtherNote}
            otherNoteLabel='Clarify “Other” income'
            onOtherNote={(incomingOtherNote) =>
              setW({ ...w, incomingOtherNote })
            }
          />
          <MoneySection
            title="Outgoing cash flows"
            fields={OUTGOING_FIELDS}
            values={w.outgoing}
            total={totals.outgoing}
            onChange={(outgoing) => setW({ ...w, outgoing })}
            otherNote={w.outgoingOtherNote}
            otherNoteLabel='Clarify “Other” expenses'
            onOtherNote={(outgoingOtherNote) =>
              setW({ ...w, outgoingOtherNote })
            }
          />
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">
          Knights of Columbus Charitable Fund council account
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Balance at beginning of period">
            <MoneyInput
              value={w.kccfBegin}
              onChange={(kccfBegin) => setW({ ...w, kccfBegin })}
            />
          </Field>
          <Field label="Contributions (Jul 1–Jun 30)">
            <MoneyInput
              value={w.kccfContributions}
              onChange={(kccfContributions) => setW({ ...w, kccfContributions })}
            />
          </Field>
          <Field label="Grants (Jul 1–Jun 30)">
            <MoneyInput
              value={w.kccfGrants}
              onChange={(kccfGrants) => setW({ ...w, kccfGrants })}
            />
          </Field>
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">
          Additional information
        </h4>
        <div className="space-y-3">
          <Field label="Comments">
            <Textarea
              value={w.comments}
              onChange={(e) => setW({ ...w, comments: e.target.value })}
              rows={2}
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">
              Audit reviewed by (check any that apply)
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {(
                [
                  ["grandKnight", "Grand Knight"],
                  ["trustee1", "Trustee 1"],
                  ["trustee2", "Trustee 2"],
                  ["trustee3", "Trustee 3"],
                  ["treasurer", "Treasurer"],
                  ["financialSecretary", "Financial Secretary"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={w.reviewedBy[key]}
                    onChange={(e) =>
                      setW({
                        ...w,
                        reviewedBy: { ...w.reviewedBy, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <p className="text-sm font-medium">Email addresses for distribution</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["trustee1", "Trustee 1"],
                ["trustee2", "Trustee 2"],
                ["trustee3", "Trustee 3"],
                ["treasurer", "Treasurer"],
                ["financialSecretary", "Financial Secretary"],
                ["districtDeputy", "District Deputy"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  type="email"
                  value={w.distributionEmails[key]}
                  onChange={(e) =>
                    setW({
                      ...w,
                      distributionEmails: {
                        ...w.distributionEmails,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <p className="text-sm font-medium">Submitted by Grand Knight</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="First name">
              <Input
                value={w.submittedByFirstName}
                onChange={(e) =>
                  setW({ ...w, submittedByFirstName: e.target.value })
                }
              />
            </Field>
            <Field label="Last name">
              <Input
                value={w.submittedByLastName}
                onChange={(e) =>
                  setW({ ...w, submittedByLastName: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={w.submittedByEmail}
                onChange={(e) =>
                  setW({ ...w, submittedByEmail: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <Label>Internal notes (not on the worksheet)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">{saved}</p> : null}

      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            setSaved(null);
            const result = await updateAuditPeriod(period.id, {
              checklist,
              worksheet: w,
              notes,
            });
            if (!result.ok) setError(result.error);
            else setSaved(result.message ?? "Saved.");
          })
        }
      >
        {pending ? "Saving…" : "Save period"}
      </Button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function YesNoSelect({
  value,
  onChange,
}: {
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <select
      className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as YesNo)}
    >
      <option value="">—</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Input
      type="number"
      step="0.01"
      className="tabular-nums"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

function MoneySection<K extends string>({
  title,
  fields,
  values,
  total,
  onChange,
  otherNote,
  otherNoteLabel,
  onOtherNote,
}: {
  title: string;
  fields: readonly MoneyField[];
  values: Record<K, number>;
  total: number;
  onChange: (next: Record<K, number>) => void;
  otherNote: string;
  otherNoteLabel: string;
  onOtherNote: (note: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={`${field.key}-${i}`} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{field.label}</p>
              {field.hint ? (
                <p className="text-muted-foreground text-[11px]">{field.hint}</p>
              ) : null}
            </div>
            <Input
              type="number"
              step="0.01"
              className="w-28 tabular-nums"
              value={Number(values[field.key as K] || 0)}
              onChange={(e) =>
                onChange({
                  ...values,
                  [field.key]: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        ))}
      </div>
      <p className="text-sm font-medium tabular-nums">Total: ${total.toFixed(2)}</p>
      <Textarea
        value={otherNote}
        onChange={(e) => onOtherNote(e.target.value)}
        placeholder={otherNoteLabel}
        rows={2}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RetentionGuardrails,
  RetentionInfoBanner,
} from "@/components/retention-guardrails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STATE_LABELS, type RetentionState } from "@/lib/domain/retention";
import { getRetentionCase } from "../actions";
import { AdvanceForm } from "../advance-form";

export default async function RetentionCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return <p className="text-destructive text-sm">Database not configured.</p>;
  }

  let data: Awaited<ReturnType<typeof getRetentionCase>>;
  try {
    data = await getRetentionCase(id);
  } catch {
    return (
      <p className="text-destructive text-sm">
        Could not load case. Run pnpm db:push.
      </p>
    );
  }
  if (!data) notFound();

  const { case: c, member, nextAction } = data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {member.lastName}, {member.firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Member #{member.memberNumber} · Case opened{" "}
            {c.openedAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <Button variant="outline" render={<Link href="/retention" />}>
          All cases
        </Button>
      </div>

      <RetentionInfoBanner />
      <RetentionGuardrails />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {STATE_LABELS[c.state as RetentionState] ?? c.state}
            </CardTitle>
            {nextAction.overdue ? (
              <Badge variant="destructive">Action overdue</Badge>
            ) : null}
          </div>
          <CardDescription>{nextAction.detail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Item label="Next action" value={nextAction.label} />
            <Item label="Due" value={nextAction.dueDate ?? "—"} />
            <Item label="First notice (#423)" value={c.firstNoticeDate ?? "—"} />
            <Item label="Second notice (#424)" value={c.secondNoticeDate ?? "—"} />
            <Item label="Knight Alert" value={c.knightAlertDate ?? "—"} />
            <Item
              label="Personal contact"
              value={
                c.personalContactBy
                  ? `${c.personalContactBy}${c.personalContactReport ? `: ${c.personalContactReport}` : ""}`
                  : "—"
              }
            />
            <Item
              label="#1845 processed"
              value={c.intent1845ProcessedDate ?? "—"}
            />
            <Item
              label="Suspension eligible"
              value={c.suspensionEligibleOn ?? "—"}
            />
            <Item label="#1845 voids on" value={c.voidOn ?? "—"} />
            <Item label="Resolution" value={c.resolution ?? "—"} />
          </dl>
          {c.resolutionNote ? (
            <p className="text-muted-foreground">Note: {c.resolutionNote}</p>
          ) : null}
          {member.phone || member.email ? (
            <p className="text-muted-foreground">
              Contact: {[member.phone, member.email].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className="text-accent-foreground text-sm">
              No phone/email on file — add contact info under Members before
              personal outreach.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advance cadence</CardTitle>
          <CardDescription>
            Stamps dates automatically. #1845 sets +60d eligibility and +90d
            void.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvanceForm
            caseId={c.id}
            allowedTransitions={nextAction.allowedTransitions}
            suggested={nextAction.advanceTo}
          />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        <Link href={`/members/${member.id}`} className="text-primary underline">
          Edit member contact
        </Link>
      </p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

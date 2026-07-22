import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GUARDRAILS } from "@/lib/domain/retention";
import { arrearageAlert } from "@/lib/domain/retention";

export function RetentionGuardrails({
  councilArrearage,
}: {
  councilArrearage?: number | null;
}) {
  const arrearage = arrearageAlert(councilArrearage ?? null);

  return (
    <div className="flex flex-col gap-3">
      {arrearage ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Council arrearage alert</AlertTitle>
          <AlertDescription>{arrearage}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertTriangle className="size-4 text-accent" />
        <AlertTitle>Cadence guardrails</AlertTitle>
        <AlertDescription>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>{GUARDRAILS.financialDifficulty}</li>
            <li>{GUARDRAILS.form100Requires1845}</li>
            <li>{GUARDRAILS.autoVoid90}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function RetentionInfoBanner() {
  return (
    <Alert>
      <Info className="size-4" />
      <AlertTitle>Retention case tracker</AlertTitle>
      <AlertDescription>
        One case per delinquency episode. Official #423 / #424 / #1845 / Form 100
        filing remains through Member Billing / Member Management — this tracker
        drives your workflow and personal-contact log.
      </AlertDescription>
    </Alert>
  );
}

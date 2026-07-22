import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MirrorBanner({ className }: { className?: string }) {
  return (
    <Alert className={className} variant="default">
      <AlertTriangle className="size-4 text-accent" />
      <AlertTitle>Member mirror — not the source of truth</AlertTitle>
      <AlertDescription>
        Contact info and workflow data live here. Member master data, ledgers,
        and official notices remain in Member Management / Member Billing at
        kofc.org. Always verify before filing or billing decisions.
      </AlertDescription>
    </Alert>
  );
}

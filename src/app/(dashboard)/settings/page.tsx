import { AlertTriangle } from "lucide-react";
import { AssessmentPanel } from "./assessment-panel";
import { SettingsForm } from "./settings-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function loadSettings() {
  if (!process.env.DATABASE_URL) {
    return { settings: null, assessments: [], dbError: true as const };
  }
  try {
    const { getDb } = await import("@/db");
    const { assessmentConfig, councilSettings } = await import("@/db/schema");
    const db = getDb();
    const [settingsRows, assessments] = await Promise.all([
      db.select().from(councilSettings).limit(1),
      db.select().from(assessmentConfig),
    ]);
    return {
      settings: settingsRows[0] ?? null,
      assessments,
      dbError: false as const,
    };
  } catch {
    return { settings: null, assessments: [], dbError: true as const };
  }
}

export default async function SettingsPage() {
  const { settings, assessments, dbError } = await loadSettings();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Council identity, dues defaults, and assessment configuration.
        </p>
      </div>

      {dbError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Database not connected</AlertTitle>
          <AlertDescription>
            Set <code className="text-xs">DATABASE_URL</code> in{" "}
            <code className="text-xs">.env.local</code> to your Neon pooled
            connection string, then run{" "}
            <code className="text-xs">pnpm db:push</code>. Forms below will
            work once the schema is applied.
          </AlertDescription>
        </Alert>
      ) : null}

      <SettingsForm settings={settings} />
      <AssessmentPanel rows={assessments} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PII / tax-ID guard</CardTitle>
          <CardDescription>
            The app rejects writes that look like SSNs, ITINs, or EINs
            (including last-four patterns). Matches the handbook rule: tax IDs
            are not to be requested or retained at the council level.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Guard lives in{" "}
          <code className="text-xs">src/lib/domain/pii-guard.ts</code> and is
          applied on settings (and will apply to all member writes).
        </CardContent>
      </Card>
    </div>
  );
}

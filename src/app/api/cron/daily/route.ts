import { NextResponse } from "next/server";
import { formatDigestText, runDailyEngine, sendDigestEmail } from "@/lib/engine/daily";

/**
 * Daily deadline engine + digest.
 * Protected by CRON_SECRET — not session auth.
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await runDailyEngine();

    let email: { sent: boolean; error?: string } = { sent: false };
    const digestTo =
      process.env.DIGEST_EMAIL ??
      process.env.AUTH_ALLOWLIST?.split(",")[0]?.trim();

    if (digestTo) {
      email = await sendDigestEmail(result.digest, digestTo);
    }

    return NextResponse.json({
      ok: true,
      ...result,
      email,
      digestPreview: formatDigestText(result.digest).slice(0, 500),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Engine failed";
    console.error("[cron/daily]", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

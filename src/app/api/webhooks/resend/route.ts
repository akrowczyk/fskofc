import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { correspondence } from "@/db/schema";

/**
 * Resend delivery/bounce webhook (optional).
 * Configure endpoint in Resend dashboard; verify signature in production if needed.
 */
export async function POST(request: Request) {
  let payload: {
    type?: string;
    data?: { email_id?: string; bounce?: unknown };
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resendId = payload.data?.email_id;
  if (!resendId || !process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const db = getDb();
    if (payload.type === "email.bounced" || payload.type === "email.failed") {
      await db
        .update(correspondence)
        .set({
          status: "failed",
          error: payload.type,
        })
        .where(eq(correspondence.resendId, resendId));
    }
  } catch (e) {
    console.error("[resend webhook]", e);
  }

  return NextResponse.json({ ok: true });
}

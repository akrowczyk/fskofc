import { ChatClient } from "./chat-client";
import { todayIso } from "@/lib/domain/dates";
import { eq } from "drizzle-orm";

export default async function ChatPage() {
  let greeting =
    "Hello — I’m your FS Companion assistant. I can search handbook rules, list what’s due, look up members, manage retention cases, and draft approval-gated emails. I never send or file without you.";

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { tasks, correspondence } = await import("@/db/schema");
      const db = getDb();
      const open = await db.select().from(tasks).where(eq(tasks.status, "open"));
      const today = todayIso();
      const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
      const dueToday = open.filter((t) => t.dueDate === today).length;
      const pending = await db
        .select()
        .from(correspondence)
        .where(eq(correspondence.status, "needs_approval"));
      greeting = `Here’s what needs you today (${today}):\n• ${open.length} open tasks (${overdue} overdue, ${dueToday} due today)\n• ${pending.length} email draft(s) awaiting approval\n\nAsk me anything — e.g. “explain #1845” or “who’s overdue and draft their reminders?” (drafts never auto-send).`;
    } catch {
      // keep default
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Assistant</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Grok-powered assistant with handbook tools. Drafts only — you approve
          all sends. Verify dollar figures against current Supreme/IRS data.
        </p>
      </div>
      <ChatClient greeting={greeting} />
    </div>
  );
}

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, chatMessages, chatThreads, tasks } from "@/db/schema";
import { agentTools } from "@/lib/agent/tools";
import { runAgentTool } from "@/lib/agent/handlers";
import { todayIso } from "@/lib/domain/dates";
import { searchHandbookLocal } from "@/lib/rag/retrieve";

export const maxDuration = 60;

const SYSTEM = `You are the Financial Secretary Companion assistant for Knights of Columbus Holy Ghost Council 10325 (Wood Dale, IL).

Rules:
1. You help with FS duties that live OUTSIDE official KofC Member Management / Member Billing. Never claim this app is the ledger of record.
2. Answer dues/retention/990/audit questions from handbook search tools. Always cite source headings. Flag any dollar amounts or IRS thresholds as "verify current Supreme/IRS figures" (handbook is 2009-era).
3. You NEVER send email or file anything with Supreme. draft_email and queue_mail_task only create needs_approval / queued items.
4. Surface what's due using list_due_items. Prefer actionable brevity.
5. Guardrails: Financial difficulty is NOT a valid reason for suspension. Form 100 needs #1845 on file 60 days. #1845 voids after 90 days.
6. Do not request or store SSNs/tax IDs.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    message?: string;
    threadId?: string | null;
  };
  const message = body.message?.trim();
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const actor = session.user.email;
  let threadId = body.threadId ?? null;

  // Greeting digest context
  let digestNote = "";
  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const open = await db.select().from(tasks).where(eq(tasks.status, "open"));
      const today = todayIso();
      const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
      const dueToday = open.filter((t) => t.dueDate === today).length;
      digestNote = `Live digest: ${open.length} open tasks, ${overdue} overdue, ${dueToday} due today.`;
    } catch {
      digestNote = "";
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Offline fallback without Anthropic
    const passages = searchHandbookLocal(message, 4);
    const reply =
      passages.length > 0
        ? `Anthropic API key not configured. Handbook seed matches:\n\n${passages
            .map(
              (p) =>
                `**${p.heading}** (${p.sourceRef})\n${p.content}\n_(verify current figures)_`,
            )
            .join("\n\n")}\n\n${digestNote}`
        : `Anthropic API key not configured. ${digestNote || "Set ANTHROPIC_API_KEY for full agent."}`;
    return Response.json({
      reply,
      threadId,
      offline: true,
    });
  }

  try {
    const db = process.env.DATABASE_URL ? getDb() : null;

    if (db && !threadId) {
      const [t] = await db
        .insert(chatThreads)
        .values({ title: message.slice(0, 80) })
        .returning({ id: chatThreads.id });
      threadId = t.id;
    }

    if (db && threadId) {
      await db.insert(chatMessages).values({
        threadId,
        role: "user",
        content: { text: message },
      });
    }

    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: digestNote
          ? `${digestNote}\n\nUser: ${message}`
          : message,
      },
    ];

    let finalText = "";
    // Tool loop (max 6 rounds)
    for (let i = 0; i < 6; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM,
        tools: agentTools,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const texts = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text);

      if (toolUses.length === 0 || response.stop_reason === "end_turn") {
        finalText = texts.join("\n") || finalText;
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let result: unknown;
        try {
          result = await runAgentTool(tu.name, tu.input, actor);
        } catch (e) {
          result = {
            error: e instanceof Error ? e.message : "Tool failed",
          };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      finalText = texts.join("\n");
    }

    // one more if still empty
    if (!finalText) {
      finalText =
        "I processed your request with tools. Check Correspondence / Tasks / Retention for changes. (Drafts never auto-send.)";
    }

    if (db && threadId) {
      await db.insert(chatMessages).values({
        threadId,
        role: "assistant",
        content: { text: finalText },
      });
      await db.insert(auditLog).values({
        actor,
        action: "agent.chat",
        entity: "chat_threads",
        entityId: threadId,
      });
    }

    return Response.json({ reply: finalText, threadId });
  } catch (e) {
    console.error("[agent]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Agent failed" },
      { status: 500 },
    );
  }
}

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, chatMessages, chatThreads, tasks } from "@/db/schema";
import { agentTools } from "@/lib/agent/tools";
import { runAgentTool } from "@/lib/agent/handlers";
import { todayIso } from "@/lib/domain/dates";
import { searchHandbookLocal } from "@/lib/rag/retrieve";

export const maxDuration = 60;

/** Default model; override with XAI_MODEL env (e.g. grok-4.5). */
const DEFAULT_MODEL = "grok-4.5";

const SYSTEM = `You are the Financial Secretary Companion assistant for Knights of Columbus Holy Ghost Council 10325 (Wood Dale, IL), powered by Grok.

Rules:
1. You help the Financial Secretary with contacts, deadlines, retention workflow, and correspondence for Council 10325.
2. Answer dues/retention/990/audit questions from handbook search tools. Cite sources. Flag dollar amounts or IRS thresholds as "verify current Supreme/IRS figures" when handbook-era.
3. You NEVER send email or file with Supreme. draft_email and queue_mail_task only create needs_approval / queued items.
4. Surface what's due using list_due_items. Prefer actionable brevity.
5. Guardrails: Financial difficulty is NOT a valid reason for suspension. Form 100 needs #1845 on file 60 days. #1845 voids after 90 days.
6. Do not request or store SSNs/tax IDs.`;

function getXaiClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
}

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

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    const passages = searchHandbookLocal(message, 4);
    const reply =
      passages.length > 0
        ? `XAI_API_KEY not configured. Handbook seed matches:\n\n${passages
            .map(
              (p) =>
                `**${p.heading}** (${p.sourceRef})\n${p.content}\n_(verify current figures)_`,
            )
            .join("\n\n")}\n\n${digestNote}`
        : `XAI_API_KEY not configured. ${digestNote || "Set XAI_API_KEY for the full Grok agent (console.x.ai)."}`;
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

    const client = getXaiClient(apiKey);
    const model = process.env.XAI_MODEL?.trim() || DEFAULT_MODEL;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: digestNote
          ? `${digestNote}\n\nUser: ${message}`
          : message,
      },
    ];

    let finalText = "";

    for (let i = 0; i < 6; i++) {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages,
        tools: agentTools,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      const msg = choice?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      const content = typeof msg.content === "string" ? msg.content : "";

      if (toolCalls.length === 0 || choice.finish_reason === "stop") {
        finalText = content || finalText;
        break;
      }

      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        if (tc.type !== "function") continue;
        const name = tc.function.name;
        let args: unknown = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        let result: unknown;
        try {
          result = await runAgentTool(name, args, actor);
        } catch (e) {
          result = {
            error: e instanceof Error ? e.message : "Tool failed",
          };
        }

        const toolMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
        messages.push(toolMsg);
      }

      if (content) finalText = content;
    }

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
        detail: { model },
      });
    }

    return Response.json({ reply: finalText, threadId, model });
  } catch (e) {
    console.error("[agent]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Agent failed" },
      { status: 500 },
    );
  }
}

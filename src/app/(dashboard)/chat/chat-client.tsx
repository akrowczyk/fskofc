"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "user" | "assistant"; text: string };

export function ChatClient({ greeting }: { greeting: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: greeting },
  ]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        threadId?: string;
      };
      if (data.threadId) setThreadId(data.threadId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.reply ?? data.error ?? "No response",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network error talking to agent." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading ? (
          <p className="text-muted-foreground text-xs">Thinking…</p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about #1845, who’s overdue, draft reminders…"
          rows={2}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={() => void send()} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

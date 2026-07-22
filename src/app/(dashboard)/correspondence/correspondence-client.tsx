"use client";

import { useTransition } from "react";
import {
  approveAndSend,
  createEmailDraft,
  dismissCorrespondence,
  getLetterPdfBase64,
  markMailed,
  queueMailLetter,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type MemberOpt = {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string;
  email: string | null;
};

type Row = {
  item: {
    id: string;
    channel: string;
    template: string;
    subject: string | null;
    body: string | null;
    status: string;
    createdAt: Date | string;
    error: string | null;
  };
  member: {
    firstName: string;
    lastName: string;
    memberNumber: string;
    email: string | null;
  } | null;
};

export function DraftEmailForm({ members }: { members: MemberOpt[] }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await createEmailDraft(fd);
          if (!r.ok) alert(r.error);
          else e.currentTarget.reset();
        });
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Member</Label>
        <select
          name="memberId"
          required
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.lastName}, {m.firstName} {m.email ? `(${m.email})` : "(no email)"}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Template</Label>
        <select
          name="template"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue="dues_reminder"
        >
          <option value="welcome">Welcome</option>
          <option value="dues_reminder">Dues reminder (supplemental)</option>
          <option value="event">Event</option>
          <option value="insurance_referral">Insurance referral</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Subject override</Label>
        <Input name="subject" placeholder="Optional" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Body override</Label>
        <Textarea name="body" rows={3} placeholder="Optional — leave blank for template" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create draft (needs approval)"}
      </Button>
    </form>
  );
}

export function QueueMailForm({ members }: { members: MemberOpt[] }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await queueMailLetter(fd);
          if (!r.ok) alert(r.error);
        });
      }}
    >
      <div className="flex-1 space-y-2">
        <Label>Member</Label>
        <select
          name="memberId"
          required
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.lastName}, {m.firstName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Letter</Label>
        <select
          name="letterType"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          defaultValue="423"
        >
          <option value="423">#423 First notice</option>
          <option value="424">#424 Second notice</option>
          <option value="KA1">#KA1 Knight Alert</option>
          <option value="1845">#1845 Intent to suspend</option>
          <option value="welcome">Welcome</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        Queue mail
      </Button>
    </form>
  );
}

export function CorrespondenceActions({ row }: { row: Row }) {
  const [pending, start] = useTransition();
  const { item } = row;

  return (
    <div className="flex flex-wrap gap-1">
      {item.channel === "email" &&
      ["needs_approval", "approved", "failed"].includes(item.status) ? (
        <Button
          size="xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await approveAndSend(item.id);
              if (!r.ok) alert(r.error);
            })
          }
        >
          Approve & send
        </Button>
      ) : null}
      {item.channel === "mail" && item.status === "queued" ? (
        <>
          <Button
            size="xs"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await getLetterPdfBase64(item.id);
                if (!r.ok) {
                  alert(r.error);
                  return;
                }
                const bin = atob(r.base64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = r.filename;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            PDF
          </Button>
          <Button
            size="xs"
            disabled={pending}
            onClick={() => start(async () => { await markMailed(item.id); })}
          >
            Mark mailed
          </Button>
        </>
      ) : null}
      {["needs_approval", "queued", "draft"].includes(item.status) ? (
        <Button
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => { await dismissCorrespondence(item.id); })}
        >
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "sent" || status === "mailed"
      ? "secondary"
      : status === "failed"
        ? "destructive"
        : status === "needs_approval"
          ? "default"
          : "outline";
  return (
    <Badge variant={variant as "default"} className="capitalize text-[10px]">
      {status.replace("_", " ")}
    </Badge>
  );
}

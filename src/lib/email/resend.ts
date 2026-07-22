import { Resend } from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendApprovedEmail(opts: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}): Promise<{ id?: string; error?: string }> {
  const resend = getResend();
  const from = opts.from ?? process.env.RESEND_FROM;
  if (!resend || !from) {
    return { error: "RESEND_API_KEY or RESEND_FROM not configured" };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  });

  if (error) return { error: error.message };
  return { id: data?.id };
}

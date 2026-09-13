import "server-only";

// Transactional email via Resend's REST API (no SDK — one POST is all we
// need). Deliberately non-throwing: an email is never allowed to fail the
// flow that triggered it (a paid order must stay paid even if Resend is
// down), so callers get a result object and decide what to log.

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: boolean; reason: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY / EMAIL_FROM not set — email not sent.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok || !payload?.id) {
      return {
        ok: false,
        skipped: false,
        reason: `Resend ${response.status}: ${payload?.message ?? "unknown error"}`,
      };
    }

    return { ok: true, id: payload.id };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

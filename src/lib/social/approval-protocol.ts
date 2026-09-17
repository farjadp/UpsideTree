// The approval gate's wire format and rules, kept free of I/O so they can be
// unit-tested. Telegram callback data is capped at 64 bytes, so decisions
// travel as short codes plus the product id.

export const REJECT_REASONS = {
  repeat: "زاویهٔ تکراری",
  tone: "لحن یا کلیشه",
  history: "خطای تاریخی یا نمادین",
  design: "طرح اشتباه در تصویر",
  visual: "تصویر شلوغ یا ضعیف",
  name: "نام محصول",
  other: "دلیل دیگر",
} as const;

export type RejectReason = keyof typeof REJECT_REASONS;

export type Decision =
  | { kind: "approve" }
  | { kind: "alt"; index: 0 | 1 }
  | { kind: "reject_menu" }
  | { kind: "reject"; reason: RejectReason; note?: string }
  | { kind: "edit" }
  | { kind: "cancel" };

const PREFIX = "sa";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCallback(decision: Decision, productId: string): string {
  const code = (() => {
    switch (decision.kind) {
      case "approve":
        return "ok";
      case "alt":
        return `a${decision.index + 1}`;
      case "reject_menu":
        return "rm";
      case "reject":
        return `rj.${decision.reason}`;
      case "edit":
        return "ed";
      case "cancel":
        return "cx";
    }
  })();
  const data = `${PREFIX}:${code}:${productId}`;
  if (Buffer.byteLength(data) > 64) throw new Error(`Callback data too long: ${data}`);
  return data;
}

export function decodeCallback(data: string | undefined | null): { decision: Decision; productId: string } | null {
  if (!data) return null;
  const [prefix, code, productId] = data.split(":");
  if (prefix !== PREFIX || !code || !productId || !UUID.test(productId)) return null;
  let decision: Decision | null = null;
  if (code === "ok") decision = { kind: "approve" };
  else if (code === "a1") decision = { kind: "alt", index: 0 };
  else if (code === "a2") decision = { kind: "alt", index: 1 };
  else if (code === "rm") decision = { kind: "reject_menu" };
  else if (code === "ed") decision = { kind: "edit" };
  else if (code === "cx") decision = { kind: "cancel" };
  else if (code.startsWith("rj.")) {
    const reason = code.slice(3);
    if (reason in REJECT_REASONS) decision = { kind: "reject", reason: reason as RejectReason };
  }
  return decision ? { decision, productId } : null;
}

type Button = { text: string; callback_data: string };

/** The main keyboard under a preview. Alt buttons only when runners-up exist. */
export function reviewKeyboard(productId: string, runnersUp: number): Button[][] {
  const rows: Button[][] = [[{ text: "✅ تأیید و انتشار", callback_data: encodeCallback({ kind: "approve" }, productId) }]];
  const alts: Button[] = [];
  if (runnersUp > 0) alts.push({ text: "🔁 زاویهٔ ۱", callback_data: encodeCallback({ kind: "alt", index: 0 }, productId) });
  if (runnersUp > 1) alts.push({ text: "🔁 زاویهٔ ۲", callback_data: encodeCallback({ kind: "alt", index: 1 }, productId) });
  if (alts.length) rows.push(alts);
  rows.push([
    { text: "✏️ اصلاح متن", callback_data: encodeCallback({ kind: "edit" }, productId) },
    { text: "❌ رد", callback_data: encodeCallback({ kind: "reject_menu" }, productId) },
  ]);
  return rows;
}

/** The second-step keyboard: pick a reason for the rejection. */
export function rejectKeyboard(productId: string): Button[][] {
  const reasons = Object.entries(REJECT_REASONS) as [RejectReason, string][];
  const rows: Button[][] = [];
  for (let i = 0; i < reasons.length; i += 2) {
    rows.push(
      reasons.slice(i, i + 2).map(([reason, label]) => ({
        text: label,
        callback_data: encodeCallback({ kind: "reject", reason }, productId),
      }))
    );
  }
  rows.push([{ text: "↩️ برگشت", callback_data: encodeCallback({ kind: "cancel" }, productId) }]);
  return rows;
}

/** Statuses a decision may act on. Anything else is stale (double tap, old message). */
export const REVIEWABLE_STATUSES = new Set(["review", "blocked"]);

/**
 * Trim the preview to a phone screen. Long captions make the founder approve
 * without reading, which poisons the feedback loop (spec §11).
 */
export function previewCaption(caption: string, max = 900) {
  const trimmed = caption.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

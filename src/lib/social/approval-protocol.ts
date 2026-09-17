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
  | { kind: "edit_slides" }
  | { kind: "new_images" }
  | { kind: "cancel" };

/**
 * Two review stages. "copy": the words, before any image is paid for.
 * "visual": the finished carousel, before it posts.
 */
export type ReviewStage = "copy" | "visual";

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
      case "edit_slides":
        return "es";
      case "new_images":
        return "ni";
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
  else if (code === "es") decision = { kind: "edit_slides" };
  else if (code === "ni") decision = { kind: "new_images" };
  else if (code === "cx") decision = { kind: "cancel" };
  else if (code.startsWith("rj.")) {
    const reason = code.slice(3);
    if (reason in REJECT_REASONS) decision = { kind: "reject", reason: reason as RejectReason };
  }
  return decision ? { decision, productId } : null;
}

type Button = { text: string; callback_data: string };

/**
 * The keyboard under a preview. Copy stage: approving generates the images.
 * Visual stage: approving publishes, and the images can be redone alone.
 */
export function reviewKeyboard(productId: string, runnersUp: number, stage: ReviewStage = "visual"): Button[][] {
  const approve = stage === "copy" ? "✅ تأیید متن، بساز تصویرها" : "✅ تأیید و انتشار";
  const rows: Button[][] = [[{ text: approve, callback_data: encodeCallback({ kind: "approve" }, productId) }]];
  const alts: Button[] = [];
  if (runnersUp > 0) alts.push({ text: "🔁 زاویهٔ ۱", callback_data: encodeCallback({ kind: "alt", index: 0 }, productId) });
  if (runnersUp > 1) alts.push({ text: "🔁 زاویهٔ ۲", callback_data: encodeCallback({ kind: "alt", index: 1 }, productId) });
  if (alts.length) rows.push(alts);
  rows.push([
    { text: "✏️ کپشن", callback_data: encodeCallback({ kind: "edit" }, productId) },
    { text: "🖋 متن اسلایدها", callback_data: encodeCallback({ kind: "edit_slides" }, productId) },
  ]);
  const last: Button[] = [];
  if (stage === "visual") last.push({ text: "🖼 تصویر جدید", callback_data: encodeCallback({ kind: "new_images" }, productId) });
  last.push({ text: "❌ رد", callback_data: encodeCallback({ kind: "reject_menu" }, productId) });
  rows.push(last);
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
export const REVIEWABLE_STATUSES = new Set(["copy_review", "review", "blocked"]);

export function stageFor(status: string): ReviewStage {
  return status === "copy_review" ? "copy" : "visual";
}

/**
 * Trim the preview to a phone screen. Long captions make the founder approve
 * without reading, which poisons the feedback loop (spec §11).
 */
export function previewCaption(caption: string, max = 900) {
  const trimmed = caption.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

// ---------------------------------------------------------------------------
// Founder edits

const PERSIAN_LETTER = /[\u0600-\u06FF]/g;
const LATIN_LETTER = /[A-Za-z]/g;

/** A paragraph written for English readers: more Latin letters than Persian. */
function isEnglishParagraph(paragraph: string) {
  const latin = paragraph.match(LATIN_LETTER)?.length ?? 0;
  const persian = paragraph.match(PERSIAN_LETTER)?.length ?? 0;
  return latin > persian;
}

/** The trailing English paragraphs of a caption, or "" when it has none. */
export function englishTail(caption: string) {
  const paragraphs = caption.trim().split(/\n\s*\n/);
  let start = paragraphs.length;
  while (start > 0 && isEnglishParagraph(paragraphs[start - 1])) start--;
  return paragraphs.slice(start).join("\n\n");
}

/**
 * Apply the founder's rewrite of a caption. Posts carry an English part for
 * readers who don't read Persian; a Persian-only rewrite keeps the existing
 * English part instead of dropping it. A rewrite that includes its own
 * English is taken as the whole caption.
 */
export function mergeCaption(previous: string, edited: string) {
  const next = edited.trim();
  if (next.split(/\n\s*\n/).some(isEnglishParagraph)) return next;
  const tail = englishTail(previous);
  return tail ? `${next}\n\n${tail}` : next;
}

export type SlideLine = { fa: string; en: string };

/** The slide lines as the founder sees and edits them: one numbered line per slide. */
export function formatSlideLines(lines: SlideLine[]) {
  return lines.map((line, index) => `${index + 1}. ${line.fa} | ${line.en}`).join("\n");
}

/**
 * Read the founder's reply to "edit slide text". One line per slide, in
 * order, optionally numbered; "فارسی | English" replaces both, a line with
 * only Persian keeps that slide's English, and "-" leaves the slide as is.
 */
export function parseSlideReply(reply: string, current: SlideLine[]): { lines: SlideLine[] } | { error: string } {
  const rows = reply
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.replace(/^[0-9۰-۹]+\s*[.)\-،:]\s*/, ""));
  if (rows.length !== current.length) {
    return { error: `${current.length} خط لازم است (یکی برای هر اسلاید)، ${rows.length} خط آمد.` };
  }
  const lines = rows.map((row, index) => {
    if (row === "-" || row === "—") return current[index];
    const [fa, ...rest] = row.split("|");
    const en = rest.join("|").trim();
    return { fa: fa.trim() || current[index].fa, en: en || current[index].en };
  });
  const tooLong = lines.findIndex((line) => line.fa.length > 80 || line.en.length > 80);
  if (tooLong >= 0) return { error: `خط ${tooLong + 1} بلند است؛ حداکثر ۸۰ حرف تا روی عکس جا شود.` };
  return { lines };
}

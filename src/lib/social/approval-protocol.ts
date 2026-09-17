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

const paragraphsOf = (text: string) =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/**
 * A caption in three parts: the Persian story before the English block, the
 * English block for readers who don't read Persian, and whatever follows it
 * (usually a Persian closing line or question).
 */
export function splitCaption(caption: string) {
  const paragraphs = paragraphsOf(caption);
  const first = paragraphs.findIndex(isEnglishParagraph);
  if (first < 0) return { persian: paragraphs.join("\n\n"), english: "", closing: "" };
  let last = first;
  while (last + 1 < paragraphs.length && isEnglishParagraph(paragraphs[last + 1])) last++;
  return {
    persian: paragraphs.slice(0, first).join("\n\n"),
    english: paragraphs.slice(first, last + 1).join("\n\n"),
    closing: paragraphs.slice(last + 1).join("\n\n"),
  };
}

/** The English block of a caption, or "" when it has none. */
export function englishTail(caption: string) {
  return splitCaption(caption).english;
}

/**
 * Apply the founder's rewrite of a caption. Posts carry an English block for
 * readers who don't read Persian; a Persian-only rewrite replaces the Persian
 * story and keeps the English block and the closing line. A rewrite that
 * includes its own English is taken as the whole caption.
 */
export function mergeCaption(previous: string, edited: string) {
  const next = edited.trim();
  if (paragraphsOf(next).some(isEnglishParagraph)) return next;
  const { english, closing } = splitCaption(previous);
  return [next, english, closing].filter(Boolean).join("\n\n");
}

const stripZwnj = (text: string) => text.replace(/\u200c/g, "");

/**
 * Copying text out of Telegram can drop the half-spaces (ZWNJ). Put them back
 * in every word the reference text spells with one; words the founder wrote
 * new are left as they are.
 */
export function restoreZwnj(text: string, reference: string) {
  const known = new Map<string, string>();
  for (const word of reference.split(/[\s«»«»،؛:.!?؟()\[\]"|—–-]+/)) {
    if (word.includes("\u200c")) known.set(stripZwnj(word), word);
  }
  if (!known.size) return text;
  // Persian letters and half-spaces only: «،» «؛» «؟» sit in the same Unicode block but end a word.
  return text.replace(/[\u0620-\u064A\u067E-\u06D3\u200c]+/g, (word) => known.get(stripZwnj(word)) ?? word);
}

/** Section labels of the preview message (compared without half-spaces). */
const PREVIEW_SECTIONS = {
  caption: "کپشن",
  slides: "متن اسلایدها",
  scenes: "صحنهها",
  angles: "زاویههای دیگر",
} as const;

/** True when a reply is the preview message copied back, edited. */
export function looksLikePreviewPaste(text: string) {
  const lines = text.split("\n").map((line) => stripZwnj(line.trim()));
  return lines.includes(PREVIEW_SECTIONS.caption) && lines.includes(PREVIEW_SECTIONS.slides);
}

/**
 * Read an edited copy of the preview message: the Persian caption story (the
 * preview shows a shortened caption, so its English part is ignored and kept
 * from the draft) and the slide lines.
 */
export function parsePreviewPaste(text: string): { caption: string | null; slides: string | null } {
  const lines = text.split("\n");
  const labels = Object.values(PREVIEW_SECTIONS) as string[];
  const sectionOf = (line: string) => labels.indexOf(stripZwnj(line.trim()));
  const section = (label: string) => {
    const start = lines.findIndex((line) => stripZwnj(line.trim()) === label);
    if (start < 0) return null;
    const rest = lines.slice(start + 1);
    const stop = rest.findIndex((line) => sectionOf(line) >= 0);
    return (stop < 0 ? rest : rest.slice(0, stop)).join("\n").trim();
  };

  const captionBlock = section(PREVIEW_SECTIONS.caption);
  const caption = captionBlock
    ? paragraphsOf(captionBlock)
        .map((paragraph) =>
          paragraph
            .split("\n")
            .filter((line) => !/^\s*#/.test(line))
            .join("\n")
            .trim()
        )
        .filter((paragraph) => paragraph && !isEnglishParagraph(paragraph))
        .join("\n\n")
    : null;
  return { caption: caption || null, slides: section(PREVIEW_SECTIONS.slides) || null };
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

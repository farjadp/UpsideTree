import { describe, expect, it } from "vitest";
import {
  REJECT_REASONS,
  decodeCallback,
  encodeCallback,
  englishTail,
  mergeCaption,
  parseSlideReply,
  previewCaption,
  rejectKeyboard,
  reviewKeyboard,
  stageFor,
  type Decision,
} from "./approval-protocol";

const productId = "599e4a71-ddcb-41f3-9423-21fff826b585";

describe("callback data", () => {
  const decisions: Decision[] = [
    { kind: "approve" },
    { kind: "alt", index: 0 },
    { kind: "alt", index: 1 },
    { kind: "reject_menu" },
    { kind: "edit" },
    { kind: "edit_slides" },
    { kind: "new_images" },
    { kind: "cancel" },
    ...(Object.keys(REJECT_REASONS) as (keyof typeof REJECT_REASONS)[]).map((reason) => ({ kind: "reject" as const, reason })),
  ];

  it.each(decisions)("round-trips %j within Telegram's 64-byte cap", (decision) => {
    const data = encodeCallback(decision, productId);
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
    expect(decodeCallback(data)).toEqual({ decision, productId });
  });

  it("refuses foreign or malformed data", () => {
    expect(decodeCallback(undefined)).toBeNull();
    expect(decodeCallback("")).toBeNull();
    expect(decodeCallback("other:ok:" + productId)).toBeNull();
    expect(decodeCallback("sa:ok:not-a-uuid")).toBeNull();
    expect(decodeCallback("sa:rj.made_up:" + productId)).toBeNull();
    expect(decodeCallback("sa:zz:" + productId)).toBeNull();
  });
});

describe("keyboards", () => {
  it("shows alternative-angle buttons only when runners-up exist", () => {
    expect(reviewKeyboard(productId, 0)).toHaveLength(3);
    expect(reviewKeyboard(productId, 1)[1]).toHaveLength(1);
    expect(reviewKeyboard(productId, 2)[1]).toHaveLength(2);
  });

  it("offers new images only once there are images", () => {
    const kinds = (stage: "copy" | "visual") =>
      reviewKeyboard(productId, 2, stage)
        .flat()
        .map((b) => decodeCallback(b.callback_data)?.decision.kind);
    expect(kinds("copy")).not.toContain("new_images");
    expect(kinds("visual")).toContain("new_images");
    expect(stageFor("copy_review")).toBe("copy");
    expect(stageFor("review")).toBe("visual");
  });

  it("offers every rejection reason and a way back", () => {
    const buttons = rejectKeyboard(productId).flat();
    const reasons = buttons.map((b) => decodeCallback(b.callback_data)?.decision).filter((d) => d?.kind === "reject");
    expect(reasons).toHaveLength(Object.keys(REJECT_REASONS).length);
    expect(buttons.at(-1) && decodeCallback(buttons.at(-1)!.callback_data)?.decision).toEqual({ kind: "cancel" });
  });
});

describe("previewCaption", () => {
  it("leaves short captions alone and cuts long ones on a word boundary", () => {
    expect(previewCaption("  کوتاه  ")).toBe("کوتاه");
    const long = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
    const cut = previewCaption(long, 100);
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut.endsWith("…")).toBe(true);
    const kept = cut.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    expect(long[kept.length]).toBe(" ");
  });
});

describe("mergeCaption", () => {
  const previous = "خط اول فارسی\nخط دوم\n\nFor someone far from home.\nSend it to them.";

  it("keeps the English part when the founder rewrites only the Persian", () => {
    expect(mergeCaption(previous, "متن تازهٔ من")).toBe("متن تازهٔ من\n\nFor someone far from home.\nSend it to them.");
  });

  it("takes the rewrite as a whole when it brings its own English", () => {
    const edited = "متن تازه\n\nMy own English line.";
    expect(mergeCaption(previous, edited)).toBe(edited);
  });

  it("finds no English tail in a Persian-only caption", () => {
    expect(englishTail("فقط فارسی\n\nباز هم فارسی")).toBe("");
    expect(mergeCaption("فقط فارسی", "جدید")).toBe("جدید");
  });
});

describe("parseSlideReply", () => {
  const current = [
    { fa: "یک", en: "One" },
    { fa: "دو", en: "Two" },
    { fa: "سه", en: "Three" },
  ];

  it("replaces both languages, keeps English when only Persian is given, and skips '-'", () => {
    const result = parseSlideReply("1. یکِ نو | New one\n۲) دوِ نو\n-", current);
    expect(result).toEqual({
      lines: [
        { fa: "یکِ نو", en: "New one" },
        { fa: "دوِ نو", en: "Two" },
        { fa: "سه", en: "Three" },
      ],
    });
  });

  it("refuses the wrong number of lines and lines too long for a slide", () => {
    expect(parseSlideReply("فقط یک خط", current)).toHaveProperty("error");
    expect(parseSlideReply(`${"ب".repeat(81)}\n-\n-`, current)).toHaveProperty("error");
  });
});

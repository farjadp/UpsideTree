import { describe, expect, it } from "vitest";
import { REJECT_REASONS, decodeCallback, encodeCallback, previewCaption, rejectKeyboard, reviewKeyboard, type Decision } from "./approval-protocol";

const productId = "599e4a71-ddcb-41f3-9423-21fff826b585";

describe("callback data", () => {
  const decisions: Decision[] = [
    { kind: "approve" },
    { kind: "alt", index: 0 },
    { kind: "alt", index: 1 },
    { kind: "reject_menu" },
    { kind: "edit" },
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
    expect(reviewKeyboard(productId, 0)).toHaveLength(2);
    expect(reviewKeyboard(productId, 1)[1]).toHaveLength(1);
    expect(reviewKeyboard(productId, 2)[1]).toHaveLength(2);
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

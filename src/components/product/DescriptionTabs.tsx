"use client";

import { useState } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";

interface DescriptionTabsProps {
  product: {
    desc_emotional_en?: string | null;
    desc_emotional_fa?: string | null;
    desc_emotional?: string | null;
    desc_functional_en?: string | null;
    desc_functional_fa?: string | null;
    desc_story_en?: string | null;
    desc_story_fa?: string | null;
    desc_story?: string | null;
  };
}

type TabId = "feeling" | "object" | "story";

// Printify imports and the Tiptap editor both store HTML. Render it as
// plain text with line breaks rather than injecting markup.
function toPlainText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Tabs are built from the product's real copy. A tab with no text is not
// shown, and Persian falls back to English — the previous version rendered
// empty panels and hardcoded Persian placeholder copy ("100% organic
// cotton") on every product.
export function DescriptionTabs({ product }: DescriptionTabsProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";

  const pick = (fa?: string | null, en?: string | null) => toPlainText(isFa ? fa?.trim() || en : en);

  const tabs = [
    {
      id: "feeling" as TabId,
      labelEn: "The Feeling",
      labelFa: "حس و حال",
      text: pick(product.desc_emotional_fa, product.desc_emotional_en || product.desc_emotional),
    },
    {
      id: "object" as TabId,
      labelEn: "The Object",
      labelFa: "ویژگی‌ها",
      text: pick(product.desc_functional_fa, product.desc_functional_en),
    },
    {
      id: "story" as TabId,
      labelEn: "The Story",
      labelFa: "داستان",
      text: pick(product.desc_story_fa, product.desc_story_en || product.desc_story),
    },
  ].filter((tab) => tab.text);

  const [selected, setSelected] = useState<TabId | null>(null);
  const active = tabs.find((tab) => tab.id === selected) ?? tabs[0];

  if (!active) return null;

  return (
    <div className={`mt-24 max-w-4xl mx-auto ${isFa ? "text-right" : "text-left"}`} dir={isFa ? "rtl" : "ltr"}>
      <div className="flex items-center gap-8 border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelected(tab.id)}
            className={`pb-4 text-lg font-display font-medium transition-colors whitespace-nowrap relative ${
              active.id === tab.id ? "text-[#18231F]" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {isFa ? tab.labelFa : tab.labelEn}
            {active.id === tab.id && <span className="absolute bottom-0 left-0 w-full h-1 bg-[#B48635]" />}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {active.id === "feeling" ? (
          <p className="text-xl leading-relaxed italic text-[#1D4E89] font-display">{active.text}</p>
        ) : (
          <p className="text-gray-600 leading-relaxed whitespace-pre-line max-w-3xl">{active.text}</p>
        )}
      </div>
    </div>
  );
}

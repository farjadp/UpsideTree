"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Maker {
  id: string;
  name: string;
  bio_en: string;
  bio_fa: string;
  photo_url: string;
}

interface DescriptionTabsProps {
  product: {
    desc_emotional: string;
    desc_functional_en: string;
    desc_story: string;
    makers?: Maker;
  };
}

export function DescriptionTabs({ product }: DescriptionTabsProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const [activeTab, setActiveTab] = useState<"feeling" | "object" | "story">("feeling");

  const tabs = [
    { id: "feeling", labelEn: "The Feeling", labelFa: "حس و حال" },
    { id: "object", labelEn: "The Object", labelFa: "ویژگی‌ها" },
    { id: "story", labelEn: "The Story", labelFa: "داستان قصه" },
  ] as const;

  return (
    <div className={`mt-24 max-w-4xl mx-auto ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-8 border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-lg font-display font-medium transition-colors whitespace-nowrap relative ${
              activeTab === tab.id 
                ? "text-[#18231F]" 
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {isFa ? tab.labelFa : tab.labelEn}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-[#B48635]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[250px] animate-fade-in relative">
        {activeTab === "feeling" && (
          <div className="prose prose-lg text-gray-600 font-display">
            <p className="text-xl leading-relaxed italic text-[#1D4E89]">
              {isFa ? "«این یک لباس نیست؛ یک میراث است که روی شانه‌های شما می‌نشیند.»" : product.desc_emotional}
            </p>
          </div>
        )}

        {activeTab === "object" && (
          <div className="flex flex-col md:flex-row gap-12">
            <div className="flex-1 prose text-gray-600">
              <h3 className="text-xl font-display font-semibold text-[#18231F] mb-4">
                {isFa ? 'مواد و جزئیات' : 'Materials & Details'}
              </h3>
              <p className="whitespace-pre-line leading-relaxed">
                {isFa 
                  ? "• ۱۰۰٪ پنبه ارگانیک\n• چاپ دستی با رنگ‌های گیاهی\n• دوخت مقاوم\n• قابل شستشو در ماشین لباسشویی (آب سرد)" 
                  : product.desc_functional_en}
              </p>
            </div>
            
            {/* Maker Card */}
            {product.makers && (
              <div className="md:w-72 bg-[#F8F7F4] p-6 rounded-2xl border border-black/5 self-start">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  {isFa ? 'درباره سازنده' : 'The Maker'}
                </h4>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden relative bg-gray-200 flex-shrink-0">
                    <Image 
                      src={product.makers.photo_url || "/images/placeholder.jpg"} 
                      alt={product.makers.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-lg text-[#18231F]">{product.makers.name}</h5>
                    <p className="text-sm text-[#697A4D]">Tehran, Iran</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {isFa ? product.makers.bio_fa || product.makers.bio_en : product.makers.bio_en}
                </p>
                <Link 
                  href={`/makers/${product.makers.id}`}
                  className="text-sm font-semibold text-[#1D4E89] underline underline-offset-2 hover:text-[#18231F] transition-colors"
                >
                  {isFa ? 'داستان کامل سازنده' : 'Read Full Story'}
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "story" && (
          <div className="prose prose-lg text-gray-600 font-display max-w-3xl">
            <h3 className="text-2xl font-display font-semibold text-[#18231F] mb-6">
              {isFa ? 'ریشه‌های تاریخی' : 'Historical Roots'}
            </h3>
            <p className="leading-relaxed whitespace-pre-line">
              {isFa 
                ? "این طرح با الهام از نقش‌برجسته‌های تخت جمشید بازآفرینی شده است. نماد شیر در فرهنگ ایران باستان نشان‌دهنده قدرت، خورشید و نگهبانی است." 
                : product.desc_story}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

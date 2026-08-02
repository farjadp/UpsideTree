"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";

interface CollectionBannerProps {
  collection: {
    name_en: string;
    name_fa: string;
    slug: string;
    story_en?: string;
    story_fa?: string;
  };
}

export function CollectionBanner({ collection }: CollectionBannerProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";

  return (
    <div className="w-full bg-[#Fdfbf7] py-16 md:py-24 mt-24 border-y border-[#B48635]/20 overflow-hidden relative">
      {/* Decorative Geometry (Achaemenid Abstract Motif) */}
      <div className={`absolute inset-0 opacity-5 pointer-events-none ${isFa ? 'right-0' : 'left-0'}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-[150%] md:w-full h-full object-cover">
          <path d="M0,0 L50,100 L100,0 Z" fill="currentColor" className="text-[#B48635]" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#18231F]" />
        </svg>
      </div>

      <div className="container mx-auto px-4 max-w-[1280px] relative z-10">
        <div className={`flex flex-col md:flex-row items-center gap-12 ${isFa ? 'md:flex-row-reverse text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
          
          <div className="md:w-1/2">
            <div className="inline-block px-3 py-1 rounded-full bg-[#B48635]/10 text-[#B48635] text-[10px] font-bold uppercase tracking-[0.15em] mb-6">
              {isFa ? 'کالکشن' : 'The Collection'}
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-[#18231F] mb-6">
              {isFa ? collection.name_fa || collection.name_en : collection.name_en}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 font-display max-w-lg">
              {isFa 
                ? (collection.story_fa || "ریشه‌ها هرگز فراموش نمی‌شوند؛ آن‌ها فقط شکل تازه‌ای به خود می‌گیرند تا با زبان امروز سخن بگویند.") 
                : (collection.story_en || "Roots are never forgotten; they only take a new shape to speak the language of today.")}
            </p>
            <Link 
              href={`/collections/${collection.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#18231F] text-white font-medium rounded-lg hover:bg-black transition-colors group"
            >
              {isFa ? 'مشاهده کل کالکشن' : 'Explore the Collection'}
              <ArrowRight className={`w-4 h-4 transition-transform ${isFa ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </Link>
          </div>
          
          <div className="md:w-1/2 w-full">
            <div className="aspect-[4/3] bg-white rounded-2xl border border-black/5 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[#1D4E89]/5" />
              <div className="w-full h-full border border-[#1D4E89]/20 rounded-xl relative overflow-hidden">
                 <Image 
                    src="/images/placeholder.jpg" 
                    alt={collection.name_en} 
                    fill 
                    className="object-cover opacity-80 mix-blend-multiply filter sepia-[0.3]"
                 />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

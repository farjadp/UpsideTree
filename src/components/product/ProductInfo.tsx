"use client";

import Link from "next/link";
import { Star, StarHalf } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { formatPrice } from "@/lib/utils";

interface ProductInfoProps {
  product: {
    name_en: string;
    name_fa: string;
    desc_emotional: string;
    price: number;
    sale_price?: number;
    status: string;
    collections: { name_en: string; name_fa: string; slug: string };
  };
  reviewStats?: { avg: number; count: number };
}

export function ProductInfo({ product, reviewStats = { avg: 4.5, count: 28 } }: ProductInfoProps) {
  const { language, setLanguage } = useLanguageStore();
  const isFa = language === "fa";

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} className="w-4 h-4 fill-[#B48635] text-[#B48635]" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<StarHalf key={i} className="w-4 h-4 fill-[#B48635] text-[#B48635]" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className={`flex flex-col gap-6 ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="flex items-center gap-2 self-end text-xs font-medium bg-gray-50 p-1 rounded-md border border-gray-100">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 rounded transition-colors ${!isFa ? 'bg-white shadow-sm text-[#18231F]' : 'text-gray-500 hover:text-gray-800'}`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('fa')}
          className={`px-3 py-1.5 rounded transition-colors ${isFa ? 'bg-white shadow-sm text-[#18231F]' : 'text-gray-500 hover:text-gray-800'}`}
        >
          FA
        </button>
      </div>

      {/* Collection Badge */}
      <div className="flex items-center gap-2">
        <Link 
          href={`/collections/${product.collections.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D4E89]/10 text-[#1D4E89] text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-[#1D4E89]/20 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D4E89]" />
          {isFa ? product.collections.name_fa || product.collections.name_en : product.collections.name_en} COLLECTION
        </Link>
      </div>

      {/* Title & Headline */}
      <div className="flex flex-col gap-3">
        <h1 className="font-display font-semibold text-3xl md:text-[32px] leading-[1.2] text-[#18231F]">
          {isFa ? product.name_fa || product.name_en : product.name_en}
        </h1>
        {product.desc_emotional && (
          <p className="font-display italic text-lg text-[#1D4E89] border-l-2 border-[#1D4E89]/20 pl-4 py-1">
            {isFa ? "«ریشه‌هایت را حمل کن، بدون اینکه فریاد بزنی.»" : product.desc_emotional}
          </p>
        )}
      </div>

      {/* Ratings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
          {renderStars(reviewStats.avg)}
        </div>
        <span className="text-sm font-semibold text-[#18231F]">{reviewStats.avg.toFixed(1)}</span>
        <span className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 cursor-pointer hover:text-gray-800">
          ({reviewStats.count} {isFa ? 'نظر' : 'reviews'})
        </span>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-baseline gap-3">
          {product.sale_price ? (
            <>
              <span className="text-xl text-[#B6653B] line-through font-mono">
                {formatPrice(product.price)}
              </span>
              <span className="text-3xl font-bold text-[#8C2F39] font-mono">
                {formatPrice(product.sale_price)}
              </span>
              <span className="px-2 py-1 rounded bg-[#8C2F39] text-white text-xs font-bold uppercase tracking-wider ml-2">
                SAVE {Math.round((1 - product.sale_price / product.price) * 100)}%
              </span>
            </>
          ) : (
            <span className="text-3xl font-bold text-[#18231F] font-mono">
              {formatPrice(product.price)} CAD
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          {isFa ? 'قیمت‌ها به دلار کانادا می‌باشد.' : 'Prices in CAD. Displayed in CAD for reference.'}
        </p>
        
        {/* Loyalty Points Preview */}
        <div className="flex items-center gap-2 mt-3 p-3 bg-[#697A4D]/5 rounded-lg border border-[#697A4D]/10 text-sm text-[#18231F]">
          🌱 <span>{isFa ? 'با این خرید' : 'Earn'} <strong>{Math.floor(product.sale_price || product.price)} {isFa ? 'امتیاز دریافت کنید' : 'points with this purchase'}</strong> → <Link href="/account/rewards" className="text-[#697A4D] font-medium underline underline-offset-2">Seed tier</Link></span>
        </div>
      </div>
    </div>
  );
}

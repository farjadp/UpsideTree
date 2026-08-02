"use client";

import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { formatPrice } from "@/lib/utils";

interface StickyMobileCartBarProps {
  productNameEn: string;
  productNameFa: string;
  price: number;
  salePrice?: number;
  isOutOfStock: boolean;
}

export function StickyMobileCartBar({ productNameEn, productNameFa, price, salePrice, isOutOfStock }: StickyMobileCartBarProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const [isVisible, setIsVisible] = useState(false);

  const handleAddToCartClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar when scrolled past 600px (roughly past the main Add to Cart button on mobile)
      if (window.scrollY > 600) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] p-3 md:hidden flex items-center justify-between animate-slide-up ${isFa ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col ${isFa ? 'items-end' : 'items-start'}`}>
        <span className="font-semibold text-sm text-[#18231F] line-clamp-1 max-w-[150px]">
          {isFa ? productNameFa || productNameEn : productNameEn}
        </span>
        <div className="flex items-center gap-2">
          {salePrice ? (
            <>
              <span className="text-xs text-gray-500 line-through font-mono">{formatPrice(price)}</span>
              <span className="text-sm font-bold text-[#8C2F39] font-mono">{formatPrice(salePrice)}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-[#18231F] font-mono">{formatPrice(price)}</span>
          )}
        </div>
      </div>
      
      <button 
        onClick={handleAddToCartClick}
        disabled={isOutOfStock}
        className={`h-11 px-6 rounded-lg font-display font-semibold text-sm transition-colors flex items-center gap-2 ${
          isOutOfStock 
            ? "bg-gray-200 text-gray-500" 
            : "bg-[#8C2F39] text-white active:bg-[#7a2831]"
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        {isOutOfStock 
          ? (isFa ? 'ناموجود' : 'Out of Stock') 
          : (isFa ? 'افزودن' : 'Add')
        }
      </button>
    </div>
  );
}

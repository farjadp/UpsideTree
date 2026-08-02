"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguageStore } from "@/store/useLanguageStore";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name_en: string;
  name_fa: string;
  slug: string;
  price: number;
  featured_image_url: string;
}

export function RecentlyViewed({ currentProduct }: { currentProduct: Product }) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Read from local storage
    const stored = localStorage.getItem("ut_recently_viewed");
    let viewed: Product[] = stored ? JSON.parse(stored) : [];

    // Add current product to the top, filter out duplicates
    viewed = [currentProduct, ...viewed.filter(p => p.id !== currentProduct.id)].slice(0, 5);
    
    // Save back to local storage
    localStorage.setItem("ut_recently_viewed", JSON.stringify(viewed));

    // Display all EXCEPT current product
    setRecentProducts(viewed.filter(p => p.id !== currentProduct.id).slice(0, 4));
  }, [currentProduct]);

  if (recentProducts.length === 0) return null;

  return (
    <div className={`mb-24 max-w-7xl mx-auto px-4 ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      <div className="flex items-end justify-between mb-8 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-display font-semibold text-[#18231F]">
          {isFa ? 'اخیراً مشاهده کرده‌اید' : 'Recently Viewed'}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {recentProducts.map((product) => (
          <div key={product.id} className="group relative flex flex-col gap-3">
            <Link href={`/products/${product.slug}`} className="block relative aspect-square bg-[#F8F7F4] rounded-xl overflow-hidden border border-black/5">
              <Image 
                src={product.featured_image_url || "/images/placeholder.jpg"} 
                alt={product.name_en} 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
            
            <Link href={`/products/${product.slug}`} className="flex flex-col gap-1 z-10 bg-stone-50">
              <h3 className="font-semibold text-[#18231F] line-clamp-1">{isFa ? product.name_fa || product.name_en : product.name_en}</h3>
              <p className="font-mono text-[#8C2F39] font-medium">{formatPrice(product.price)}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

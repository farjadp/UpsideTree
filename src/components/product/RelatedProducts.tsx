"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { formatPrice } from "@/lib/utils";
import { ProductActions } from "./ProductActions";

interface RelatedProduct {
  id: string;
  name_en: string;
  name_fa: string;
  slug: string;
  price: number;
  featured_image_url: string;
  collections: { name_en: string; name_fa?: string };
}

interface RelatedProductsProps {
  products: RelatedProduct[];
  collectionNameEn: string;
  collectionNameFa: string;
}

export function RelatedProducts({ products, collectionNameEn, collectionNameFa }: RelatedProductsProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const [quickViewProduct, setQuickViewProduct] = useState<RelatedProduct | null>(null);

  if (!products || products.length === 0) return null;

  return (
    <div className={`mt-24 mb-24 max-w-7xl mx-auto px-4 ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      <div className="flex items-end justify-between mb-8 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-display font-semibold text-[#18231F]">
          {isFa ? `بیشتر از ${collectionNameFa || collectionNameEn}` : `More from ${collectionNameEn}`}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <div key={product.id} className="group relative flex flex-col gap-3">
            <Link href={`/products/${product.slug}`} className="block relative aspect-square bg-[#F8F7F4] rounded-xl overflow-hidden border border-black/5">
              <Image 
                src={product.featured_image_url || "/images/placeholder.jpg"} 
                alt={product.name_en} 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
            
            {/* Quick View Overlay (Desktop only) */}
            <div className="absolute top-[calc(100%-4rem)] left-0 w-full p-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex justify-center -translate-y-4 pointer-events-none">
              <button 
                onClick={(e) => { e.preventDefault(); setQuickViewProduct(product); }}
                className="w-full bg-white/90 backdrop-blur-md border border-white text-[#18231F] font-medium py-3 rounded-lg shadow-lg hover:bg-white transition-colors pointer-events-auto transform translate-y-4 group-hover:translate-y-0 duration-300"
              >
                {isFa ? 'مشاهده سریع' : 'Quick View'}
              </button>
            </div>

            <Link href={`/products/${product.slug}`} className="flex flex-col gap-1 z-10 bg-stone-50">
              <h3 className="font-semibold text-[#18231F] line-clamp-1">{isFa ? product.name_fa || product.name_en : product.name_en}</h3>
              <p className="font-mono text-[#8C2F39] font-medium">{formatPrice(product.price)}</p>
            </Link>
          </div>
        ))}
      </div>

      {/* QUICK VIEW MODAL */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="absolute inset-0" 
            onClick={() => setQuickViewProduct(null)}
          />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative z-10 animate-slide-up">
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-500 hover:text-black hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="md:w-1/2 aspect-square md:aspect-auto relative bg-[#F8F7F4]">
              <Image 
                src={quickViewProduct.featured_image_url || "/images/placeholder.jpg"} 
                alt={quickViewProduct.name_en} 
                fill 
                className="object-cover"
              />
            </div>
            
            <div className="md:w-1/2 p-8 overflow-y-auto max-h-[50vh] md:max-h-none flex flex-col bg-white">
              <h2 className="text-2xl font-display font-semibold text-[#18231F] mb-2">
                {isFa ? quickViewProduct.name_fa || quickViewProduct.name_en : quickViewProduct.name_en}
              </h2>
              <p className="font-mono text-[#8C2F39] text-xl font-bold mb-6">
                {formatPrice(quickViewProduct.price)}
              </p>
              
              {/* Reuse ProductActions for Add to Cart logic */}
              <div className="flex-1">
                <ProductActions 
                  product={{
                    id: quickViewProduct.id,
                    product_type: "Physical",
                    status: "active",
                    product_variants: [
                      { id: "v1", color: "Ivory", size: "M", price: quickViewProduct.price, stock_quantity: 10, is_active: true }
                    ]
                  }}
                />
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <Link 
                  href={`/products/${quickViewProduct.slug}`}
                  className="text-sm font-medium text-[#1D4E89] underline underline-offset-2 hover:text-[#18231F] transition-colors"
                >
                  {isFa ? 'مشاهده تمام جزئیات محصول' : 'View Full Details'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/useLanguageStore";

interface BreadcrumbProps {
  collection: { name_en: string; name_fa: string; slug: string };
  product: { name_en: string; name_fa: string };
}

export function Breadcrumb({ collection, product }: BreadcrumbProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";

  const items = [
    { label: isFa ? "خانه" : "Home", href: "/" },
    { label: isFa ? "کالکشن‌ها" : "Collections", href: "/collections" },
    { label: isFa ? collection.name_fa || collection.name_en : collection.name_en, href: `/collections/${collection.slug}` },
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol 
        className={`flex items-center text-[12px] whitespace-nowrap ${isFa ? 'flex-row-reverse space-x-reverse' : ''}`}
        dir={isFa ? "rtl" : "ltr"}
      >
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <Link 
              href={item.href}
              className="text-[#B48635] hover:text-[#8b6522] transition-colors"
            >
              {item.label}
            </Link>
            <span className="mx-2 text-slate-300">/</span>
          </li>
        ))}
        <li className="text-[#18231F] font-medium truncate max-w-[200px] sm:max-w-none" aria-current="page">
          {isFa ? product.name_fa || product.name_en : product.name_en}
        </li>
      </ol>
    </nav>
  );
}

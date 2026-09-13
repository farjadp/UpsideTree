"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Compass, BookOpen, Search, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { PersianMotif } from "@/components/brand/PersianMotif";

// Styled with the real theme tokens (lapis / ink / ivory / gold). The
// previous version used `ut-*` classes that don't exist in the theme, so
// the search button rendered white-on-white and the "404" numerals
// overlapped the headline.
export default function NotFound() {
  const router = useRouter();
  const language = useLanguageStore((state) => state.language);
  const isFa = language === "fa";
  const [query, setQuery] = useState("");

  const t = {
    title: isFa ? "این شاخه پیدا نشد" : "Lost in the canopy",
    subtitle: isFa
      ? "صفحه‌ای که دنبالش بودید وجود ندارد. از یکی از مسیرهای زیر برگردید."
      : "The page you were looking for isn't here. One of these paths will take you back.",
    placeholder: isFa ? "جستجوی محصول یا مجموعه" : "Search products or collections",
    search: isFa ? "جستجو" : "Search",
  };

  const paths = [
    { href: "/", icon: Home, title: isFa ? "صفحهٔ اصلی" : "Home", desc: isFa ? "تازه‌ترین محصولات" : "Newest pieces" },
    { href: "/collections", icon: Compass, title: isFa ? "مجموعه‌ها" : "Collections", desc: isFa ? "همهٔ مجموعه‌ها" : "Browse every collection" },
    { href: "/stories", icon: BookOpen, title: isFa ? "داستان‌ها" : "Stories", desc: isFa ? "داستان پشت هر طرح" : "The story behind each design" },
  ];

  const Arrow = isFa ? ArrowLeft : ArrowRight;

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  return (
    <main
      className="min-h-screen bg-ivory-100 flex flex-col items-center justify-center px-5 py-16 text-center"
      dir={isFa ? "rtl" : "ltr"}
    >
      <div className="rotate-180 mb-6" aria-hidden="true">
        <PersianMotif motif="cypress" size={56} color="#1D4E89" opacity={0.8} />
      </div>

      <p className="font-body text-sm font-semibold tracking-widest text-gold-600 mb-3">404</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold text-lapis-500 mb-4 text-center">{t.title}</h1>
      <p className="font-body text-base md:text-lg text-ink-400 max-w-lg leading-relaxed mb-10 text-center">{t.subtitle}</p>

      <form onSubmit={onSearch} className="w-full max-w-md flex gap-2 mb-12">
        <label className="relative flex-1">
          <span className="sr-only">{t.placeholder}</span>
          <Search
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 ${isFa ? "right-3.5" : "left-3.5"}`}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.placeholder}
            className={`w-full h-12 rounded-brand border border-ivory-500 bg-white text-sm text-ink-500 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-lapis-500/30 ${isFa ? "pr-10 pl-3" : "pl-10 pr-3"}`}
          />
        </label>
        <button
          type="submit"
          className="h-12 px-5 rounded-brand bg-lapis-500 hover:bg-lapis-600 text-white text-sm font-medium transition-colors"
        >
          {t.search}
        </button>
      </form>

      <nav className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4">
        {paths.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-brand-xl border border-ivory-500 bg-white/70 p-5 text-start hover:border-lapis-300 hover:bg-white transition-colors"
          >
            <span className="w-10 h-10 shrink-0 rounded-brand bg-lapis-50 text-lapis-500 flex items-center justify-center">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-display text-lg font-semibold text-ink-500 group-hover:text-lapis-500">{title}</span>
              <span className="block text-xs text-ink-400">{desc}</span>
            </span>
            <Arrow className="w-4 h-4 text-ink-300 group-hover:text-lapis-500" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </main>
  );
}

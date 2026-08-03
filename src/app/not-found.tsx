"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { Button } from "@/components/ui/Button";
import { Home, Compass, BookOpen, Search, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const isFa = language === 'fa';
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/collections?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Prevent SSR hydrations mismatch before mounted
  if (!isMounted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-ut-sand/20">
        <div className="w-12 h-12 border-2 border-ut-lapis/20 border-t-ut-lapis rounded-full animate-spin" />
      </div>
    );
  }

  const content = {
    title: isFa ? "۴۰۴ — این شاخه در غبار زمان گم شده است" : "404 — Lost in the Canopy of Legend",
    subtitle: isFa 
      ? "صفحه یا محصولی که به دنبال آن بودید، در هیچ‌یک از تالارهای باستانی یا قصه‌های ما پیدا نشد. اما ریشه‌ها همیشه راه بازگشت را نشان می‌دهند." 
      : "The page or story you are seeking could not be found among our living collections. But the roots will always guide you back.",
    searchPlaceholder: isFa ? "جستجوی کالا، طرح یا داستان..." : "Search products, motifs, or stories...",
    searchButton: isFa ? "جستجو" : "Search",
    home: isFa ? "صفحه اصلی" : "Back to Home",
    homeDesc: isFa ? "بازگشت به خانه و بررسی محصولات جدید" : "Return to home & fresh arrivals",
    collections: isFa ? "کاوش مجموعه‌ها" : "Explore Collections",
    collectionsDesc: isFa ? "شاهنامه‌ها، شیر و خورشید و نمادهای کهن" : "Pre-Islamic motifs & modern apparel",
    about: isFa ? "داستان برند ما" : "Our Story",
    aboutDesc: isFa ? "آشنایی با فلسفه و ریشه‌های درخت وارونه" : "Learn about the heritage of Upside Tree",
    suggestedHeading: isFa ? "مسیرهای پیشنهادی" : "Suggested Paths",
    quote: isFa 
      ? "«درختی که ریشه در اسطوره دارد، هیچ‌گاه خزان نمی‌شناسد.»" 
      : "“A tree rooted in legend knows no autumn.”",
  };

  return (
    <div 
      className="min-h-[85vh] bg-gradient-to-b from-ut-sand/40 via-white to-ut-sand/30 flex flex-col items-center justify-center px-4 py-16 text-center font-sans overflow-hidden relative"
      dir={isFa ? "rtl" : "ltr"}
    >
      {/* Decorative Floating Geometric Accents */}
      <div className="absolute top-12 left-12 opacity-10 pointer-events-none animate-pulse">
        <PersianMotif motif="geometric" size={140} color="#1A2B4C" />
      </div>
      <div className="absolute bottom-16 right-12 opacity-10 pointer-events-none animate-pulse delay-700">
        <PersianMotif motif="pomegranate" size={120} color="#8B1E2B" />
      </div>

      {/* Main Illustration Area */}
      <div className="relative mb-8 flex flex-col items-center justify-center">
        {/* Glow backdrop */}
        <div className="absolute w-56 h-56 bg-ut-terracotta/10 rounded-full blur-3xl -z-10 animate-pulse" />
        
        {/* Inverted Cypress Icon Container */}
        <div className="w-32 h-32 md:w-40 md:h-40 bg-white/80 backdrop-blur-md rounded-3xl border border-ut-sand/80 shadow-xl flex items-center justify-center relative group transform hover:rotate-6 transition-all duration-500">
          <div className="transform rotate-180 transition-transform duration-700 group-hover:scale-110">
            <PersianMotif motif="cypress" size={64} color="#1A2B4C" />
          </div>
          {/* Subtle 404 Tag */}
          <span className="absolute -bottom-3 -right-3 bg-ut-pomegranate text-white font-serif font-bold text-xs px-3 py-1 rounded-full shadow-md">
            404 / ۴۰۴
          </span>
        </div>
      </div>

      {/* Big Number Backdrop */}
      <div className="font-serif text-7xl md:text-9xl font-bold tracking-tighter text-ut-lapis/10 select-none -mt-10 mb-2">
        {isFa ? "۴۰۴" : "404"}
      </div>

      {/* Headline & Narrative */}
      <h1 className="font-serif text-3xl md:text-5xl text-ut-lapis font-bold max-w-2xl leading-tight mb-4 -mt-6">
        {content.title}
      </h1>
      
      <p className="text-ut-onyx/70 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
        {content.subtitle}
      </p>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-md mb-12 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={content.searchPlaceholder}
            className="w-full h-12 px-4 py-2 bg-white border border-ut-onyx/20 rounded-xl text-sm focus:outline-none focus:border-ut-lapis focus:ring-2 focus:ring-ut-lapis/20 transition-all text-ut-onyx shadow-sm"
          />
          <Search className={`w-4 h-4 text-ut-onyx/40 absolute top-4 ${isFa ? 'left-3.5' : 'right-3.5'}`} />
        </div>
        <Button variant="primary" type="submit" className="h-12 px-6 rounded-xl bg-ut-lapis hover:bg-ut-lapis/90 text-white font-medium">
          {content.searchButton}
        </Button>
      </form>

      {/* Suggested Navigation Tiles */}
      <div className="w-full max-w-3xl mb-12">
        <h2 className="text-xs uppercase tracking-widest text-ut-onyx/50 font-bold mb-6">
          {content.suggestedHeading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Home */}
          <Link 
            href="/"
            className="group bg-white/70 hover:bg-white backdrop-blur-sm border border-ut-sand/80 hover:border-ut-lapis/30 p-5 rounded-2xl text-right transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-ut-lapis/10 text-ut-lapis flex items-center justify-center group-hover:bg-ut-lapis group-hover:text-white transition-colors">
                <Home className="w-5 h-5" />
              </div>
              {isFa ? <ArrowLeft className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-lapis transition-colors" /> : <ArrowRight className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-lapis transition-colors" />}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ut-onyx group-hover:text-ut-lapis transition-colors mb-1">
                {content.home}
              </h3>
              <p className="text-xs text-ut-onyx/60">
                {content.homeDesc}
              </p>
            </div>
          </Link>

          {/* Card 2: Collections */}
          <Link 
            href="/collections"
            className="group bg-white/70 hover:bg-white backdrop-blur-sm border border-ut-sand/80 hover:border-ut-pomegranate/30 p-5 rounded-2xl text-right transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-ut-pomegranate/10 text-ut-pomegranate flex items-center justify-center group-hover:bg-ut-pomegranate group-hover:text-white transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              {isFa ? <ArrowLeft className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-pomegranate transition-colors" /> : <ArrowRight className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-pomegranate transition-colors" />}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ut-onyx group-hover:text-ut-pomegranate transition-colors mb-1">
                {content.collections}
              </h3>
              <p className="text-xs text-ut-onyx/60">
                {content.collectionsDesc}
              </p>
            </div>
          </Link>

          {/* Card 3: Story */}
          <Link 
            href="/about"
            className="group bg-white/70 hover:bg-white backdrop-blur-sm border border-ut-sand/80 hover:border-ut-terracotta/30 p-5 rounded-2xl text-right transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-ut-terracotta/10 text-ut-terracotta flex items-center justify-center group-hover:bg-ut-terracotta group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              {isFa ? <ArrowLeft className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-terracotta transition-colors" /> : <ArrowRight className="w-4 h-4 text-ut-onyx/30 group-hover:text-ut-terracotta transition-colors" />}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ut-onyx group-hover:text-ut-terracotta transition-colors mb-1">
                {content.about}
              </h3>
              <p className="text-xs text-ut-onyx/60">
                {content.aboutDesc}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Persian Heritage Poetic Quote Footer */}
      <div className="pt-6 border-t border-ut-sand/60 max-w-md mx-auto">
        <p className="font-serif italic text-sm text-ut-onyx/60 mb-2">
          {content.quote}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-ut-onyx/40">
          <span>Upside Tree Brand Studio</span>
          <span>•</span>
          <span dir="ltr">@upsidetree</span>
        </div>
      </div>
    </div>
  );
}

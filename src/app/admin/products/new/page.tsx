"use client";

import { useState, useEffect } from "react";
import { 
  Save, Eye, Sparkles, ChevronRight, Image as ImageIcon, Plus, Trash2, 
  CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Wand2, ArrowLeft, X 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();

  // Form State
  const [activeLangTab, setActiveLangTab] = useState<"en" | "fa">("en");
  const [activeDescTab, setActiveDescTab] = useState<"emotional" | "functional" | "story">("emotional");

  const [nameEn, setNameEn] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [slug, setSlug] = useState("");

  // Descriptions (Bilingual)
  const [descEmotionalEn, setDescEmotionalEn] = useState("");
  const [descEmotionalFa, setDescEmotionalFa] = useState("");
  const [descFunctionalEn, setDescFunctionalEn] = useState("");
  const [descFunctionalFa, setDescFunctionalFa] = useState("");
  const [descStoryEn, setDescStoryEn] = useState("");
  const [descStoryFa, setDescStoryFa] = useState("");

  // Sidebar Settings
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [visibility, setVisibility] = useState<"public" | "hidden" | "password_protected">("public");
  const [productType, setProductType] = useState<"physical" | "pod" | "digital" | "limited" | "variable">("physical");
  const [collectionId, setCollectionId] = useState("");
  const [collections, setCollections] = useState<any[]>([]);

  // Pricing & Inventory
  const [price, setPrice] = useState("45.00");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("15.00");
  const [sku, setSku] = useState("");
  const [manageStock, setManageStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState(25);

  // Gallery
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Brand Gate Checklist
  const [brandGate, setBrandGate] = useState({
    has_story: true,
    fits_collection: true,
    persian_reviewed: false,
    sample_approved: false,
    pricing_checked: true,
    legal_checked: false,
  });

  // AI Assistant Drawer
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMotif, setAiMotif] = useState("Cypress & Pomegranate");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    // Auto slug from Name EN
    if (nameEn && !slug) {
      setSlug(nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  }, [nameEn]);

  useEffect(() => {
    fetch("/api/admin/collections")
      .then(res => res.json())
      .then(data => {
        if (data.collections) setCollections(data.collections);
      })
      .catch(() => {});
  }, []);

  const handleToggleBrandGate = (key: keyof typeof brandGate) => {
    setBrandGate(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isBrandGateApproved = Object.values(brandGate).every(Boolean);

  const handleGenerateAiCopy = async (target: string) => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          productType,
          motif: aiMotif,
          collection: collections.find(c => c.id === collectionId)?.name_en || "Roots"
        })
      });
      const data = await res.json();
      if (data.text) {
        if (target === "emotional_en") setDescEmotionalEn(data.text);
        if (target === "emotional_fa") setDescEmotionalFa(data.text);
        if (target === "story_en") setDescStoryEn(data.text);
        if (target === "story_fa") setDescStoryFa(data.text);
      }
    } catch (err) {
      console.error(err);
    }
    setIsAiLoading(false);
  };

  const handleSaveProduct = async () => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: nameEn || "Untitled Product",
          name_fa: nameFa || "محصول جدید",
          slug: slug || `product-${Date.now()}`,
          status,
          visibility,
          product_type: productType,
          collection_id: collectionId || null,
          price: parseFloat(price) || 0,
          sale_price: salePrice ? parseFloat(salePrice) : null,
          cost_price: costPrice ? parseFloat(costPrice) : null,
          sku: sku || null,
          manage_stock: manageStock,
          stock_quantity: stockQuantity,
          desc_emotional_en: descEmotionalEn,
          desc_emotional_fa: descEmotionalFa,
          desc_functional_en: descFunctionalEn,
          desc_functional_fa: descFunctionalFa,
          desc_story_en: descStoryEn,
          desc_story_fa: descStoryFa,
          featured_image_url: featuredImageUrl,
          gallery_urls: galleryUrls,
          brand_gate: brandGate,
        })
      });
      if (res.ok) {
        router.push("/admin/products");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const marginPercent = price && costPrice ? (((parseFloat(price) - parseFloat(costPrice)) / parseFloat(price)) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-semibold text-white tracking-tight">Add New Product</h1>
            <p className="text-xs text-slate-400">Create a 3-layer story-driven product for your store.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAiOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-300 hover:text-gold-200 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            ✦ AI Assistant
          </button>
          <button
            onClick={handleSaveProduct}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-xs shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Product
          </button>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column (70% = 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Product Names */}
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-semibold text-white text-sm">Product Name & URL</h3>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveLangTab("en")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeLangTab === "en" ? "bg-lapis-600 text-white" : "text-slate-400"}`}
                >
                  English
                </button>
                <button
                  onClick={() => setActiveLangTab("fa")}
                  className={`px-3 py-1 rounded-lg transition-colors font-persian ${activeLangTab === "fa" ? "bg-lapis-600 text-white" : "text-slate-400"}`}
                >
                  فارسی
                </button>
              </div>
            </div>

            {activeLangTab === "en" ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">Product Name (EN) *</label>
                <input
                  type="text"
                  placeholder="e.g. Cypress & Pomegranate Silk Scarf"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500"
                />
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>URL Slug:</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-xs text-slate-300 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">نام محصول (فارسی) *</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثلا: روسری ابریشمی سرو و انار"
                  value={nameFa}
                  onChange={(e) => setNameFa(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500 font-persian"
                />
              </div>
            )}
          </div>

          {/* Section 2: 3-Layer Descriptions */}
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">3-Layer Brand System Description</h3>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveDescTab("emotional")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeDescTab === "emotional" ? "bg-gold-500/20 text-gold-300 border border-gold-500/30" : "text-slate-400"}`}
                >
                  1. Emotional
                </button>
                <button
                  onClick={() => setActiveDescTab("functional")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeDescTab === "functional" ? "bg-gold-500/20 text-gold-300 border border-gold-500/30" : "text-slate-400"}`}
                >
                  2. Functional
                </button>
                <button
                  onClick={() => setActiveDescTab("story")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeDescTab === "story" ? "bg-gold-500/20 text-gold-300 border border-gold-500/30" : "text-slate-400"}`}
                >
                  3. Story
                </button>
              </div>
            </div>

            {activeDescTab === "emotional" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">One sentence. The feeling this product gives to the customer.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Emotional (EN)</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Designed to carry the weight of memory while fitting seamlessly into the rhythm of modern life."
                      value={descEmotionalEn}
                      onChange={(e) => setDescEmotionalEn(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">توصیف احساسی (فارسی)</label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      placeholder="مثلا: طراحی‌شده برای ماندگاری خاطره‌ها، همگام با نبض زندگی امروز."
                      value={descEmotionalFa}
                      onChange={(e) => setDescEmotionalFa(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDescTab === "functional" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Materials, dimensions, care instructions, and specs.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Functional Specs (EN)</label>
                    <textarea
                      rows={4}
                      placeholder="e.g. 100% Mulberry Silk, 90x90cm, Hand-rolled edges. Dry clean only."
                      value={descFunctionalEn}
                      onChange={(e) => setDescFunctionalEn(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">مشخصات فنی (فارسی)</label>
                    <textarea
                      rows={4}
                      dir="rtl"
                      placeholder="مثلا: ۱۰۰٪ ابریشم طبیعی، ابعاد ۹۰ در ۹۰ سانتی‌متر. دور دوزی دست‌ساز."
                      value={descFunctionalFa}
                      onChange={(e) => setDescFunctionalFa(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDescTab === "story" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Cultural source, inspiration, and historical roots.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cultural Story (EN)</label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Inspired by 16th-century Persian illuminated manuscripts..."
                      value={descStoryEn}
                      onChange={(e) => setDescStoryEn(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">داستان ریشه (فارسی)</label>
                    <textarea
                      rows={4}
                      dir="rtl"
                      placeholder="مثلا: با الهام از نسخ خطی و نگارگری‌های سده ۱۶ میلادی..."
                      value={descStoryFa}
                      onChange={(e) => setDescStoryFa(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Media Gallery */}
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-3">Product Media</h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Featured Image URL</label>
              <input
                type="text"
                placeholder="https://... image URL or select from Media Library"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Column (30% = 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Publish & Status */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Publishing Status</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active (Published)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Collection</label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select Collection...</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>{col.name_en} ({col.name_fa})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="physical">Physical Product</option>
                  <option value="pod">Print-on-Demand (POD)</option>
                  <option value="digital">Digital Download</option>
                  <option value="limited">Limited Edition</option>
                  <option value="variable">Variable Product</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Pricing & Margin */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Pricing (CAD)</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sale Price ($)</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>Cost Price: ${costPrice}</span>
              <span className="font-semibold text-emerald-400">Margin: {marginPercent}%</span>
            </div>
          </div>

          {/* Card 3: Brand Gate Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gold-400" />
                Brand Gate Checklist
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isBrandGateApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {isBrandGateApproved ? "Approved" : "Incomplete"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: "has_story", label: "Has a clear story / inspiration" },
                { key: "fits_collection", label: "Fits a named collection" },
                { key: "persian_reviewed", label: "Persian text reviewed by human" },
                { key: "sample_approved", label: "Sample approved" },
                { key: "pricing_checked", label: "Pricing aligned with brand" },
                { key: "legal_checked", label: "Legal & cultural check done" },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={(brandGate as any)[item.key]}
                    onChange={() => handleToggleBrandGate(item.key as any)}
                    className="rounded bg-slate-950 border-white/20 text-gold-500 focus:ring-0"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Slide-in Drawer */}
      {isAiOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 p-6 z-50 overflow-y-auto space-y-6 shadow-2xl animate-slide-in-right">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-gold-400" />
              Claude AI Copywriter
            </h3>
            <button onClick={() => setIsAiOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Key Motif / Inspiration</label>
              <input
                type="text"
                value={aiMotif}
                onChange={(e) => setAiMotif(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleGenerateAiCopy("emotional_en")}
                disabled={isAiLoading}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-gold-500/20 border border-white/10 rounded-xl text-xs text-slate-200 hover:text-gold-300 text-left flex items-center justify-between"
              >
                <span>✦ Emotional Copy (EN)</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => handleGenerateAiCopy("emotional_fa")}
                disabled={isAiLoading}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-gold-500/20 border border-white/10 rounded-xl text-xs text-slate-200 hover:text-gold-300 text-left flex items-center justify-between font-persian"
              >
                <span>✦ توصیف احساسی (فارسی)</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => handleGenerateAiCopy("story_en")}
                disabled={isAiLoading}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-gold-500/20 border border-white/10 rounded-xl text-xs text-slate-200 hover:text-gold-300 text-left flex items-center justify-between"
              >
                <span>✦ Story Copy (EN)</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

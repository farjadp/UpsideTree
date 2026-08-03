"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/Button";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { 
  Minus, Plus, Trash2, Heart, ShieldCheck, 
  Truck, ArrowRight, ArrowLeft 
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const isFa = language === 'fa';
  const { items, updateQuantity, removeItem, cartTotal } = useCartStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [storyMessage, setStoryMessage] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartTotal();
  // If gift wrap is selected, add $5.00
  const finalSubtotal = subtotal + (giftWrap ? 5 : 0);
  
  const FREE_SHIPPING_THRESHOLD = 75;
  const progressPercent = Math.min((finalSubtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - finalSubtotal, 0);

  // Translations
  const t = {
    title: isFa ? "سبد خرید شما" : "Your Cart",
    items: isFa ? "محصول" : "items",
    item: isFa ? "محصول" : "item",
    empty: isFa ? "سبد خرید شما خالی است." : "Your cart is empty.",
    discover: isFa ? "مجموعه‌های ما را کشف کنید و چیزی معنادار بیابید." : "Discover our collections and find something meaningful.",
    explore: isFa ? "جستجوی مجموعه‌ها" : "Explore Collections",
    color: isFa ? "رنگ:" : "Color:",
    size: isFa ? "سایز:" : "Size:",
    sku: isFa ? "شناسه:" : "SKU:",
    unitPrice: isFa ? "قیمت واحد:" : "Unit price:",
    subtotal: isFa ? "جمع جزء:" : "Subtotal:",
    saveForLater: isFa ? "ذخیره برای بعد" : "Save for Later",
    remove: isFa ? "حذف" : "Remove",
    giftWrap: isFa ? "بسته‌بندی هدیه (+$۵)" : "Add gift wrapping (+$5.00 CAD)",
    giftMsg: isFa ? "پیام هدیه (اختیاری)" : "Gift message (optional)",
    storyMsg: isFa ? "پیام کارت داستان (اختیاری)" : "Story Card message (optional)",
    addNote: isFa ? "افزودن یادداشت به سفارش" : "Add a note to your order",
    notePlaceholder: isFa ? "یادداشت داخلی برای ما..." : "Internal note for us — not printed on packaging",
    summary: isFa ? "خلاصه سفارش" : "Order Summary",
    wrappingFee: isFa ? "بسته‌بندی:" : "Gift wrapping:",
    coupon: isFa ? "کد تخفیف" : "Coupon",
    shipping: isFa ? "ارسال:" : "Shipping:",
    calcNext: isFa ? "در مرحله بعد محاسبه می‌شود" : "Calculated next",
    tax: isFa ? "مالیات:" : "Tax:",
    estimatedTotal: isFa ? "مجموع تقریبی:" : "Estimated Total:",
    apply: isFa ? "اعمال" : "Apply",
    freeShipProg: isFa ? `فقط $${amountToFreeShipping.toFixed(2)} دیگر تا ارسال رایگان` : `Add $${amountToFreeShipping.toFixed(2)} more for free shipping`,
    freeShipQual: isFa ? "🎉 شما واجد شرایط ارسال رایگان هستید!" : "🎉 You qualify for free shipping!",
    proceed: isFa ? "ادامه به پرداخت" : "PROCEED TO CHECKOUT",
    continue: isFa ? "ادامه خرید" : "Continue Shopping",
    secure: isFa ? "پرداخت امن" : "Secure checkout",
    shipsFrom: isFa ? "ارسال از کانادا" : "Ships from Canada",
    returns: isFa ? "۳۰ روز ضمانت بازگشت" : "30-day returns"
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <PersianMotif className="w-16 h-16 opacity-20 mb-8" />
        <h1 className="font-serif text-4xl text-ut-lapis mb-4">{t.empty}</h1>
        <p className="text-ut-onyx/70 max-w-md mx-auto mb-8 font-sans">{t.discover}</p>
        <Link href="/collections/roots">
          <Button variant="primary" className="px-8">{t.explore}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-7xl font-sans" dir={isFa ? 'rtl' : 'ltr'}>
      <h1 className="font-serif text-3xl md:text-4xl text-ut-lapis mb-8 md:mb-12 border-b border-ut-sand/30 pb-6">
        {t.title} ({totalItems} {totalItems === 1 ? t.item : t.items})
      </h1>

      <div className="flex flex-col lg:flex-row gap-12 relative">
        {/* LEFT COLUMN: Cart Items */}
        <div className="w-full lg:w-[60%] flex flex-col space-y-8">
          
          {/* Items List */}
          <div className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 md:gap-6 pb-6 border-b border-ut-sand/40">
                {/* Image */}
                <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-ut-sand rounded overflow-hidden relative border border-ut-onyx/5">
                  <Image
                    src={item.image}
                    alt={isFa ? item.nameFa : item.nameEn}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/products/${item.productId}`} className="font-serif text-lg md:text-xl text-ut-onyx hover:text-ut-pomegranate transition-colors">
                        {isFa ? item.nameFa : item.nameEn}
                      </Link>
                      <div className="text-sm text-ut-onyx/60 mt-1 space-y-0.5">
                        {item.variantColor && <p>{t.color} {item.variantColor}</p>}
                        {item.variantSize && <p>{t.size} {item.variantSize}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ut-onyx">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Actions & Quantity */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="flex items-center border border-ut-onyx/20 rounded h-10 w-28">
                      <button 
                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="w-8 flex justify-center text-ut-onyx/60 hover:text-ut-onyx"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-center font-medium text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 flex justify-center text-ut-onyx/60 hover:text-ut-onyx"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button className="text-sm text-ut-lapis hover:text-ut-pomegranate transition-colors flex items-center gap-1.5 font-medium">
                        <Heart className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.saveForLater}</span>
                      </button>
                      <span className="text-ut-onyx/20">|</span>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-ut-onyx/50 hover:text-ut-pomegranate transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.remove}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Messages Section */}
          <div className="bg-ut-sand/30 p-5 md:p-6 rounded-lg border border-ut-sand/50 space-y-5">
            {/* Gift Wrap */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${giftWrap ? 'bg-ut-lapis border-ut-lapis' : 'border-ut-onyx/30 group-hover:border-ut-lapis'}`}>
                  {giftWrap && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <input type="checkbox" className="hidden" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
                <span className="text-ut-onyx font-medium flex items-center gap-2">
                  🎁 {t.giftWrap}
                </span>
              </label>

              {giftWrap && (
                <div className="mt-4 space-y-4 pl-8 border-l-2 border-ut-sand ml-2.5">
                  <div>
                    <label className="block text-sm text-ut-onyx/70 mb-1.5">{t.giftMsg}</label>
                    <textarea 
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value.substring(0, 150))}
                      className="w-full border border-ut-onyx/20 rounded p-2.5 text-sm focus:outline-none focus:border-ut-lapis bg-white"
                      rows={2}
                    />
                    <div className="text-xs text-right mt-1 text-ut-onyx/40">{giftMessage.length}/150</div>
                  </div>
                  <div>
                    <label className="block text-sm text-ut-onyx/70 mb-1.5">{t.storyMsg}</label>
                    <input 
                      type="text"
                      value={storyMessage}
                      onChange={(e) => setStoryMessage(e.target.value)}
                      className="w-full border border-ut-onyx/20 rounded p-2.5 text-sm focus:outline-none focus:border-ut-lapis bg-white"
                      placeholder="Printed on a handmade Story Card"
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="border-ut-sand" />

            {/* Order Note */}
            <div>
              <button 
                onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                className="text-ut-lapis hover:text-ut-pomegranate transition-colors font-medium text-sm flex items-center gap-2"
              >
                {isNoteExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {t.addNote}
              </button>
              
              {isNoteExpanded && (
                <textarea 
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-full mt-3 border border-ut-onyx/20 rounded p-3 text-sm focus:outline-none focus:border-ut-lapis min-h-[100px] bg-white"
                />
              )}
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="w-full lg:w-[40%]">
          <div className="sticky top-24 bg-white border border-ut-onyx/10 rounded-xl p-6 md:p-8 shadow-sm">
            <h2 className="font-serif text-2xl text-ut-lapis mb-6">{t.summary}</h2>
            
            <div className="space-y-4 text-ut-onyx font-sans pb-6 border-b border-ut-sand/50">
              <div className="flex justify-between">
                <span>{t.subtotal} ({totalItems} {t.items})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {giftWrap && (
                <div className="flex justify-between text-ut-pomegranate">
                  <span>{t.wrappingFee}</span>
                  <span>+$5.00</span>
                </div>
              )}

              <div className="flex justify-between text-ut-onyx/60 text-sm">
                <span>{t.shipping}</span>
                <span>{t.calcNext}</span>
              </div>
              <div className="flex justify-between text-ut-onyx/60 text-sm">
                <span>{t.tax}</span>
                <span>{t.calcNext}</span>
              </div>
            </div>

            <div className="py-6 border-b border-ut-sand/50">
              <div className="flex justify-between items-end font-serif text-2xl text-ut-lapis mb-2">
                <span>{t.estimatedTotal}</span>
                <span>${finalSubtotal.toFixed(2)} CAD</span>
              </div>
            </div>

            {/* Free Shipping Progress */}
            <div className="py-5 text-sm">
              <p className="font-medium mb-2">
                {amountToFreeShipping > 0 ? t.freeShipProg : t.freeShipQual}
              </p>
              <div className="h-2 w-full bg-ut-sand rounded-full overflow-hidden">
                <div 
                  className="h-full bg-ut-pomegranate transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Coupon */}
            <div className="py-4 border-t border-ut-sand/50">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={t.coupon}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 border border-ut-onyx/20 rounded h-11 px-3 text-sm focus:outline-none focus:border-ut-lapis uppercase"
                />
                <Button variant="outline" className="h-11 px-4">{t.apply}</Button>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <Link href="/checkout" className="block">
                <Button variant="primary" className="w-full h-14 text-base tracking-widest bg-ut-pomegranate hover:bg-ut-pomegranate/90 text-white border-0">
                  {t.proceed}
                </Button>
              </Link>
              
              <Link href="/" className="block text-center text-ut-lapis text-sm hover:underline flex items-center justify-center gap-2 font-medium">
                {isFa ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {t.continue}
              </Link>
            </div>
            
            {/* Trust Signals */}
            <div className="mt-8 flex flex-col space-y-3 text-xs text-ut-onyx/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ut-lapis" />
                <span>{t.secure}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-ut-lapis" />
                <span>{t.shipsFrom}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowLeft className={`w-4 h-4 text-ut-lapis ${isFa ? 'rotate-180' : ''}`} />
                <span>{t.returns}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

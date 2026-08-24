"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const FREE_SHIPPING_THRESHOLD = 75;
const FLAT_SHIPPING_RATE = 12;

function inputClass() {
  return "w-full border border-ut-onyx/20 rounded h-11 px-3 text-sm focus:outline-none focus:border-ut-lapis bg-white";
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const searchParams = useSearchParams();
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const { items, cartTotal } = useCartStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("CA");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const subtotal = cartTotal();
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const estimatedTotal = subtotal + shippingCost;

  const t = {
    title: isFa ? "تسویه حساب" : "Checkout",
    contact: isFa ? "اطلاعات تماس" : "Contact information",
    fullName: isFa ? "نام کامل" : "Full name",
    email: isFa ? "ایمیل" : "Email",
    phone: isFa ? "شماره تماس (اختیاری)" : "Phone (optional)",
    shipping: isFa ? "آدرس ارسال" : "Shipping address",
    line1: isFa ? "آدرس" : "Street address",
    line2: isFa ? "واحد / پلاک (اختیاری)" : "Apartment / suite (optional)",
    city: isFa ? "شهر" : "City",
    province: isFa ? "استان / ایالت" : "Province / State",
    postalCode: isFa ? "کد پستی" : "Postal code",
    country: isFa ? "کشور" : "Country",
    summary: isFa ? "خلاصه سفارش" : "Order summary",
    subtotal: isFa ? "جمع جزء" : "Subtotal",
    shippingLabel: isFa ? "ارسال" : "Shipping",
    free: isFa ? "رایگان" : "Free",
    taxNote: isFa ? "مالیات در مرحله پرداخت محاسبه می‌شود" : "Tax calculated at payment",
    total: isFa ? "مجموع" : "Total",
    pay: isFa ? "ادامه به پرداخت امن" : "Continue to secure payment",
    processing: isFa ? "در حال پردازش..." : "Processing...",
    secure: isFa ? "پرداخت شما توسط Stripe رمزگذاری و پردازش می‌شود." : "Your payment is encrypted and processed by Stripe.",
    backToCart: isFa ? "بازگشت به سبد خرید" : "Back to cart",
    empty: isFa ? "سبد خرید شما خالی است." : "Your cart is empty.",
    exploreCollections: isFa ? "جستجوی مجموعه‌ها" : "Explore collections",
    cancelledNotice: isFa
      ? "پرداخت لغو شد. سبد شما همچنان محفوظ است — هر وقت آماده بودید دوباره امتحان کنید."
      : "Payment was cancelled. Your cart is still here — try again whenever you're ready.",
  };

  const cancelled = searchParams.get("cancelled");

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-ut-lapis mb-4">{t.empty}</h1>
        <Link href="/collections/roots">
          <Button variant="primary" className="px-8">{t.exploreCollections}</Button>
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone || undefined,
          shippingAddress: { line1, line2, city, province, postal_code: postalCode, country },
          billingSameAsShipping: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Checkout failed.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout URL was returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-6xl font-sans" dir={isFa ? "rtl" : "ltr"}>
      <h1 className="font-serif text-3xl md:text-4xl text-ut-lapis mb-8 border-b border-ut-sand/30 pb-6">
        {t.title}
      </h1>

      {cancelled && (
        <div className="mb-8 rounded-lg border border-ut-pomegranate/30 bg-ut-pomegranate/5 px-4 py-3 text-sm text-ut-pomegranate">
          {t.cancelledNotice}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12">
        <form onSubmit={handleSubmit} className="w-full lg:w-[60%] space-y-8">
          <section className="space-y-4">
            <h2 className="font-serif text-xl text-ut-lapis">{t.contact}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required placeholder={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass()} />
              <input required type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
            </div>
            <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass()} />
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-ut-lapis">{t.shipping}</h2>
            <input required placeholder={t.line1} value={line1} onChange={(e) => setLine1(e.target.value)} className={inputClass()} />
            <input placeholder={t.line2} value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClass()} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input required placeholder={t.city} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass()} />
              <input placeholder={t.province} value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass()} />
              <input placeholder={t.postalCode} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass()} />
            </div>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass()}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </section>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full h-14 text-base tracking-widest bg-ut-pomegranate hover:bg-ut-pomegranate/90 text-white border-0 disabled:opacity-60"
          >
            {isSubmitting ? t.processing : t.pay}
          </Button>
          <p className="flex items-center gap-2 text-xs text-ut-onyx/60">
            <ShieldCheck className="w-4 h-4 text-ut-lapis" />
            {t.secure}
          </p>

          <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-ut-lapis hover:underline">
            <ArrowLeft className="w-4 h-4" />
            {t.backToCart}
          </Link>
        </form>

        <div className="w-full lg:w-[40%]">
          <div className="sticky top-24 bg-white border border-ut-onyx/10 rounded-xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="font-serif text-2xl text-ut-lapis mb-2">{t.summary}</h2>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-ut-onyx/80">
                <span>{isFa ? item.nameFa : item.nameEn} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-ut-sand/50 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.subtotal}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t.shippingLabel}</span>
                <span>{shippingCost === 0 ? t.free : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-xs text-ut-onyx/50">
                <span>{t.taxNote}</span>
              </div>
            </div>
            <div className="border-t border-ut-sand/50 pt-4 flex justify-between font-serif text-xl text-ut-lapis">
              <span>{t.total}</span>
              <span>${estimatedTotal.toFixed(2)} CAD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

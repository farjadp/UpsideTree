"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";
import { useMoney } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/Button";
import { GivingOrderNote } from "@/components/giving/GivingOrderNote";
import { GIVING_RATE } from "@/lib/pricing";

// Countries Printify ships to that we sell in. Tax applies where a rate is
// configured for the destination.
const COUNTRIES: Array<[string, string]> = [
  ["CA", "Canada"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["AT", "Austria"],
  ["IE", "Ireland"],
  ["IT", "Italy"],
  ["ES", "Spain"],
  ["PT", "Portugal"],
  ["FI", "Finland"],
  ["LU", "Luxembourg"],
  ["SE", "Sweden"],
  ["DK", "Denmark"],
  ["NO", "Norway"],
  ["CH", "Switzerland"],
  ["AU", "Australia"],
];

type Quote = {
  currency: "CAD" | "EUR";
  subtotal: number;
  shipping: number | null;
  tax: number;
  total: number | null;
};

function inputClass() {
  return "w-full border border-ink-500/20 rounded h-11 px-3 text-sm focus:outline-none focus:border-lapis-500 bg-white";
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
  const { items } = useCartStore();
  const { currency, convert, formatConverted } = useMoney();

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

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const cartLines = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
    [items]
  );

  const shippingAddress = useMemo(
    () => ({ line1, line2, city, province, postal_code: postalCode, country }),
    [line1, line2, city, province, postalCode, country]
  );

  // Live quote: real Printify shipping + tax for this address, in the
  // chosen currency, from the same pricing code the payment uses. Debounced
  // so typing an address doesn't fire a request per keystroke.
  useEffect(() => {
    if (!isMounted || cartLines.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoting(true);
      setQuoteError("");
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cartLines, shippingAddress, currency }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Couldn't calculate shipping.");
        setQuote(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : "Couldn't calculate shipping.");
      } finally {
        if (!controller.signal.aborted) setQuoting(false);
      }
    }, 600);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isMounted, cartLines, shippingAddress, currency]);

  if (!isMounted) return null;

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
    summary: isFa ? "خلاصه سفارش" : "Order summary",
    subtotal: isFa ? "جمع جزء" : "Subtotal",
    shippingLabel: isFa ? "ارسال" : "Shipping",
    tax: isFa ? "مالیات" : "Tax",
    enterAddress: isFa ? "پس از وارد کردن آدرس" : "Enter your address",
    total: isFa ? "مجموع" : "Total",
    pay: isFa ? "ادامه به پرداخت امن" : "Continue to secure payment",
    processing: isFa ? "در حال پردازش..." : "Processing...",
    secure: isFa ? "پرداخت شما توسط Stripe رمزگذاری و پردازش می‌شود." : "Your payment is encrypted and processed by Stripe.",
    backToCart: isFa ? "بازگشت به سبد خرید" : "Back to cart",
    empty: isFa ? "سبد خرید شما خالی است." : "Your cart is empty.",
    exploreCollections: isFa ? "مشاهدهٔ مجموعه‌ها" : "Explore collections",
    chargedIn: isFa ? `مبلغ به ${currency} پرداخت می‌شود.` : `You'll be charged in ${currency}.`,
    cancelledNotice: isFa
      ? "پرداخت لغو شد. سبد شما همچنان محفوظ است — هر وقت آماده بودید دوباره امتحان کنید."
      : "Payment was cancelled. Your cart is still here — try again whenever you're ready.",
  };

  const cancelled = searchParams.get("cancelled");

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-display text-4xl text-lapis-500 mb-4">{t.empty}</h1>
        <Link href="/collections">
          <Button variant="primary" className="px-8">{t.exploreCollections}</Button>
        </Link>
      </div>
    );
  }

  // Until the server quote arrives, show the client-side subtotal.
  const subtotal = quote?.subtotal ?? items.reduce((sum, item) => sum + convert(item.price) * item.quantity, 0);
  const canPay = Boolean(quote && quote.total !== null) && !quoting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartLines,
          currency,
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone || undefined,
          shippingAddress,
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
    <div className="container mx-auto py-12 md:py-16 max-w-6xl font-body" dir={isFa ? "rtl" : "ltr"}>
      <h1 className="font-display text-3xl md:text-4xl text-lapis-500 mb-8 border-b border-ivory-500 pb-6">
        {t.title}
      </h1>

      {cancelled && (
        <div className="mb-8 rounded-lg border border-pomegranate-500/30 bg-pomegranate-500/5 px-4 py-3 text-sm text-pomegranate-500">
          {t.cancelledNotice}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12">
        <form onSubmit={handleSubmit} className="w-full lg:w-[60%] space-y-8">
          <section className="space-y-4">
            <h2 className="font-display text-xl text-lapis-500">{t.contact}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required placeholder={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass()} />
              <input required type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
            </div>
            <input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass()} />
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl text-lapis-500">{t.shipping}</h2>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass()} aria-label="Country">
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <input required placeholder={t.line1} value={line1} onChange={(e) => setLine1(e.target.value)} className={inputClass()} />
            <input placeholder={t.line2} value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClass()} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input required placeholder={t.city} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass()} />
              <input required={country === "CA" || country === "US"} placeholder={t.province} value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass()} />
              <input required placeholder={t.postalCode} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass()} />
            </div>
          </section>

          {(error || quoteError) && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
              {error || quoteError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !canPay}
            className="w-full h-14 text-base tracking-widest bg-pomegranate-500 hover:bg-pomegranate-600 text-white border-0 disabled:opacity-60"
          >
            {isSubmitting ? t.processing : t.pay}
          </Button>
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <ShieldCheck className="w-4 h-4 text-lapis-500" />
            {t.secure}
          </p>

          <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-lapis-500 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            {t.backToCart}
          </Link>
        </form>

        <div className="w-full lg:w-[40%]">
          <div className="sticky top-24 bg-white border border-ink-500/10 rounded-xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="font-display text-2xl text-lapis-500 mb-2">{t.summary}</h2>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm text-ink-400">
                <span>{isFa ? item.nameFa : item.nameEn} × {item.quantity}</span>
                <span className="tabular-nums">{formatConverted(convert(item.price) * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-ivory-500 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="tabular-nums">{formatConverted(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.shippingLabel}</span>
                <span className="tabular-nums">
                  {quoting ? <Loader2 className="inline w-4 h-4 animate-spin" /> : quote?.shipping != null ? formatConverted(quote.shipping) : <span className="text-ink-300">{t.enterAddress}</span>}
                </span>
              </div>
              {quote && quote.tax > 0 && (
                <div className="flex justify-between">
                  <span>{t.tax}</span>
                  <span className="tabular-nums">{formatConverted(quote.tax)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-ivory-500 pt-4 flex justify-between font-display text-xl text-lapis-500">
              <span>{t.total}</span>
              <span className="tabular-nums">{quote?.total != null ? formatConverted(quote.total) : "—"}</span>
            </div>
            <p className="text-xs text-ink-400">{t.chargedIn}</p>
            <GivingOrderNote formattedAmount={formatConverted(Math.round(subtotal * GIVING_RATE * 100) / 100)} />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const clearCart = useCartStore((state) => state.clearCart);

  // The Stripe redirect back to this page only happens after a successful
  // payment, so it's safe to clear the local cart here.
  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = {
    title: isFa ? "سفارش شما ثبت شد!" : "Your order is confirmed!",
    body: isFa
      ? "ممنون از خرید شما. ایمیل تاییدیه به‌زودی برایتان ارسال می‌شود."
      : "Thank you for your order. A confirmation email is on its way.",
    orderNumber: isFa ? "شماره سفارش" : "Order number",
    continue: isFa ? "ادامه خرید" : "Continue shopping",
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center" dir={isFa ? "rtl" : "ltr"}>
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
      <h1 className="font-serif text-3xl md:text-4xl text-ut-lapis mb-4">{t.title}</h1>
      <p className="text-ut-onyx/70 max-w-md mx-auto mb-4 font-sans">{t.body}</p>
      {orderNumber && (
        <p className="text-sm text-ut-onyx/50 mb-8 font-mono">
          {t.orderNumber}: {orderNumber}
        </p>
      )}
      <Link href="/collections">
        <Button variant="primary" className="px-8">{t.continue}</Button>
      </Link>
    </div>
  );
}

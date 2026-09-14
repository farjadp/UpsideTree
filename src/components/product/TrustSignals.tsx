"use client";

import { useLanguageStore } from "@/store/useLanguageStore";
import { Truck, RotateCcw, Paintbrush, ShieldCheck, HeartHandshake } from "lucide-react";
import { useGivingEnabled } from "@/components/giving/GivingProvider";

export function TrustSignals() {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const givingEnabled = useGivingEnabled();

  const signals = [
    { icon: Truck, labelEn: "Shipping cost shown before you pay", labelFa: "هزینهٔ ارسال پیش از پرداخت نمایش داده می‌شود" },
    { icon: RotateCcw, labelEn: "Replaced if damaged or misprinted", labelFa: "تعویض در صورت آسیب یا خطای چاپ" },
    { icon: Paintbrush, labelEn: "Print-on-demand — made when you order", labelFa: "تولید بر اساس تقاضا — حفظ محیط زیست" },
    { icon: ShieldCheck, labelEn: "Secure checkout (Stripe)", labelFa: "پرداخت امن و مطمئن" },
    ...(givingEnabled
      ? [{ icon: HeartHandshake, labelEn: "3% of every purchase helps people in need in Iran", labelFa: "۳٪ از هر خرید صرف کمک به نیازمندان ایران می‌شود" }]
      : []),
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100 ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      {signals.map((signal, idx) => (
        <div key={idx} className="flex items-center gap-2.5">
          <signal.icon className="w-4 h-4 text-[#697A4D] flex-shrink-0" strokeWidth={2.5} />
          <span className="text-xs font-medium text-[#18231F]">
            {isFa ? signal.labelFa : signal.labelEn}
          </span>
        </div>
      ))}
    </div>
  );
}

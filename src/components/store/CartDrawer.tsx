"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CartDrawer() {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  
  const { isOpen, setIsOpen, items, updateQuantity, removeItem, cartTotal } = useCartStore();
  
  // Hydration fix for Zustand persist
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!mounted) return null;

  const total = cartTotal();
  const FREE_SHIPPING_THRESHOLD = 75;
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = FREE_SHIPPING_THRESHOLD - total;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 bottom-0 z-[60] w-full max-w-[400px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isFa ? 'left-0' : 'right-0'
        } ${
          isOpen ? 'translate-x-0' : isFa ? '-translate-x-full' : 'translate-x-full'
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-xl text-[#18231F]">
            {isFa ? 'سبد خرید' : 'Your Cart'} ({items.length})
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="p-4 bg-[#F8F7F4] border-b border-gray-100">
          <p className="text-sm text-center mb-2 font-medium text-[#18231F]">
            {remaining > 0 ? (
              isFa 
                ? `فقط ${formatPrice(remaining)} تا ارسال رایگان!` 
                : `You're ${formatPrice(remaining)} away from free shipping!`
            ) : (
              isFa ? 'شما واجد شرایط ارسال رایگان هستید! 🎉' : 'You qualify for free shipping! 🎉'
            )}
          </p>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#697A4D] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
              <ShoppingBag className="w-12 h-12" strokeWidth={1} />
              <p>{isFa ? 'سبد خرید شما خالی است.' : 'Your cart is empty.'}</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-md relative flex-shrink-0 overflow-hidden border border-gray-200">
                  <Image src={item.image} alt={item.nameEn} fill className="object-cover" />
                </div>
                
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm text-[#18231F] pr-4">
                        {isFa ? item.nameFa || item.nameEn : item.nameEn}
                      </h3>
                      <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(item.selectedAttributes).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{titleCase(key)}:</span> {value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {item.variantColor && <span>{item.variantColor}</span>}
                          {item.variantColor && item.variantSize && <span> / </span>}
                          {item.variantSize && <span>{item.variantSize}</span>}
                        </>
                      )}
                    </div>
                    {item.giftWrap && (
                      <div className="text-xs text-[#B48635] mt-0.5">
                        + {isFa ? 'بسته‌بندی هدیه' : 'Gift Wrap'} ($5.00)
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex items-center border border-gray-300 rounded h-8">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-2 h-full text-gray-500 hover:bg-gray-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-[#18231F]">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, Math.min(10, item.quantity + 1))}
                        className="px-2 h-full text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-medium text-[#18231F]">
                      {formatPrice((item.price + (item.giftWrap ? 5 : 0)) * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex justify-between mb-4 font-semibold text-lg text-[#18231F]">
              <span>{isFa ? 'مجموع' : 'Subtotal'}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button className="w-full h-14 bg-[#8C2F39] text-white font-display font-semibold tracking-wide rounded-lg hover:bg-[#7a2831] transition-colors">
              {isFa ? 'تکمیل خرید' : 'CHECKOUT'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              {isFa ? 'هزینه ارسال و مالیات در مرحله بعد محاسبه می‌شود.' : 'Shipping & taxes calculated at checkout.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

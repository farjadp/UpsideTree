"use client";

import { useState } from "react";
import { Check, Heart, Share, Minus, Plus, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useCartStore } from "@/store/useCartStore";

// Type definitions based on the requirements
interface Variant {
  id: string;
  sku?: string;
  name_en?: string;
  name_fa?: string;
  attributes?: Record<string, string>;
  color?: string;
  size?: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  image_url?: string;
  is_default?: boolean;
  is_active?: boolean;
}

interface ProductActionsProps {
  product: {
    id: string;
    product_type: string;
    status: string;
    product_variants: Variant[];
  };
  isWishlistedInitially?: boolean;
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProductActions({ product, isWishlistedInitially = false }: ProductActionsProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  const attributeOptions = product.product_variants.reduce<Record<string, string[]>>((accumulator, variant) => {
    const variantAttributes = {
      ...(variant.attributes || {}),
      ...(variant.color ? { color: variant.color } : {}),
      ...(variant.size ? { size: variant.size } : {}),
    };

    for (const [key, value] of Object.entries(variantAttributes)) {
      if (!value) continue;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      if (!accumulator[key].includes(value)) {
        accumulator[key].push(value);
      }
    }

    return accumulator;
  }, {});

  // States
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(attributeOptions).map(([key, values]) => [key, values[0] || ""])
    )
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(isWishlistedInitially);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [showNotify, setShowNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");

  // Determine current variant and stock
  const currentVariant = product.product_variants.find(
    (variant) => {
      const variantAttributes: Record<string, string> = {
        ...(variant.attributes || {}),
        ...(variant.color ? { color: variant.color } : {}),
        ...(variant.size ? { size: variant.size } : {}),
      };

      return Object.entries(selectedAttributes).every(
        ([key, value]) => !value || variantAttributes[key] === value
      );
    }
  );
  const stockLimit = currentVariant ? currentVariant.stock_quantity : 0;
  const isOutOfStock = product.status !== 'active' || stockLimit <= 0;

  const handleQuantityChange = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > Math.min(10, stockLimit)) num = Math.min(10, stockLimit);
    setQuantity(num);
  };

  const { addItem } = useCartStore();

  const handleAddToCart = async () => {
    setIsAdding(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsAdding(false);
    setAddedSuccess(true);
    
    // Add to Zustand Store
    addItem({
      id: `${product.id}-${Object.values(selectedAttributes).join("-")}`,
      productId: product.id,
      variantId: currentVariant?.id,
      nameEn: currentVariant?.name_en || 'Product',
      nameFa: currentVariant?.name_fa || 'محصول',
      price: currentVariant ? currentVariant.sale_price || currentVariant.price : 0,
      quantity,
      image: currentVariant?.image_url || '/images/placeholder.jpg',
      selectedAttributes,
      variantColor: selectedAttributes.color || undefined,
      variantSize: selectedAttributes.size || undefined,
      giftWrap
    });

    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Will notify ${notifyEmail} when available.`);
    setShowNotify(false);
  };

  // Color Map for UI Swatches
  const colorMap: Record<string, string> = {
    "Ivory": "#F8F7F4",
    "Black": "#18231F",
    "Ink Black": "#18231F",
    "Lapis Blue": "#1D4E89",
    "Charcoal": "#333333",
    "Warm Ivory": "#Fdfbf7",
    "Pomegranate Red": "#8C2F39",
    "Cypress Green": "#697A4D"
  };

  return (
    <div className={`mt-8 flex flex-col gap-6 ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      
      {Object.entries(attributeOptions).map(([attributeKey, values]) => {
        const selectedValue = selectedAttributes[attributeKey];
        const isColor = attributeKey.toLowerCase() === "color";
        const label = titleCase(attributeKey);

        return (
          <div key={attributeKey} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#18231F]">
                {label}: <span className="font-normal">{selectedValue}</span>
              </span>
              {attributeKey.toLowerCase() === "size" ? (
                <button className="text-xs text-[#1D4E89] underline underline-offset-2 hover:text-[#18231F] transition-colors">
                  {isFa ? 'راهنمای سایز' : 'Size Guide →'}
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const active = selectedValue === value;

                if (isColor) {
                  const hex = colorMap[value] || "#ddd";
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedAttributes((current) => ({ ...current, [attributeKey]: value }))}
                      className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        active ? "border-[#B48635] shadow-[0_0_0_2px_white,0_0_0_3px_#B48635]" : "border-black/10 hover:scale-110"
                      }`}
                      style={{ backgroundColor: hex }}
                      title={value}
                    >
                      {active ? (
                        <Check className={`w-4 h-4 ${hex === '#F8F7F4' || hex === '#Fdfbf7' ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                      ) : null}
                    </button>
                  );
                }

                return (
                  <button
                    key={value}
                    onClick={() => setSelectedAttributes((current) => ({ ...current, [attributeKey]: value }))}
                    className={`min-w-[3rem] px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-[#1D4E89] text-white border border-[#1D4E89]"
                        : "bg-white text-[#18231F] border border-gray-200 hover:border-[#1D4E89]"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* QUANTITY & ADD TO CART ROW */}
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        {!isOutOfStock && (
          <div className="flex items-center border border-gray-300 rounded-lg h-14 overflow-hidden w-full sm:w-32 bg-white flex-shrink-0">
            <button 
              disabled={quantity <= 1}
              onClick={() => handleQuantityChange(String(quantity - 1))}
              className="px-4 h-full text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input 
              type="text" 
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full text-center font-medium text-[#18231F] focus:outline-none"
            />
            <button 
              disabled={quantity >= Math.min(10, stockLimit)}
              onClick={() => handleQuantityChange(String(quantity + 1))}
              className="px-4 h-full text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {isOutOfStock ? (
          <div className="w-full">
            <button 
              onClick={() => setShowNotify(!showNotify)}
              className="w-full h-14 rounded-lg bg-[#18231F] text-white font-display font-semibold tracking-wide text-sm hover:bg-black transition-colors"
            >
              {isFa ? 'موجود شد خبرم کن' : 'NOTIFY ME WHEN AVAILABLE'}
            </button>
            {showNotify && (
              <form onSubmit={handleNotifySubmit} className="mt-3 flex gap-2 animate-fade-in">
                <input 
                  type="email" 
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder={isFa ? 'ایمیل شما' : 'your@email.com'}
                  className="flex-1 px-4 h-12 rounded-lg border border-gray-300 focus:outline-none focus:border-[#1D4E89]"
                />
                <button type="submit" className="px-6 h-12 bg-[#B48635] text-white font-medium rounded-lg hover:bg-[#8b6522] transition-colors">
                  {isFa ? 'ثبت' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <button 
            onClick={handleAddToCart}
            disabled={isAdding || addedSuccess}
            className={`w-full h-14 rounded-lg font-display font-semibold tracking-[0.05em] text-[15px] transition-all flex items-center justify-center gap-2 ${
              addedSuccess 
                ? "bg-[#697A4D] text-white"
                : "bg-[#8C2F39] text-white hover:bg-[#7a2831] active:scale-[0.99]"
            }`}
          >
            {isAdding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : addedSuccess ? (
              <>
                <Check className="w-5 h-5" strokeWidth={3} />
                {isFa ? 'به سبد خرید اضافه شد' : 'ADDED TO CART'}
              </>
            ) : (
              isFa ? '+ افزودن به سبد خرید' : '+ ADD TO CART'
            )}
          </button>
        )}
      </div>

      {/* WISHLIST & SHARE */}
      <div className="flex items-center gap-6 mt-1">
        <button 
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="flex items-center gap-2 text-sm font-medium text-[#18231F] hover:text-[#B48635] transition-colors group"
        >
          <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-[#8C2F39] text-[#8C2F39]' : 'text-gray-400 group-hover:text-[#B48635]'}`} />
          {isFa ? 'افزودن به علاقه‌مندی‌ها' : 'Save to Wishlist'}
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-[#18231F] hover:text-[#B48635] transition-colors group">
          <Share className="w-4 h-4 text-gray-400 group-hover:text-[#B48635] transition-colors" />
          {isFa ? 'اشتراک‌گذاری' : 'Share'}
        </button>
      </div>

      {/* GIFT WRAP */}
      <div className="mt-4 pt-6 border-t border-gray-100">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center mt-0.5">
            <input 
              type="checkbox" 
              className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded cursor-pointer checked:bg-[#B48635] checked:border-[#B48635] transition-colors"
              checked={giftWrap}
              onChange={(e) => setGiftWrap(e.target.checked)}
            />
            <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-[#18231F] select-none">
              {isFa ? 'بسته‌بندی هدیه' : 'Add gift wrapping'} <span className="text-gray-500 font-normal">(+$5.00 CAD)</span>
            </span>
          </div>
        </label>
        
        {giftWrap && (
          <div className="mt-4 ml-8 animate-fade-in">
            <textarea
              maxLength={150}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              placeholder={isFa ? 'متن کارت هدیه...' : 'Gift message (optional)'}
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#B48635] resize-none text-sm"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{isFa ? 'متن شما روی کارت قصه چاپ می‌شود.' : 'Your message will be printed on a Story Card.'}</span>
              <span>{giftMessage.length}/150</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

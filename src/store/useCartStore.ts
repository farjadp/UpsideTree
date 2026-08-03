import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  nameEn: string;
  nameFa: string;
  price: number;
  quantity: number;
  image: string;
  selectedAttributes?: Record<string, string>;
  variantColor?: string;
  variantSize?: string;
  giftWrap?: boolean;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        });
      },
      
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
        
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
        
      clearCart: () => set({ items: [] }),
      
      cartTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity + (item.giftWrap ? 5 : 0), 0);
      },
    }),
    {
      name: 'ut-cart-storage',
      // Don't persist isOpen state
      partialize: (state) => ({ items: state.items }),
    }
  )
);

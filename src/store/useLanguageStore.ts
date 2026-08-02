import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'fa';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'fa' : 'en' })),
    }),
    {
      name: 'ut-language-preference',
    }
  )
);

import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "alta-vista-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "en" ? "en" : "pt";
    } catch {
      return "pt";
    }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  const toggleLang = () => setLang(lang === "pt" ? "en" : "pt");

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

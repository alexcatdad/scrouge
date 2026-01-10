import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getTranslations } from "./translations";
import type { Language, Translations } from "./types";

/**
 * I18n context value
 */
interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Storage key for persisting language preference
 */
const LANGUAGE_STORAGE_KEY = "scrouge_language";

/**
 * Detect browser language
 */
function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";

  const browserLang = navigator.language.split("-")[0];
  const supportedLanguages: Language[] = ["en", "es", "fr", "de"];

  if (supportedLanguages.includes(browserLang as Language)) {
    return browserLang as Language;
  }

  return "en";
}

/**
 * Get stored language preference
 */
function getStoredLanguage(): Language | null {
  if (typeof localStorage === "undefined") return null;

  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && ["en", "es", "fr", "de"].includes(stored)) {
    return stored as Language;
  }

  return null;
}

/**
 * Store language preference
 */
function storeLanguage(language: Language): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

/**
 * I18n Provider Props
 */
interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

/**
 * I18n Provider component
 */
export function I18nProvider({ children, defaultLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Priority: stored preference > default prop > browser detection
    return getStoredLanguage() || defaultLanguage || detectBrowserLanguage();
  });

  const [translations, setTranslations] = useState<Translations>(() => getTranslations(language));

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    storeLanguage(newLanguage);
    setTranslations(getTranslations(newLanguage));

    // Update document language attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLanguage;
    }
  }, []);

  // Set initial document language
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value: I18nContextValue = {
    language,
    setLanguage,
    t: translations,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n context
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

/**
 * Hook to access translations directly
 */
export function useTranslation(): Translations {
  const { t } = useI18n();
  return t;
}

/**
 * Available languages for language selector
 */
export const availableLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
];

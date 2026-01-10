import type { Language, Translations } from "../types";
import { en } from "./en";
import { es } from "./es";

/**
 * All available translations
 */
export const translations: Record<Language, Translations> = {
  en,
  es,
  // French and German translations can be added here
  // For now, they fall back to English
  fr: en,
  de: en,
};

/**
 * Get translations for a specific language
 */
export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en;
}

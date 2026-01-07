/**
 * Internationalization (i18n) System
 * 
 * A lightweight i18n implementation using React context.
 * Supports multiple languages with lazy loading of translations.
 */

export { I18nProvider, useI18n, useTranslation } from "./provider";
export { formatCurrency, formatDate, formatNumber } from "./formatters";
export type { Language, TranslationKey, Translations } from "./types";


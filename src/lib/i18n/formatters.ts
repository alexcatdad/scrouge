import type { Language } from "./types";

/**
 * Get the locale string for a language
 */
function getLocale(language: Language): string {
  const localeMap: Record<Language, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
  };
  return localeMap[language] || "en-US";
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string,
  language: Language = "en"
): string {
  const locale = getLocale(language);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a date
 */
export function formatDate(
  date: Date | number,
  language: Language = "en",
  options: Intl.DateTimeFormatOptions = {}
): string {
  const locale = getLocale(language);
  const dateObj = typeof date === "number" ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a relative date (e.g., "in 3 days", "2 hours ago")
 */
export function formatRelativeDate(
  date: Date | number,
  language: Language = "en"
): string {
  const locale = getLocale(language);
  const dateObj = typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    
    if (Math.abs(diffDays) < 1) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (Math.abs(diffHours) < 1) {
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        return rtf.format(diffMinutes, "minute");
      }
      return rtf.format(diffHours, "hour");
    }
    
    if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, "day");
    }
    
    if (Math.abs(diffDays) < 365) {
      const diffMonths = Math.round(diffDays / 30);
      return rtf.format(diffMonths, "month");
    }
    
    const diffYears = Math.round(diffDays / 365);
    return rtf.format(diffYears, "year");
  } catch {
    // Fallback for browsers without RelativeTimeFormat
    if (diffDays === 0) return language === "es" ? "Hoy" : "Today";
    if (diffDays === 1) return language === "es" ? "Mañana" : "Tomorrow";
    if (diffDays === -1) return language === "es" ? "Ayer" : "Yesterday";
    if (diffDays > 0) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Format a number
 */
export function formatNumber(
  value: number,
  language: Language = "en",
  options: Intl.NumberFormatOptions = {}
): string {
  const locale = getLocale(language);
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  language: Language = "en",
  decimals: number = 0
): string {
  const locale = getLocale(language);
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}


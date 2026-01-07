/**
 * Supported languages
 */
export type Language = "en" | "es" | "fr" | "de";

/**
 * Translation keys organized by namespace
 */
export interface Translations {
  // Common UI elements
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    back: string;
    next: string;
    submit: string;
    search: string;
    filter: string;
    all: string;
    active: string;
    inactive: string;
    yes: string;
    no: string;
  };

  // Authentication
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    forgotPassword: string;
    createAccount: string;
    continueAsGuest: string;
    guestMode: string;
    welcomeBack: string;
    getStarted: string;
    orContinueWith: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    overview: string;
    subscriptions: string;
    payments: string;
    aiAssistant: string;
    settings: string;
    totalMonthly: string;
    totalYearly: string;
    activeSubscriptions: string;
    upcomingPayments: string;
    noSubscriptions: string;
    addFirst: string;
  };

  // Subscriptions
  subscription: {
    add: string;
    edit: string;
    delete: string;
    pause: string;
    activate: string;
    name: string;
    cost: string;
    category: string;
    billingCycle: string;
    nextBilling: string;
    paymentMethod: string;
    website: string;
    description: string;
    notes: string;
    monthly: string;
    yearly: string;
    weekly: string;
    daily: string;
    confirmDelete: string;
    addSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    pauseSuccess: string;
    activateSuccess: string;
  };

  // Payment methods
  payment: {
    add: string;
    edit: string;
    delete: string;
    setDefault: string;
    name: string;
    type: string;
    lastFour: string;
    expiry: string;
    default: string;
    creditCard: string;
    debitCard: string;
    bankAccount: string;
    paypal: string;
    other: string;
    confirmDelete: string;
    addSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    cannotDelete: string;
  };

  // Categories
  categories: {
    entertainment: string;
    software: string;
    cloud: string;
    utilities: string;
    health: string;
    education: string;
    finance: string;
    shopping: string;
    food: string;
    transport: string;
    other: string;
  };

  // AI Chat
  chat: {
    title: string;
    placeholder: string;
    configureProvider: string;
    configureProviderDesc: string;
    guestModeBlocked: string;
    guestModeBlockedDesc: string;
    suggestions: {
      addSubscription: string;
      showSpending: string;
      upcomingPayments: string;
    };
  };

  // Settings
  settings: {
    title: string;
    aiProvider: string;
    selectProvider: string;
    apiKey: string;
    modelId: string;
    saveSettings: string;
    deleteSettings: string;
    configured: string;
    notConfigured: string;
    webgpuSupported: string;
    webgpuNotSupported: string;
    providers: {
      webllm: string;
      openai: string;
      xai: string;
      mistral: string;
      ollama: string;
    };
  };

  // Errors
  errors: {
    generic: string;
    networkError: string;
    unauthorized: string;
    notFound: string;
    rateLimited: string;
    validationFailed: string;
    somethingWentWrong: string;
    tryAgain: string;
    refreshPage: string;
  };

  // Landing page
  landing: {
    tagline: string;
    headline: string;
    headlineHighlight: string;
    description: string;
    features: {
      paymentTracking: {
        title: string;
        description: string;
      };
      aiAssistant: {
        title: string;
        description: string;
      };
      smartInsights: {
        title: string;
        description: string;
      };
    };
    securityNote: string;
  };
}

/**
 * Flattened translation key type for type-safe access
 */
export type TranslationKey = FlattenKeys<Translations>;

/**
 * Helper type to flatten nested object keys
 */
type FlattenKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;


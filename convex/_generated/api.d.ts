/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiSettings from "../aiSettings.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as http from "../http.js";
import type * as lib_aiProvider from "../lib/aiProvider.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as mcpApiKeys from "../mcpApiKeys.js";
import type * as paymentMethods from "../paymentMethods.js";
import type * as pricing from "../pricing.js";
import type * as router from "../router.js";
import type * as serviceRequests from "../serviceRequests.js";
import type * as sharing from "../sharing.js";
import type * as subscriptions from "../subscriptions.js";
import type * as templates from "../templates.js";
import type * as testing from "../testing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiSettings: typeof aiSettings;
  auth: typeof auth;
  chat: typeof chat;
  http: typeof http;
  "lib/aiProvider": typeof lib_aiProvider;
  "lib/encryption": typeof lib_encryption;
  "lib/logger": typeof lib_logger;
  "lib/rateLimit": typeof lib_rateLimit;
  mcpApiKeys: typeof mcpApiKeys;
  paymentMethods: typeof paymentMethods;
  pricing: typeof pricing;
  router: typeof router;
  serviceRequests: typeof serviceRequests;
  sharing: typeof sharing;
  subscriptions: typeof subscriptions;
  templates: typeof templates;
  testing: typeof testing;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

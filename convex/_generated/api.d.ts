/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as basket from "../basket.js";
import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as launch from "../launch.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_rate_limits from "../lib/rate_limits.js";
import type * as lib_receipt_compatibility from "../lib/receipt_compatibility.js";
import type * as lib_receipt_counters from "../lib/receipt_counters.js";
import type * as lib_save_counters from "../lib/save_counters.js";
import type * as maintenance from "../maintenance.js";
import type * as moderation from "../moderation.js";
import type * as receipts from "../receipts.js";
import type * as runRequests from "../runRequests.js";
import type * as runners from "../runners.js";
import type * as seed from "../seed.js";
import type * as seo from "../seo.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  basket: typeof basket;
  catalog: typeof catalog;
  crons: typeof crons;
  drafts: typeof drafts;
  http: typeof http;
  launch: typeof launch;
  "lib/authorization": typeof lib_authorization;
  "lib/counters": typeof lib_counters;
  "lib/rate_limits": typeof lib_rate_limits;
  "lib/receipt_compatibility": typeof lib_receipt_compatibility;
  "lib/receipt_counters": typeof lib_receipt_counters;
  "lib/save_counters": typeof lib_save_counters;
  maintenance: typeof maintenance;
  moderation: typeof moderation;
  receipts: typeof receipts;
  runRequests: typeof runRequests;
  runners: typeof runners;
  seed: typeof seed;
  seo: typeof seo;
  uploads: typeof uploads;
  users: typeof users;
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

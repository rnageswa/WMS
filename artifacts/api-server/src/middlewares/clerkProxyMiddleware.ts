/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";
import type { IncomingHttpHeaders } from "http";

// Derive the Clerk FAPI host from the publishable key (base64 payload after pk_test_/pk_live_)
function getFapiFromPublishableKey(key: string | undefined): string {
  if (!key) return "https://frontend-api.clerk.dev";
  try {
    const b64 = key.replace(/^pk_(test|live)_/, "");
    const decoded = Buffer.from(b64, "base64").toString("utf-8").replace(/\$$/, "");
    return decoded.startsWith("http") ? decoded : `https://${decoded}`;
  } catch {
    return "https://frontend-api.clerk.dev";
  }
}

const CLERK_FAPI = process.env.NODE_ENV === "production" 
  ? getFapiFromPublishableKey(process.env.CLERK_PUBLISHABLE_KEY)
  : "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(",")[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

export function clerkProxyMiddleware(): RequestHandler {
  // In development, still proxy to Clerk's FAPI so the browser can reach Clerk
  // through our server (the whitelabel key encodes the custom domain as FAPI,
  // which only resolves in production). We skip the Clerk-Proxy-Url header
  // (production-only custom domain feature) but still forward the raw requests.
  const isProduction = process.env.NODE_ENV === "production";
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey && isProduction) {
    return (_req, _res, next) => next();
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        if (isProduction && secretKey) {
          const protocol = req.headers["x-forwarded-proto"] || "https";
          const host = getClerkProxyHost(req) || "";
          const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

          proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
          proxyReq.setHeader("Clerk-Secret-Key", secretKey);
        }

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
    },
  }) as RequestHandler;
}

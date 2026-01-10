/**
 * Bun Production Server
 *
 * Serves the Vite-built static files in production.
 * In development, use `bun run dev` which runs Vite dev server.
 */

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Simple structured logger for the Bun server
 */
const serverLogger = {
  info: (message: string, data?: Record<string, unknown>) => {
    const entry = { timestamp: new Date().toISOString(), level: "info", message, ...data };
    console.log(JSON.stringify(entry));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    const entry = { timestamp: new Date().toISOString(), level: "warn", message, ...data };
    console.warn(JSON.stringify(entry));
  },
  error: (message: string, error?: Error, data?: Record<string, unknown>) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      error: error ? { name: error.name, message: error.message } : undefined,
      ...data,
    };
    console.error(JSON.stringify(entry));
  },
};

/**
 * Server-side environment variables validated with t3-env
 */
const serverEnv = createEnv({
  server: {
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535))
      .default("3000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

const isProduction = serverEnv.NODE_ENV === "production";
const port = serverEnv.PORT;

// Log configuration at startup
serverLogger.info("Server configuration", {
  port,
  nodeEnv: serverEnv.NODE_ENV,
  mode: isProduction ? "production" : "development",
});

/**
 * Security headers for all responses
 * These headers protect against common web vulnerabilities
 */
const getSecurityHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    // Prevent clickjacking attacks
    "X-Frame-Options": "DENY",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Enable XSS filter in older browsers
    "X-XSS-Protection": "1; mode=block",
    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Restrict permissions/features
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  // Content Security Policy
  // Note: VITE_CONVEX_URL is baked into the bundle at build time
  // We allow connections to *.convex.cloud for flexibility
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://fonts.googleapis.com https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  headers["Content-Security-Policy"] = cspDirectives.join("; ");

  // HSTS - only in production (requires HTTPS)
  if (isProduction) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
};

/**
 * Add security headers to a response
 */
const addSecurityHeaders = (response: Response): Response => {
  const securityHeaders = getSecurityHeaders();
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(securityHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

/**
 * Get content type based on file extension
 */
const getContentType = (pathname: string): string => {
  const ext = pathname.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    map: "application/json",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
};

/**
 * Get cache control header based on file type
 */
const getCacheControl = (pathname: string): string => {
  // HTML files should not be cached
  if (pathname.endsWith(".html") || pathname === "/") {
    return "no-cache, no-store, must-revalidate";
  }
  // Assets with hash in filename can be cached forever
  if (pathname.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
    return "public, max-age=31536000, immutable";
  }
  // Other static assets get moderate caching
  return "public, max-age=86400";
};

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Health check endpoint for container orchestration (no security headers needed)
    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Serve from dist directory (Vite build output)
    const distDir = "./dist";

    // Handle root path -> index.html
    if (pathname === "/") {
      pathname = "/index.html";
    }

    // Try to serve the file from dist
    const filePath = `${distDir}${pathname}`;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const contentType = getContentType(pathname);
      const cacheControl = getCacheControl(pathname);

      const response = new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        },
      });
      return addSecurityHeaders(response);
    }

    // SPA fallback: serve index.html for non-file routes
    // This enables client-side routing
    if (!pathname.includes(".")) {
      const indexFile = Bun.file(`${distDir}/index.html`);
      if (await indexFile.exists()) {
        const response = new Response(indexFile, {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        return addSecurityHeaders(response);
      }
    }

    return addSecurityHeaders(new Response("Not Found", { status: 404 }));
  },
});

serverLogger.info("Server started", { port, url: `http://localhost:${port}` });

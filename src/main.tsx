import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { initMonitoring } from "./lib/monitoring";
import { env } from "./lib/env";

// Initialize error monitoring (Sentry)
// Set VITE_SENTRY_DSN environment variable to enable
void initMonitoring({
  dsn: env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

// Create Convex client with validated environment variable
const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { env } from "./lib/env";
import { initMonitoring } from "./lib/monitoring";

// Initialize error monitoring (console-only)
void initMonitoring();

// Create Convex client with validated environment variable
const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);

# Scrouge - Project Overview

## Purpose
Scrouge is a subscription tracking application that helps users manage their recurring subscriptions, track costs, and get AI-powered insights about their spending.

## Tech Stack

### Frontend
- **React 19** with functional components and hooks
- **Tailwind CSS v4** for styling
- **Vite 7** for development server and build tooling
- **Bun** as the runtime (production server in `index.ts`)

### Backend
- **Convex** serverless database and functions
- **@convex-dev/auth** for authentication (password, anonymous, GitHub OAuth, Authentik OIDC)

### AI Integration
- **Vercel AI SDK** (`ai` package) for chat functionality
- Multiple providers: OpenAI, xAI (Grok), Mistral, Ollama, WebLLM (local browser inference)
- User API keys encrypted at rest with AES-256-GCM

### Other Key Dependencies
- **@t3-oss/env-core** + **Zod** for type-safe environment variables
- **Dexie** (IndexedDB wrapper) for client-side chat storage
- **Sonner** for toast notifications
- **Playwright** for E2E testing

## Directory Structure

```
index.ts          # Bun production server - serves Vite build output
index.html        # Entry point - loads src/main.tsx
vite.config.ts    # Vite configuration
src/
  App.tsx         # Main app component with auth state
  SignInForm.tsx  # Multi-provider auth form
  main.tsx        # React entry point with Convex client
  components/     # Feature components (Dashboard, Chat, Subscriptions, etc.)
  lib/
    env.ts        # Type-safe environment variables (t3-env)
    monitoring.ts # Error monitoring (console-only)
    webllm.ts     # Local LLM inference
    guestMode.tsx # Guest user functionality
    i18n/         # Internationalization (en, es)
convex/
  schema.ts       # Database schema (extends authTables)
  auth.ts         # Auth configuration
  http.ts         # HTTP router (auth routes - don't modify)
  router.ts       # User-defined HTTP routes
  chat.ts         # AI chat with tool calling
  subscriptions.ts, paymentMethods.ts, aiSettings.ts  # CRUD operations
  lib/encryption.ts  # API key encryption utilities
  lib/rateLimit.ts   # Rate limiting
tests/            # Unit tests (Bun test)
e2e/              # Playwright E2E tests
dist/             # Vite build output (generated)
```

## Database Tables (Convex)
- `subscriptions` - User subscription records
- `paymentMethods` - Payment method configurations
- `servicePricing` - Cached pricing data for services
- `userAISettings` - User's AI provider configuration
- `mcpApiKeys` - MCP API keys for external integrations
- `rateLimits` - Rate limiting tracking
- Auth tables from `@convex-dev/auth`

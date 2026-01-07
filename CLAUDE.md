# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Tailwind watcher + Bun server with HMR)
bun run dev

# Run individual parts separately
bun run dev:tailwind   # CSS watcher
bun run dev:server     # Bun server with --hot
bun run dev:backend    # Convex backend (convex dev)

# Build
bun run build:css      # Compile Tailwind CSS
bun run build          # Build CSS + bundle for production

# Lint (TypeScript type checking)
bun run lint           # Runs tsc on both convex/ and src/
```

## Architecture

This is a subscription tracking app built with **Bun + Convex + React**.

### Stack
- **Runtime**: Bun (not Node.js)
- **Backend**: Convex (serverless database + functions)
- **Frontend**: React 19 with Tailwind CSS v4
- **Auth**: @convex-dev/auth (password, anonymous, GitHub OAuth, Authentik OIDC)
- **AI**: Vercel AI SDK with multiple providers (OpenAI, xAI, Mistral, Ollama)

### Directory Structure
```
index.ts          # Bun server - serves HTML and transpiles TSX
index.html        # Entry point - loads src/main.tsx
src/
  App.tsx         # Main app component with auth state
  SignInForm.tsx  # Multi-provider auth form
  components/     # Feature components (Dashboard, Chat, Subscriptions, etc.)
  index.css       # Tailwind source CSS
  dist.css        # Compiled CSS (generated)
convex/
  schema.ts       # Database schema (extends authTables)
  auth.ts         # Auth configuration
  http.ts         # HTTP router (auth routes only - don't modify)
  router.ts       # User-defined HTTP routes (modify this one)
  chat.ts         # AI chat with tool calling
  subscriptions.ts, paymentMethods.ts, aiSettings.ts  # CRUD operations
  lib/encryption.ts  # API key encryption utilities
```

### Key Patterns

**Bun Server**: The `index.ts` file serves HTML and transpiles TypeScript/TSX on-the-fly. It injects `CONVEX_URL` into the HTML at runtime.

**Convex Functions**: Always use new function syntax with validators:
```typescript
export const myQuery = query({
  args: { id: v.id("table") },
  returns: v.object({...}),
  handler: async (ctx, args) => {...}
});
```

**Database Access**: Use `ctx.db` in queries/mutations. Actions cannot access the database directly - use `ctx.runQuery`/`ctx.runMutation`.

**AI Chat**: The chat system uses Vercel AI SDK with tool calling. User API keys are encrypted at rest using AES-256-GCM (requires `AI_ENCRYPTION_KEY` env var in Convex dashboard).

## Environment Variables

**Local** (in `.env`):
- `CONVEX_URL` - Convex deployment URL

**Convex Dashboard**:
- `AI_ENCRYPTION_KEY` - For encrypting user API keys (generate with `openssl rand -hex 32`)
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` - GitHub OAuth (optional)
- `AUTH_AUTHENTIK_ID`, `AUTH_AUTHENTIK_SECRET`, `AUTH_AUTHENTIK_ISSUER` - Authentik OIDC (optional)

## Deployment

The app is containerized with Docker and deployed via Gitea Actions.

```bash
# Build Docker image locally
docker build -t scrouge .

# Run locally with docker-compose
docker compose up

# Or run directly
docker run -p 3000:3000 -e CONVEX_URL=https://tough-hound-59.convex.cloud scrouge
```

**CI/CD**: Push to `main` branch triggers `.gitea/workflows/deploy.yaml` which builds, pushes to Gitea Container Registry, and deploys via SSH.

**Required Gitea Secrets**: `REGISTRY_TOKEN`, `CONVEX_URL`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
